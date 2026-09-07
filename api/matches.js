const { neon } = require('@neondatabase/serverless');
const { normalizeEspnEvent, normalizeNeonMatch } = require('../lib/match-contract');

const ESPN_ENDPOINT = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard';
const RECENT_DAYS = 3;
const SEASON_END = '2027-06-01';

function espnDate(value) {
    return value.toISOString().slice(0, 10).replaceAll('-', '');
}

function espnDateRange() {
    const today = new Date();
    today.setUTCHours(12, 0, 0, 0);
    const start = new Date(today);
    start.setUTCDate(today.getUTCDate() - RECENT_DAYS);
    return `${espnDate(start)}-${SEASON_END.replaceAll('-', '')}`;
}

async function fetchRecentEspnMatches() {
    const dateRange = espnDateRange();
    const response = await fetch(`${ESPN_ENDPOINT}?dates=${dateRange}&limit=1000`);
    if (!response.ok) throw new Error(`ESPN returned HTTP ${response.status} for ${dateRange}`);
    const payload = await response.json();
    if (!Array.isArray(payload.events)) throw new Error(`Invalid ESPN response for ${dateRange}`);
    return payload.events.map(normalizeEspnEvent).filter(Boolean);
}

async function readHistoricalMatches(sql) {
    const rows = await sql`
        SELECT
            m.provider, m.provider_event_id, m.kickoff_at, m.status, m.status_completed, m.status_clock,
            m.home_score, m.away_score, m.venue, m.matchday,
            home.provider_team_id AS home_provider_id, home.canonical_name AS home_name, home.logo_url AS home_logo,
            away.provider_team_id AS away_provider_id, away.canonical_name AS away_name, away.logo_url AS away_logo,
            COALESCE(
                json_agg(json_build_object(
                    'teamProviderId', scorer_team.provider_team_id,
                    'athleteProviderId', ms.provider_athlete_id,
                    'athleteName', ms.athlete_name,
                    'minute', ms.minute,
                    'ownGoal', ms.own_goal,
                    'penalty', ms.penalty
                ) ORDER BY ms.id) FILTER (WHERE ms.id IS NOT NULL),
                '[]'::json
            ) AS scorers
        FROM matches m
        JOIN teams home ON home.id = m.home_team_id
        JOIN teams away ON away.id = m.away_team_id
        LEFT JOIN match_scorers ms ON ms.match_id = m.id
        LEFT JOIN teams scorer_team ON scorer_team.id = ms.team_id
        WHERE m.season = '2026'
        GROUP BY m.id, home.id, away.id
        ORDER BY m.kickoff_at ASC`;

    return rows.map(normalizeNeonMatch);
}

function mergeMatches(historicalMatches, liveMatches) {
    const merged = new Map(historicalMatches.map(match => [match.id, match]));
    for (const match of liveMatches) merged.set(match.id, { ...merged.get(match.id), ...match });
    return [...merged.values()].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
}

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
    if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL is not configured.' });

    try {
        const sql = neon(process.env.DATABASE_URL);
        const historicalMatches = await readHistoricalMatches(sql);
        let liveMatches = [];
        let liveAvailable = true;

        try {
            liveMatches = await fetchRecentEspnMatches();
        } catch (error) {
            liveAvailable = false;
            console.error('ESPN live feed unavailable; serving Neon history:', error);
        }

        res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
        return res.status(200).json({
            matches: mergeMatches(historicalMatches, liveMatches),
            sources: { historical: 'neon', live: liveAvailable ? 'espn' : null },
            liveAvailable,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Normalized match read failed:', error);
        return res.status(500).json({ error: 'Unable to read normalized match data.' });
    }
};
