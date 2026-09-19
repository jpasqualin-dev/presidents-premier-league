(function () {
    const ignoredEventPattern = /kick.?off|match start|half.?time|halftime|start (of )?(the )?(second|2nd) half|second half|delay|delayed|end regular time|end of regular time|full time/i;

    const eventText = value => String(value || '').trim().toLowerCase();

    window.dedupeDrawerEvents = function (events) {
        const unique = new Map();
        (events || []).forEach(event => {
            const substitution = Boolean(event.substitution || event.eventType?.toLowerCase().includes('substitution'));
            const minute = eventText(event.minute || event.clockDisplay);
            const team = eventText(event.teamProviderId);
            const comingOn = eventText(event.comingOn || event.playerOn || event.substitute || event.athleteName);
            const goingOff = eventText(event.goingOff || event.playerOff || event.replacedPlayer);
            const key = substitution
                ? ['substitution', team, minute, comingOn, goingOff].join('|')
                : [eventText(event.eventType || event.type), team, minute, eventText(event.athleteProviderId || event.athleteName), Boolean(event.scoringPlay), Boolean(event.redCard), Boolean(event.yellowCard)].join('|');
            unique.set(key, { ...(unique.get(key) || {}), ...event });
        });
        return [...unique.values()];
    };

    window.getDrawerMatchEvents = function (match) {
        const scorers = (match.scorers || []).map(item => ({ ...item, eventType: 'Goal' }));
        const nonScoringEvents = window.dedupeDrawerEvents(match.events || []).filter(event => !event.scoringPlay && !/^goal|score/i.test(String(event.eventType || event.type || '')));
        return [...scorers, ...nonScoringEvents]
            .filter(event => !ignoredEventPattern.test(String(event.eventType || event.type || event.event_type || '')))
            .sort((a, b) => {
                const minute = event => {
                    const value = parseInt(event.minute || event.clockDisplay || '', 10);
                    return Number.isFinite(value) ? value : Infinity;
                };
                return minute(a) - minute(b);
            });
    };

    const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
    const getOwner = teamName => typeof window.matchDrawerOwnerResolver === 'function' ? window.matchDrawerOwnerResolver(teamName) || '' : '';
    const getTeam = (match, side) => side === 'home' ? match.homeTeam : match.awayTeam;
    const formatDate = value => new Date(value).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const statKey = name => String(name || '').replace(/[^a-zA-Z]/g, '').toLowerCase();

    function renderStats(match) {
        const definitions = [['Possession', ['possessionpct', 'possession', 'ballpossession']], ['Total Shots', ['totalshots', 'shots']], ['Shots on Target', ['shotsontarget']], ['Fouls', ['foulscommitted', 'fouls']]];
        return definitions.map(([label, aliases]) => {
            const values = ['home', 'away'].map(side => {
                const team = getTeam(match, side);
                const stat = (match.teamStats || []).find(item => aliases.includes(statKey(item.name)) && String(item.teamProviderId) === String(team.id || team.providerId));
                const value = stat?.displayValue ?? stat?.value ?? '-';
                if (label !== 'Possession' || value === '-') return value;
                const percentage = Number.parseFloat(String(value).replace('%', ''));
                return Number.isFinite(percentage) ? `${Math.round(percentage)}%` : value;
            });
            const parsed = values.map(value => Number.parseFloat(String(value).replace('%', '')));
            const numeric = parsed.map(value => Number.isFinite(value) ? value : 0);
            const total = numeric[0] + numeric[1] || 1;
            const winner = parsed.every(Number.isFinite) && parsed[0] !== parsed[1] ? (label === 'Fouls' ? (parsed[0] < parsed[1] ? 0 : 1) : (parsed[0] > parsed[1] ? 0 : 1)) : -1;
            const valueClass = index => winner === index ? ` stat-leader stat-leader-${index === 0 ? 'home' : 'away'}` : '';
            return `<div class="stat-row"><span class="stat-value${valueClass(0)}">${escapeHtml(values[0])}</span><span class="stat-label">${escapeHtml(label)}</span><span class="stat-value${valueClass(1)}">${escapeHtml(values[1])}</span><span class="stat-bars"><span class="stat-bar-home" style="width:${numeric[0] / total * 100}%"></span><span class="stat-bar-away" style="width:${numeric[1] / total * 100}%"></span></span></div>`;
        }).join('');
    }

    function renderEvents(match) {
        const homeId = String(match.homeTeam.id || match.homeTeam.providerId), awayId = String(match.awayTeam.id || match.awayTeam.providerId);
        const events = window.getDrawerMatchEvents(match), halfTime = match.score?.halfTime;
        const hasHalfTime = halfTime?.home != null && halfTime?.away != null;
        const hasFullTime = match.status === 'FINISHED' && match.score?.fullTime?.home != null && match.score?.fullTime?.away != null;
        let runningHome = 0, runningAway = 0;
        const period = label => `<div class="timeline-period"><span></span><span class="timeline-period-label">${escapeHtml(label)}</span><span></span></div>`;
        const renderEvent = event => {
            const teamId = String(event.teamProviderId || ''), side = teamId === homeId ? 'home' : teamId === awayId ? 'away' : 'away';
            const isGoal = event.eventType === 'Goal' || event.scoringPlay, isRed = Boolean(event.redCard), isYellow = Boolean(event.yellowCard), isSub = Boolean(event.substitution || event.eventType?.toLowerCase().includes('substitution'));
            const minute = String(event.minute || event.clockDisplay || '').trim().replace(/'+$/, '');
            let icon = '', detail = '', secondary = '';
            if (isGoal) {
                if (event.ownGoal) side === 'home' ? runningAway++ : runningHome++; else side === 'home' ? runningHome++ : runningAway++;
                icon = '<span class="event-icon goal" aria-hidden="true">⚽</span>';
                detail = `<span>${escapeHtml(event.athleteName || 'Goal')} (${runningHome} - ${runningAway})</span>`;
                secondary = [event.assistName ? `Assist by ${escapeHtml(event.assistName)}` : '', event.penalty ? 'Penalty' : '', event.ownGoal ? 'Own goal' : ''].filter(Boolean).map(item => `<div class="event-assist">${item}</div>`).join('');
            } else if (isSub) {
                const on = event.comingOn || event.playerOn || event.substitute || event.athleteName || 'Player coming on', off = event.goingOff || event.playerOff || event.replacedPlayer || '';
                icon = '<span class="event-icon" aria-hidden="true">↔</span>'; detail = `<span><span class="event-sub-on">${escapeHtml(on)}</span>${off ? `<br><span class="event-sub-off">${escapeHtml(off)}</span>` : ''}</span>`;
            } else if (isRed || isYellow) { icon = `<span class="event-icon ${isRed ? 'red' : 'yellow'}" aria-hidden="true"></span>`; detail = `<span>${escapeHtml(event.athleteName || (isRed ? 'Red card' : 'Yellow card'))}</span>`; }
            else detail = `<span>${escapeHtml(event.athleteName || event.eventType || 'Match event')}</span>`;
            const main = side === 'home' ? `${icon}${detail}` : `${detail}${icon}`, eventClass = isGoal ? 'goal' : isRed || isYellow ? 'card' : isSub ? 'substitution' : 'generic';
            return `<div class="timeline-event ${side} ${eventClass}"><span class="event-copy"><span class="event-main">${main}</span>${secondary}</span><span class="event-minute">${escapeHtml(minute ? `${minute}'` : '')}</span></div>`;
        };
        const items = [period('Kick-off')]; let halfTimeInserted = false;
        events.forEach(event => { if (hasHalfTime && !halfTimeInserted && parseInt(event.minute || event.clockDisplay || 0, 10) >= 45) { items.push(period(`HT ${halfTime.home} - ${halfTime.away}`)); halfTimeInserted = true; } items.push(renderEvent(event)); });
        if (hasHalfTime && !halfTimeInserted) items.push(period(`HT ${halfTime.home} - ${halfTime.away}`));
        if (hasFullTime) items.push(period(`FT ${match.score.fullTime.home} - ${match.score.fullTime.away}`));
        if (!events.length && !hasHalfTime && !hasFullTime) items.push('<p class="empty-detail">No match events are available yet.</p>');
        return `<div class="timeline">${items.join('')}</div>`;
    }

    function renderLineups(match) {
        const lineups = match.lineups;
        if (!lineups?.home?.players?.length && !lineups?.away?.players?.length) return '<p class="empty-detail">Lineups are not available yet</p>';
        return `<div class="lineups">${['home', 'away'].map(side => { const lineup = lineups[side] || {}, players = Array.isArray(lineup.players) ? lineup.players : []; const renderPlayers = group => group.length ? `<ol>${group.map(player => `<li>${escapeHtml(typeof player === 'string' ? player : player.name || player.displayName || player.athlete?.displayName || player.athlete?.shortName || 'Unknown player')}${player.position ? ` <span class="lineup-position">(${escapeHtml(player.position)})</span>` : ''}</li>`).join('')}</ol>` : '<p class="empty-detail">Unavailable</p>'; return `<div class="lineup-team"><h4>${escapeHtml(getTeam(match, side).name)}</h4><div class="formation">${escapeHtml(lineup.formation || 'Formation unavailable')}</div><div class="lineup-group"><h5>Starting XI</h5>${renderPlayers(players.filter(player => player.starter))}</div><div class="lineup-group"><h5>Substitutes</h5>${renderPlayers(players.filter(player => !player.starter))}</div></div>`; }).join('')}</div>`;
    }

    function renderScorers(match) {
        const scorers = Array.isArray(match.scorers) ? match.scorers : [], minute = scorer => Number.isFinite(Number(scorer.minute)) ? Number(scorer.minute) : Infinity;
        const formatMinute = value => { const text = String(value || '').trim(); return text ? `${text.replace(/'+$/, '')}'` : ''; };
        const renderTeam = teamId => { const items = scorers.filter(scorer => String(scorer.teamProviderId) === String(teamId)).sort((a, b) => minute(a) - minute(b)); return items.length ? items.map(scorer => `<span class="match-scorer">${escapeHtml(scorer.athleteName)} ${escapeHtml(formatMinute(scorer.minute))}${scorer.ownGoal ? ' (OG)' : ''}${scorer.penalty ? ' (P)' : ''}</span>`).join('') : '<span class="match-scorer-empty">No goals</span>'; };
        return `<div class="match-scorers"><div class="match-scorer-column">${renderTeam(match.homeTeam.id || match.homeTeam.providerId)}</div><div class="match-scorer-column away">${renderTeam(match.awayTeam.id || match.awayTeam.providerId)}</div></div>`;
    }

    window.renderSharedMatchDetail = function (match) {
        const home = match.homeTeam, away = match.awayTeam, score = match.score?.fullTime?.home == null ? 'vs' : `${match.score.fullTime.home} - ${match.score.fullTime.away}`;
        const status = match.status === 'FINISHED' ? 'Full time' : match.status === 'IN_PLAY' ? `${match.minute || 'Live'}'` : match.status === 'PAUSED' ? 'Half time' : 'Upcoming';
        return `<section class="match-hero"><div class="match-meta">${escapeHtml(formatDate(match.utcDate))}</div><div class="match-scoreline"><div class="match-team"><span>${escapeHtml(home.name)}</span>${home.crest ? `<img src="${escapeHtml(home.crest)}" alt="">` : ''}<span class="match-team-owner">${escapeHtml(getOwner(home.name))}</span></div><div class="match-score">${escapeHtml(score)}<span class="match-status">${escapeHtml(status)}</span></div><div class="match-team"><span>${escapeHtml(away.name)}</span>${away.crest ? `<img src="${escapeHtml(away.crest)}" alt="">` : ''}<span class="match-team-owner">${escapeHtml(getOwner(away.name))}</span></div></div><div class="match-venue">${escapeHtml(match.venue || 'Venue unavailable')}</div>${renderScorers(match)}</section><section class="match-detail-section"><h3>Match Stats</h3>${renderStats(match)}</section><section class="match-detail-section"><h3>Match Events</h3>${renderEvents(match)}</section><section class="match-detail-section"><h3>Lineups</h3>${renderLineups(match)}</section>`;
    };

    window.fetchSharedMatchById = async function (matchId) {
        const data = await getMatchData(), match = data?.matches?.find(item => String(item.id) === String(matchId));
        if (!match) throw new Error('Match details were not found.');
        if (match.provider === 'espn' || String(match.id).startsWith('espn:')) {
            try {
                const response = await fetch(`/api/match-details?event=${encodeURIComponent(match.providerEventId || match.id)}`, { cache: 'no-store' });
                if (response.ok) {
                    const detailData = await response.json();
                    if (detailData.teamStats?.length) match.teamStats = detailData.teamStats;
                    if (detailData.lineups) match.lineups = detailData.lineups;
                    if (detailData.scorers?.length) match.scorers = detailData.scorers;
                    if (detailData.halfTime) match.score = { ...(match.score || {}), halfTime: detailData.halfTime };
                    match.events = window.dedupeDrawerEvents([...(match.events || []), ...(detailData.events || []), ...(detailData.substitutions || [])]);
                }
            } catch (error) { console.warn('Optional ESPN match details unavailable:', error); }
        }
        return match;
    };

    window.openSharedMatchDrawer = async function (matchId, options = {}) {
        const overlay = document.getElementById('match-drawer-overlay'), drawer = overlay.querySelector('.match-drawer'), content = document.getElementById('match-detail-content');
        const header = overlay.querySelector('.match-drawer-header');
        header?.classList.remove('weekly-mode');
        header?.querySelector('.match-drawer-back')?.remove();
        if (header && options.backButtonMarkup) header.insertAdjacentHTML('afterbegin', options.backButtonMarkup);
        document.getElementById('match-drawer-title').textContent = 'Match details';
        drawer.scrollTop = 0; overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden', 'false'); document.body.classList.add('drawer-open'); content.innerHTML = '<p class="empty-detail">Loading match details...</p>';
        try { content.innerHTML = window.renderSharedMatchDetail(await window.fetchSharedMatchById(matchId)); }
        catch (error) { console.error('Error fetching match details:', error); content.innerHTML = '<p class="empty-detail">Unable to load match details.</p>'; }
    };

    window.closeSharedMatchDrawer = function (event) {
        if (event && event.target.id !== 'match-drawer-overlay') return;
        const overlay = document.getElementById('match-drawer-overlay'); overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden', 'true'); document.body.classList.remove('drawer-open');
        overlay.querySelector('.match-drawer-back')?.remove();
        overlay.querySelector('.match-drawer-header')?.classList.remove('weekly-mode');
        const title = document.getElementById('match-drawer-title'); if (title) title.textContent = 'Match details';
    };
})();
