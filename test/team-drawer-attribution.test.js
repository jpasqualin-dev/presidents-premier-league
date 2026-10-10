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

test('team stats capitalize the heading and rank fewer goals conceded higher', () => {
    const drawer = loadTeamDrawer();
    const teams = ['Team A', 'Team B', 'Team C'];
    const matches = [
        { status: 'FINISHED', homeTeam: { name: 'Team A' }, awayTeam: { name: 'Team B' }, score: { fullTime: { home: 2, away: 5 } } },
        { status: 'FINISHED', homeTeam: { name: 'Team B' }, awayTeam: { name: 'Team C' }, score: { fullTime: { home: 3, away: 2 } } },
        { status: 'FINISHED', homeTeam: { name: 'Team C' }, awayTeam: { name: 'Team A' }, score: { fullTime: { home: 1, away: 10 } } }
    ];
    const stats = drawer.buildStats(matches, teams, () => 'Test');
    const output = drawer.render('Team B', {
        stats,
        matches,
        getLogoByName: () => '',
        getShortTeamName: name => name,
        getOwnerOfTeam: () => 'Test'
    });
    const teamAOutput = drawer.render('Team A', {
        stats,
        matches,
        getLogoByName: () => '',
        getShortTeamName: name => name,
        getOwnerOfTeam: () => 'Test'
    });

    assert.match(output, /<h2 class="team-drawer-card-title">Team Stats<\/h2>/);
    assert.match(output, /Goals<\/span><strong>8<\/strong>/);
    assert.match(output, /Goals Conceded<\/span><strong>4<\/strong>[\s\S]*?aria-label="Goals Conceded rank 1 of 20"/);
    assert.match(teamAOutput, /Goals Conceded<\/span><strong>6<\/strong>[\s\S]*?aria-label="Goals Conceded rank 2 of 20"/);
});

test('team drawer table follows Team Form and shows up to two places around the selected team', () => {
    const drawer = loadTeamDrawer();
    const teams = Array.from({ length: 6 }, (_, index) => {
        const team = `Team ${index + 1}`;
        return [team, {
            team, owner: `Owner ${index + 1}`, PL: 10, W: 8 - index, D: 2, L: index,
            GF: 20 - index, GA: 5 + index, GD: 15 - index, PTS: 26 - index * 3,
            cleanSheets: 2, yellowCards: 0, redCards: 0
        }];
    });
    const allStats = Object.fromEntries(teams);
    const output = drawer.render('Team 3', {
        stats: { allStats, homeStats: allStats, awayStats: allStats },
        matches: [],
        getLogoByName: () => '',
        getShortTeamName: name => name,
        getOwnerOfTeam: () => 'Test'
    });

    assert.ok(output.indexOf('Team Form') < output.indexOf('Table'));
    assert.ok(output.indexOf('Table') < output.indexOf('Team Stats'));
    const tableRows = output.match(/<h2 class="team-drawer-card-title">Table<\/h2>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)[1];
    assert.deepEqual([...tableRows.matchAll(/class="fotmob-rank">(\d+)<\/td>/g)].map(match => Number(match[1])), [1, 2, 3, 4, 5]);
    assert.match(tableRows, /class="team-drawer-table-selected" aria-current="true"[^>]*><td class="fotmob-rank">3<\/td>/);
    assert.equal((tableRows.match(/role="button" tabindex="0"/g) || []).length, 5);
    assert.match(tableRows, /aria-label="View Team 2 details" onclick="event\.stopPropagation\(\); openTeamDrawerFromMatch\(&quot;Team 2&quot;\)"/);
    assert.match(tableRows, /onkeydown="if \(event\.key === 'Enter' \|\| event\.key === ' '\)/);
    assert.match(tableRows, /Team 1/);
    assert.match(tableRows, /Team 5/);
    assert.doesNotMatch(tableRows, /Team 6/);
});

test('team drawer table clips rows at both ends of the standings', () => {
    const drawer = loadTeamDrawer();
    const names = ['Team A', 'Team B', 'Team C', 'Team D'];
    const allStats = Object.fromEntries(names.map((team, index) => [team, {
        team, owner: 'Test', PL: 1, W: 1, D: 0, L: 0, GF: 2, GA: 0,
        GD: 2, PTS: 12 - index, cleanSheets: 1, yellowCards: 0, redCards: 0
    }]));
    const render = teamName => drawer.render(teamName, {
        stats: { allStats, homeStats: allStats, awayStats: allStats },
        matches: [],
        getLogoByName: () => '',
        getShortTeamName: name => name,
        getOwnerOfTeam: () => 'Test'
    });
    const topRows = render('Team A').match(/<h2 class="team-drawer-card-title">Table<\/h2>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)[1];
    const bottomRows = render('Team D').match(/<h2 class="team-drawer-card-title">Table<\/h2>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)[1];

    assert.deepEqual([...topRows.matchAll(/class="fotmob-rank">(\d+)<\/td>/g)].map(match => Number(match[1])), [1, 2, 3]);
    assert.match(topRows, /Team C/);
    assert.doesNotMatch(topRows, /Team D/);
    assert.deepEqual([...bottomRows.matchAll(/class="fotmob-rank">(\d+)<\/td>/g)].map(match => Number(match[1])), [2, 3, 4]);
    assert.match(bottomRows, /Team B/);
    assert.doesNotMatch(bottomRows, /Team A/);
});

test('Goals Conceded bar is fullest for first place and smallest for twentieth', () => {
    const drawer = loadTeamDrawer();
    const allStats = Object.fromEntries(Array.from({ length: 20 }, (_, index) => {
        const team = `Team ${index + 1}`;
        return [team, {
            team, owner: 'Test', PL: 1, W: 0, D: 0, L: 1,
            GF: 0, GA: index, GD: -index, PTS: 0, cleanSheets: 0,
            yellowCards: 0, redCards: 0
        }];
    }));
    const stats = { allStats, homeStats: allStats, awayStats: allStats };
    const render = teamName => drawer.render(teamName, {
        stats,
        matches: [],
        getLogoByName: () => '',
        getShortTeamName: name => name,
        getOwnerOfTeam: () => 'Test'
    });

    assert.match(render('Team 1'), /Goals Conceded<\/span><strong>0<\/strong><div class="team-drawer-bar" aria-label="Goals Conceded rank 1 of 20"><div class="team-drawer-bar-fill" style="width:100%"/);
    assert.match(render('Team 20'), /Goals Conceded<\/span><strong>19<\/strong><div class="team-drawer-bar" aria-label="Goals Conceded rank 20 of 20"><div class="team-drawer-bar-fill" style="width:5%"/);
});
