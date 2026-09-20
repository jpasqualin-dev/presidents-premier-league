const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEspnEvent, normalizeNeonMatch } = require('../lib/match-contract');
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

test('normalizes approved long team names from ESPN and Neon records', () => {
    const espnMatch = normalizeEspnEvent({
        id: '3',
        date: '2026-09-19T12:00:00Z',
        competitions: [{
            status: { type: { state: 'post', completed: true } },
            competitors: [
                { homeAway: 'home', team: { id: '331', displayName: 'Brighton' }, score: 0 },
                { homeAway: 'away', team: { id: '361', displayName: 'Newcastle' }, score: 0 }
            ]
        }]
    });
    assert.equal(espnMatch.homeTeam.name, 'Brighton & Hove Albion');
    assert.equal(espnMatch.awayTeam.name, 'Newcastle United');

    const neonMatch = normalizeNeonMatch({
        provider: 'espn', provider_event_id: '4', kickoff_at: '2026-09-19T12:00:00Z',
        status_state: 'post', status_completed: true, home_provider_id: '349', home_name: 'Bournemouth',
        away_provider_id: '367', away_name: 'Tottenham', home_score: 0, away_score: 0,
        scorers: [], events: [], team_stats: []
    });
    assert.equal(neonMatch.homeTeam.name, 'AFC Bournemouth');
    assert.equal(neonMatch.awayTeam.name, 'Tottenham Hotspur');
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
