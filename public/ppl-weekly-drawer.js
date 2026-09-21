(function () {
    const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

    function isPlayed(match) {
        return match?.status === 'FINISHED' || match?.status === 'FT' || match?.status === 'post' || match?.status_completed === true;
    }

    function sameTeam(left, right) {
        const leftName = String(left || '').toLowerCase();
        const rightName = String(right || '').toLowerCase();
        return leftName.includes(rightName) || rightName.includes(leftName);
    }

    function renderFixture(match, owner, context) {
        const home = match.homeTeam, away = match.awayTeam;
        const homeScore = match.score?.fullTime?.home, awayScore = match.score?.fullTime?.away;
        const hasScore = isPlayed(match) && homeScore != null && awayScore != null;
        const score = hasScore ? `${homeScore} - ${awayScore}` : 'Upcoming';
        const openMatch = typeof window.openMatchDrawer === 'function' ? 'openMatchDrawer' : 'openSharedMatchDrawer';
        return `<div class="ppl-weekly-fixture" role="button" tabindex="0" aria-label="View details for ${escapeHtml(home.name)} versus ${escapeHtml(away.name)}" onclick="event.stopPropagation(); ${openMatch}('${escapeHtml(String(match.id))}')" onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); ${openMatch}('${escapeHtml(String(match.id))}'); }"><span>${escapeHtml(context.shortName(home.name))} <small>${sameTeam(home.name, owner) ? 'HOME' : sameTeam(away.name, owner) ? 'AWAY' : ''}</small> vs ${escapeHtml(context.shortName(away.name))}</span><strong>${score}</strong></div>`;
    }

    function renderWeek(week, matches, context) {
        const weekMatches = (matches || []).filter(match => Number(match.matchday) === Number(week));
        const owners = Object.keys(context.draftData || {});
        const sections = owners.map(owner => {
            const ownerTeams = context.draftData[owner] || [];
            const ownerMatches = weekMatches.filter(match => ownerTeams.some(team => sameTeam(team, match.homeTeam.name) || sameTeam(team, match.awayTeam.name)));
            if (!ownerMatches.length) return '';
            const points = ownerMatches.reduce((total, match) => {
                if (!isPlayed(match)) return total;
                const home = match.score?.fullTime?.home, away = match.score?.fullTime?.away;
                if (home == null || away == null) return total;
                const ownsHome = ownerTeams.some(team => sameTeam(team, match.homeTeam.name));
                const ownScore = ownsHome ? home : away, opponentScore = ownsHome ? away : home;
                return total + (ownScore > opponentScore ? 3 : ownScore === opponentScore ? 1 : 0);
            }, 0);
            return `<section class="ppl-weekly-owner"><h3>${escapeHtml(owner)} <strong>${points} PTS</strong></h3>${ownerMatches.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate)).map(match => renderFixture(match, owner, context)).join('')}</section>`;
        }).filter(Boolean).join('');
        return sections || '<p class="empty-detail">No weekly results yet.</p>';
    }

    function open(week, context) {
        const overlay = document.getElementById('match-drawer-overlay');
        const drawer = overlay?.querySelector('.match-drawer');
        const header = overlay?.querySelector('.match-drawer-header');
        const content = document.getElementById('match-detail-content');
        if (!overlay || !drawer || !header || !content) return;
        const hasWeekNavigation = typeof window.changeWeeklyDrawerWeek === 'function';
        header.innerHTML = hasWeekNavigation
            ? `<div class="weekly-drawer-nav" style="display:flex"><button class="drawer-week-btn" id="weekly-drawer-prev" type="button" aria-label="View previous week" onclick="changeWeeklyDrawerWeek(-1)">‹</button><span class="match-drawer-title" id="weekly-drawer-title">PPL Matchweek ${escapeHtml(String(week))}</span><button class="drawer-week-btn" id="weekly-drawer-next" type="button" aria-label="View next week" onclick="changeWeeklyDrawerWeek(1)">›</button></div><button class="match-drawer-close" type="button" aria-label="Close weekly results" onclick="closeMatchDrawer()">&times;</button>`
            : `<div class="ppl-weekly-header"><button class="match-drawer-close" type="button" aria-label="Close weekly results" onclick="closeMatchDrawer()">&times;</button><span class="match-drawer-title">PPL Matchweek ${escapeHtml(String(week))}</span></div>`;
        content.innerHTML = `<section class="match-detail-section ppl-weekly-detail"><h2>Matchweek ${escapeHtml(String(week))}</h2>${renderWeek(week, context.matches, context)}</section>`;
        drawer.scrollTop = 0;
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('drawer-open');
    }

    const style = document.createElement('style');
    style.textContent = '.ppl-weekly-header{display:flex;align-items:center;justify-content:center;width:100%;min-height:34px}.ppl-weekly-header .match-drawer-close{right:18px}.ppl-weekly-detail h2{margin-bottom:14px;text-align:center;color:var(--text-main)}.ppl-weekly-owner{margin-top:12px;padding:12px;border:1px solid var(--border-color);border-radius:8px}.ppl-weekly-owner:first-of-type{margin-top:0}.ppl-weekly-owner h3{display:flex;justify-content:space-between;margin-bottom:8px;color:var(--text-main);font-size:.95rem}.ppl-weekly-owner h3 strong{color:var(--text-muted);font-size:.8rem}.ppl-weekly-fixture{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--border-color);color:var(--text-main);font-size:.8rem;cursor:pointer}.ppl-weekly-fixture small{color:var(--text-muted);font-size:.6rem}.ppl-weekly-fixture strong{white-space:nowrap}';
    document.head.appendChild(style);

    window.PplWeeklyDrawer = { open };
})();
