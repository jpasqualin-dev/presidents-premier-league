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
