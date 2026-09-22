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
    ['ppl-weekly-drawer.js', 'team-drawer-shared.js', 'index.html'].forEach(file => {
        const source = readPublic(file);
        assert.match(source, /weekly-form-team[^}]*white-space:\s*nowrap/u, file);
        assert.match(source, /weekly-form-team[^}]*text-overflow:\s*ellipsis/u, file);
    });
});

test('primary pages load shared drawer dependencies in the expected order', () => {
    sharedConfigPages.forEach(file => {
        const source = readPublic(file);
        const configIndex = source.indexOf('src="league-config.js"');
        const matchDataIndex = source.indexOf('src="match-data.js"');
        assert.ok(configIndex >= 0 && configIndex < matchDataIndex, file);
    });
});
