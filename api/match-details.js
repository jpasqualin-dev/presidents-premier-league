const { fetchMatchSummary, fetchScoringDetails, fetchMatchStatistics, fetchMatchLineups } = require('./sync-espn');

function toClientEvent(detail) {
    const athlete = detail.athletesInvolved?.[0];
    const substitute = detail.athletesInvolved?.[1];
    return {
        teamProviderId: detail.team?.id ? String(detail.team.id) : null,
        athleteProviderId: athlete?.id ? String(athlete.id) : null,
        athleteName: athlete?.displayName || null,
        comingOn: detail.substitution ? athlete?.displayName || null : null,
        goingOff: detail.substitution ? substitute?.displayName || null : null,
        eventType: detail.type?.text || detail.type?.type || null,
        minute: detail.clock?.displayValue || null,
        scoringPlay: Boolean(detail.scoringPlay),
        substitution: Boolean(detail.substitution),
        redCard: Boolean(detail.redCard),
        yellowCard: Boolean(detail.yellowCard),
        penalty: Boolean(detail.penaltyKick),
        ownGoal: Boolean(detail.ownGoal)
    };
}

function toClientScorer(detail) {
    const scorer = detail.athletesInvolved?.[0];
    const assist = detail.athletesInvolved?.[1];
    return {
        teamProviderId: detail.team?.id ? String(detail.team.id) : null,
        athleteProviderId: scorer?.id ? String(scorer.id) : null,
        athleteName: scorer?.displayName || 'Unknown scorer',
        assistProviderId: assist?.id ? String(assist.id) : null,
        assistName: assist?.displayName || null,
        minute: detail.clock?.displayValue || null,
        ownGoal: Boolean(detail.ownGoal),
        penalty: Boolean(detail.penaltyKick)
    };
}

function getHalfTimeScores(summary) {
    const competitors = summary?.header?.competitions?.[0]?.competitors || [];
    const scores = {};
    competitors.forEach(competitor => {
        const value = competitor.linescores?.[0]?.value ?? competitor.linescores?.[0]?.displayValue;
        if (value == null) return;
        scores[competitor.homeAway] = Number(value);
    });
    return scores.home == null || scores.away == null
        ? null
        : { home: scores.home, away: scores.away };
}

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

    const eventId = String(req.query?.event || '').replace(/^espn:/, '');
    if (!/^\d+$/.test(eventId)) return res.status(400).json({ error: 'A valid ESPN event ID is required.' });

    try {
        const summary = await fetchMatchSummary(eventId);
        if (!summary) {
            res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
            return res.status(200).json({ events: [], scorers: [], substitutions: [], teamStats: [], lineups: null, source: 'unavailable' });
        }
        const [details, teamStats, lineups] = await Promise.all([
            fetchScoringDetails({ id: eventId, competitions: [] }, summary),
            fetchMatchStatistics(eventId, summary),
            fetchMatchLineups(eventId, summary)
        ]);
        const substitutions = details
            .filter(detail => detail.substitution || detail.type?.type?.includes('substitution') || detail.type?.text?.toLowerCase().includes('substitution'))
            .map(detail => ({
                teamProviderId: detail.team?.id ? String(detail.team.id) : null,
                eventType: detail.type?.text || 'Substitution',
                minute: detail.clock?.displayValue || null,
                substitution: true,
                comingOn: detail.athletesInvolved?.[0]?.displayName || null,
                goingOff: detail.athletesInvolved?.[1]?.displayName || null
            }));
        const events = details.map(toClientEvent);
        const scorers = details.filter(detail => detail.scoringPlay).map(toClientScorer);
        const halfTime = getHalfTimeScores(summary);

        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return res.status(200).json({ events, scorers, substitutions, teamStats, lineups, halfTime });
    } catch (error) {
        console.error('Match detail read failed:', error);
        return res.status(502).json({ error: 'Unable to read ESPN match details.' });
    }
};