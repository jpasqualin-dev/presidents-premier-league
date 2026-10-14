const test = require('node:test');
const assert = require('node:assert/strict');
const { buildScorerRecords, canReplaceScorerRecords, dayKeys, findMatchesNeedingRepair, syncCurrentRosters, syncEvent } = require('../api/sync-espn');

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

async function runSyncWithSummary(summary, fetchError = null) {
    const originalFetch = global.fetch;
    const queries = [];
    let teamInsertCount = 0;
    global.fetch = async () => {
        if (fetchError) throw fetchError;
        return { ok: true, json: async () => summary };
    };
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

test('assist observations distinguish credited, verified unassisted, and unresolved events', () => {
    const checkedAt = new Date('2026-10-12T12:00:00Z');
    const goal = {
        scoringPlay: true,
        team: { id: '337' },
        type: { text: 'Goal', type: 'goal' },
        clock: { value: 3600 },
        athletesInvolved: [{ id: 'scorer', displayName: 'Scorer' }]
    };
    const firstObservation = buildScorerRecords([goal], [], true, checkedAt)[0];
    assert.equal(firstObservation.assistStatus, 'unverified');
    assert.equal(firstObservation.assistObservations, 1);

    const secondObservation = buildScorerRecords([goal], [{
        team_provider_id: '337',
        provider_athlete_id: 'scorer',
        athlete_name: 'Scorer',
        assist_status: 'unverified',
        assist_observations: 1,
        assist_checked_at: '2026-10-12T12:00:00Z',
        minute: 60
    }], true, new Date('2026-10-12T15:00:00Z'))[0];
    assert.equal(secondObservation.assistStatus, 'unverified');
    assert.equal(secondObservation.assistObservations, 1);

    const verifiedUnassisted = buildScorerRecords([goal], [{
        team_provider_id: '337',
        provider_athlete_id: 'scorer',
        athlete_name: 'Scorer',
        assist_status: 'unverified',
        assist_observations: 1,
        assist_checked_at: '2026-10-12T12:00:00Z',
        minute: 60
    }], true, new Date('2026-10-12T19:00:00Z'))[0];
    assert.equal(verifiedUnassisted.assistStatus, 'unassisted');

    const stoppage = buildScorerRecords([{ ...goal, clock: { value: 2820, displayValue: "45'+2'" } }], [], true, checkedAt)[0];
    assert.equal(stoppage.minute, 45);
    const early = buildScorerRecords([{ ...goal, clock: { value: 874 } }], [], true, checkedAt)[0];
    assert.equal(early.minute, 14);

    const credited = buildScorerRecords([{
        ...goal,
        athletesInvolved: [goal.athletesInvolved[0], { id: 'assister', displayName: 'Assister' }]
    }], [], true, checkedAt)[0];
    assert.equal(credited.assistStatus, 'credited');
    assert.equal(credited.assistProviderId, 'assister');

    const retained = buildScorerRecords([goal], [{
        team_provider_id: '337',
        provider_athlete_id: 'scorer',
        athlete_name: 'Scorer',
        assist_provider_id: 'assister',
        assist_name: 'Assister',
        assist_status: 'credited',
        assist_observations: 0,
        assist_checked_at: '2026-10-12T12:00:00Z',
        minute: 60
    }], true, checkedAt)[0];
    assert.equal(retained.assistProviderId, 'assister');
    assert.equal(retained.assistStatus, 'credited');

    const ownGoal = buildScorerRecords([{ ...goal, ownGoal: true }], [], true, checkedAt)[0];
    assert.equal(ownGoal.assistStatus, 'unassisted');
});

test('UTC date window retains the prior local date for live and scheduled feeds', () => {
    const dates = dayKeys(new Date('2026-10-12T02:25:00Z'));
    assert.deepEqual(dates, [
        '20261005', '20261006', '20261007', '20261008', '20261009',
        '20261010', '20261011', '20261012', '20261013'
    ]);
    assert.equal(dates.includes('20261010'), true);
});

test('repair queue includes score mismatches and unresolved assist data in bounded batches', async () => {
    let query = '';
    await findMatchesNeedingRepair(async parts => {
        query = parts.join('?');
        return [];
    });
    assert.match(query, /COUNT\(ms\.id\) <> m\.home_score \+ m\.away_score/u);
    assert.match(query, /BOOL_OR\(ms\.assist_status = 'unverified'\)/u);
    assert.match(query, /LIMIT 50/u);
});

test('sync preserves stored scorers on partial ESPN detail and repairs them when complete', async () => {
    const incompleteQueries = await runSyncWithSummary(matchSummary(2));
    assert.equal(incompleteQueries.some(query => query.includes('DELETE FROM match_scorers')), false);

    const completeQueries = await runSyncWithSummary(matchSummary(3));
    assert.equal(completeQueries.some(query => query.includes('DELETE FROM match_scorers')), true);
    assert.equal(completeQueries.filter(query => query.includes('INSERT INTO match_scorers')).length, 3);
});

test('sync stores scoreboard match data when ESPN match details are unavailable', async () => {
    const queries = await runSyncWithSummary(null, new Error('ESPN summary request failed'));
    assert.equal(queries.some(query => query.includes('INSERT INTO matches')), true);
});

test('current player rosters are refreshed as one complete cached snapshot', async () => {
    const originalFetch = global.fetch;
    const rosterRequests = [];
    const queries = [];
    const teams = Array.from({ length: 20 }, (_, index) => ({ provider_team_id: String(index + 1) }));
    const sql = async (parts, ...values) => {
        const text = parts.join('?');
        queries.push({ text, values });
        if (text.includes('SELECT last_synced_at')) return [];
        if (text.includes('SELECT provider_team_id')) return teams;
        return [];
    };
    global.fetch = async url => {
        const teamId = String(url).match(/teams\/(\d+)\/roster/u)?.[1];
        rosterRequests.push(teamId);
        return {
            ok: true,
            json: async () => ({ athletes: [{ id: `player-${teamId}`, fullName: `Player ${teamId}` }] })
        };
    };

    try {
        const result = await syncCurrentRosters(sql, new Date('2026-10-14T00:00:00Z'));
        assert.deepEqual(result, { refreshed: true, reason: null, players: 20 });
        assert.equal(rosterRequests.length, 20);
        assert.equal(queries.some(query => query.text.includes('INSERT INTO player_current_teams')), true);
        assert.equal(queries.some(query => query.text.includes('DELETE FROM player_current_teams')), true);
        assert.equal(queries.some(query => query.text.includes('INSERT INTO player_roster_sync')), true);
    } finally {
        global.fetch = originalFetch;
    }
});

test('current player rosters use the stored snapshot until its daily refresh expires', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => { throw new Error('roster should not be fetched while cached'); };
    const sql = async parts => {
        const text = parts.join('?');
        if (text.includes('SELECT last_synced_at')) return [{ last_synced_at: '2026-10-14T12:00:00Z' }];
        throw new Error(`Unexpected query: ${text}`);
    };

    try {
        const result = await syncCurrentRosters(sql, new Date('2026-10-14T17:00:00Z'));
        assert.deepEqual(result, { refreshed: false, reason: 'cached', players: null });
    } finally {
        global.fetch = originalFetch;
    }
});
