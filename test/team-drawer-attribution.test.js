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

test('team form keeps the full schedule and highlights the latest played match', () => {
    const matches = [1, 2, 3, 4, 5].map((matchday, index) => ({
        id: String(matchday),
        status: matchday < 4 ? 'FINISHED' : 'SCHEDULED',
        matchday,
        utcDate: `2026-09-${15 + index}T12:00:00Z`,
        homeTeam: { id: '1', name: 'Brighton' },
        awayTeam: { id: String(matchday + 1), name: `Opponent ${matchday}` },
        score: { fullTime: { home: matchday, away: 0 } }
    }));
    const output = loadTeamDrawer().render('Brighton', {
        stats: teamStats(['Brighton']),
        matches,
        getLogoByName: () => '',
        getShortTeamName: name => name,
        getOwnerOfTeam: () => 'Test'
    });

    assert.equal((output.match(/class="weekly-form-match/g) || []).length, 5);
    assert.equal((output.match(/latest-played/g) || []).length, 1);
    assert.match(output, /Most recently played match/);
    assert.ok(output.indexOf('Opponent 4') < output.indexOf('Opponent 5'));
});
