const seasonRounds = require('../data/season-rounds-2026.json');

function isoWeekKey(value) {
    const date = new Date(value);
    const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((thursday - yearStart) / 86400000) + 1) / 7);
    return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getMatchday(event) {
    const eventDate = event.date.slice(0, 10);
    const round = seasonRounds.rounds.find(([, start, end]) => eventDate >= start && eventDate <= end);
    return round ? String(round[0]) : event.week?.number || event.competitions?.[0]?.week?.number || isoWeekKey(event.date);
}

function normalizeMatchStatus(status) {
    const state = status.state;
    const detail = String(status.detail || status.shortDetail || '').toLowerCase();
    if (state === 'post' || status.completed) return 'FINISHED';
    if (state === 'in' && (status.name === 'STATUS_HALFTIME' || detail.includes('halftime'))) return 'PAUSED';
    return state === 'in' ? 'IN_PLAY' : 'SCHEDULED';
}

function isDelayEvent(event) {
    return /delay|delayed/i.test(String(event?.eventType || event?.type?.text || event?.type?.type || event?.event_type || ''));
}

function normalizeEspnEvent(event) {
    const competition = event.competitions?.[0];
    const home = competition?.competitors?.find(item => item.homeAway === 'home');
    const away = competition?.competitors?.find(item => item.homeAway === 'away');
    if (!competition || !home?.team?.id || !away?.team?.id) return null;

    const status = competition.status?.type || {};
    const state = normalizeMatchStatus({ ...status, name: status.name, detail: competition.status?.detail });
    const displayClock = competition.status?.displayClock || null;
    const halfTimeScore = competitor => competitor?.linescores?.[0]?.value ?? competitor?.linescores?.[0]?.displayValue;

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
            },
            halfTime: {
                home: halfTimeScore(home) == null ? null : Number(halfTimeScore(home)),
                away: halfTimeScore(away) == null ? null : Number(halfTimeScore(away))
            }
        },
        scorers: (competition.details || []).filter(detail => detail.scoringPlay).map(detail => ({
            teamProviderId: detail.team?.id ? String(detail.team.id) : null,
            athleteProviderId: detail.athletesInvolved?.[0]?.id ? String(detail.athletesInvolved[0].id) : null,
            athleteName: detail.athletesInvolved?.[0]?.displayName || 'Unknown scorer',
            assistProviderId: detail.athletesInvolved?.[1]?.id ? String(detail.athletesInvolved[1].id) : null,
            assistName: detail.athletesInvolved?.[1]?.displayName || null,
            minute: detail.clock?.displayValue || null,
            ownGoal: Boolean(detail.ownGoal),
            penalty: Boolean(detail.penaltyKick)
        })),
        events: (competition.details || []).filter(detail => !isDelayEvent(detail) && (detail.redCard || detail.yellowCard || detail.substitution || detail.type?.type?.includes('substitution'))).map(detail => ({
            teamProviderId: detail.team?.id ? String(detail.team.id) : null,
            athleteProviderId: detail.athletesInvolved?.[0]?.id ? String(detail.athletesInvolved[0].id) : null,
            athleteName: detail.athletesInvolved?.[0]?.displayName || null,
            comingOn: detail.athletesInvolved?.[0]?.displayName || null,
            goingOff: detail.athletesInvolved?.[1]?.displayName || null,
            eventType: detail.type?.text || null,
            minute: detail.clock?.displayValue || null,
            substitution: Boolean(detail.substitution || detail.type?.type?.includes('substitution')),
            redCard: Boolean(detail.redCard),
            yellowCard: Boolean(detail.yellowCard),
            penalty: Boolean(detail.penaltyKick)
        })),
        teamStats: [home, away].flatMap(competitor => (competitor.statistics || []).map(stat => ({
            teamProviderId: String(competitor.team.id),
            name: stat.name,
            displayValue: stat.displayValue || null,
            value: Number.isNaN(Number.parseFloat(stat.displayValue)) ? null : Number.parseFloat(stat.displayValue)
        }))),
        venue: competition.venue?.fullName || null,
        source: 'espn-live'
    };
}

function normalizeNeonMatch(row) {
    const state = normalizeMatchStatus({
        state: row.status,
        completed: row.status_completed,
        detail: row.status_detail
    });
    return {
        id: `${row.provider}:${row.provider_event_id}`,
        provider: row.provider,
        providerEventId: row.provider_event_id,
        utcDate: row.kickoff_at,
        status: state,
        minute: row.status_clock ? Number.parseInt(row.status_clock, 10) || null : null,
        matchday: row.matchday || isoWeekKey(row.kickoff_at),
        homeTeam: { id: row.home_provider_id, name: row.home_name, crest: row.home_logo },
        awayTeam: { id: row.away_provider_id, name: row.away_name, crest: row.away_logo },
        score: {
            fullTime: { home: row.home_score, away: row.away_score },
            halfTime: { home: row.home_half_time_score, away: row.away_half_time_score }
        },
        scorers: row.scorers || [],
        events: (row.events || []).filter(event => !isDelayEvent(event) && !event.scoringPlay && !/^goal|score/i.test(String(event.eventType || event.type || ''))),
        teamStats: row.team_stats || [],
        lineups: row.lineups || null,
        venue: row.venue,
        source: 'neon'
    };
}

module.exports = { getMatchday, isoWeekKey, normalizeEspnEvent, normalizeNeonMatch };
