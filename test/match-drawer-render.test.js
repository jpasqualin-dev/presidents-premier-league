const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'match-drawer-shared.js'), 'utf8');

function createRenderer() {
    const teams = [
        { id: 'home', longName: 'Home United', shortName: 'Home', aliases: [], crest: '/home.png' },
        { id: 'away', longName: 'Away City', shortName: 'Away', aliases: [], crest: '/away.png' },
        { id: 'opponent-home', longName: 'Home Opponent', shortName: 'Home Opponent', aliases: [], crest: '/opponent-home.png' },
        { id: 'opponent-away', longName: 'Away Opponent', shortName: 'Away Opponent', aliases: [], crest: '/opponent-away.png' }
    ];
    const resolve = (name, id) => teams.find(team => team.id === String(id || ''))
        || teams.find(team => [team.longName, team.shortName, ...team.aliases].includes(name));
    const window = {
        TeamNames: {
            teams,
            resolve,
            crest: (name, id) => resolve(name, id)?.crest || '',
            shortName: (name, id) => resolve(name, id)?.shortName || name
        }
    };
    const document = {
        body: { insertAdjacentHTML() {} },
        head: { appendChild() {} },
        createElement: () => ({}),
        getElementById: () => null,
        addEventListener() {}
    };

    vm.runInNewContext(source, { window, document, console, CSS: { escape: value => value } });
    return window.renderSharedMatchDetail;
}

function finishedMatch(id, utcDate, homeTeam, awayTeam, homeScore, awayScore, teamCards = {}) {
    return {
        id,
        status: 'FINISHED',
        utcDate,
        homeTeam,
        awayTeam,
        score: { fullTime: { home: homeScore, away: awayScore } },
        teamCards
    };
}

test('upcoming match renders date, two-team form, table rows, and ranked season stats', () => {
    const render = createRenderer();
    const home = { id: 'home', name: 'Home United', crest: '/home.png' };
    const away = { id: 'away', name: 'Away City', crest: '/away.png' };
    const homeOpponent = { id: 'opponent-home', name: 'Home Opponent', crest: '/opponent-home.png' };
    const awayOpponent = { id: 'opponent-away', name: 'Away Opponent', crest: '/opponent-away.png' };
    const previousMatches = [];

    for (let day = 1; day <= 6; day += 1) {
        previousMatches.push(finishedMatch(
            `home-${day}`,
            `2026-10-${String(day).padStart(2, '0')}T12:00:00Z`,
            home,
            homeOpponent,
            day,
            0,
            { home: { yellow: day % 2, red: 0 }, away: { yellow: 0, red: 0 } }
        ));
        previousMatches.push(finishedMatch(
            `away-${day}`,
            `2026-10-${String(day + 6).padStart(2, '0')}T12:00:00Z`,
            awayOpponent,
            away,
            day,
            0,
            { home: { yellow: 0, red: 0 }, away: { yellow: day % 2, red: day === 6 ? 1 : 0 } }
        ));
    }

    const upcomingMatch = {
        id: 'upcoming',
        status: 'SCHEDULED',
        utcDate: '2026-10-18T12:00:00Z',
        homeTeam: home,
        awayTeam: away,
        score: { fullTime: { home: null, away: null } },
        venue: 'League Ground'
    };
    const html = render(upcomingMatch, [upcomingMatch, ...previousMatches]);

    assert.match(html, /match-upcoming-weekday/);
    assert.match(html, /match-upcoming-month-day/);
    assert.match(html, /match-upcoming-kickoff/);
    assert.ok(html.indexOf('match-upcoming-month-day') < html.indexOf('match-upcoming-weekday'));
    assert.match(html, /League Ground/);
    assert.doesNotMatch(html, /match-meta|match-status|match-scorers|No goals|Match Events|Lineups/);
    assert.equal((html.match(/class="match-detail-section upcoming-card/g) || []).length, 3);
    assert.match(html, /<th>PL<\/th><th>W<\/th><th>D<\/th><th>L<\/th><th>\+\/-<\/th><th>GD<\/th><th>PTS<\/th>/);

    const tableBody = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] || '';
    assert.equal((tableBody.match(/<tr>/g) || []).length, 2);

    const formHtml = html.match(/<section class="match-detail-section upcoming-card upcoming-form-card">([\s\S]*?)<\/section>/)?.[1] || '';
    assert.equal((formHtml.match(/class="match-form-result /g) || []).length, 10);
    assert.ok(formHtml.indexOf('6 - 0') < formHtml.indexOf('2 - 0'));
    assert.ok(formHtml.indexOf('6 - 0') < formHtml.lastIndexOf('2 - 0'));
    assert.match(formHtml, /match-form-score-win/);
    assert.match(formHtml, /match-form-score-loss/);
    assert.match(formHtml, /class="match-form-crest"><img src="\/opponent-home.png"/);
    assert.match(formHtml, /class="match-form-crest"><img src="\/home.png"/);
    assert.match(formHtml, /class="match-form-crest"><img src="\/opponent-away.png"/);
    assert.match(formHtml, /class="match-form-crest"><img src="\/away.png"/);

    assert.equal((html.match(/class="stat-row upcoming-stat-row"/g) || []).length, 6);
    assert.match(html, /Pts per match/);
    assert.match(html, /Goals per match/);
    assert.match(html, /Goals conceded per match/);
    assert.match(html, /Goal Differential/);
    assert.match(html, /Yellow Cards/);
    assert.match(html, /Red Cards/);
    assert.match(html, /#\d+/);
    assert.doesNotMatch(html, /stat-bars-diverging|stat-gd-bar/);
    assert.match(html, /\+21 \(#\d+\)/);
    assert.match(html, /-21 \(#\d+\)/);
    assert.match(html, /class="stat-bars" aria-hidden="true"><span class="stat-bar-home" style="width:95%"><\/span><span class="stat-bar-away" style="width:5%"/);
});

test('equal league goal differentials produce an even head-to-head split', () => {
    const render = createRenderer();
    const match = {
        id: 'upcoming',
        status: 'SCHEDULED',
        utcDate: '2026-10-18T12:00:00Z',
        homeTeam: { id: 'home', name: 'Home United' },
        awayTeam: { id: 'away', name: 'Away City' },
        score: { fullTime: { home: null, away: null } }
    };
    const html = render(match, [match]);
    const goalDifferenceRow = [...html.matchAll(/<div class="stat-row upcoming-stat-row">([\s\S]*?)<\/div>/g)]
        .find(([, row]) => row.includes('Goal Differential'))?.[0] || '';

    assert.equal((goalDifferenceRow.match(/width:50%/g) || []).length, 2);
});

test('live and completed matches retain their existing detail cards', () => {
    const render = createRenderer();
    const match = finishedMatch(
        'finished',
        '2026-10-01T12:00:00Z',
        { id: 'home', name: 'Home United' },
        { id: 'away', name: 'Away City' },
        2,
        1
    );
    const html = render(match, [match]);

    assert.match(html, /Full time/);
    assert.match(html, /Match Stats/);
    assert.match(html, /Match Events/);
    assert.match(html, /Lineups/);
    assert.match(html, /match-scorers/);
    assert.doesNotMatch(html, /upcoming-card/);
});
