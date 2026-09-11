const { fetchScoringDetails, fetchMatchStatistics } = require('./sync-espn');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

    const eventId = String(req.query?.event || '').replace(/^espn:/, '');
    if (!/^\d+$/.test(eventId)) return res.status(400).json({ error: 'A valid ESPN event ID is required.' });

    try {
        const [details, teamStats] = await Promise.all([
            fetchScoringDetails({ id: eventId, competitions: [] }),
            fetchMatchStatistics(eventId)
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

        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
        return res.status(200).json({ substitutions, teamStats });
    } catch (error) {
        console.error('Match detail read failed:', error);
        return res.status(502).json({ error: 'Unable to read ESPN match details.' });
    }
};