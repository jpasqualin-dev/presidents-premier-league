const test = require('node:test');
const assert = require('node:assert/strict');
const teams = require('../public/data/teams.json');
const matchData = require('../data/matches.json');
const { resolveTeam, longTeamName, shortTeamName, crestForTeam } = require('../lib/team-names');

test('team registry has 20 unique complete entries', () => {
    assert.equal(teams.length, 20);
    assert.equal(new Set(teams.map(team => team.id)).size, teams.length);
    assert.equal(new Set(teams.map(team => team.longName)).size, teams.length);
    assert.equal(new Set(teams.map(team => team.shortName)).size, teams.length);
    teams.forEach(team => {
        assert.ok(team.id);
        assert.ok(team.longName);
        assert.ok(team.shortName);
        assert.ok(team.crest);
    });
});

test('team registry resolves approved aliases and crests', () => {
    assert.equal(longTeamName('Brighton'), 'Brighton & Hove Albion');
    assert.equal(longTeamName('Newcastle'), 'Newcastle United');
    assert.equal(longTeamName('Bournemouth'), 'AFC Bournemouth');
    assert.equal(longTeamName('Tottenham'), 'Tottenham Hotspur');
    assert.equal(shortTeamName('Nottingham Forest'), 'Nottm Forest');
    assert.equal(resolveTeam('Brighton', '331').id, '331');
    assert.match(crestForTeam('Newcastle United', '361'), /361\.png$/);
});

test('every provider team ID in the match fixture is registered', () => {
    const providerIds = new Set();
    matchData.matches.forEach(match => {
        providerIds.add(match.homeTeam.providerId);
        providerIds.add(match.awayTeam.providerId);
    });
    providerIds.forEach(providerId => assert.ok(resolveTeam('', providerId), `Missing team registry entry for ${providerId}`));
});
