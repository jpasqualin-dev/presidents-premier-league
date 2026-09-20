const teams = require('../public/data/teams.json');

const byId = new Map(teams.map(team => [team.id, team]));
const byName = new Map();
teams.forEach(team => {
    [team.longName, team.shortName, ...(team.aliases || [])].forEach(name => byName.set(name.toLowerCase(), team));
});

function resolveTeam(name, providerId = '') {
    return byId.get(String(providerId)) || byName.get(String(name || '').trim().toLowerCase()) || null;
}

function longTeamName(name, providerId = '') {
    return resolveTeam(name, providerId)?.longName || name;
}

function shortTeamName(name, providerId = '') {
    return resolveTeam(name, providerId)?.shortName || name;
}

function crestForTeam(name, providerId = '') {
    return resolveTeam(name, providerId)?.crest || null;
}

module.exports = { teams, resolveTeam, longTeamName, shortTeamName, crestForTeam };
