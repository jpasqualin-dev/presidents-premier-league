const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

function loadIndividualScoringEvents() {
    const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'match-data.js'), 'utf8');
    const window = { addEventListener() {} };
    vm.runInNewContext(source, { window, console, setTimeout });
    return {
        getIndividualScoringEvents: window.getIndividualScoringEvents,
        getCreditedAssistEvents: window.getCreditedAssistEvents
    };
}

test('individual scoring excludes own goals but keeps normal goals', () => {
    const { getIndividualScoringEvents } = loadIndividualScoringEvents();
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

test('credited assist events share one rule and omit own goals and unverified assists', () => {
    const { getCreditedAssistEvents } = loadIndividualScoringEvents();
    const scorers = [
        { athleteName: 'Scorer', assistName: 'Credited assister', assistStatus: 'credited' },
        { athleteName: 'Scorer', assistName: 'Unverified assister', assistStatus: 'unverified' },
        { athleteName: 'Own goal', assistName: 'Invalid assister', assistStatus: 'credited', ownGoal: true },
        { athleteName: 'Legacy scorer', assistName: 'Legacy assister' }
    ];

    assert.deepEqual(
        getCreditedAssistEvents(scorers).map(event => event.assistName),
        ['Credited assister', 'Legacy assister']
    );
});
