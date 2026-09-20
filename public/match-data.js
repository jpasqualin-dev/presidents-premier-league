(() => {
    const config = {
        cacheKey: 'pl_match_data_v2',
        cacheTimeKey: 'pl_match_data_time',
        lockKey: 'pl_match_data_lock',
        channelName: 'ppl-match-data',
        ttl: 15 * 1000,
        pollInterval: 2 * 60 * 1000,
        livePollInterval: 15 * 1000,
        lockDuration: 10 * 1000
    };
    const subscribers = new Set();
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(config.channelName) : null;
    let memoryData = null;
    let memoryTime = 0;
    let memoryIncludesDetails = false;
    let pendingRequest = null;
    let pollTimer = null;

    const normalizeData = data => window.TeamNames
        ? { ...data, matches: (data?.matches || []).map(window.TeamNames.normalizeMatch) }
        : data;

    const cacheKeys = includeDetails => ({
        data: includeDetails ? `${config.cacheKey}_details` : config.cacheKey,
        time: includeDetails ? `${config.cacheTimeKey}_details` : config.cacheTimeKey
    });

    const pollIntervalFor = data => data?.matches?.some(match => ['IN_PLAY', 'PAUSED'].includes(match.status))
        ? config.livePollInterval
        : config.pollInterval;

    const schedulePoll = data => {
        if (pollTimer) clearTimeout(pollTimer);
        pollTimer = setTimeout(async () => {
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
        if (cached) {
            memoryData = cached.data;
            memoryTime = cached.time;
            memoryIncludesDetails = includeDetails;
            return cached.data;
        }
        if (pendingRequest?.includeDetails === includeDetails) return pendingRequest.promise;

        const promise = (async () => {
            const requestStarted = Date.now();
            const refreshedCache = force ? null : getFreshCache(includeDetails);
            if (refreshedCache) {
                memoryData = refreshedCache.data;
                memoryTime = refreshedCache.time;
                memoryIncludesDetails = includeDetails;
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
                if (availableCache && availableCache.time > requestStarted) {
                    memoryData = availableCache.data;
                    memoryTime = availableCache.time;
                    memoryIncludesDetails = includeDetails;
                    return availableCache.data;
                }
                if (Date.now() - lockStarted >= config.lockDuration) throw new Error('Timed out waiting for match data refresh.');
                await wait(100);
            }

            try {
                const response = await fetch(`/api/matches${includeDetails ? '?details=1' : ''}`, { cache: 'no-store' });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = normalizeData(await response.json());
                const time = Date.now();
                const keys = cacheKeys(includeDetails);
                localStorage.setItem(keys.data, JSON.stringify(data));
                localStorage.setItem(keys.time, time.toString());
                publish(data, time, includeDetails);
                return data;
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

    window.DataManager = { config, getMatchData, refresh, subscribe, start };
    window.getIndividualScoringEvents = scorers => (scorers || []).filter(scorer => scorer?.ownGoal !== true);
    window.getMatchData = getMatchData;
})();
