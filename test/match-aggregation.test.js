const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEspnEvent } = require('../lib/match-contract');
const { dedupeByKey, mergeMatches } = require('../lib/match-aggregation');
const { applyMatchCorrections } = require('../api/matches');

const baseMatch = {
    id: 'espn:1',
    provider: 'espn',
    providerEventId: '1',
    utcDate: '2026-09-19T12:00:00Z',
    status: 'IN_PLAY',
    homeTeam: { id: 'home', name: 'Home' },
    awayTeam: { id: 'away', name: 'Away' },
    score: { fullTime: { home: 2, away: 1 }, halfTime: { home: 1, away: 0 } },
    scorers: [{ athleteName: 'Existing scorer' }],
    events: [{ eventType: 'Yellow Card' }],
    teamStats: [{ teamProviderId: 'home', name: 'possessionPct', value: 55 }]
};

test('completed match wins over live data without losing populated details', () => {
    const [match] = mergeMatches([
        { ...baseMatch, status: 'FINISHED', score: { fullTime: { home: 3, away: 1 }, halfTime: { home: 1, away: 0 } } },
        { ...baseMatch, status: 'IN_PLAY', score: { fullTime: { home: 2, away: 1 }, halfTime: { home: 1, away: 0 } }, scorers: [], events: [], teamStats: [] }
    ]);

    assert.equal(match.status, 'FINISHED');
    assert.deepEqual(match.score.fullTime, { home: 3, away: 1 });
    assert.equal(match.scorers.length, 1);
    assert.equal(match.events.length, 1);
    assert.equal(match.teamStats.length, 1);
});

test('deduplicates provider records and preserves zero scores', () => {
    const records = dedupeByKey([{ id: '1', value: 'old' }, { id: '1', value: 'new' }], item => item.id);
    assert.deepEqual(records, [{ id: '1', value: 'new' }]);

    const match = normalizeEspnEvent({
        id: '2',
        date: '2026-09-19T12:00:00Z',
        competitions: [{
            status: { type: { state: 'post', completed: true, detail: 'FT' } },
            competitors: [
                { homeAway: 'home', team: { id: 'home', displayName: 'Home' }, score: 0 },
                { homeAway: 'away', team: { id: 'away', displayName: 'Away' }, score: 0 }
            ]
        }]
    });
    assert.equal(match.status, 'FINISHED');
    assert.equal(match.score.fullTime.home, 0);
    assert.equal(match.score.fullTime.away, 0);
});

test('repairs the Brentford-Chelsea result when ESPN no longer serves the event', () => {
    const [match] = applyMatchCorrections([{
        provider: 'espn',
        providerEventId: '401879275',
        status: 'SCHEDULED',
        score: { fullTime: { home: 0, away: 0 } }
    }]);

    assert.equal(match.status, 'FINISHED');
    assert.deepEqual(match.score.fullTime, { home: 3, away: 0 });
});
