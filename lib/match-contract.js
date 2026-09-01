function isoWeekKey(value) {
    const date = new Date(value);
    const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((thursday - yearStart) / 86400000) + 1) / 7);
    return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getMatchday(event) {
    return event.week?.number || event.competitions?.[0]?.week?.number || isoWeekKey(event.date);
}

function normalizeEspnEvent(event) {
    const competition = event.competitions?.[0];
    const home = competition?.competitors?.find(item => item.homeAway === 'home');
    const away = competition?.competitors?.find(item => item.homeAway === 'away');
    if (!competition || !home?.team?.id || !away?.team?.id) return null;

    const status = competition.status?.type || {};
    const state = status.state === 'post' ? 'FINISHED' : status.state === 'in' ? 'IN_PLAY' : 'SCHEDULED';
    const displayClock = competition.status?.displayClock || null;

    return {
        id: `espn:${event.id}`,
        provider: 'espn',
        providerEventId: String(event.id),
        utcDate: event.date,
        status: state,
        minute: displayClock ? Number.parseInt(displayClock, 10) || null : null,
        matchday: getMatchday(event),
        homeTeam: { id: String(home.team.id), name: home.team.displayName, crest: home.team.logo || null },
        awayTeam: { id: String(away.team.id), name: away.team.displayName, crest: away.team.logo || null },
        score: {
            fullTime: {
                home: home.score == null ? null : Number(home.score),
                away: away.score == null ? null : Number(away.score)
            }
        },
        venue: competition.venue?.fullName || null,
        source: 'espn-live'
    };
}

function normalizeNeonMatch(row) {
    return {
        id: `${row.provider}:${row.provider_event_id}`,
        provider: row.provider,
        providerEventId: row.provider_event_id,
        utcDate: row.kickoff_at,
        status: row.status_completed ? 'FINISHED' : row.status === 'in' ? 'IN_PLAY' : 'SCHEDULED',
        minute: row.status_clock ? Number.parseInt(row.status_clock, 10) || null : null,
        matchday: row.matchday || isoWeekKey(row.kickoff_at),
        homeTeam: { id: row.home_provider_id, name: row.home_name, crest: row.home_logo },
        awayTeam: { id: row.away_provider_id, name: row.away_name, crest: row.away_logo },
        score: { fullTime: { home: row.home_score, away: row.away_score } },
        venue: row.venue,
        source: 'neon'
    };
}

module.exports = { getMatchday, isoWeekKey, normalizeEspnEvent, normalizeNeonMatch };
