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
    'afc bournemouth': 'AFC Bournemouth', bournemouth: 'AFC Bournemouth',
    brighton: 'Brighton & Hove Albion', 'brighton & hove albion': 'Brighton & Hove Albion',
    coventry: 'Coventry City', hull: 'Hull City', ipswich: 'Ipswich Town',
    leeds: 'Leeds United', 'man city': 'Manchester City', 'man united': 'Manchester United',
    newcastle: 'Newcastle United', 'nottm forest': 'Nottingham Forest', spurs: 'Tottenham Hotspur',
    tottenham: 'Tottenham Hotspur'
};
const byId = new Map(teams.map(([id, longName, shortName]) => [id, { id, longName, shortName }]));
const byName = new Map(teams.map(([, longName, shortName]) => [longName.toLowerCase(), { longName, shortName }]));

function resolveTeam(name, providerId = '') {
    return byId.get(String(providerId)) || byName.get(String(aliases[String(name || '').trim().toLowerCase()] || String(name || '').trim()).toLowerCase()) || null;
}

function longTeamName(name, providerId = '') {
    return resolveTeam(name, providerId)?.longName || name;
}

module.exports = { teams, resolveTeam, longTeamName };
