const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const publicDir = path.join(__dirname, '..', 'public');
const readPublic = file => fs.readFileSync(path.join(publicDir, file), 'utf8');
const readRepo = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const playerPages = ['hef.html', 'jamey.html', 'jordan.html', 'nate.html', 'wes.html'];
const sharedConfigPages = ['index.html', 'fixtures.html', 'stats.html', 'table.html', ...playerPages];

 test('all primary pages consume the shared league configuration', () => {
    sharedConfigPages.forEach(file => assert.match(readPublic(file), /<script src="league-config\.js"><\/script>/, file));
});

test('league configuration is not duplicated in primary page shells', () => {
    sharedConfigPages.forEach(file => {
        const source = readPublic(file);
        assert.doesNotMatch(source, /const\s+draftData\s*=\s*\{/u, file);
        assert.doesNotMatch(source, /const\s+draftPicks\s*=\s*\{/u, file);
        assert.doesNotMatch(source, /const\s+divisionData\s*=\s*\{/u, file);
    });
});

test('drawer form labels keep a bounded single-line contract', () => {
    ['ppl-weekly-drawer.js', 'team-drawer-shared.js', 'drawers.css'].forEach(file => {
        const source = readPublic(file);
        assert.match(source, /weekly-form-team[^}]*white-space:\s*nowrap/u, file);
        assert.match(source, /weekly-form-team[^}]*text-overflow:\s*ellipsis/u, file);
    });
});

test('drawer presentation styles are centralized', () => {
    const source = readPublic('drawers.css');
    assert.match(source, /\.match-drawer-overlay\s*\{/u);
    assert.match(source, /\.match-drawer\s*\{[^}]*height:\s*100%/u);
    assert.match(source, /\.weekly-form\s*\{/u);
    assert.doesNotMatch(readPublic('index.html'), /\.match-drawer-overlay\s*\{/u);
});

test('match drawer rendering stays in the shared renderer', () => {
    ['index.html', 'fixtures.html'].forEach(file => {
        const source = readPublic(file);
        assert.doesNotMatch(source, /function\s+render(?:MatchDetail|Lineups|MatchStats|MatchEvents|MatchScorers)\s*\(/u, file);
        assert.doesNotMatch(source, /async\s+function\s+fetchMatchById\s*\(/u, file);
    });
    assert.match(readPublic('match-drawer-shared.js'), /renderSharedMatchDetail/u);
});

test('primary pages load shared drawer dependencies in the expected order', () => {
    sharedConfigPages.forEach(file => {
        const source = readPublic(file);
        const configIndex = source.indexOf('src="league-config.js"');
        const matchDataIndex = source.indexOf('src="match-data.js"');
        assert.ok(configIndex >= 0 && configIndex < matchDataIndex, file);
    });
});

test('full-season match details are limited to the stats page', () => {
    ['index.html', 'fixtures.html', 'table.html', 'player-page.js'].forEach(file => {
        assert.doesNotMatch(readPublic(file), /getMatchData\(\{\s*includeDetails:\s*true/u, file);
    });
    assert.match(readPublic('stats.html'), /getMatchData\(\{\s*includeDetails:\s*true/u);
    assert.match(readPublic('match-drawer-shared.js'), /\/api\/match-details\?event=/u);
});

test('Goals Conceded stat card follows Golden Gloves and ranks the fewest first', () => {
    const source = readPublic('stats.html');
    assert.match(source, /const pplTitleOrder = \[\s*"Golden Boot", "Golden Gloves \(Clean Sheets\)", "Goals Conceded", "Goal difference"/u);
    assert.match(source, /title: "Goals Conceded",\s*players: \[\.\.\.players\]\.sort\(\(a,b\) => a\.GA - b\.GA \|\| b\.PTS - a\.PTS\),\s*playerVal: p => p\.GA, teamVal: t => t\.GA, teamRaw: t => t\.GA,\s*aggregateVal: teamStatsObj => Object\.values\(teamStatsObj\)\.reduce\(\(total, team\) => total \+ team\.GA, 0\),\s*pillClass: "pill-red", sortDir: -1, allTeams: true, allTeamsSortDir: -1/u);
});

test('overall Form view aligns PTS and form cells across player and team rows', () => {
    const source = readPublic('index.html');
    assert.match(source, /<th>Form<\/th><th>PTS<\/th>/u);
    assert.match(source, /renderFormResults\(playerForm\)\}<\/div><\/td><td class="highlight-col"><strong>\$\{p\.PTS\}/u);
    assert.match(source, /renderNextOpponent\(t\.team\)\}<\/div><\/td>\s*<td class="highlight-col"><strong>\$\{t\.PTS\}/u);
    assert.match(source, /overall-form-rank.*overall-form-player.*overall-form-results.*overall-form-points/u);
    assert.match(source, /classList\.toggle\('form-view', overallMode === 'FORM'\)/u);
});

test('match data polling uses shared caching and pauses while hidden', () => {
    const matchesSource = readRepo('api/matches.js');
    assert.match(matchesSource, /s-maxage=60, stale-while-revalidate=120/u);
    assert.match(matchesSource, /s-maxage=10, stale-while-revalidate=20/u);
    const source = readPublic('match-data.js');
    assert.match(source, /visibilitychange/u);
    assert.match(source, /visibilityState === 'hidden'/u);
});

test('match details caching is state-aware instead of unconditional no-store', () => {
    const source = readRepo('api/match-details.js');
    assert.doesNotMatch(source, /no-store, max-age=0/u);
    assert.match(source, /s-maxage=3600, stale-while-revalidate=86400/u);
    assert.match(source, /s-maxage=10, stale-while-revalidate=20/u);
});

test('player pages load the shared player renderer', () => {
    playerPages.forEach(file => {
        const source = readPublic(file);
        assert.match(source, /<script src="player-page\.js"><\/script>/u, file);
        assert.doesNotMatch(source, /fetch(?:Hef|Jamey|Jordan|Nate|Wes)Fixtures/u, file);
        assert.doesNotMatch(source, /SharedPlayerPage/u, file);
    });
});
