const { neon } = require('@neondatabase/serverless');
const { normalizeEspnEvent, normalizeNeonMatch } = require('../lib/match-contract');
const { mergeMatches } = require('../lib/match-aggregation');
const { fetchScoringDetails } = require('./sync-espn');
const matchCorrections = require('../data/match-corrections.json');

const ESPN_ENDPOINT = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard';
const DATE_LOOKBACK = 1;
const DATE_LOOKAHEAD = 1;
const RECENT_FINAL_WINDOW_MS = 2 * 60 * 60 * 1000;

function espnDateKeys() {
    const today = new Date();
    today.setUTCHours(12, 0, 0, 0);
    const dates = [];
    for (let offset = -DATE_LOOKBACK; offset <= DATE_LOOKAHEAD; offset += 1) {
        const date = new Date(today);
        date.setUTCDate(today.getUTCDate() + offset);
        dates.push(date.toISOString().slice(0, 10).replaceAll('-', ''));
    }
    return dates;
}

function shouldFetchDetails(event) {
    const status = event.competitions?.[0]?.status?.type || {};
    if (status.state === 'in') return true;
    if (status.state !== 'post' && !status.completed) return false;
    const eventTime = new Date(event.date).getTime();
    return Number.isFinite(eventTime) && Date.now() - eventTime <= RECENT_FINAL_WINDOW_MS;
}

function applyMatchCorrections(matches) {
    const corrections = new Map(matchCorrections.map(correction => [
        `${correction.provider}:${correction.providerEventId}`,
        correction
    ]));
    return matches.map(match => {
        const correction = corrections.get(`${match.provider}:${match.providerEventId}`);
        if (!correction) return match;
        return {
            ...match,
            status: correction.status,
            score: {
                ...(match.score || {}),
                fullTime: {
                    ...(match.score?.fullTime || {}),
                    home: correction.homeScore,
                    away: correction.awayScore
                }
            }
        };
    });
}

async function fetchRecentEspnMatches() {
    const payloads = await Promise.all(espnDateKeys().map(async date => {
        const response = await fetch(`${ESPN_ENDPOINT}?dates=${date}&limit=1000`);
        if (!response.ok) throw new Error(`ESPN returned HTTP ${response.status} for ${date}`);
        return response.json();
    }));
    const sourceEvents = [...new Map(
        payloads.flatMap(payload => payload.events || []).map(event => [String(event.id), event])
    ).values()];
    const events = await Promise.all(sourceEvents.map(async event => {
        if (!shouldFetchDetails(event)) return event;
        try {
            const details = await fetchScoringDetails(event);
            return {
                ...event,
                competitions: event.competitions?.map(competition => ({ ...competition, details }))
            };
        } catch (error) {
            console.warn(`ESPN details unavailable for event ${event.id}; using scoreboard data:`, error.message);
            return event;
        }
    }));
    return events.map(normalizeEspnEvent).filter(Boolean);
}

async function readHistoricalMatches(sql, includeDetails = false) {
    const rows = await sql`
        SELECT
            m.provider, m.provider_event_id, m.kickoff_at, m.status_state, m.status_completed, m.status_clock,
            m.home_score, m.away_score,
            (to_jsonb(m)->>'home_half_time_score')::integer AS home_half_time_score,
            (to_jsonb(m)->>'away_half_time_score')::integer AS away_half_time_score,
            m.venue, m.matchday,
            home.provider_team_id AS home_provider_id, home.canonical_name AS home_name, home.logo_url AS home_logo,
            away.provider_team_id AS away_provider_id, away.canonical_name AS away_name, away.logo_url AS away_logo,
            CASE WHEN ${includeDetails} THEN COALESCE((
                SELECT json_agg(json_build_object(
                    'teamProviderId', scorer_team.provider_team_id,
                    'athleteProviderId', ms.provider_athlete_id,
                    'athleteName', ms.athlete_name,
                    'assistProviderId', to_jsonb(ms)->>'assist_provider_id',
                    'assistName', to_jsonb(ms)->>'assist_name',
                    'minute', ms.minute,
                    'ownGoal', ms.own_goal,
                    'penalty', ms.penalty
                ) ORDER BY ms.id)
                FROM match_scorers ms
                LEFT JOIN teams scorer_team ON scorer_team.id = ms.team_id
                WHERE ms.match_id = m.id
            ), '[]'::json) ELSE '[]'::json END AS scorers,
            CASE WHEN ${includeDetails} THEN COALESCE((
                SELECT json_agg(json_build_object(
                    'teamProviderId', event_team.provider_team_id,
                    'athleteProviderId', me.athlete_provider_id,
                    'athleteName', me.athlete_name,
                    'comingOn', to_jsonb(me)->>'substitution_player_on',
                    'goingOff', to_jsonb(me)->>'substitution_player_off',
                    'eventType', me.event_type,
                    'minute', me.clock_display,
                    'redCard', me.red_card,
                    'yellowCard', me.yellow_card,
                    'penalty', me.penalty
                ) ORDER BY me.id)
                FROM match_events me
                LEFT JOIN teams event_team ON event_team.id = me.team_id
                                WHERE me.match_id = m.id
                                    AND NOT COALESCE(me.scoring_play, FALSE)
            ), '[]'::json) ELSE '[]'::json END AS events
            , CASE WHEN ${includeDetails} THEN COALESCE((
                SELECT json_agg(json_build_object(
                    'teamProviderId', stats_team.provider_team_id,
                    'name', mts.stat_name,
                    'value', mts.stat_value,
                    'displayValue', mts.display_value
                ) ORDER BY mts.stat_name)
                FROM match_team_stats mts
                JOIN teams stats_team ON stats_team.id = mts.team_id
                WHERE mts.match_id = m.id
            ), '[]'::json) ELSE '[]'::json END AS team_stats
        FROM matches m
        JOIN teams home ON home.id = m.home_team_id
        JOIN teams away ON away.id = m.away_team_id
        WHERE m.season = '2026'
        GROUP BY m.id, home.id, away.id
        ORDER BY m.kickoff_at ASC`;

    return rows.map(normalizeNeonMatch);
}

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

    try {
        const includeDetails = req.query?.details === '1' || req.query?.details === 'true';
        const historyPromise = process.env.DATABASE_URL
            ? readHistoricalMatches(neon(process.env.DATABASE_URL), includeDetails)
            : Promise.reject(new Error('DATABASE_URL is not configured.'));
        const livePromise = fetchRecentEspnMatches();
        const [historyResult, liveResult] = await Promise.allSettled([historyPromise, livePromise]);
        const historicalMatches = historyResult.status === 'fulfilled' ? historyResult.value : [];
        const liveMatches = liveResult.status === 'fulfilled' ? liveResult.value : [];
        const liveAvailable = liveResult.status === 'fulfilled';

        if (historyResult.status === 'rejected') console.error('Neon history unavailable; serving live ESPN data:', historyResult.reason);
        if (liveResult.status === 'rejected') console.error('ESPN live feed unavailable; serving Neon history:', liveResult.reason);
        if (historyResult.status === 'rejected' && liveResult.status === 'rejected') {
            throw new Error('Both Neon history and ESPN live data are unavailable.');
        }

        res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=45');
        return res.status(200).json({
            matches: mergeMatches(applyMatchCorrections([...historicalMatches, ...liveMatches])),
            sources: { historical: historyResult.status === 'fulfilled' ? 'neon' : null, live: liveAvailable ? 'espn' : null },
            liveAvailable,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Normalized match read failed:', error);
        return res.status(500).json({ error: 'Unable to read normalized match data.' });
    }
};

module.exports.applyMatchCorrections = applyMatchCorrections;
