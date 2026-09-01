const { neon } = require('@neondatabase/serverless');
const { normalizeEspnEvent, normalizeNeonMatch } = require('../lib/match-contract');

const ESPN_ENDPOINT = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard';
const RECENT_DAYS = 3;

function recentDateKeys() {
    const dates = [];
    const today = new Date();
    today.setUTCHours(12, 0, 0, 0);
    for (let offset = 0; offset <= RECENT_DAYS; offset += 1) {
        const date = new Date(today);
        date.setUTCDate(today.getUTCDate() - offset);
        dates.push(date.toISOString().slice(0, 10).replaceAll('-', ''));
    }
    return dates;
}

async function fetchRecentEspnMatches() {
    const responses = await Promise.all(recentDateKeys().map(async date => {
        const response = await fetch(`${ESPN_ENDPOINT}?dates=${date}`);
        if (!response.ok) throw new Error(`ESPN returned HTTP ${response.status} for ${date}`);
        const payload = await response.json();
        if (!Array.isArray(payload.events)) throw new Error(`Invalid ESPN response for ${date}`);
        return payload.events;
    }));
    return responses.flat().map(normalizeEspnEvent).filter(Boolean);
}

async function readHistoricalMatches(sql) {
    const rows = await sql`
        SELECT
            m.provider, m.provider_event_id, m.kickoff_at, m.status, m.status_clock,
            m.home_score, m.away_score, m.venue, m.matchday,
            home.provider_team_id AS home_provider_id, home.canonical_name AS home_name, home.logo_url AS home_logo,
            away.provider_team_id AS away_provider_id, away.canonical_name AS away_name, away.logo_url AS away_logo
        FROM matches m
        JOIN teams home ON home.id = m.home_team_id
        JOIN teams away ON away.id = m.away_team_id
        WHERE m.season = '2026'
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
