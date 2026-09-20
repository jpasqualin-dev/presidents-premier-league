const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

function loadIndividualScoringEvents() {
    const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'match-data.js'), 'utf8');
    const window = { addEventListener() {} };
    vm.runInNewContext(source, { window, console, setTimeout });
    return window.getIndividualScoringEvents;
}

test('individual scoring excludes own goals but keeps normal goals', () => {
    const getIndividualScoringEvents = loadIndividualScoringEvents();
    const events = [
        { athleteName: 'João Pedro', teamProviderId: '363', ownGoal: false },
        { athleteName: 'João Pedro', teamProviderId: '331', ownGoal: true },
        { athleteName: 'Malick Yalcouyé', teamProviderId: '331', ownGoal: false }
    ];

    assert.deepEqual(
        getIndividualScoringEvents(events).map(event => event.athleteName),
        ['João Pedro', 'Malick Yalcouyé']
    );
});
