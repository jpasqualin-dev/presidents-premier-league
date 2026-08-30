const fs = require('node:fs/promises');
const path = require('node:path');

const endpoint = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard';
const databasePath = path.resolve('data/matches.json');
const startDate = process.env.START_DATE || '2026-08-01';
const endDate = process.env.END_DATE || new Date().toISOString().slice(0, 10);

const dateRange = (start, end) => {
    const dates = [];
    for (const date = new Date(`${start}T12:00:00Z`); date <= new Date(`${end}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 1)) {
        dates.push(date.toISOString().slice(0, 10).replaceAll('-', ''));
    }
    return dates;
};

const competitor = (event, side) => event.competitions?.[0]?.competitors?.find(item => item.homeAway === side);

function normalizeEvent(event) {
    const competition = event.competitions?.[0] || {};
    const home = competitor(event, 'home');
    const away = competitor(event, 'away');
    if (!home?.team?.id || !away?.team?.id) return null;

    return {
        id: `espn:${event.id}`,
        provider: 'espn',
        providerEventId: String(event.id),
        date: event.date,
        status: {
            state: competition.status?.type?.state || 'scheduled',
            completed: Boolean(competition.status?.type?.completed),
            detail: competition.status?.type?.detail || null,
            clock: competition.status?.displayClock || null
        },
        homeTeam: {
            providerId: String(home.team.id),
            name: home.team.displayName,
            shortName: home.team.shortDisplayName || home.team.abbreviation,
            logo: home.team.logo || null,
            score: home.score == null ? null : Number(home.score)
        },
        awayTeam: {
            providerId: String(away.team.id),
            name: away.team.displayName,
            shortName: away.team.shortDisplayName || away.team.abbreviation,
            logo: away.team.logo || null,
            score: away.score == null ? null : Number(away.score)
        },
        venue: competition.venue?.fullName || null,
        scorers: (competition.details || []).filter(detail => detail.scoringPlay).map(detail => ({
            teamProviderId: String(detail.team?.id || ''),
            athleteProviderId: detail.athletesInvolved?.[0]?.id ? String(detail.athletesInvolved[0].id) : null,
            athleteName: detail.athletesInvolved?.[0]?.displayName || 'Unknown scorer',
            minute: detail.clock?.displayValue || null,
            ownGoal: Boolean(detail.ownGoal),
            penalty: Boolean(detail.penaltyKick)
        }))
    };
}

async function loadDatabase() {
    try {
        return JSON.parse(await fs.readFile(databasePath, 'utf8'));
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        return { schemaVersion: 1, provider: 'espn', competition: 'eng.1', season: 2026, updatedAt: null, matches: [] };
    }
}

(async () => {
    const database = await loadDatabase();
    const matchesById = new Map(database.matches.map(match => [match.id, match]));

    for (const date of dateRange(startDate, endDate)) {
        const response = await fetch(`${endpoint}?dates=${date}`);
        if (!response.ok) throw new Error(`ESPN returned HTTP ${response.status} for ${date}`);
        const payload = await response.json();
        for (const event of payload.events || []) {
            const match = normalizeEvent(event);
            if (match) matchesById.set(match.id, match);
        }
    }

    database.updatedAt = new Date().toISOString();
    database.matches = [...matchesById.values()].sort((a, b) => a.date.localeCompare(b.date));
    await fs.writeFile(databasePath, `${JSON.stringify(database, null, 2)}\n`);
    console.log(`Stored ${database.matches.length} normalized matches through ${endDate}.`);
})();
