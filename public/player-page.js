(() => {
    window.SharedPlayerPage = true;
    let shouldPositionInitialCard = true;
    const playerName = document.querySelector('.profile-info h1')?.textContent.trim() || '';
    const { draftData, getOwnerOfTeam } = PplLeagueConfig;
    const teamLogos = TeamNames.logoMap();
    const cleanName = name => TeamNames.shortName(name);

    window.playerTeamLogos = teamLogos;
    window.playerTeams = draftData[playerName] || [];
    window.matchDrawerOwnerResolver = getOwnerOfTeam;
    window.playerPageDraftData = draftData;
    window.playerPageGetShortTeamName = cleanName;

    function addFixtureToMatchweek(matchweek, match, myTeam, opponentTeam, venue, isHome) {
        let score = '';
        let result = 'upcoming';
        let points = 0;
        const isComplete = match.status === 'FINISHED';
        if (['FINISHED', 'IN_PLAY', 'PAUSED'].includes(match.status)) {
            const myScore = isHome ? match.score.fullTime.home : match.score.fullTime.away;
            const opponentScore = isHome ? match.score.fullTime.away : match.score.fullTime.home;
            score = `${myScore} - ${opponentScore}`;
            if (myScore > opponentScore) { result = 'win'; points = 3; }
            else if (myScore < opponentScore) result = 'loss';
            else { result = 'draw'; points = 1; }
        } else {
            score = new Date(match.utcDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
        }
        matchweek.weeklyPoints += points;
        matchweek.fixtures.push({
            matchId: match.id,
            team: cleanName(myTeam),
            teamFull: myTeam,
            venue,
            opp: cleanName(opponentTeam),
            oppFull: opponentTeam,
            manager: getOwnerOfTeam(opponentTeam),
            score,
            result,
            isComplete
        });
    }

    async function fetchPlayerFixtures() {
        const myTeams = draftData[playerName] || [];
        try {
            const data = await getMatchData({ includeDetails: true });
            const matchweeks = {};
            (data.matches || []).forEach(match => {
                const home = match.homeTeam.name;
                const away = match.awayTeam.name;
                const isHomeMyTeam = myTeams.some(team => home.toLowerCase().includes(team.toLowerCase()));
                const isAwayMyTeam = myTeams.some(team => away.toLowerCase().includes(team.toLowerCase()));
                if (!isHomeMyTeam && !isAwayMyTeam) return;
                const matchweek = match.matchday;
                matchweeks[matchweek] ||= { matchweek, weeklyPoints: 0, fixtures: [] };
                if (isHomeMyTeam && isAwayMyTeam) {
                    addFixtureToMatchweek(matchweeks[matchweek], match, home, away, 'HOME', true);
                    addFixtureToMatchweek(matchweeks[matchweek], match, away, home, 'AWAY', false);
                } else if (isHomeMyTeam) addFixtureToMatchweek(matchweeks[matchweek], match, home, away, 'HOME', true);
                else addFixtureToMatchweek(matchweeks[matchweek], match, away, home, 'AWAY', false);
            });
            window.playerMatches = data.matches || [];
            renderPage(Object.values(matchweeks).sort((left, right) => left.matchweek - right.matchweek), window.playerMatches);
        } catch (error) {
            console.error('Fetch error:', error);
            document.getElementById('fixtures-container').innerHTML = '<div class="loading">Unable to load match data. Please check your backend route connection.</div>';
            revealPlayerPage();
        }
    }

    function renderPage(matchweeks, matches) {
        const container = document.getElementById('fixtures-container');
        container.innerHTML = '';
        if (!matchweeks.length) {
            container.innerHTML = '<div class="loading">No matchweek fixtures found.</div>';
            revealPlayerPage();
            return;
        }
        const currentMatchweekIndex = matchweeks.reduce((latestIndex, matchweek, index) => matchweek.fixtures.some(fixture => fixture.result !== 'upcoming') ? index : latestIndex, -1);
        let totalPoints = 0;
        matchweeks.forEach((matchweek, index) => {
            totalPoints += matchweek.weeklyPoints;
            const card = document.createElement('div');
            card.className = 'mw-card';
            if (index === currentMatchweekIndex) card.id = 'current-matchweek';
            const fixtures = matchweek.fixtures.map(fixture => {
                const logoKey = Object.keys(teamLogos).find(key => fixture.oppFull.toLowerCase().includes(key.toLowerCase()));
                const logo = logoKey ? `<img src="${teamLogos[logoKey]}" class="team-icon" alt="${logoKey}">` : '';
                return `<div class="fixture-item" data-match-id="${fixture.matchId}" role="button" tabindex="0" aria-label="View details for ${fixture.teamFull} versus ${fixture.oppFull}"><div class="match-details"><div class="my-team">${fixture.team} <span class="venue-tag">${fixture.venue}</span></div><div class="opponent-line">vs ${logo} ${fixture.opp} <span class="manager-tag">(${fixture.manager})</span></div></div><div class="result-badge ${fixture.result}">${fixture.score}</div></div>`;
            }).join('');
            const hasResults = matchweek.fixtures.some(fixture => fixture.isComplete);
            const attributes = hasResults ? `role="button" tabindex="0" onclick="event.stopPropagation(); PplWeeklyDrawer.open({ week: ${matchweek.matchweek}, matches: window.playerMatches, draftData: window.playerPageDraftData, getOwnerOfTeam: window.matchDrawerOwnerResolver, getShortTeamName: window.playerPageGetShortTeamName, openMatch: 'openMatchDrawer' })" onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); PplWeeklyDrawer.open({ week: ${matchweek.matchweek}, matches: window.playerMatches, draftData: window.playerPageDraftData, getOwnerOfTeam: window.matchDrawerOwnerResolver, getShortTeamName: window.playerPageGetShortTeamName, openMatch: 'openMatchDrawer' }); }"` : 'aria-disabled="true"';
            card.innerHTML = `<div class="mw-header" ${attributes}><span class="mw-title${hasResults ? '' : ' mw-title-disabled'}">Matchweek ${matchweek.matchweek}${getMatchweekStars(matchweek, matches)}</span><span class="mw-points">+${matchweek.weeklyPoints} PTS</span></div><div>${fixtures}</div>`;
            container.appendChild(card);
        });
        window.bindSharedMatchRows(container);
        document.getElementById('total-pts').textContent = totalPoints;
        updateAchievements(matchweeks, matches);
        if (shouldPositionInitialCard) {
            setTimeout(positionCurrentMatchweek, 100);
            shouldPositionInitialCard = false;
        }
    }

    function positionCurrentMatchweek() {
        const profileCard = document.querySelector('.profile-card');
        const currentMatchweek = document.getElementById('current-matchweek');
        if (!profileCard || !currentMatchweek) return revealPlayerPage();
        const stickyTop = parseFloat(getComputedStyle(profileCard).top) || 0;
        const targetTop = stickyTop + profileCard.getBoundingClientRect().height + 14;
        const y = currentMatchweek.getBoundingClientRect().top + window.pageYOffset - targetTop;
        window.scrollTo({ top: Math.max(0, y), behavior: 'auto' });
        revealPlayerPage();
    }

    function revealPlayerPage() {
        document.body.classList.add('player-page-ready');
    }

    function updatePlayerCardBackdrop() {
        const profileCard = document.querySelector('.profile-card');
        if (!profileCard) return;
        const profileStyle = getComputedStyle(profileCard);
        document.documentElement.style.setProperty('--profile-card-sticky-top', profileStyle.top);
        document.documentElement.style.setProperty('--profile-card-height', `${profileCard.getBoundingClientRect().height}px`);
    }

    function getMatchweekStars(matchweek, matches) {
        if (!matchweek.fixtures.every(fixture => fixture.isComplete)) return '';
        const results = matchweek.fixtures.map(fixture => fixture.result);
        const weeklyPoints = {};
        matches.filter(match => match.status === 'FINISHED' && match.matchday === matchweek.matchweek).forEach(match => {
            const homeOwner = getOwnerOfTeam(match.homeTeam.name);
            const awayOwner = getOwnerOfTeam(match.awayTeam.name);
            const homeScore = match.score.fullTime.home;
            const awayScore = match.score.fullTime.away;
            if (homeScore === null || awayScore === null) return;
            [homeOwner, awayOwner].forEach(owner => { if (owner !== 'Free Agent / Unassigned') weeklyPoints[owner] ||= 0; });
            if (homeOwner !== 'Free Agent / Unassigned') weeklyPoints[homeOwner] += homeScore > awayScore ? 3 : homeScore === awayScore ? 1 : 0;
            if (awayOwner !== 'Free Agent / Unassigned') weeklyPoints[awayOwner] += awayScore > homeScore ? 3 : awayScore === homeScore ? 1 : 0;
        });
        const weeklyScores = Object.values(weeklyPoints);
        const isFullMatchweek = matches.filter(match => match.status === 'FINISHED' && match.matchday === matchweek.matchweek).length >= 10;
        const stars = [
            isFullMatchweek && weeklyScores.length > 0 && matchweek.weeklyPoints === Math.max(...weeklyScores) ? 'Won week' : '',
            !results.includes('loss') ? 'Undefeated' : '',
            results.every(result => result === 'win') ? 'Perfect week' : ''
        ].filter(Boolean);
        return stars.length ? `<span class="mw-achievement-stars" title="${stars.join(', ')}" aria-label="${stars.join(', ')}">${'&#9733;'.repeat(stars.length)}</span>` : '';
    }

    function updateAchievements(matchweeks, matches) {
        const weeklyPoints = {};
        matches.filter(match => match.status === 'FINISHED').forEach(match => {
            const matchweek = match.matchday;
            const homeOwner = getOwnerOfTeam(match.homeTeam.name);
            const awayOwner = getOwnerOfTeam(match.awayTeam.name);
            const homeScore = match.score.fullTime.home;
            const awayScore = match.score.fullTime.away;
            if (homeScore === null || awayScore === null) return;
            weeklyPoints[matchweek] ||= {};
            [homeOwner, awayOwner].forEach(owner => { if (owner !== 'Free Agent / Unassigned') weeklyPoints[matchweek][owner] ||= 0; });
            if (homeOwner !== 'Free Agent / Unassigned') weeklyPoints[matchweek][homeOwner] += homeScore > awayScore ? 3 : homeScore === awayScore ? 1 : 0;
            if (awayOwner !== 'Free Agent / Unassigned') weeklyPoints[matchweek][awayOwner] += awayScore > homeScore ? 3 : awayScore === homeScore ? 1 : 0;
        });
        const completedWeeks = matchweeks.filter(matchweek => matchweek.fixtures.length > 0 && matchweek.fixtures.every(fixture => fixture.isComplete) && matches.filter(match => match.status === 'FINISHED' && match.matchday === matchweek.matchweek).length >= 10);
        const achievements = completedWeeks.reduce((totals, matchweek) => {
            const results = matchweek.fixtures.map(fixture => fixture.result);
            const scores = Object.values(weeklyPoints[matchweek.matchweek] || {});
            const isWeeklyLeader = scores.length > 0 && matchweek.weeklyPoints === Math.max(...scores);
            return { weeksWon: totals.weeksWon + Number(isWeeklyLeader), undefeatedWeeks: totals.undefeatedWeeks + Number(!results.includes('loss')), perfectWeeks: totals.perfectWeeks + Number(results.every(result => result === 'win')) };
        }, { weeksWon: 0, undefeatedWeeks: 0, perfectWeeks: 0 });
        document.getElementById('weeks-won').textContent = achievements.weeksWon;
        document.getElementById('undefeated-weeks').textContent = achievements.undefeatedWeeks;
        document.getElementById('perfect-weeks').textContent = achievements.perfectWeeks;
        renderHeadToHead(matches);
    }

    function renderHeadToHead(matches) {
        const opponents = Object.keys(draftData).filter(owner => owner !== playerName);
        const records = Object.fromEntries(opponents.map(owner => [owner, { wins: 0, draws: 0, losses: 0, points: 0 }]));
        matches.filter(match => match.status === 'FINISHED').forEach(match => {
            const homeOwner = getOwnerOfTeam(match.homeTeam.name);
            const awayOwner = getOwnerOfTeam(match.awayTeam.name);
            const homeScore = match.score.fullTime.home;
            const awayScore = match.score.fullTime.away;
            if (homeScore === null || awayScore === null) return;
            const opponent = homeOwner === playerName ? awayOwner : awayOwner === playerName ? homeOwner : null;
            if (!records[opponent]) return;
            const currentScore = homeOwner === playerName ? homeScore : awayScore;
            const opponentScore = homeOwner === playerName ? awayScore : homeScore;
            if (currentScore > opponentScore) { records[opponent].wins += 1; records[opponent].points += 3; }
            else if (currentScore === opponentScore) { records[opponent].draws += 1; records[opponent].points += 1; }
            else records[opponent].losses += 1;
        });
        document.getElementById('head-to-head-details').innerHTML = opponents.map(owner => ({ owner, ...records[owner] })).sort((left, right) => right.points - left.points || left.owner.localeCompare(right.owner)).map(record => `<div class="head-to-head-row"><span>${playerName} vs. ${record.owner}</span><span class="head-to-head-record">${record.wins}-${record.draws}-${record.losses}</span><span class="head-to-head-points">${record.points} PTS</span></div>`).join('');
    }

    function toggleProfileCard() {
        const card = document.querySelector('.profile-card');
        const previousPosition = captureProfileContentPosition();
        card.setAttribute('aria-expanded', String(card.getAttribute('aria-expanded') !== 'true'));
        preserveProfileContentPosition(previousPosition);
    }

    function captureProfileContentPosition() {
        const card = document.querySelector('.profile-card');
        const cardBottom = card.getBoundingClientRect().bottom;
        const visibleCard = [...document.querySelectorAll('.mw-card')].find(matchweek => {
            const rect = matchweek.getBoundingClientRect();
            return rect.bottom > cardBottom && rect.top < window.innerHeight;
        });
        return visibleCard ? { element: visibleCard, top: visibleCard.getBoundingClientRect().top } : null;
    }

    function preserveProfileContentPosition(previousPosition) {
        requestAnimationFrame(() => {
            updatePlayerCardBackdrop();
            if (!previousPosition || window.scrollY <= 1) return;
            const positionDelta = previousPosition.element.getBoundingClientRect().top - previousPosition.top;
            if (positionDelta) window.scrollBy(0, positionDelta);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const card = document.querySelector('.profile-card');
        updatePlayerCardBackdrop();
        card.addEventListener('click', toggleProfileCard);
        if ('ResizeObserver' in window) new ResizeObserver(updatePlayerCardBackdrop).observe(card);
        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleProfileCard(); }
        });
        DataManager.subscribe(data => {
            if (data === null) {
                document.getElementById('fixtures-container').innerHTML = '<div class="loading">Unable to load match data. Please check your backend route connection.</div>';
                revealPlayerPage();
                return;
            }
            fetchPlayerFixtures();
        });
        DataManager.start();
    });
})();