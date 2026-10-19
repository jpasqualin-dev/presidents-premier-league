const { neon } = require('@neondatabase/serverless');
const { assistStatus: getAssistStatus, getMatchday } = require('../lib/match-contract');
const { crestForTeam } = require('../lib/team-names');
const { dedupeByKey } = require('../lib/match-aggregation');

const ESPN_ENDPOINT = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard';
const ESPN_TEAM_ENDPOINT = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams';
const SEASON_START = '2026-08-01';
const SEASON_END = '2027-06-01';
const SYNC_LOOKBACK_DAYS = 7;
const ROSTER_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const teamOwners = {
    Arsenal: ['Hef', 'Red and Blue Division'], Bournemouth: ['Hef', 'Birds and Beasts Division'], 'Nottingham Forest': ['Hef', 'Field and Forest Division'], 'Hull City': ['Hef', 'Cottage and Country Division'],
    'Manchester City': ['Jordan', 'Red and Blue Division'], Brighton: ['Jordan', 'Birds and Beasts Division'], Brentford: ['Jordan', 'Field and Forest Division'], 'Ipswich Town': ['Jordan', 'Cottage and Country Division'],
    Liverpool: ['Wes', 'Red and Blue Division'], Newcastle: ['Wes', 'Birds and Beasts Division'], Sunderland: ['Wes', 'Field and Forest Division'], 'Coventry City': ['Wes', 'Cottage and Country Division'],
    'Manchester United': ['Nate', 'Red and Blue Division'], 'Aston Villa': ['Nate', 'Birds and Beasts Division'], Everton: ['Nate', 'Field and Forest Division'], Fulham: ['Nate', 'Cottage and Country Division'],
    Chelsea: ['Jamey', 'Red and Blue Division'], Tottenham: ['Jamey', 'Birds and Beasts Division'], 'Crystal Palace': ['Jamey', 'Field and Forest Division'], 'Leeds United': ['Jamey', 'Cottage and Country Division']
};

function dayKeys(now = new Date()) {
    const today = new Date(now);
    today.setUTCHours(12, 0, 0, 0);
    const dates = [];
    for (let offset = -SYNC_LOOKBACK_DAYS; offset <= 1; offset += 1) {
        const date = new Date(today);
        date.setUTCDate(today.getUTCDate() + offset);
        dates.push(date.toISOString().slice(0, 10).replaceAll('-', ''));
    }
    return dates;
}

function findTeamOwner(name) {
    return Object.entries(teamOwners).find(([canonical]) => name === canonical || name.includes(canonical) || canonical.includes(name))?.[1] || [null, null];
}

function findCanonicalTeam(name) {
    return Object.keys(teamOwners).find(canonical => name === canonical || name.includes(canonical) || canonical.includes(name)) || name;
}

function getCompetitor(event, side) {
    return event.competitions?.[0]?.competitors?.find(item => item.homeAway === side);
}

function getHalfTimeScore(competitor) {
    const score = competitor?.linescores?.[0]?.value ?? competitor?.linescores?.[0]?.displayValue;
    return score == null ? null : Number(score);
}

function dateKeysBetween(startDate, endDate) {
    const dates = [];
    const current = new Date(`${startDate}T12:00:00Z`);
    const last = new Date(`${endDate}T12:00:00Z`);
    for (; current <= last; current.setUTCDate(current.getUTCDate() + 1)) {
        dates.push(current.toISOString().slice(0, 10).replaceAll('-', ''));
    }
    return dates;
}

async function fetchEvents() {
    const responses = await Promise.all(dayKeys().map(async date => {
        const response = await fetch(`${ESPN_ENDPOINT}?dates=${date}&limit=1000`);
        if (!response.ok) throw new Error(`ESPN returned HTTP ${response.status} for ${date}`);
        return response.json();
    }));
    return dedupeByKey(responses.flatMap(payload => payload.events || []), event => event.id);
}

async function fetchEventsForDates(dates) {
    const responses = await Promise.all(dates.map(async date => {
        const response = await fetch(`${ESPN_ENDPOINT}?dates=${date}`);
        if (!response.ok) throw new Error(`ESPN returned HTTP ${response.status} for ${date}`);
        return response.json();
    }));
    return dedupeByKey(responses.flatMap(payload => payload.events || []), event => event.id);
}

async function fetchMatchSummary(eventId) {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event=${encodeURIComponent(eventId)}`);
    if (!response.ok) return null;
    return response.json();
}

async function fetchTeamRoster(teamProviderId) {
    const response = await fetch(`${ESPN_TEAM_ENDPOINT}/${encodeURIComponent(teamProviderId)}/roster`);
    if (!response.ok) throw new Error(`ESPN returned HTTP ${response.status} for team roster ${teamProviderId}`);
    const payload = await response.json();
    if (!Array.isArray(payload.athletes) || payload.athletes.length === 0) {
        throw new Error(`ESPN returned no roster athletes for team ${teamProviderId}`);
    }
    return payload.athletes;
}

async function syncCurrentRosters(sql, now = new Date()) {
    const [syncState] = await sql`
        SELECT last_synced_at
        FROM player_roster_sync
        WHERE sync_key = 'espn-current-rosters'`;
    const lastSyncedAt = syncState?.last_synced_at ? new Date(syncState.last_synced_at).getTime() : 0;
    if (Number.isFinite(lastSyncedAt) && now.getTime() - lastSyncedAt < ROSTER_REFRESH_INTERVAL_MS) {
        return { refreshed: false, reason: 'cached', players: null };
    }

    const teams = await sql`
        SELECT provider_team_id
        FROM teams
        WHERE provider = 'espn'
        ORDER BY provider_team_id`;
    if (teams.length !== Object.keys(teamOwners).length) {
        throw new Error(`Expected ${Object.keys(teamOwners).length} ESPN teams before refreshing rosters; found ${teams.length}`);
    }

    const rosterByTeam = new Array(teams.length);
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(5, teams.length) }, async () => {
        while (nextIndex < teams.length) {
            const index = nextIndex;
            nextIndex += 1;
            const teamProviderId = String(teams[index].provider_team_id);
            const athletes = await fetchTeamRoster(teamProviderId);
            rosterByTeam[index] = athletes.map(athlete => {
                if (athlete?.id == null || !athlete.fullName && !athlete.displayName) {
                    throw new Error(`ESPN returned an invalid athlete for team roster ${teamProviderId}`);
                }
                return {
                    provider_athlete_id: String(athlete.id),
                    athlete_name: athlete.fullName || athlete.displayName,
                    provider_team_id: teamProviderId
                };
            });
        }
    });
    await Promise.all(workers);

    const playersById = new Map();
    rosterByTeam.flat().forEach(player => {
        const prior = playersById.get(player.provider_athlete_id);
        if (prior && prior.provider_team_id !== player.provider_team_id) {
            throw new Error(`ESPN listed athlete ${player.provider_athlete_id} on multiple current rosters`);
        }
        playersById.set(player.provider_athlete_id, player);
    });
    const players = [...playersById.values()];
    if (!players.length) throw new Error('ESPN returned no current roster players.');

    const observedAt = now.toISOString();
    await sql`
        INSERT INTO player_current_teams (provider, provider_athlete_id, athlete_name, team_id, observed_at)
        SELECT 'espn', roster.provider_athlete_id, roster.athlete_name, teams.id, ${observedAt}
        FROM json_to_recordset(${JSON.stringify(players)}::json)
            AS roster(provider_athlete_id text, athlete_name text, provider_team_id text)
        JOIN teams ON teams.provider = 'espn'
            AND teams.provider_team_id = roster.provider_team_id
        ON CONFLICT (provider, provider_athlete_id) DO UPDATE SET
            athlete_name = EXCLUDED.athlete_name,
            team_id = EXCLUDED.team_id,
            observed_at = EXCLUDED.observed_at`;
    await sql`
        DELETE FROM player_current_teams
        WHERE provider = 'espn' AND observed_at < ${observedAt}`;
    await sql`
        INSERT INTO player_roster_sync (sync_key, last_synced_at)
        VALUES ('espn-current-rosters', ${observedAt})
        ON CONFLICT (sync_key) DO UPDATE SET last_synced_at = EXCLUDED.last_synced_at`;
    return { refreshed: true, reason: null, players: players.length };
}

function normalizeSummaryEvent(item) {
    return {
        type: item.type,
        clock: item.clock,
        team: item.team,
        scoreValue: item.scoreValue,
        scoringPlay: Boolean(item.scoringPlay),
        redCard: Boolean(item.redCard) || item.type?.type === 'red-card',
        yellowCard: Boolean(item.yellowCard) || item.type?.type === 'yellow-card',
        penaltyKick: Boolean(item.penaltyKick) || item.type?.type === 'penalty---scored',
        ownGoal: Boolean(item.ownGoal),
        shootout: Boolean(item.shootout),
        substitution: Boolean(item.substitution || item.type?.type?.includes('substitution')),
        athletesInvolved: (item.participants || []).map(participant => participant.athlete).filter(Boolean)
    };
}

async function fetchScoringDetails(event, summary = null) {
    const payload = summary || await fetchMatchSummary(event.id);
    if (!payload) return event.competitions?.[0]?.details || [];
    const competitors = payload.header?.competitions?.[0]?.competitors || [];
    for (const competitor of competitors) {
        const target = event.competitions?.[0]?.competitors?.find(item => item.homeAway === competitor.homeAway);
        if (target && competitor.linescores) target.linescores = competitor.linescores;
    }
    const summaryEvents = payload.keyEvents?.length ? payload.keyEvents : payload.plays || [];
    return summaryEvents.length ? summaryEvents.map(normalizeSummaryEvent) : event.competitions?.[0]?.details || [];
}

function canReplaceScorerRecords(summary, details, homeScore, awayScore, homeTeamId, awayTeamId) {
    if (!summary || !Array.isArray(details)) return false;
    if (homeScore == null || awayScore == null || String(homeScore).trim() === '' || String(awayScore).trim() === '') return false;
    const homeGoals = Number(homeScore);
    const awayGoals = Number(awayScore);
    if (!Number.isInteger(homeGoals) || homeGoals < 0 || !Number.isInteger(awayGoals) || awayGoals < 0) return false;
    const expectedGoals = homeGoals + awayGoals;
    const scorers = details.filter(detail => detail.scoringPlay);
    const teamIds = new Set([String(homeTeamId), String(awayTeamId)]);
    return scorers.length === expectedGoals
        && scorers.every(scorer => scorer.team?.id != null && teamIds.has(String(scorer.team.id)));
}

const ASSIST_CONFIRMATION_OBSERVATIONS = 2;

function scorerMinute(value) {
    if (value == null || value === '') return null;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return Math.floor(numeric);
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : null;
}

// ESPN clock.value is in seconds; displayValue ("45'+2'") is already minutes.
function clockMinute(clock) {
    const display = scorerMinute(clock?.displayValue);
    if (display != null) return display;
    const seconds = Number(clock?.value);
    return Number.isFinite(seconds) ? Math.floor(seconds / 60) : null;
}

function buildScorerRecords(details, existingRecords, finished, checkedAt = new Date()) {
    const priorRecords = [...(existingRecords || [])];
    return details.filter(detail => detail.scoringPlay).map(detail => {
        const scorer = detail.athletesInvolved?.[0];
        const teamProviderId = detail.team?.id == null ? null : String(detail.team.id);
        const athleteProviderId = scorer?.id == null ? null : String(scorer.id);
        const minute = clockMinute(detail.clock);
        const sameScorer = record => String(record.team_provider_id) === String(teamProviderId)
            && ((athleteProviderId && String(record.provider_athlete_id) === athleteProviderId)
                || (!athleteProviderId && String(record.athlete_name || '').toLowerCase() === String(scorer?.displayName || '').toLowerCase()));
        const matchingIndexes = priorRecords.map((record, index) => sameScorer(record) ? index : -1).filter(index => index >= 0);
        const exactMinuteIndex = matchingIndexes.find(index => scorerMinute(priorRecords[index].minute) === minute);
        const priorIndex = exactMinuteIndex ?? (matchingIndexes.length === 1 ? matchingIndexes[0] : -1);
        const prior = priorIndex >= 0 ? priorRecords.splice(priorIndex, 1)[0] : null;
        const assistant = detail.athletesInvolved?.[1];
        const assistProviderId = assistant?.id == null ? null : String(assistant.id);
        const assistName = assistant?.displayName || null;
        const explicitUnassisted = getAssistStatus(detail) === 'unassisted';

        if (assistProviderId || assistName) {
            return {
                teamProviderId, athleteProviderId, athleteName: scorer?.displayName || 'Unknown scorer',
                assistProviderId, assistName, assistStatus: 'credited', assistObservations: 0,
                assistCheckedAt: checkedAt, minute, ownGoal: Boolean(detail.ownGoal), penalty: Boolean(detail.penaltyKick)
            };
        }

        if (explicitUnassisted || prior?.assist_status === 'unassisted') {
            return {
                teamProviderId, athleteProviderId, athleteName: scorer?.displayName || 'Unknown scorer',
                assistProviderId: null, assistName: null, assistStatus: 'unassisted', assistObservations: 0,
                assistCheckedAt: checkedAt, minute, ownGoal: Boolean(detail.ownGoal), penalty: Boolean(detail.penaltyKick)
            };
        }

        if (prior?.assist_status === 'credited' && (prior.assist_provider_id || prior.assist_name)) {
            return {
                teamProviderId, athleteProviderId, athleteName: scorer?.displayName || prior.athlete_name || 'Unknown scorer',
                assistProviderId: prior.assist_provider_id, assistName: prior.assist_name, assistStatus: 'credited',
                assistObservations: 0, assistCheckedAt: prior.assist_checked_at || checkedAt, minute,
                ownGoal: Boolean(detail.ownGoal), penalty: Boolean(detail.penaltyKick)
            };
        }

        const previousObservations = Number(prior?.assist_observations) || 0;
        const previousCheckedAt = prior?.assist_checked_at ? new Date(prior.assist_checked_at) : null;
        const canCountObservation = finished
            && (!previousCheckedAt || checkedAt.getTime() - previousCheckedAt.getTime() >= 6 * 60 * 60 * 1000);
        const observations = previousObservations + (canCountObservation || !prior ? 1 : 0);
        return {
            teamProviderId, athleteProviderId, athleteName: scorer?.displayName || prior?.athlete_name || 'Unknown scorer',
            assistProviderId: null, assistName: null,
            assistStatus: finished && observations >= ASSIST_CONFIRMATION_OBSERVATIONS ? 'unassisted' : 'unverified',
            assistObservations: observations,
            assistCheckedAt: canCountObservation || !prior ? checkedAt : previousCheckedAt,
            minute, ownGoal: Boolean(detail.ownGoal), penalty: Boolean(detail.penaltyKick)
        };
    });
}

async function fetchMatchStatistics(eventId, summary = null) {
    const payload = summary || await fetchMatchSummary(eventId);
    if (!payload) return [];
    const stats = (payload.boxscore?.teams || []).flatMap(team => (team.statistics || []).map(stat => ({
        teamProviderId: team.team?.id ? String(team.team.id) : null,
        name: stat.name,
        displayValue: stat.displayValue || null,
        value: Number.isNaN(Number.parseFloat(stat.displayValue)) ? null : Number.parseFloat(stat.displayValue)
    })));
    return dedupeByKey(stats, stat => `${stat.teamProviderId}:${stat.name}`);
}
async function fetchMatchLineups(eventId, summary = null) {
    const payload = summary || await fetchMatchSummary(eventId);
    if (!payload) return null;
    const lineups = {};
    for (const roster of payload.rosters || []) {
        const side = roster.homeAway === 'home' || roster.homeAway === 'away' ? roster.homeAway : null;
        if (!side) continue;
        lineups[side] = {
            formation: roster.formation || null,
            players: (roster.roster || []).map(item => ({
                name: item.athlete?.displayName || item.athlete?.shortName || item.name || 'Unknown player',
                starter: Boolean(item.starter),
                position: typeof item.position === 'string'
                    ? item.position
                    : item.position?.abbreviation || item.position?.displayName || item.position?.name || null,
                subbedIn: Boolean(item.subbedIn),
                subbedOut: Boolean(item.subbedOut)
            }))
        };
    }
    return Object.keys(lineups).length ? lineups : null;
}
async function syncEvent(sql, event) {
    const competition = event.competitions?.[0];
    const home = getCompetitor(event, 'home');
    const away = getCompetitor(event, 'away');
    if (!competition || !home?.team?.id || !away?.team?.id) return false;

    const status = competition.status?.type || {};
    const homeOwner = findTeamOwner(home.team.displayName);
    const awayOwner = findTeamOwner(away.team.displayName);
    const homeName = findCanonicalTeam(home.team.displayName);
    const awayName = findCanonicalTeam(away.team.displayName);
    let summary = null;
    let details = competition.details || [];
    let matchStatistics = [];
    try {
        summary = await fetchMatchSummary(event.id);
        if (summary) {
            [details, matchStatistics] = await Promise.all([
                fetchScoringDetails(event, summary),
                fetchMatchStatistics(event.id, summary)
            ]);
        }
    } catch (error) {
        console.warn(`ESPN details unavailable while syncing event ${event.id}; storing scoreboard data:`, error.message);
        summary = null;
        details = competition.details || [];
        matchStatistics = [];
    }
    const [existingMatch] = await sql`
        SELECT id, kickoff_at, matchday
        FROM matches
        WHERE provider = 'espn' AND provider_event_id = ${String(event.id)}`;
    const [homeTeam] = await sql`
        INSERT INTO teams (provider, provider_team_id, canonical_name, short_name, owner_name, division, logo_url)
        VALUES ('espn', ${String(home.team.id)}, ${homeName}, ${home.team.shortDisplayName || home.team.abbreviation}, ${homeOwner[0]}, ${homeOwner[1]}, ${crestForTeam(homeName, home.team.id)})
        ON CONFLICT (canonical_name) DO UPDATE SET provider = EXCLUDED.provider, provider_team_id = EXCLUDED.provider_team_id, short_name = EXCLUDED.short_name, owner_name = EXCLUDED.owner_name, division = EXCLUDED.division, logo_url = EXCLUDED.logo_url, updated_at = NOW()
        RETURNING id`;
    const [awayTeam] = await sql`
        INSERT INTO teams (provider, provider_team_id, canonical_name, short_name, owner_name, division, logo_url)
        VALUES ('espn', ${String(away.team.id)}, ${awayName}, ${away.team.shortDisplayName || away.team.abbreviation}, ${awayOwner[0]}, ${awayOwner[1]}, ${crestForTeam(awayName, away.team.id)})
        ON CONFLICT (canonical_name) DO UPDATE SET provider = EXCLUDED.provider, provider_team_id = EXCLUDED.provider_team_id, short_name = EXCLUDED.short_name, owner_name = EXCLUDED.owner_name, division = EXCLUDED.division, logo_url = EXCLUDED.logo_url, updated_at = NOW()
        RETURNING id`;
    const [match] = await sql`
        INSERT INTO matches (provider, provider_event_id, competition, season, kickoff_at, matchday, status_state, status_completed, status_detail, status_clock, home_team_id, away_team_id, home_score, away_score, home_half_time_score, away_half_time_score, venue)
        VALUES ('espn', ${String(event.id)}, 'eng.1', ${Number(event.season?.year || 2026)}, ${event.date}, ${getMatchday(event)}, ${status.state || 'scheduled'}, ${Boolean(status.completed)}, ${status.detail || null}, ${competition.status?.displayClock || null}, ${homeTeam.id}, ${awayTeam.id}, ${home.score == null ? null : Number(home.score)}, ${away.score == null ? null : Number(away.score)}, ${getHalfTimeScore(home)}, ${getHalfTimeScore(away)}, ${competition.venue?.fullName || null})
        ON CONFLICT (provider, provider_event_id) DO UPDATE SET original_kickoff_at = COALESCE(matches.original_kickoff_at, matches.kickoff_at), rescheduled_at = CASE WHEN matches.kickoff_at IS DISTINCT FROM EXCLUDED.kickoff_at THEN NOW() ELSE matches.rescheduled_at END, kickoff_at = EXCLUDED.kickoff_at, matchday = COALESCE(matches.matchday, EXCLUDED.matchday), status_state = EXCLUDED.status_state, status_completed = EXCLUDED.status_completed, status_detail = EXCLUDED.status_detail, status_clock = EXCLUDED.status_clock, home_team_id = EXCLUDED.home_team_id, away_team_id = EXCLUDED.away_team_id, home_score = EXCLUDED.home_score, away_score = EXCLUDED.away_score, home_half_time_score = EXCLUDED.home_half_time_score, away_half_time_score = EXCLUDED.away_half_time_score, venue = EXCLUDED.venue, updated_at = NOW()
        RETURNING id`;
    if (existingMatch?.kickoff_at && new Date(existingMatch.kickoff_at).getTime() !== new Date(event.date).getTime()) {
        await sql`
            INSERT INTO schedule_changes (match_id, old_kickoff_at, new_kickoff_at)
            VALUES (${existingMatch.id}, ${existingMatch.kickoff_at}, ${event.date})
            ON CONFLICT (match_id, old_kickoff_at, new_kickoff_at) DO NOTHING`;
    }
    const hasEventPayload = Boolean(summary && (
        summary.keyEvents?.length || summary.plays?.length || event.competitions?.[0]?.details?.length
    ));
    const hasCompleteScorerPayload = canReplaceScorerRecords(
        summary,
        details,
        home.score,
        away.score,
        home.team.id,
        away.team.id
    );
    const hasStatsPayload = Boolean(summary?.boxscore?.teams?.length);

    if (hasEventPayload) {
        await sql`DELETE FROM match_events WHERE match_id = ${match.id}`;
        for (const detail of details) {
            const scorer = detail.athletesInvolved?.[0];
            const team = detail.team?.id === home.team.id ? homeTeam : detail.team?.id === away.team.id ? awayTeam : null;
            const isSubstitution = Boolean(detail.substitution || detail.type?.type?.includes('substitution') || detail.type?.text?.toLowerCase().includes('substitution'));
            await sql`
            INSERT INTO match_events (match_id, team_id, event_type, clock_seconds, clock_display, athlete_provider_id, athlete_name, substitution_player_on, substitution_player_off, score_value, scoring_play, red_card, yellow_card, penalty, own_goal, shootout)
            VALUES (${match.id}, ${team?.id || null}, ${detail.type?.text || 'unknown'}, ${detail.clock?.value == null ? null : Math.floor(Number(detail.clock.value))}, ${detail.clock?.displayValue || null}, ${scorer?.id ? String(scorer.id) : null}, ${scorer?.displayName || null}, ${isSubstitution ? detail.athletesInvolved?.[0]?.displayName || null : null}, ${isSubstitution ? detail.athletesInvolved?.[1]?.displayName || null : null}, ${detail.scoreValue == null ? null : Number(detail.scoreValue)}, ${Boolean(detail.scoringPlay)}, ${Boolean(detail.redCard)}, ${Boolean(detail.yellowCard)}, ${Boolean(detail.penaltyKick)}, ${Boolean(detail.ownGoal)}, ${Boolean(detail.shootout)})`;
        }
    }
    if (hasCompleteScorerPayload) {
        const existingScorers = await sql`
            SELECT t.provider_team_id AS team_provider_id, ms.provider_athlete_id, ms.athlete_name, ms.assist_provider_id,
                ms.assist_name, ms.assist_status, ms.assist_observations, ms.assist_checked_at, ms.minute
            FROM match_scorers ms
            JOIN teams t ON t.id = ms.team_id
            WHERE ms.match_id = ${match.id}`;
        const finished = status.state === 'post' || Boolean(status.completed);
        const scorerRecords = buildScorerRecords(details, existingScorers, finished);
        await sql`DELETE FROM match_scorers WHERE match_id = ${match.id}`;
        for (const scorer of scorerRecords) {
            const scorerTeam = scorer.teamProviderId === String(home.team.id) ? homeTeam
                : scorer.teamProviderId === String(away.team.id) ? awayTeam
                    : null;
            if (!scorerTeam) continue;
            await sql`
            INSERT INTO match_scorers (match_id, provider_athlete_id, team_id, athlete_name, assist_provider_id, assist_name, assist_status, assist_observations, assist_checked_at, minute, own_goal, penalty)
            VALUES (${match.id}, ${scorer.athleteProviderId}, ${scorerTeam.id}, ${scorer.athleteName}, ${scorer.assistProviderId}, ${scorer.assistName}, ${scorer.assistStatus}, ${scorer.assistObservations}, ${scorer.assistCheckedAt}, ${scorer.minute}, ${scorer.ownGoal}, ${scorer.penalty})`;
        }
    }
    if (hasStatsPayload) {
        await sql`DELETE FROM match_team_stats WHERE match_id = ${match.id}`;
        for (const stat of matchStatistics) {
            const team = stat.teamProviderId === String(home.team.id) ? homeTeam
                : stat.teamProviderId === String(away.team.id) ? awayTeam
                    : null;
            if (!team) continue;
            await sql`
                INSERT INTO match_team_stats (match_id, team_id, stat_name, stat_value, display_value)
                VALUES (${match.id}, ${team.id}, ${stat.name}, ${stat.value}, ${stat.displayValue})
                ON CONFLICT (match_id, team_id, stat_name) DO UPDATE SET stat_value = EXCLUDED.stat_value, display_value = EXCLUDED.display_value`;
        }
    }
    return true;
}

async function findMatchesNeedingRepair(sql) {
    return sql`
        SELECT m.provider_event_id, m.kickoff_at,
            COUNT(ms.id) <> m.home_score + m.away_score AS scorer_pending,
            COALESCE(BOOL_OR(ms.assist_status = 'unverified'), FALSE) AS assist_pending
        FROM matches m
        LEFT JOIN match_scorers ms ON ms.match_id = m.id
        WHERE m.provider = 'espn'
            AND m.season::text = '2026'
            AND (m.status_completed = TRUE OR m.status_state = 'post')
            AND m.home_score IS NOT NULL
            AND m.away_score IS NOT NULL
        GROUP BY m.id, m.provider_event_id, m.kickoff_at, m.home_score, m.away_score
        HAVING COUNT(ms.id) <> m.home_score + m.away_score
            OR BOOL_OR(ms.assist_status = 'unverified')
        ORDER BY m.kickoff_at ASC
        LIMIT 50`;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
    if (!process.env.CRON_SECRET) return res.status(500).json({ error: 'CRON_SECRET is not configured.' });
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized.' });
    if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL is not configured.' });

    try {
        const sql = neon(process.env.DATABASE_URL);
        const recentEvents = await fetchEvents();
        const incompleteMatches = await findMatchesNeedingRepair(sql);
        const repairDates = [...new Set(incompleteMatches.map(match =>
            new Date(match.kickoff_at).toISOString().slice(0, 10).replaceAll('-', '')
        ))];
        const missingEventIds = new Set(incompleteMatches.map(match => String(match.provider_event_id)));
        const repairEvents = repairDates.length ? await fetchEventsForDates(repairDates) : [];
        const events = dedupeByKey([
            ...recentEvents,
            ...repairEvents.filter(event => missingEventIds.has(String(event.id)))
        ], event => event.id);
        let stored = 0;
        const failures = [];
        for (const event of events) {
            try {
                if (await syncEvent(sql, event)) stored += 1;
            } catch (error) {
                failures.push({ eventId: String(event.id), message: error.message });
                console.error(`Failed to sync ESPN event ${event.id}:`, error);
            }
        }
        const rosterSync = await syncCurrentRosters(sql);
        const remainingIncompleteMatches = await findMatchesNeedingRepair(sql);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(failures.length ? 500 : 200).json({
            provider: 'espn',
            dates: dayKeys(),
            events: events.length,
            stored,
            failures,
            scorerRepairs: {
                candidates: incompleteMatches.filter(match => match.scorer_pending).length,
                eventsFound: repairEvents.filter(event => missingEventIds.has(String(event.id))
                    && incompleteMatches.find(match => String(match.provider_event_id) === String(event.id))?.scorer_pending).length,
                remaining: remainingIncompleteMatches.filter(match => match.scorer_pending).length
            },
            assistRepairs: {
                candidates: incompleteMatches.filter(match => match.assist_pending).length,
                eventsFound: repairEvents.filter(event => missingEventIds.has(String(event.id))
                    && incompleteMatches.find(match => String(match.provider_event_id) === String(event.id))?.assist_pending).length,
                remaining: remainingIncompleteMatches.filter(match => match.assist_pending).length
            },
            rosterSync: {
                refreshed: rosterSync.refreshed,
                reason: rosterSync.reason,
                players: rosterSync.players
            },
            syncedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('ESPN sync failed:', error);
        return res.status(500).json({ error: 'ESPN synchronization failed.' });
    }
};

module.exports.dateKeysBetween = dateKeysBetween;
module.exports.fetchEventsForDates = fetchEventsForDates;
module.exports.fetchMatchStatistics = fetchMatchStatistics;
module.exports.fetchMatchLineups = fetchMatchLineups;
module.exports.fetchScoringDetails = fetchScoringDetails;
module.exports.fetchMatchSummary = fetchMatchSummary;
module.exports.fetchTeamRoster = fetchTeamRoster;
module.exports.syncCurrentRosters = syncCurrentRosters;
module.exports.syncEvent = syncEvent;
module.exports.canReplaceScorerRecords = canReplaceScorerRecords;
module.exports.buildScorerRecords = buildScorerRecords;
module.exports.findMatchesNeedingRepair = findMatchesNeedingRepair;
module.exports.dayKeys = dayKeys;
