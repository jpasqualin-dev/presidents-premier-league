const test = require('node:test');
const assert = require('node:assert/strict');
const { assistStatus, normalizeEspnEvent, normalizeNeonMatch } = require('../lib/match-contract');
const { dedupeByKey, mergeMatches } = require('../lib/match-aggregation');
const { applyMatchCorrections, buildDataQuality, readCurrentPlayers } = require('../api/matches');

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
    teamCards: { home: { yellow: 1, red: 0 }, away: { yellow: 0, red: 0 } },
    teamStats: [{ teamProviderId: 'home', name: 'possessionPct', value: 55 }]
};

test('completed match wins over live data without losing populated details', () => {
    const [match] = mergeMatches([
        { ...baseMatch, status: 'FINISHED', score: { fullTime: { home: 3, away: 1 }, halfTime: { home: 1, away: 0 } }, teamCards: { home: { yellow: 2, red: 1 }, away: { yellow: 0, red: 0 } } },
        { ...baseMatch, status: 'IN_PLAY', score: { fullTime: { home: 2, away: 1 }, halfTime: { home: 1, away: 0 } }, scorers: [], events: [], teamStats: [] }
    ]);

    assert.equal(match.status, 'FINISHED');
    assert.deepEqual(match.score.fullTime, { home: 3, away: 1 });
    assert.equal(match.scorers.length, 1);
    assert.equal(match.events.length, 1);
    assert.equal(match.teamStats.length, 1);
    assert.deepEqual(match.teamCards, { home: { yellow: 2, red: 1 }, away: { yellow: 0, red: 0 } });
});

test('verified historical assists survive a sparse completed live scorer record', () => {
    const historical = {
        ...baseMatch,
        status: 'FINISHED',
        scorers: [{
            teamProviderId: '382',
            athleteProviderId: '298008',
            athleteName: 'Rayan Cherki',
            assistProviderId: '299910',
            assistName: 'Josko Gvardiol',
            assistStatus: 'credited',
            minute: "78'"
        }]
    };
    const live = {
        ...historical,
        source: 'espn-live',
        scorers: [{
            teamProviderId: '382',
            athleteProviderId: '298008',
            athleteName: 'Rayan Cherki',
            assistProviderId: null,
            assistName: null,
            assistStatus: 'unverified',
            minute: "78'"
        }]
    };

    const [match] = mergeMatches([historical, live]);

    assert.equal(match.scorers[0].assistName, 'Josko Gvardiol');
    assert.equal(match.scorers[0].assistStatus, 'credited');
    assert.equal(match.source, 'espn-live');
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
            ],
            details: [
                { team: { id: 'home' }, yellowCard: true },
                { team: { id: 'away' }, redCard: true }
            ]
        }]
    });
    assert.equal(match.status, 'FINISHED');
    assert.equal(match.score.fullTime.home, 0);
    assert.equal(match.score.fullTime.away, 0);
    assert.deepEqual(match.teamCards, { home: { yellow: 1, red: 0 }, away: { yellow: 0, red: 1 } });
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
        home_yellow_cards: '2', home_red_cards: '1', away_yellow_cards: '0', away_red_cards: '0',
        scorers: [], events: [], team_stats: []
    });
    assert.equal(neonMatch.homeTeam.name, 'AFC Bournemouth');
    assert.equal(neonMatch.awayTeam.name, 'Tottenham Hotspur');
    assert.deepEqual(neonMatch.teamCards, { home: { yellow: 2, red: 1 }, away: { yellow: 0, red: 0 } });
});

test('normalizes credited and explicitly unassisted goal events', () => {
    assert.equal(assistStatus({ athletesInvolved: [{ id: 'scorer' }, { id: 'assister' }] }), 'credited');
    assert.equal(assistStatus({ ownGoal: true, athletesInvolved: [{ id: 'scorer' }] }), 'unassisted');
    assert.equal(assistStatus({ penaltyKick: true, athletesInvolved: [{ id: 'scorer' }] }), 'unassisted');
    assert.equal(assistStatus({ type: { text: 'Goal - Free-kick' }, athletesInvolved: [{ id: 'scorer' }] }), 'unassisted');
    assert.equal(assistStatus({ athletesInvolved: [{ id: 'scorer' }] }), 'unverified');
});

test('repairs the Brentford-Chelsea result and missing scorers when ESPN no longer serves the event', () => {
    const [match] = applyMatchCorrections([{
        provider: 'espn',
        providerEventId: '401879275',
        status: 'SCHEDULED',
        homeTeam: { id: '337', name: 'Brentford' },
        awayTeam: { id: '363', name: 'Chelsea' },
        scorers: [],
        score: { fullTime: { home: 0, away: 0 } }
    }]);

    assert.equal(match.status, 'FINISHED');
    assert.deepEqual(match.score.fullTime, { home: 3, away: 0 });
    assert.deepEqual(match.scorers.map(scorer => scorer.athleteName), [
        'Jaidon Anthony',
        'Igor Thiago',
        'Fábio Carvalho'
    ]);
    assert.equal(match.scorers.filter(scorer => scorer.teamProviderId === match.homeTeam.id).length, match.score.fullTime.home);
    assert.equal(match.scorers.filter(scorer => scorer.teamProviderId === match.awayTeam.id).length, match.score.fullTime.away);
    assert.equal(buildDataQuality(false, true, [], [match], true).scoringComplete, true);
    assert.equal(buildDataQuality(true, true, [match], [match], true).assistComplete, true);
});

test('match response quality distinguishes complete details from summary or missing history', () => {
    const detailedMatch = {
        ...baseMatch,
        status: 'FINISHED',
        score: { fullTime: { home: 0, away: 0 } },
        scorers: [],
        events: [],
        teamStats: [],
        teamCards: { home: { yellow: 0, red: 0 }, away: { yellow: 0, red: 0 } }
    };

    assert.deepEqual(buildDataQuality(true, true, [detailedMatch], [detailedMatch], true), {
        detailLevel: 'full',
        detailsComplete: true,
        scoringComplete: true,
        assistComplete: true,
        unverifiedAssistCount: 0,
        historicalAvailable: true,
        historicalMatchCount: 1,
        totalMatchCount: 1,
        liveAvailable: true
    });
    assert.equal(buildDataQuality(false, true, [detailedMatch], [detailedMatch], true).detailsComplete, false);
    assert.equal(buildDataQuality(true, false, [], [detailedMatch], true).detailsComplete, false);
    const scoringMismatch = buildDataQuality(true, true, [detailedMatch], [{
        ...detailedMatch,
        score: { fullTime: { home: 2, away: 1 } }
    }], true);
    assert.equal(scoringMismatch.detailsComplete, true);
    assert.equal(scoringMismatch.scoringComplete, false);

    const incompleteAssist = buildDataQuality(true, true, [detailedMatch], [{
        ...detailedMatch,
        score: { fullTime: { home: 1, away: 0 } },
        scorers: [{ athleteName: 'Scorer', assistStatus: 'unverified' }]
    }], true);
    assert.equal(incompleteAssist.scoringComplete, true);
    assert.equal(incompleteAssist.assistComplete, false);
    assert.equal(incompleteAssist.unverifiedAssistCount, 1);
});

test('current player records expose stable athlete ids and current club names', async () => {
    let query = '';
    const players = await readCurrentPlayers(async parts => {
        query = parts.join('?');
        return [{
            athlete_provider_id: '268641',
            athlete_name: 'Iliman Ndiaye',
            provider_team_id: '382',
            team_name: 'Manchester City'
        }];
    });

    assert.match(query, /FROM player_current_teams/u);
    assert.deepEqual(players, [{
        athleteProviderId: '268641',
        athleteName: 'Iliman Ndiaye',
        teamProviderId: '382',
        teamName: 'Manchester City'
    }]);
});
