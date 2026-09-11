(function () {
    const ignoredEventPattern = /kick.?off|match start|half.?time|halftime|start (of )?(the )?(second|2nd) half|second half|delay|delayed|end regular time|end of regular time|full time/i;

    window.getDrawerMatchEvents = function (match) {
        const scorers = (match.scorers || []).map(item => ({ ...item, eventType: 'Goal' }));
        const nonScoringEvents = (match.events || []).filter(event => !event.scoringPlay && !/^goal|score/i.test(String(event.eventType || event.type || '')));
        return [...scorers, ...nonScoringEvents]
            .filter(event => !ignoredEventPattern.test(String(event.eventType || event.type || event.event_type || '')))
            .sort((a, b) => {
                const minute = event => {
                    const value = parseInt(event.minute || event.clockDisplay || '', 10);
                    return Number.isFinite(value) ? value : Infinity;
                };
                return minute(a) - minute(b);
            });
    };
})();
