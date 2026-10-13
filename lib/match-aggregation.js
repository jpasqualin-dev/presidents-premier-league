const STATUS_RANK = {
    SCHEDULED: 0,
    PAUSED: 1,
    IN_PLAY: 2,
    FINISHED: 3
};

const DETAIL_ARRAY_FIELDS = ['scorers', 'events', 'teamStats'];

function matchKey(match) {
    return `${match.provider || 'unknown'}:${match.providerEventId || match.id}`;
}

function isPopulated(value) {
    return Array.isArray(value) ? value.length > 0 : value != null;
}

function assistQuality(scorer) {
    if (scorer.assistStatus === 'credited' && (scorer.assistProviderId || scorer.assistName)) return 2;
    if (scorer.assistStatus === 'unassisted' || scorer.ownGoal || scorer.penalty) return 2;
    if (scorer.assistProviderId || scorer.assistName) return 2;
    return 0;
}

function sameScorer(left, right) {
    if (left.teamProviderId != null && right.teamProviderId != null
        && String(left.teamProviderId) !== String(right.teamProviderId)) return false;
    if (left.athleteProviderId != null && right.athleteProviderId != null) {
        return String(left.athleteProviderId) === String(right.athleteProviderId);
    }
    return String(left.athleteName || '').trim().toLowerCase()
        === String(right.athleteName || '').trim().toLowerCase();
}

function scorerMinute(scorer) {
    const minute = Number.parseInt(String(scorer.minute ?? ''), 10);
    return Number.isFinite(minute) ? minute : null;
}

function mergeScorerAssists(preferredScorers, fallbackScorers) {
    const remaining = fallbackScorers.map((scorer, index) => ({ scorer, index }));
    return preferredScorers.map(scorer => {
        const candidates = remaining.filter(({ scorer: candidate }) => sameScorer(scorer, candidate));
        if (!candidates.length) return scorer;
        const minute = scorerMinute(scorer);
        const exactMinute = minute == null
            ? null
            : candidates.find(({ scorer: candidate }) => scorerMinute(candidate) === minute);
        const match = exactMinute || (candidates.length === 1 ? candidates[0] : null);
        if (!match) return scorer;
        remaining.splice(remaining.findIndex(candidate => candidate.index === match.index), 1);
        if (assistQuality(scorer) >= assistQuality(match.scorer)) return scorer;
        const assist = match.scorer;
        return {
            ...scorer,
            assistProviderId: assist.assistProviderId || null,
            assistName: assist.assistName || null,
            assistStatus: assist.assistStatus
                || (assist.assistProviderId || assist.assistName ? 'credited' : assist.ownGoal || assist.penalty ? 'unassisted' : 'unverified')
        };
    });
}

function mergeMatchRecords(existing, incoming) {
    if (!existing) return incoming;
    if (!incoming) return existing;

    const existingRank = STATUS_RANK[existing.status] ?? -1;
    const incomingRank = STATUS_RANK[incoming.status] ?? -1;
    const preferred = incomingRank >= existingRank ? incoming : existing;
    const fallback = preferred === incoming ? existing : incoming;
    const merged = { ...fallback, ...preferred };

    for (const field of DETAIL_ARRAY_FIELDS) {
        if (!isPopulated(preferred[field]) && isPopulated(fallback[field])) merged[field] = fallback[field];
    }
    if (isPopulated(preferred.scorers) && isPopulated(fallback.scorers)) {
        merged.scorers = mergeScorerAssists(preferred.scorers, fallback.scorers);
    }

    if (existing.teamCards || incoming.teamCards) {
        merged.teamCards = Object.fromEntries(['home', 'away'].map(side => [side, Object.fromEntries(['yellow', 'red'].map(card => [
            card,
            Math.max(Number(existing.teamCards?.[side]?.[card]) || 0, Number(incoming.teamCards?.[side]?.[card]) || 0)
        ]))]));
    }

    merged.score = {
        ...(fallback.score || {}),
        ...(preferred.score || {}),
        fullTime: {
            ...(fallback.score?.fullTime || {}),
            ...(preferred.score?.fullTime || {})
        },
        halfTime: {
            ...(fallback.score?.halfTime || {}),
            ...(preferred.score?.halfTime || {})
        }
    };

    return merged;
}

function mergeMatches(records) {
    const merged = new Map();
    for (const record of records || []) {
        if (!record) continue;
        const key = matchKey(record);
        merged.set(key, mergeMatchRecords(merged.get(key), record));
    }
    return [...merged.values()].sort((left, right) => {
        const dateDifference = new Date(left.utcDate) - new Date(right.utcDate);
        return dateDifference || matchKey(left).localeCompare(matchKey(right));
    });
}

function dedupeByKey(items, getKey) {
    const values = new Map();
    for (const item of items || []) {
        const key = getKey(item);
        if (key != null) values.set(String(key), item);
    }
    return [...values.values()];
}

module.exports = { dedupeByKey, matchKey, mergeMatchRecords, mergeMatches };
