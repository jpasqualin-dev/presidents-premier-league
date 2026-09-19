(function () {
    const ignoredEventPattern = /kick.?off|match start|half.?time|halftime|start (of )?(the )?(second|2nd) half|second half|delay|delayed|end regular time|end of regular time|full time/i;

    const eventText = value => String(value || '').trim().toLowerCase();

    window.dedupeDrawerEvents = function (events) {
        const unique = new Map();
        (events || []).forEach(event => {
            const substitution = Boolean(event.substitution || event.eventType?.toLowerCase().includes('substitution'));
            const minute = eventText(event.minute || event.clockDisplay);
            const team = eventText(event.teamProviderId);
            const comingOn = eventText(event.comingOn || event.playerOn || event.substitute || event.athleteName);
            const goingOff = eventText(event.goingOff || event.playerOff || event.replacedPlayer);
            const key = substitution
                ? ['substitution', team, minute, comingOn, goingOff].join('|')
                : [eventText(event.eventType || event.type), team, minute, eventText(event.athleteProviderId || event.athleteName), Boolean(event.scoringPlay), Boolean(event.redCard), Boolean(event.yellowCard)].join('|');
            unique.set(key, { ...(unique.get(key) || {}), ...event });
        });
        return [...unique.values()];
    };

    window.getDrawerMatchEvents = function (match) {
        const scorers = (match.scorers || []).map(item => ({ ...item, eventType: 'Goal' }));
        const nonScoringEvents = window.dedupeDrawerEvents(match.events || []).filter(event => !event.scoringPlay && !/^goal|score/i.test(String(event.eventType || event.type || '')));
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
