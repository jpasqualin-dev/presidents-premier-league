(() => {
    const config = {
        cacheKey: 'pl_match_data_v2',
        cacheTimeKey: 'pl_match_data_time',
        lockKey: 'pl_match_data_lock',
        channelName: 'ppl-match-data',
        ttl: 15 * 1000,
        pollInterval: 2 * 60 * 1000,
        livePollInterval: 15 * 1000,
        lockDuration: 10 * 1000,
        staleMaxAge: 24 * 60 * 60 * 1000
    };
    const subscribers = new Set();
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(config.channelName) : null;
    let memoryData = null;
    let memoryTime = 0;
    let memoryIncludesDetails = false;
    let pendingRequest = null;
    let pollTimer = null;
    let status = { stale: false, lastSuccessfulSync: 0, detailLevel: 'summary' };
    let detailedStatus = { stale: false, lastSuccessfulSync: 0, detailLevel: 'full' };

    const normalizeData = data => window.TeamNames
        ? { ...data, matches: (data?.matches || []).map(window.TeamNames.normalizeMatch) }
        : data;
    const hasDetailedMatchShape = data => data?.dataQuality?.detailLevel === 'full'
        && Array.isArray(data.matches)
        && data.matches.length > 0
        && data.matches.every(match => Array.isArray(match.scorers)
            && Array.isArray(match.events)
            && Array.isArray(match.teamStats)
            && match.teamCards
            && typeof match.teamCards === 'object');
    const isUsableData = (data, includeDetails) => !includeDetails || hasDetailedMatchShape(data);

    const cacheKeys = includeDetails => ({
        data: includeDetails ? `${config.cacheKey}_details` : config.cacheKey,
        time: includeDetails ? `${config.cacheTimeKey}_details` : config.cacheTimeKey
    });

    const pollIntervalFor = data => data?.matches?.some(match => ['IN_PLAY', 'PAUSED'].includes(match.status))
        ? config.livePollInterval
        : config.pollInterval;

    const schedulePoll = data => {
        if (pollTimer) clearTimeout(pollTimer);
        pollTimer = null;
        if (document.visibilityState === 'hidden') return;
        pollTimer = setTimeout(async () => {
            pollTimer = null;
            if (document.visibilityState === 'hidden') return;
            const nextData = await refresh();
            schedulePoll(nextData);
        }, pollIntervalFor(data));
    };

    const readCache = (includeDetails = false) => {
        try {
            const keys = cacheKeys(includeDetails);
            const cachedData = localStorage.getItem(keys.data);
            const cachedTime = Number(localStorage.getItem(keys.time));
            if (!cachedData || !cachedTime || Date.now() - cachedTime >= config.ttl) return null;
            return { data: normalizeData(JSON.parse(cachedData)), time: cachedTime };
        } catch (error) {
            console.warn('Unable to read match data cache:', error);
            return null;
        }
    };

    const readStaleCache = (includeDetails = false) => {
        const cached = readCache(includeDetails);
        if (cached && isUsableData(cached.data, includeDetails)) return cached;
        try {
            const keys = cacheKeys(includeDetails);
            const data = localStorage.getItem(keys.data);
            const time = Number(localStorage.getItem(keys.time));
            if (data && time && Date.now() - time <= config.staleMaxAge) {
                const normalizedData = normalizeData(JSON.parse(data));
                if (isUsableData(normalizedData, includeDetails)) return { data: normalizedData, time };
            }
        } catch (error) {
            console.warn('Unable to read stale match data cache:', error);
        }
        return null;
    };

    const updateStatus = (nextStatus, includeDetails = false) => {
        const next = { ...nextStatus, includeDetails };
        if (includeDetails) detailedStatus = next;
        else status = next;
        window.dispatchEvent(new CustomEvent('match-data-status', { detail: next }));
    };

    const updateDataStatus = (data, time, includeDetails, stale = false) => updateStatus({
        stale,
        lastSuccessfulSync: time,
        generatedAt: data?.generatedAt || null,
        detailLevel: data?.dataQuality?.detailLevel || (includeDetails ? 'unknown' : 'summary'),
        detailsComplete: data?.dataQuality?.detailsComplete === true,
        scoringComplete: data?.dataQuality?.scoringComplete === true,
        historicalAvailable: data?.dataQuality?.historicalAvailable === true,
        historicalMatchCount: data?.dataQuality?.historicalMatchCount || 0,
        totalMatchCount: data?.matches?.length || 0,
        sources: data?.sources || null
    }, includeDetails);

    const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

    const notifySubscribers = data => {
        subscribers.forEach(listener => {
            try { listener(data); }
            catch (error) { console.error('Match data subscriber failed:', error); }
        });
    };

    const publish = (data, time, includeDetails = false) => {
        memoryData = data;
        memoryTime = time;
        memoryIncludesDetails = includeDetails;
        notifySubscribers(data);
        channel?.postMessage({ data, time, includeDetails });
    };

    const getFreshCache = (includeDetails = false) => {
        if (memoryData && memoryIncludesDetails === includeDetails && Date.now() - memoryTime < config.ttl) return { data: memoryData, time: memoryTime };
        return readCache(includeDetails);
    };

    async function getMatchData({ force = false, includeDetails = false } = {}) {
        if (window.TeamNames?.ready) await window.TeamNames.ready;
        const cached = force ? null : getFreshCache(includeDetails);
        if (cached && isUsableData(cached.data, includeDetails)) {
            memoryData = cached.data;
            memoryTime = cached.time;
            memoryIncludesDetails = includeDetails;
            updateDataStatus(cached.data, cached.time, includeDetails);
            return cached.data;
        }
        if (pendingRequest?.includeDetails === includeDetails) return pendingRequest.promise;

        const promise = (async () => {
            const requestStarted = Date.now();
            const refreshedCache = force ? null : getFreshCache(includeDetails);
            if (refreshedCache && isUsableData(refreshedCache.data, includeDetails)) {
                memoryData = refreshedCache.data;
                memoryTime = refreshedCache.time;
                memoryIncludesDetails = includeDetails;
                updateDataStatus(refreshedCache.data, refreshedCache.time, includeDetails);
                return refreshedCache.data;
            }

            const owner = `${Date.now()}-${Math.random()}`;
            let ownsLock = false;
            const lockStarted = Date.now();

            while (!ownsLock) {
                const currentLock = JSON.parse(localStorage.getItem(config.lockKey) || 'null');
                if (!currentLock || Date.now() - currentLock.started >= config.lockDuration) {
                    localStorage.setItem(config.lockKey, JSON.stringify({ owner, started: Date.now() }));
                    ownsLock = JSON.parse(localStorage.getItem(config.lockKey) || 'null')?.owner === owner;
                }
                if (ownsLock) break;
                const availableCache = readCache(includeDetails);
                if (availableCache && availableCache.time > requestStarted && isUsableData(availableCache.data, includeDetails)) {
                    memoryData = availableCache.data;
                    memoryTime = availableCache.time;
                    memoryIncludesDetails = includeDetails;
                    updateDataStatus(availableCache.data, availableCache.time, includeDetails);
                    return availableCache.data;
                }
                if (Date.now() - lockStarted >= config.lockDuration) throw new Error('Timed out waiting for match data refresh.');
                await wait(100);
            }

            try {
                const response = await fetch(`/api/matches${includeDetails ? '?details=1' : ''}`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = normalizeData(await response.json());
                if (!isUsableData(data, includeDetails)) {
                    throw new Error('Detailed match data is incomplete or unavailable.');
                }
                const time = Date.now();
                const keys = cacheKeys(includeDetails);
                localStorage.setItem(keys.data, JSON.stringify(data));
                localStorage.setItem(keys.time, time.toString());
                updateDataStatus(data, time, includeDetails);
                publish(data, time, includeDetails);
                return data;
            } catch (error) {
                const stale = readStaleCache(includeDetails);
                if (!stale) throw error;
                memoryData = stale.data;
                memoryTime = stale.time;
                memoryIncludesDetails = includeDetails;
                updateDataStatus(stale.data, stale.time, includeDetails, true);
                notifySubscribers(stale.data);
                return stale.data;
            } finally {
                const currentLock = JSON.parse(localStorage.getItem(config.lockKey) || 'null');
                if (currentLock?.owner === owner) localStorage.removeItem(config.lockKey);
            }
        })();

        pendingRequest = { includeDetails, promise };
        try {
            return await promise;
        } finally {
            if (pendingRequest?.promise === promise) pendingRequest = null;
        }
    }

    async function refresh() {
        try { return await getMatchData(); }
        catch (error) { console.error('Unable to refresh match data:', error); }
    }

    function subscribe(listener) {
        subscribers.add(listener);
        return () => subscribers.delete(listener);
    }

    function getStatus({ includeDetails = false } = {}) { return includeDetails ? detailedStatus : status; }

    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                if (pollTimer) clearTimeout(pollTimer);
                pollTimer = null;
                return;
            }
            if (!pollTimer) refresh().then(data => schedulePoll(data));
        });
    }

    async function start() {
        if (pollTimer) return;
        if (window.TeamNames?.ready) await window.TeamNames.ready;
        const cached = getFreshCache();
        if (cached) {
            memoryData = cached.data;
            memoryTime = cached.time;
            memoryIncludesDetails = false;
            notifySubscribers(cached.data);
        } else {
            getMatchData()
                .then(data => schedulePoll(data))
                .catch(error => {
                    console.error('Unable to load match data:', error);
                    notifySubscribers(null);
                    schedulePoll(null);
                });
        }
        if (cached) schedulePoll(cached.data);
    }

    function handleExternalUpdate(event) {
        const update = event.data || event.newValue && JSON.parse(event.newValue);
        if (!update?.data || !update.time || update.time <= memoryTime) return;
        memoryData = normalizeData(update.data);
        memoryTime = update.time;
        memoryIncludesDetails = Boolean(update.includeDetails);
        updateDataStatus(memoryData, memoryTime, memoryIncludesDetails);
        notifySubscribers(memoryData);
    }

    channel?.addEventListener('message', handleExternalUpdate);
    window.addEventListener('storage', event => {
        if (!event.newValue) return;
        const includeDetails = event.key === cacheKeys(true).time;
        if (event.key !== cacheKeys(false).time && !includeDetails) return;
        const cached = readCache(includeDetails);
        if (cached) handleExternalUpdate({ newValue: JSON.stringify({ ...cached, includeDetails }) });
    });

    window.DataManager = { config, getMatchData, refresh, subscribe, getStatus, start };
    window.getIndividualScoringEvents = scorers => (scorers || []).filter(scorer => scorer?.ownGoal !== true);
    window.getMatchData = getMatchData;
})();
