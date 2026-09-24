const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const publicDir = path.join(__dirname, '..', 'public');
const readPublic = file => fs.readFileSync(path.join(publicDir, file), 'utf8');
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

test('player pages load the shared player renderer', () => {
    playerPages.forEach(file => {
        const source = readPublic(file);
        assert.match(source, /<script src="player-page\.js"><\/script>/u, file);
        assert.doesNotMatch(source, /fetch(?:Hef|Jamey|Jordan|Nate|Wes)Fixtures/u, file);
        assert.doesNotMatch(source, /SharedPlayerPage/u, file);
    });
});
