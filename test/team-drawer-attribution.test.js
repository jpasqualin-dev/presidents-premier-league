const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

function loadTeamDrawer() {
    const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'team-drawer-shared.js'), 'utf8');
    const window = {
        getIndividualScoringEvents: scorers => (scorers || []).filter(scorer => scorer?.ownGoal !== true)
    };
    const document = {
        createElement: () => ({ style: {}, id: '' }),
        head: { appendChild() {} }
    };
    vm.runInNewContext(source, { window, document });
    return window.TeamDrawerShared;
}

function teamStats(teamNames) {
    const stats = {};
    teamNames.forEach(team => {
        stats[team] = { team, owner: 'Test', PL: 1, W: 1, D: 0, L: 0, GF: 2, GA: 0, GD: 2, PTS: 3, cleanSheets: 1, yellowCards: 0, redCards: 0 };
    });
    return { allStats: stats, homeStats: stats, awayStats: stats };
}

function renderTeam(teamName, match, allTeams) {
    return loadTeamDrawer().render(teamName, {
        stats: teamStats(allTeams),
        matches: [match],
        getLogoByName: () => '',
        getShortTeamName: name => name,
        getOwnerOfTeam: () => 'Test'
    });
}

test('Brighton drawer excludes Chelsea player from the same match', () => {
    const output = renderTeam('Brighton', {
        status: 'FINISHED',
        matchday: 1,
        utcDate: '2026-09-19T12:00:00Z',
        homeTeam: { id: '363', name: 'Chelsea' },
        awayTeam: { id: '331', name: 'Brighton & Hove Albion' },
        score: { fullTime: { home: 1, away: 1 } },
        scorers: [
            { teamProviderId: '363', athleteProviderId: '284960', athleteName: 'João Pedro', ownGoal: false },
            { teamProviderId: '331', athleteProviderId: '284960', athleteName: 'João Pedro', ownGoal: true }
        ]
    }, ['Chelsea', 'Brighton']);

    assert.equal(output.includes('João Pedro'), false);
});

test('Newcastle drawer excludes Leeds player from the same match', () => {
    const output = renderTeam('Newcastle', {
        status: 'FINISHED',
        matchday: 1,
        utcDate: '2026-09-19T12:00:00Z',
        homeTeam: { id: '2', name: 'Leeds United' },
        awayTeam: { id: '361', name: 'Newcastle United' },
        score: { fullTime: { home: 1, away: 1 } },
        scorers: [
            { teamProviderId: '2', athleteProviderId: '306', athleteName: 'Dominic Calvert-Lewin', ownGoal: false },
            { teamProviderId: '361', athleteProviderId: '999', athleteName: 'Newcastle Player', ownGoal: false }
        ]
    }, ['Leeds United', 'Newcastle']);

    assert.equal(output.includes('Dominic Calvert-Lewin'), false);
    assert.equal(output.includes('Newcastle Player'), true);
});
