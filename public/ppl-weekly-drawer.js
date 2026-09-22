(function () {
    const state = { weeks: [], index: 0, context: null, expanded: new Set() };
    const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

    function isCompletedMatch(match) {
        return match?.status === 'FINISHED' || match?.status === 'FT' || match?.status === 'post' || match?.status_completed === true;
    }

    function sameTeam(left, right) {
        const leftName = String(left || '').toLowerCase();
        const rightName = String(right || '').toLowerCase();
        return leftName.includes(rightName) || rightName.includes(leftName);
    }

    function buildWeeks(matches, draftData, getOwnerOfTeam) {
        const grouped = new Map();
        (matches || []).forEach(match => {
            if (match.matchday == null) return;
            if (!grouped.has(match.matchday)) grouped.set(match.matchday, []);
            grouped.get(match.matchday).push(match);
        });
        return [...grouped.entries()].sort(([left], [right]) => Number(left) - Number(right)).map(([week, weekMatches]) => {
            const owners = Object.fromEntries(Object.keys(draftData).map(owner => [owner, { points: 0, results: [], goalDifference: 0 }]));
            weekMatches.forEach(match => {
                if (!isCompletedMatch(match)) return;
                const homeOwner = getOwnerOfTeam(match.homeTeam.name), awayOwner = getOwnerOfTeam(match.awayTeam.name);
                const homeScore = match.score?.fullTime?.home ?? 0, awayScore = match.score?.fullTime?.away ?? 0;
                [[homeOwner, homeScore > awayScore ? 3 : homeScore === awayScore ? 1 : 0, homeScore > awayScore ? 'win' : homeScore === awayScore ? 'draw' : 'loss', homeScore - awayScore], [awayOwner, awayScore > homeScore ? 3 : awayScore === homeScore ? 1 : 0, awayScore > homeScore ? 'win' : awayScore === homeScore ? 'draw' : 'loss', awayScore - homeScore]].forEach(([owner, points, result, goalDifference]) => {
                    if (!owner) return;
                    owners[owner] ||= { points: 0, results: [], goalDifference: 0 };
                    owners[owner].points += points;
                    owners[owner].goalDifference += goalDifference;
                    owners[owner].results.push(result);
                });
            });
            const highestPoints = Math.max(...Object.values(owners).map(owner => owner.points), 0);
            const ownerDetails = Object.entries(owners).map(([owner, details]) => {
                const achievements = details.results.length && details.points === highestPoints ? ['Weekly points leader'] : [];
                if (details.results.length && !details.results.includes('loss')) achievements.push('Undefeated week');
                if (details.results.length && details.results.every(result => result === 'win')) achievements.push('Perfect week');
                return { owner, points: details.points, goalDifference: details.goalDifference, wins: details.results.filter(result => result === 'win').length, draws: details.results.filter(result => result === 'draw').length, losses: details.results.filter(result => result === 'loss').length, stars: achievements.length, achievements };
            }).sort((left, right) => right.points - left.points || right.goalDifference - left.goalDifference || left.owner.localeCompare(right.owner));
            return { week, ownerDetails, matches: weekMatches };
        });
    }

    function renderWeeklyDetail(week) {
        const context = state.context;
        if (!week) return '<section class="match-detail-section"><p class="empty-detail">No weekly results yet.</p></section>';
        const ownerSections = week.ownerDetails.map(owner => {
            const goalDifferenceClass = owner.goalDifference > 0 ? 'pill-green' : owner.goalDifference < 0 ? 'pill-red' : 'pill-gray';
            const expanded = state.expanded.has(`${week.week}:${owner.owner}`);
            const ownerTeams = context.draftData[owner.owner] || [];
            const matchesOwnedByTeam = (teamName, matchTeam) => sameTeam(teamName, matchTeam.name);
            const formMatches = ownerTeams.flatMap(teamName => week.matches.filter(match => matchesOwnedByTeam(teamName, match.homeTeam) || matchesOwnedByTeam(teamName, match.awayTeam)).map(match => ({ match, ownerIsHome: matchesOwnedByTeam(teamName, match.homeTeam) }))).sort((left, right) => new Date(left.match.utcDate) - new Date(right.match.utcDate));
            const form = formMatches.map(({ match, ownerIsHome }) => {
                const ownerTeam = ownerIsHome ? match.homeTeam : match.awayTeam, opponentTeam = ownerIsHome ? match.awayTeam : match.homeTeam;
                const ownerScore = ownerIsHome ? match.score?.fullTime?.home : match.score?.fullTime?.away, opponentScore = ownerIsHome ? match.score?.fullTime?.away : match.score?.fullTime?.home;
                const hasScore = isCompletedMatch(match) && ownerScore != null && opponentScore != null;
                const scoreClass = hasScore ? ownerScore > opponentScore ? ' weekly-form-score-win' : ownerScore < opponentScore ? ' weekly-form-score-loss' : ' weekly-form-score-draw' : '';
                const ownerLogo = context.getLogoByName?.(ownerTeam.name) || ownerTeam.crest || '', opponentLogo = context.getLogoByName?.(opponentTeam.name) || opponentTeam.crest || '';
                const date = match.utcDate ? new Date(match.utcDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                const openMatch = context.openMatch || 'openMatchDrawer';
                return `<div class="weekly-form-match" role="button" tabindex="0" aria-label="View details for ${escapeHtml(ownerTeam.name)} versus ${escapeHtml(opponentTeam.name)}" onclick="event.stopPropagation(); ${openMatch}('${escapeHtml(String(match.id))}')" onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); ${openMatch}('${escapeHtml(String(match.id))}'); }"><div class="weekly-form-date">${escapeHtml(date)}</div><div class="weekly-form-team">${escapeHtml(context.getShortTeamName(ownerTeam.name))}</div><div class="weekly-form-venue">${ownerIsHome ? 'HOME' : 'AWAY'}</div>${ownerLogo ? `<img class="weekly-form-crest" src="${escapeHtml(ownerLogo)}" alt="${escapeHtml(ownerTeam.name)} crest">` : '<span class="weekly-form-crest empty"></span>'}<div class="weekly-form-score${scoreClass}">${hasScore ? `${ownerScore} - ${opponentScore}` : ' - '}</div><div class="weekly-form-team">${escapeHtml(context.getShortTeamName(opponentTeam.name))}</div>${opponentLogo ? `<img class="weekly-form-crest" src="${escapeHtml(opponentLogo)}" alt="${escapeHtml(opponentTeam.name)} crest">` : '<span class="weekly-form-crest empty"></span>'}<div class="weekly-form-opponent-owner">${escapeHtml(context.getOwnerOfTeam(opponentTeam.name) || '')}</div></div>`;
            }).join('');
            return `<section class="match-hero weekly-detail-leader${expanded ? ' expanded' : ''}" role="button" tabindex="0" aria-expanded="${expanded}" onclick="PplWeeklyDrawer.toggleForm('${escapeHtml(String(week.week))}', '${escapeHtml(owner.owner)}')" onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); PplWeeklyDrawer.toggleForm('${escapeHtml(String(week.week))}', '${escapeHtml(owner.owner)}'); }"><div class="weekly-detail-toggle"><span class="weekly-detail-name-row"><span class="weekly-detail-name">${escapeHtml(owner.owner)}</span><span class="weekly-stars" aria-label="${owner.stars} gold star${owner.stars === 1 ? '' : 's'}">${'★'.repeat(owner.stars)}</span><span class="weekly-detail-points">${owner.points} PTS</span></span></div>${owner.achievements.length ? `<div class="weekly-detail-achievements">${owner.achievements.map(achievement => escapeHtml(achievement)).join(' · ')}</div>` : ''}<div class="weekly-detail-record-row"><span>Record:</span><span class="weekly-detail-record">${owner.wins}-${owner.draws}-${owner.losses}</span><span class="weekly-detail-goal-difference ${goalDifferenceClass}">GD: ${owner.goalDifference > 0 ? '+' : ''}${owner.goalDifference}</span><span class="weekly-detail-chevron" aria-hidden="true">›</span></div><div class="weekly-form" onclick="event.stopPropagation()">${form || '<div class="empty-detail">No matches available</div>'}</div></section>`;
        }).join('');
        return ownerSections || '<section class="match-detail-section"><p class="empty-detail">No completed matches yet.</p></section>';
    }

    function render() {
        const week = state.weeks[state.index], overlay = document.getElementById('match-drawer-overlay'), drawer = overlay?.querySelector('.match-drawer'), content = document.getElementById('match-detail-content');
        if (!overlay || !drawer || !content) return;
        const header = overlay.querySelector('.match-drawer-header');
        const latestResultsIndex = state.weeks.reduce((latest, item, index) => item.matches.some(isCompletedMatch) ? index : latest, -1);
        const nextDisabled = state.index >= latestResultsIndex;
        header.innerHTML = `<div class="weekly-drawer-nav" style="display:flex"><button class="drawer-week-btn" type="button" aria-label="View previous week" onclick="PplWeeklyDrawer.changeWeek(-1)" ${state.index <= 0 ? 'disabled' : ''}>‹</button><span class="match-drawer-title">Week ${escapeHtml(String(week?.week ?? ''))}</span><button class="drawer-week-btn" type="button" aria-label="View next week" onclick="PplWeeklyDrawer.changeWeek(1)" ${nextDisabled ? 'disabled' : ''}>›</button></div><button class="match-drawer-close" type="button" aria-label="Close weekly results" onclick="closeMatchDrawer()">&times;</button>`;
        content.innerHTML = renderWeeklyDetail(week);
        drawer.scrollTop = 0;
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('drawer-open');
        overlay.querySelector('.match-drawer-close')?.focus();
    }

    function open(options) {
        state.context = { ...options, getShortTeamName: options.getShortTeamName || (name => name), getOwnerOfTeam: options.getOwnerOfTeam || (() => '') };
        state.expanded.clear();
        state.weeks = options.weeks || buildWeeks(options.matches, options.draftData, state.context.getOwnerOfTeam);
        state.index = options.index ?? state.weeks.findIndex(item => String(item.week) === String(options.week));
        if (state.index < 0) state.index = 0;
        if (!state.weeks[state.index]?.matches.some(isCompletedMatch)) return;
        window.DrawerRouter?.closeAll();
        render();
    }

    window.PplWeeklyDrawer = { open, render, toggleForm(week, owner) { const key = `${week}:${owner}`; state.expanded.has(key) ? state.expanded.delete(key) : state.expanded.add(key); render(); }, changeWeek(direction) { const next = state.index + direction; if (next < 0 || next >= state.weeks.length) return; state.index = next; state.expanded.clear(); state.context.onWeekChange?.(next); render(); } };
    const style = document.createElement('style');
    style.textContent = '.weekly-drawer-nav{display:flex;align-items:center;justify-content:center;gap:12px;width:100%}.weekly-drawer-nav .drawer-week-btn{display:inline-flex;align-items:center;justify-content:center;width:51px;height:51px;padding:0;border:1px solid var(--border-color);border-radius:50%;background:var(--card-bg);color:var(--text-main);font-size:1.6rem;line-height:1;cursor:pointer}.weekly-drawer-nav .drawer-week-btn:disabled{opacity:.35;cursor:not-allowed}.mw-title-disabled{cursor:default;opacity:.65}.weekly-detail-leader{margin-bottom:12px;padding:15px;text-align:center}.weekly-detail-name-row{display:flex;align-items:center;justify-content:center;gap:8px;line-height:1.1}.weekly-detail-name{color:var(--text-main);font-size:1.1rem;font-weight:800}.weekly-stars{color:#d69e00;letter-spacing:2px}.weekly-detail-points{display:inline-block;margin-left:6px;padding:3px 7px;border-radius:4px;background:#c6f6d5;color:#276749;font-size:.95rem;font-weight:400;white-space:nowrap}.weekly-detail-record-row{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:9px;color:var(--text-main);font-size:.95rem}.weekly-detail-record{color:var(--text-main);font-size:.95rem;font-weight:600}.weekly-detail-toggle{display:flex;width:100%;align-items:center;justify-content:center;gap:8px;padding:0;border:0;background:transparent;color:inherit;text-align:center;cursor:pointer}.weekly-detail-chevron{flex:0 0 auto;color:var(--text-muted);font-size:1rem;transition:transform .2s ease}.weekly-detail-leader.expanded .weekly-detail-chevron{transform:rotate(90deg)}.weekly-detail-achievements{margin:8px 0 0;color:var(--text-muted);font-size:.76rem;line-height:1.15;text-align:center}.weekly-form{display:none;grid-template-columns:repeat(4,minmax(78px,1fr));gap:8px;margin-top:14px;overflow-x:auto}.weekly-detail-leader.expanded .weekly-form{display:grid}.weekly-form-match{display:flex;min-width:78px;flex-direction:column;align-items:center;gap:5px;padding:4px 2px;background:transparent;color:var(--text-main);text-align:center}.weekly-form-date{margin:0;color:var(--text-muted);font-size:.64rem;line-height:1}.weekly-form-venue{padding:1px 6px;border-radius:4px;background:#f1f5f9;color:var(--text-muted);font-size:.58rem;font-weight:600;line-height:1.1}.weekly-form-team{min-height:0;font-size:.66rem;font-weight:700;line-height:1.05}.weekly-form-crest{display:block;width:26px;height:26px;margin:0 auto;object-fit:contain}.weekly-form-crest.empty{visibility:hidden}.weekly-form-score{display:table;min-width:38px;margin:0 auto;padding:3px 6px;border-radius:4px;color:var(--text-main);font-size:.82rem;font-weight:800;line-height:1.1}.weekly-form-score-win{background:var(--win-color);color:#fff}.weekly-form-score-draw{background:var(--draw-color);color:#fff}.weekly-form-score-loss{background:var(--loss-color);color:#fff}.weekly-form-opponent-owner{min-height:0;color:var(--text-muted);font-size:.62rem;line-height:1.05}.weekly-detail-goal-difference{display:inline-block;padding:3px 7px;border-radius:4px;font-size:.95rem;font-weight:400;white-space:nowrap}.pill-green{background:#c6f6d5;color:#276749}.pill-red{background:#fed7d7;color:#9b2c2c}.pill-gray{background:#edf2f7;color:#4a5568}@media(max-width:600px){.weekly-drawer-nav{gap:8px}.weekly-drawer-nav .drawer-week-btn{width:42px;height:42px;font-size:1.35rem}}';
    style.textContent += 'body.dark-mode .weekly-form-venue{background:#303030;color:#b8b8b8}';
    style.textContent += '.weekly-form-team{display:block;width:100%;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';
    document.head.appendChild(style);
})();
