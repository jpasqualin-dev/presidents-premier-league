(() => {
    const teams = [
        ['359', 'Arsenal', 'Arsenal'],
        ['362', 'Aston Villa', 'Aston Villa'],
        ['349', 'AFC Bournemouth', 'Bournemouth'],
        ['337', 'Brentford', 'Brentford'],
        ['331', 'Brighton & Hove Albion', 'Brighton'],
        ['363', 'Chelsea', 'Chelsea'],
        ['384', 'Crystal Palace', 'Crystal Palace'],
        ['388', 'Coventry City', 'Coventry'],
        ['368', 'Everton', 'Everton'],
        ['370', 'Fulham', 'Fulham'],
        ['306', 'Hull City', 'Hull'],
        ['373', 'Ipswich Town', 'Ipswich'],
        ['357', 'Leeds United', 'Leeds'],
        ['364', 'Liverpool', 'Liverpool'],
        ['382', 'Manchester City', 'Man City'],
        ['360', 'Manchester United', 'Man United'],
        ['361', 'Newcastle United', 'Newcastle'],
        ['393', 'Nottingham Forest', 'Nottm Forest'],
        ['366', 'Sunderland', 'Sunderland'],
        ['367', 'Tottenham Hotspur', 'Spurs']
    ];
    const aliases = {
        'arsenal': 'Arsenal',
        'aston villa': 'Aston Villa',
        'afc bournemouth': 'AFC Bournemouth',
        'bournemouth': 'AFC Bournemouth',
        'brentford': 'Brentford',
        'brighton': 'Brighton & Hove Albion',
        'brighton & hove albion': 'Brighton & Hove Albion',
        'chelsea': 'Chelsea',
        'crystal palace': 'Crystal Palace',
        'coventry': 'Coventry City',
        'coventry city': 'Coventry City',
        'everton': 'Everton',
        'fulham': 'Fulham',
        'hull': 'Hull City',
        'hull city': 'Hull City',
        'ipswich': 'Ipswich Town',
        'ipswich town': 'Ipswich Town',
        'leeds': 'Leeds United',
        'leeds united': 'Leeds United',
        'liverpool': 'Liverpool',
        'man city': 'Manchester City',
        'manchester city': 'Manchester City',
        'man united': 'Manchester United',
        'manchester united': 'Manchester United',
        'newcastle': 'Newcastle United',
        'newcastle united': 'Newcastle United',
        'nottm forest': 'Nottingham Forest',
        'nottingham forest': 'Nottingham Forest',
        'sunderland': 'Sunderland',
        'spurs': 'Tottenham Hotspur',
        'tottenham': 'Tottenham Hotspur',
        'tottenham hotspur': 'Tottenham Hotspur'
    };
    const byId = Object.fromEntries(teams.map(([id, longName, shortName]) => [id, { id, longName, shortName }]));
    const byLongName = Object.fromEntries(teams.map(([, longName, shortName]) => [longName.toLowerCase(), { longName, shortName }]));

    function resolve(name, providerId = '') {
        const byProviderId = byId[String(providerId)];
        if (byProviderId) return byProviderId;
        const value = String(name || '').trim().toLowerCase();
        if (aliases[value]) return byLongName[aliases[value].toLowerCase()];
        return byLongName[value] || null;
    }

    function longName(name, providerId = '') {
        return resolve(name, providerId)?.longName || name;
    }

    function shortName(name, providerId = '') {
        return resolve(name, providerId)?.shortName || name;
    }

    function normalizeMatch(match) {
        return {
            ...match,
            homeTeam: { ...match.homeTeam, name: longName(match.homeTeam?.name, match.homeTeam?.id || match.homeTeam?.providerId) },
            awayTeam: { ...match.awayTeam, name: longName(match.awayTeam?.name, match.awayTeam?.id || match.awayTeam?.providerId) }
        };
    }

    function addAliases(logoMap) {
        Object.keys(logoMap || {}).forEach(name => {
            const team = resolve(name);
            if (!team) return;
            logoMap[team.longName] = logoMap[name];
            logoMap[team.shortName] = logoMap[name];
        });
        return logoMap;
    }

    window.TeamNames = { teams, resolve, longName, shortName, normalizeMatch, addAliases };
})();
