(() => {
    let teams = [];
    const queuedLogoMaps = new Set();
    const warnedUnknownTeams = new Set();
    const ready = fetch('data/teams.json', { cache: 'no-store' })
        .then(response => {
            if (!response.ok) throw new Error(`Unable to load team registry: HTTP ${response.status}`);
            return response.json();
        })
        .then(registry => {
            teams = registry;
            queuedLogoMaps.forEach(addAliases);
            return teams;
        })
        .catch(error => {
            console.error(error);
            return teams;
        });

    function resolve(name, providerId = '') {
        const normalizedProviderId = String(providerId || '');
        const byProviderId = teams.find(team => team.id === normalizedProviderId);
        if (byProviderId) return byProviderId;
        const value = String(name || '').trim().toLowerCase();
        const byName = teams.find(team => [team.longName, team.shortName, ...(team.aliases || [])].some(alias => alias.toLowerCase() === value));
        if (byName) return byName;
        const unknownKey = normalizedProviderId ? `id:${normalizedProviderId}` : value ? `name:${value}` : '';
        if (unknownKey && !warnedUnknownTeams.has(unknownKey)) {
            warnedUnknownTeams.add(unknownKey);
            console.warn('Unknown team identity:', { name, providerId });
        }
        return null;
    }

    function longName(name, providerId = '') {
        return resolve(name, providerId)?.longName || name;
    }

    function shortName(name, providerId = '') {
        return resolve(name, providerId)?.shortName || name;
    }

    function crest(name, providerId = '') {
        return resolve(name, providerId)?.crest || '';
    }

    function logoMap() {
        return new Proxy({}, {
            get: (_, property) => typeof property === 'string' ? crest(property) : undefined,
            ownKeys: () => teams.map(team => team.longName),
            getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true })
        });
    }

    function normalizeMatch(match) {
        const homeName = longName(match.homeTeam?.name, match.homeTeam?.id || match.homeTeam?.providerId);
        const awayName = longName(match.awayTeam?.name, match.awayTeam?.id || match.awayTeam?.providerId);
        const homeCrest = crest(homeName, match.homeTeam?.id || match.homeTeam?.providerId);
        const awayCrest = crest(awayName, match.awayTeam?.id || match.awayTeam?.providerId);
        return {
            ...match,
            homeTeam: { ...match.homeTeam, name: homeName, crest: homeCrest, logo: homeCrest },
            awayTeam: { ...match.awayTeam, name: awayName, crest: awayCrest, logo: awayCrest }
        };
    }

    function addAliases(logoMap) {
        if (!teams.length) {
            queuedLogoMaps.add(logoMap);
            return logoMap;
        }
        teams.forEach(team => {
            const existing = logoMap[team.longName] || logoMap[team.shortName] || (team.aliases || []).map(alias => logoMap[alias]).find(Boolean);
            if (existing) {
                logoMap[team.longName] = existing;
                logoMap[team.shortName] = existing;
            }
        });
        return logoMap;
    }

    window.TeamNames = { get teams() { return teams; }, ready, resolve, longName, shortName, crest, logoMap, normalizeMatch, addAliases };
})();
