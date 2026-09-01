(() => {
    const cacheKey = 'pl_match_data_v2';
    const cacheTimeKey = 'pl_match_data_time';
    const lockKey = 'pl_match_data_lock';
    const cacheDuration = 30 * 1000;
    const lockDuration = 15 * 1000;
    let pendingRequest = null;

    const readCache = () => {
        const cachedData = localStorage.getItem(cacheKey);
        const cachedTime = Number(localStorage.getItem(cacheTimeKey));
        if (!cachedData || !cachedTime || Date.now() - cachedTime >= cacheDuration) return null;
        return JSON.parse(cachedData);
    };

    const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

    async function getMatchData() {
        const cachedData = readCache();
        if (cachedData) return cachedData;
        if (pendingRequest) return pendingRequest;

        pendingRequest = (async () => {
            const refreshedCache = readCache();
            if (refreshedCache) return refreshedCache;

            const owner = `${Date.now()}-${Math.random()}`;
            let ownsLock = false;
            const lockStarted = Date.now();

            while (!ownsLock) {
                const currentLock = JSON.parse(localStorage.getItem(lockKey) || 'null');
                if (!currentLock || Date.now() - currentLock.started >= lockDuration) {
                    localStorage.setItem(lockKey, JSON.stringify({ owner, started: Date.now() }));
                    ownsLock = JSON.parse(localStorage.getItem(lockKey) || 'null')?.owner === owner;
                }
                if (ownsLock) break;
                const availableCache = readCache();
                if (availableCache) return availableCache;
                if (Date.now() - lockStarted >= lockDuration) throw new Error('Timed out waiting for match data refresh.');
                await wait(100);
            }

            try {
                const response = await fetch('/api/matches', { cache: 'no-store' });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                localStorage.setItem(cacheKey, JSON.stringify(data));
                localStorage.setItem(cacheTimeKey, Date.now().toString());
                return data;
            } finally {
                const currentLock = JSON.parse(localStorage.getItem(lockKey) || 'null');
                if (currentLock?.owner === owner) localStorage.removeItem(lockKey);
            }
        })();

        try {
            return await pendingRequest;
        } finally {
            pendingRequest = null;
        }
    }

    window.getMatchData = getMatchData;
})();
