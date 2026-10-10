const test = require('node:test');
const assert = require('node:assert/strict');
const { canReplaceScorerRecords, syncEvent } = require('../api/sync-espn');

function matchEvent() {
    return {
        id: '401879275',
        date: '2026-09-18T19:00:00Z',
        season: { year: 2026 },
        competitions: [{
            status: { type: { state: 'post', completed: true, detail: 'FT' } },
            competitors: [
                { homeAway: 'home', team: { id: '337', displayName: 'Brentford' }, score: '3' },
                { homeAway: 'away', team: { id: '363', displayName: 'Chelsea' }, score: '0' }
            ]
        }]
    };
}

function matchSummary(goalCount) {
    return {
        keyEvents: Array.from({ length: goalCount }, (_, index) => ({
            type: { text: 'Goal', type: 'goal' },
            clock: { value: (index + 1) * 600, displayValue: `${index + 1 * 10}'` },
            team: { id: '337' },
            scoreValue: index + 1,
            scoringPlay: true,
            participants: [{ athlete: { id: `player-${index}`, displayName: `Player ${index}` } }]
        }))
    };
}

async function runSyncWithSummary(summary) {
    const originalFetch = global.fetch;
    const queries = [];
    let teamInsertCount = 0;
    global.fetch = async () => ({ ok: true, json: async () => summary });
    const sql = async (parts, ...values) => {
        const text = parts.join('?');
        queries.push({ text, values });
        if (text.includes('INSERT INTO teams')) {
            teamInsertCount += 1;
            return [{ id: `team-${teamInsertCount}` }];
        }
        if (text.includes('INSERT INTO matches')) return [{ id: 'match-db-id' }];
        return [];
    };

    try {
        await syncEvent(sql, matchEvent());
        return queries.map(query => query.text);
    } finally {
        global.fetch = originalFetch;
    }
}

test('scorer records are replaced only when ESPN detail matches the final score', () => {
    const completeDetails = Array.from({ length: 3 }, (_, index) => ({
        scoringPlay: true,
        team: { id: '337' }
    }));
    assert.equal(canReplaceScorerRecords({}, completeDetails, 3, 0, '337', '363'), true);
    assert.equal(canReplaceScorerRecords({}, completeDetails.slice(0, 2), 3, 0, '337', '363'), false);
    assert.equal(canReplaceScorerRecords({}, [], 3, 0, '337', '363'), false);
    assert.equal(canReplaceScorerRecords(null, completeDetails, 3, 0, '337', '363'), false);
    assert.equal(canReplaceScorerRecords({}, [], null, null, '337', '363'), false);
    assert.equal(canReplaceScorerRecords({}, [
        ...completeDetails.slice(0, 2),
        { scoringPlay: true, team: { id: 'unknown' } }
    ], 3, 0, '337', '363'), false);
    assert.equal(canReplaceScorerRecords({}, [], 0, 0, '337', '363'), true);
});

test('sync preserves stored scorers on partial ESPN detail and repairs them when complete', async () => {
    const incompleteQueries = await runSyncWithSummary(matchSummary(2));
    assert.equal(incompleteQueries.some(query => query.includes('DELETE FROM match_scorers')), false);

    const completeQueries = await runSyncWithSummary(matchSummary(3));
    assert.equal(completeQueries.some(query => query.includes('DELETE FROM match_scorers')), true);
    assert.equal(completeQueries.filter(query => query.includes('INSERT INTO match_scorers')).length, 3);
});
