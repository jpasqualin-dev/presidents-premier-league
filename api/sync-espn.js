const { neon } = require('@neondatabase/serverless');
const { getMatchday } = require('../lib/match-contract');

const ESPN_ENDPOINT = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard';
const SEASON_START = '2026-08-01';
const SEASON_END = '2027-06-01';
const teamOwners = {
    Arsenal: ['Hef', 'Red and Blue Division'], Bournemouth: ['Hef', 'Birds and Beasts Division'], 'Nottingham Forest': ['Hef', 'Field and Forest Division'], 'Hull City': ['Hef', 'Cottage and Country Division'],
    'Manchester City': ['Jordan', 'Red and Blue Division'], Brighton: ['Jordan', 'Birds and Beasts Division'], Brentford: ['Jordan', 'Field and Forest Division'], 'Ipswich Town': ['Jordan', 'Cottage and Country Division'],
    Liverpool: ['Wes', 'Red and Blue Division'], Newcastle: ['Wes', 'Birds and Beasts Division'], Sunderland: ['Wes', 'Field and Forest Division'], 'Coventry City': ['Wes', 'Cottage and Country Division'],
    'Manchester United': ['Nate', 'Red and Blue Division'], 'Aston Villa': ['Nate', 'Birds and Beasts Division'], Everton: ['Nate', 'Field and Forest Division'], Fulham: ['Nate', 'Cottage and Country Division'],
    Chelsea: ['Jamey', 'Red and Blue Division'], Tottenham: ['Jamey', 'Birds and Beasts Division'], 'Crystal Palace': ['Jamey', 'Field and Forest Division'], 'Leeds United': ['Jamey', 'Cottage and Country Division']
};

function dayKeys() {
    return [`${SEASON_START.replaceAll('-', '')}-${SEASON_END.replaceAll('-', '')}`];
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
    return responses.flatMap(payload => payload.events || []);
}

async function fetchEventsForDates(dates) {
    const responses = await Promise.all(dates.map(async date => {
        const response = await fetch(`${ESPN_ENDPOINT}?dates=${date}`);
        if (!response.ok) throw new Error(`ESPN returned HTTP ${response.status} for ${date}`);
        return response.json();
    }));
    return responses.flatMap(payload => payload.events || []);
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
    const [existingMatch] = await sql`
        SELECT id, kickoff_at, matchday
        FROM matches
        WHERE provider = 'espn' AND provider_event_id = ${String(event.id)}`;
    const [homeTeam] = await sql`
        INSERT INTO teams (provider, provider_team_id, canonical_name, short_name, owner, division, logo_url)
        VALUES ('espn', ${String(home.team.id)}, ${homeName}, ${home.team.shortDisplayName || home.team.abbreviation}, ${homeOwner[0]}, ${homeOwner[1]}, ${home.team.logo || null})
        ON CONFLICT (canonical_name) DO UPDATE SET provider = EXCLUDED.provider, provider_team_id = EXCLUDED.provider_team_id, short_name = EXCLUDED.short_name, owner = EXCLUDED.owner, division = EXCLUDED.division, logo_url = EXCLUDED.logo_url, updated_at = NOW()
        RETURNING id`;
    const [awayTeam] = await sql`
        INSERT INTO teams (provider, provider_team_id, canonical_name, short_name, owner, division, logo_url)
        VALUES ('espn', ${String(away.team.id)}, ${awayName}, ${away.team.shortDisplayName || away.team.abbreviation}, ${awayOwner[0]}, ${awayOwner[1]}, ${away.team.logo || null})
        ON CONFLICT (canonical_name) DO UPDATE SET provider = EXCLUDED.provider, provider_team_id = EXCLUDED.provider_team_id, short_name = EXCLUDED.short_name, owner = EXCLUDED.owner, division = EXCLUDED.division, logo_url = EXCLUDED.logo_url, updated_at = NOW()
        RETURNING id`;
    const [match] = await sql`
        INSERT INTO matches (provider, provider_event_id, competition, season, kickoff_at, matchday, status, status_completed, status_detail, status_clock, home_team_id, away_team_id, home_score, away_score, venue)
        VALUES ('espn', ${String(event.id)}, 'eng.1', ${Number(event.season?.year || 2026)}, ${event.date}, ${getMatchday(event)}, ${status.state || 'scheduled'}, ${Boolean(status.completed)}, ${status.detail || null}, ${competition.status?.displayClock || null}, ${homeTeam.id}, ${awayTeam.id}, ${home.score == null ? null : Number(home.score)}, ${away.score == null ? null : Number(away.score)}, ${competition.venue?.fullName || null})
        ON CONFLICT (provider, provider_event_id) DO UPDATE SET original_kickoff_at = COALESCE(matches.original_kickoff_at, matches.kickoff_at), rescheduled_at = CASE WHEN matches.kickoff_at IS DISTINCT FROM EXCLUDED.kickoff_at THEN NOW() ELSE matches.rescheduled_at END, kickoff_at = EXCLUDED.kickoff_at, matchday = COALESCE(matches.matchday, EXCLUDED.matchday), status = EXCLUDED.status, status_completed = EXCLUDED.status_completed, status_detail = EXCLUDED.status_detail, status_clock = EXCLUDED.status_clock, home_team_id = EXCLUDED.home_team_id, away_team_id = EXCLUDED.away_team_id, home_score = EXCLUDED.home_score, away_score = EXCLUDED.away_score, venue = EXCLUDED.venue, updated_at = NOW()
        RETURNING id`;
    if (existingMatch?.kickoff_at && new Date(existingMatch.kickoff_at).getTime() !== new Date(event.date).getTime()) {
        await sql`
            INSERT INTO schedule_changes (match_id, old_kickoff_at, new_kickoff_at)
            VALUES (${existingMatch.id}, ${existingMatch.kickoff_at}, ${event.date})
            ON CONFLICT (match_id, old_kickoff_at, new_kickoff_at) DO NOTHING`;
    }
    await sql`DELETE FROM match_scorers WHERE match_id = ${match.id}`;
    await sql`DELETE FROM match_events WHERE match_id = ${match.id}`;
    await sql`DELETE FROM match_team_stats WHERE match_id = ${match.id}`;
    for (const detail of competition.details || []) {
        const scorer = detail.athletesInvolved?.[0];
        const team = detail.team?.id === home.team.id ? homeTeam : detail.team?.id === away.team.id ? awayTeam : null;
        await sql`
            INSERT INTO match_events (match_id, team_id, event_type, clock_seconds, clock_display, athlete_provider_id, athlete_name, score_value, scoring_play, red_card, yellow_card, penalty, own_goal, shootout)
            VALUES (${match.id}, ${team?.id || null}, ${detail.type?.text || 'unknown'}, ${detail.clock?.value == null ? null : Math.floor(Number(detail.clock.value))}, ${detail.clock?.displayValue || null}, ${scorer?.id ? String(scorer.id) : null}, ${scorer?.displayName || null}, ${detail.scoreValue == null ? null : Number(detail.scoreValue)}, ${Boolean(detail.scoringPlay)}, ${Boolean(detail.redCard)}, ${Boolean(detail.yellowCard)}, ${Boolean(detail.penaltyKick)}, ${Boolean(detail.ownGoal)}, ${Boolean(detail.shootout)})`;
    }
    for (const detail of (competition.details || []).filter(item => item.scoringPlay)) {
        const scorer = detail.athletesInvolved?.[0];
        const scorerTeam = detail.team?.id === home.team.id ? homeTeam : awayTeam;
        if (!scorerTeam) continue;
        await sql`
            INSERT INTO match_scorers (match_id, provider_athlete_id, team_id, athlete_name, minute, own_goal, penalty)
            VALUES (${match.id}, ${scorer?.id ? String(scorer.id) : null}, ${scorerTeam.id}, ${scorer?.displayName || 'Unknown scorer'}, ${detail.clock?.value == null ? null : Math.floor(Number(detail.clock.value) / 60)}, ${Boolean(detail.ownGoal)}, ${Boolean(detail.penaltyKick)})`;
    }
    for (const competitor of [home, away]) {
        const team = competitor.homeAway === 'home' ? homeTeam : awayTeam;
        for (const stat of competitor.statistics || []) {
            const numericValue = Number.parseFloat(stat.displayValue);
            await sql`
                INSERT INTO match_team_stats (match_id, team_id, stat_name, stat_value, display_value)
                VALUES (${match.id}, ${team.id}, ${stat.name}, ${Number.isNaN(numericValue) ? null : numericValue}, ${stat.displayValue || null})
                ON CONFLICT (match_id, team_id, stat_name) DO UPDATE SET stat_value = EXCLUDED.stat_value, display_value = EXCLUDED.display_value`;
        }
    }
    return true;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
    if (!process.env.CRON_SECRET) return res.status(500).json({ error: 'CRON_SECRET is not configured.' });
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized.' });
    if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL is not configured.' });

    try {
        const sql = neon(process.env.DATABASE_URL);
        const events = await fetchEvents();
        let stored = 0;
        for (const event of events) if (await syncEvent(sql, event)) stored += 1;
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ provider: 'espn', dates: dayKeys(), events: events.length, stored, syncedAt: new Date().toISOString() });
    } catch (error) {
        console.error('ESPN sync failed:', error);
        return res.status(500).json({ error: 'ESPN synchronization failed.' });
    }
};

module.exports.dateKeysBetween = dateKeysBetween;
module.exports.fetchEventsForDates = fetchEventsForDates;
module.exports.syncEvent = syncEvent;
