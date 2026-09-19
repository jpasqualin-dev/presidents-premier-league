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
    let pendingRequest = null;
    let pollTimer = null;

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

    const readCache = () => {
        try {
            const cachedData = localStorage.getItem(config.cacheKey);
            const cachedTime = Number(localStorage.getItem(config.cacheTimeKey));
            if (!cachedData || !cachedTime || Date.now() - cachedTime >= config.ttl) return null;
            return { data: JSON.parse(cachedData), time: cachedTime };
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

    const publish = (data, time) => {
        memoryData = data;
        memoryTime = time;
        notifySubscribers(data);
        channel?.postMessage({ data, time });
    };

    const getFreshCache = () => {
        if (memoryData && Date.now() - memoryTime < config.ttl) return { data: memoryData, time: memoryTime };
        return readCache();
    };

    async function getMatchData({ force = false } = {}) {
        const cached = force ? null : getFreshCache();
        if (cached) {
            memoryData = cached.data;
            memoryTime = cached.time;
            return cached.data;
        }
        if (pendingRequest) return pendingRequest;

        pendingRequest = (async () => {
            const requestStarted = Date.now();
            const refreshedCache = force ? null : getFreshCache();
            if (refreshedCache) {
                memoryData = refreshedCache.data;
                memoryTime = refreshedCache.time;
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
                const availableCache = readCache();
                if (availableCache && availableCache.time > requestStarted) {
                    memoryData = availableCache.data;
                    memoryTime = availableCache.time;
                    return availableCache.data;
                }
                if (Date.now() - lockStarted >= config.lockDuration) throw new Error('Timed out waiting for match data refresh.');
                await wait(100);
            }

            try {
                const response = await fetch('/api/matches', { cache: 'no-store' });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                const time = Date.now();
                localStorage.setItem(config.cacheKey, JSON.stringify(data));
                localStorage.setItem(config.cacheTimeKey, time.toString());
                publish(data, time);
                return data;
            } finally {
                const currentLock = JSON.parse(localStorage.getItem(config.lockKey) || 'null');
                if (currentLock?.owner === owner) localStorage.removeItem(config.lockKey);
            }
        })();

        try {
            return await pendingRequest;
        } finally {
            pendingRequest = null;
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

    function start() {
        if (pollTimer) return;
        const cached = getFreshCache();
        if (cached) {
            memoryData = cached.data;
            memoryTime = cached.time;
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
        memoryData = update.data;
        memoryTime = update.time;
        notifySubscribers(update.data);
    }

    channel?.addEventListener('message', handleExternalUpdate);
    window.addEventListener('storage', event => {
        if (event.key !== config.cacheTimeKey || !event.newValue) return;
        const cached = readCache();
        if (cached) handleExternalUpdate({ newValue: JSON.stringify(cached) });
    });

    window.DataManager = { config, getMatchData, refresh, subscribe, start };
    window.getMatchData = getMatchData;
})();
