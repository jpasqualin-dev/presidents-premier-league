const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const publicDir = path.join(__dirname, '..', 'public');
const indexSource = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

const extractFunction = name => {
    const start = indexSource.indexOf(`    function ${name}(`);
    assert.notEqual(start, -1, `${name} should exist in index.html`);
    const end = indexSource.indexOf('\n    }\n', start) + '\n    }\n'.length;
    return indexSource.slice(start, end);
};

const loadWeeklyCardSummary = (allMatchesData, draftData) => {
    const leagueWindow = {};
    vm.runInNewContext(fs.readFileSync(path.join(publicDir, 'league-config.js'), 'utf8'), { window: leagueWindow });
    const { getOwnerOfTeam } = leagueWindow.PplLeagueConfig;
    const context = { allMatchesData, draftData, getOwnerOfTeam, cachedPlayerStats: {}, Map, Infinity };
    vm.runInNewContext(`${extractFunction('isCompletedMatch')}\n${extractFunction('getPplStandingsRankMap')}\n${extractFunction('getWeeklyCardSummary')}\nthis.getWeeklyCardSummary = getWeeklyCardSummary;`, context);
    return context.getWeeklyCardSummary();
};

const match = (id, matchday, homeName, awayName, home, away) => ({
    id,
    matchday,
    status: 'FINISHED',
    utcDate: '2026-09-19T12:00:00Z',
    homeTeam: { name: homeName },
    awayTeam: { name: awayName },
    score: { fullTime: { home, away } }
});

const draftData = {
    Hef: ['Arsenal', 'AFC Bournemouth', 'Nottingham Forest', 'Hull City'],
    Jordan: ['Manchester City', 'Brighton & Hove Albion', 'Brentford', 'Ipswich Town'],
    Wes: ['Liverpool', 'Newcastle United', 'Sunderland', 'Coventry City'],
    Nate: ['Manchester United', 'Aston Villa', 'Everton', 'Fulham'],
    Jamey: ['Chelsea', 'Tottenham Hotspur', 'Crystal Palace', 'Leeds United']
};

test('weekly card goal difference matches each owner’s per-team totals, including owner-vs-owner matches', () => {
    const matches = [
        match(1, 1, 'Manchester City', 'Brentford', 1, 0),
        match(2, 1, 'Brighton & Hove Albion', 'Fulham', 3, 0),
        match(3, 1, 'Ipswich Town', 'Coventry City', 2, 1),
        match(4, 1, 'Arsenal', 'Hull City', 0, 1),
        match(5, 1, 'AFC Bournemouth', 'Everton', 1, 0),
        match(6, 1, 'Nottingham Forest', 'Sunderland', 0, 0),
        match(7, 1, 'Chelsea', 'Leeds United', 2, 2)
    ];

    const [week] = loadWeeklyCardSummary(matches, draftData);
    const gdByOwner = Object.fromEntries(week.ownerDetails.map(owner => [owner.owner, owner.goalDifference]));

    assert.equal(gdByOwner.Jordan, 4);
    assert.equal(gdByOwner.Hef, 1);
    assert.equal(gdByOwner.Jamey, 0);
    assert.equal(gdByOwner.Nate, -4);
    assert.equal(gdByOwner.Wes, -1);
});

test('weekly card goal difference nets to zero across the league', () => {
    const matches = [
        match(1, 2, 'Manchester City', 'Brentford', 2, 2),
        match(2, 2, 'Arsenal', 'Hull City', 3, 0),
        match(3, 2, 'Liverpool', 'Newcastle United', 1, 4),
        match(4, 2, 'Manchester United', 'Aston Villa', 0, 1)
    ];

    const [week] = loadWeeklyCardSummary(matches, draftData);
    const total = week.ownerDetails.reduce((sum, owner) => sum + owner.goalDifference, 0);

    assert.equal(total, 0);
});
