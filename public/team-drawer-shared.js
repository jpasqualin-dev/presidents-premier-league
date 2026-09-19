(function () {
    const style = document.createElement('style');
    style.id = 'shared-team-drawer-styles';
    style.textContent = `.team-drawer-card{margin-bottom:14px;padding:18px;background:var(--card-bg,#fff);border:1px solid var(--border-color,#dfe5eb);border-radius:12px}.team-drawer-summary{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:18px}.team-drawer-identity{display:flex;width:150px;flex-direction:column;align-items:center;justify-self:start}.team-drawer-crest{width:150px;height:150px;object-fit:contain}.team-drawer-owner{width:100%;margin-top:8px;color:var(--text-main,#1a1a1a);font-size:.85rem;font-weight:600;text-align:center}.team-drawer-records{display:grid;gap:10px;color:var(--text-muted,#718096);font-size:.78rem}.team-drawer-record{display:flex;justify-content:space-between;gap:12px;padding-bottom:8px;border-bottom:1px solid var(--border-color,#dfe5eb)}.team-drawer-record strong{color:var(--text-main,#1a1a1a);font-size:.9rem}.team-drawer-card-title{margin-bottom:16px;color:var(--text-main,#1a1a1a);font-size:.95rem;text-align:center}.team-drawer-stat{display:grid;grid-template-columns:120px 42px minmax(0,1fr) 62px;align-items:center;gap:10px;color:var(--text-muted,#718096);font-size:.82rem}.team-drawer-stat+.team-drawer-stat{margin-top:10px}.team-drawer-stat>span{white-space:nowrap}.team-drawer-stat strong{color:var(--text-main,#1a1a1a);text-align:right}.team-drawer-bar{position:relative;height:10px;border-radius:99px;background:var(--border-color,#dfe5eb)}.team-drawer-bar-fill{position:absolute;inset:0 auto 0 0;height:100%;border-radius:inherit;background:#00a667}.team-drawer-bar-rank{color:var(--text-main,#1a1a1a);font-size:.82rem;font-weight:600;line-height:1;text-align:left;white-space:nowrap}.team-drawer-bar-fill.yellow{background:#facc15}.team-drawer-bar-fill.red{background:#ef4444}.team-form-grid{display:grid;grid-template-columns:repeat(5,minmax(78px,1fr));gap:8px;overflow-x:auto}.team-form-grid .weekly-form-match{display:flex;min-width:78px;flex-direction:column;align-items:center;gap:5px;padding:4px 2px;background:transparent;color:var(--text-main,#1a1a1a);text-align:center}.team-form-grid .weekly-form-date{margin:0;color:var(--text-muted,#718096);font-size:.64rem;line-height:1}.team-form-grid .weekly-form-venue{padding:1px 6px;border-radius:4px;background:#f1f5f9;color:var(--text-muted,#718096);font-size:.58rem;font-weight:600;line-height:1.1}.team-form-grid .weekly-form-team{min-height:0;font-size:.66rem;font-weight:700;line-height:1.05}.team-form-grid .weekly-form-crest{display:block;width:26px;height:26px;margin:0 auto;object-fit:contain}.team-form-grid .weekly-form-crest.empty{visibility:hidden}.team-form-grid .weekly-form-score{display:table;min-width:38px;margin:0 auto;padding:3px 6px;border-radius:4px;color:#fff;font-size:.82rem;font-weight:800;line-height:1.1}.team-form-grid .weekly-form-score-win{background:var(--win-color,#00a667);color:#fff}.team-form-grid .weekly-form-score-draw{background:var(--draw-color,#718096);color:#fff}.team-form-grid .weekly-form-score-loss{background:var(--loss-color,#e53e3e);color:#fff}.team-form-grid .weekly-form-opponent-owner{min-height:0;color:var(--text-muted,#718096);font-size:.62rem;line-height:1.05}body.dark-mode .team-drawer-owner{color:#f1f1f1}body.dark-mode .team-drawer-bar-fill{background:#00ff87}body.dark-mode .team-drawer-bar-fill.yellow{background:#facc15}body.dark-mode .team-drawer-bar-fill.red{background:#ef4444}body.dark-mode .team-form-grid .weekly-form-venue{background:#303030;color:#b8b8b8}@media(max-width:600px){.team-drawer-identity,.team-drawer-crest{width:120px}.team-drawer-crest{height:120px}.team-drawer-stat{grid-template-columns:108px 36px minmax(0,1fr) 62px;gap:7px}}`;
    style.textContent += '.team-drawer-card-title{margin-top:0;margin-bottom:16px;border-bottom:2px solid #00ff87;padding-bottom:8px}';
    document.head.appendChild(style);

    function escape(value) {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
    }

    function isPlayed(match) {
        return match?.status === 'FINISHED' || match?.status === 'FT' || match?.status === 'post' || match?.status_completed === true;
    }

    function matchesTeam(match, teamName) {
        const name = teamName.toLowerCase();
        const home = match.homeTeam.name.toLowerCase();
        const away = match.awayTeam.name.toLowerCase();
        return home.includes(name) || name.includes(home) || away.includes(name) || name.includes(away);
    }

    function render(teamName, options) {
        const allStats = options.stats.allStats || options.stats;
        const teamKey = Object.keys(allStats).find(key => key.toLowerCase() === teamName.toLowerCase()) || Object.keys(allStats).find(key => matchesTeam({ homeTeam: { name: key }, awayTeam: { name: key } }, teamName));
        const team = allStats[teamKey];
        if (!team) return '<section class="team-drawer-card"><p class="empty-detail">Team details are unavailable.</p></section>';
        const shortName = options.getShortTeamName(team.team);
        const logo = options.getLogoByName(team.team);
        const teams = Object.values(allStats).sort((a, b) => b.PTS - a.PTS || b.GD - a.GD || b.GF - a.GF);
        const rank = teams.findIndex(item => item.team === team.team) + 1;
        const formatRecord = value => `${value.W}-${value.D}-${value.L}`;
        const statRank = field => {
            const lowerIsBetter = field === 'yellowCards' || field === 'redCards';
            return Object.values(allStats).filter(item => lowerIsBetter ? item[field] < team[field] : item[field] > team[field]).length + 1;
        };
        const statRow = (label, field, colorClass = '') => {
            const value = team[field] ?? 0;
            const valueText = field === 'GD' && value > 0 ? `+${value}` : value;
            const fieldRank = statRank(field);
            const percentage = Math.max(5, 100 - (fieldRank - 1) * 5);
            return `<div class="team-drawer-stat"><span>${label}</span><strong>${valueText}</strong><div class="team-drawer-bar" aria-label="${label} rank ${fieldRank} of 20"><div class="team-drawer-bar-fill${colorClass ? ` ${colorClass}` : ''}" style="width:${percentage}%"></div></div><span class="team-drawer-bar-rank">Rank: ${fieldRank}</span></div>`;
        };
        const matches = (options.matches || []).filter(match => matchesTeam(match, team.team)).sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));
        const playedWeeks = matches.filter(isPlayed).map(match => Number(match.matchday)).filter(Number.isFinite);
        const latestPlayedWeek = playedWeeks.length ? Math.max(...playedWeeks) : -Infinity;
        const upcomingWeeks = matches.filter(match => !isPlayed(match) && new Date(match.utcDate).getTime() >= Date.now()).map(match => Number(match.matchday)).filter(week => Number.isFinite(week) && week >= latestPlayedWeek);
        const currentWeek = upcomingWeeks.length ? Math.min(...upcomingWeeks) : Number.isFinite(latestPlayedWeek) ? latestPlayedWeek : Number(matches[matches.length - 1]?.matchday);
        const formMatches = matches.filter(match => Number(match.matchday) <= currentWeek).slice(0, 5).reverse();
        const form = formMatches.map(match => {
            const isHome = match.homeTeam.name.toLowerCase().includes(team.team.toLowerCase()) || team.team.toLowerCase().includes(match.homeTeam.name.toLowerCase());
            const ownTeam = isHome ? match.homeTeam : match.awayTeam;
            const opponent = isHome ? match.awayTeam : match.homeTeam;
            const ownScore = isHome ? match.score?.fullTime?.home : match.score?.fullTime?.away;
            const opponentScore = isHome ? match.score?.fullTime?.away : match.score?.fullTime?.home;
            const hasScore = isPlayed(match) && ownScore != null && opponentScore != null;
            const scoreClass = hasScore ? ownScore > opponentScore ? ' weekly-form-score-win' : ownScore < opponentScore ? ' weekly-form-score-loss' : ' weekly-form-score-draw' : '';
            const ownLogo = options.getLogoByName(ownTeam.name) || ownTeam.crest || '';
            const opponentLogo = options.getLogoByName(opponent.name) || opponent.crest || '';
            const date = match.utcDate ? new Date(match.utcDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            return `<div class="weekly-form-match" role="button" tabindex="0" aria-label="View details for ${escape(ownTeam.name)} versus ${escape(opponent.name)}" onclick="event.stopPropagation(); ${options.openMatch ? `openMatchDrawer('${escape(String(match.id))}')` : ''}" onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); ${options.openMatch ? `openMatchDrawer('${escape(String(match.id))}');` : ''} }"><div class="weekly-form-date">${escape(date)}</div><div class="weekly-form-team">${escape(options.getShortTeamName(ownTeam.name))}</div>${ownLogo ? `<img class="weekly-form-crest" src="${escape(ownLogo)}" alt="${escape(ownTeam.name)} crest">` : '<span class="weekly-form-crest empty"></span>'}<div class="weekly-form-venue">${isHome ? 'HOME' : 'AWAY'}</div><div class="weekly-form-score${scoreClass}">${hasScore ? `${ownScore} - ${opponentScore}` : ' - '}</div><div class="weekly-form-team">${escape(options.getShortTeamName(opponent.name))}</div>${opponentLogo ? `<img class="weekly-form-crest" src="${escape(opponentLogo)}" alt="${escape(opponent.name)} crest">` : '<span class="weekly-form-crest empty"></span>'}<div class="weekly-form-opponent-owner">${escape(options.getOwnerOfTeam(opponent.name) || '')}</div></div>`;
        }).join('');
        return `<section class="team-drawer-card"><h2 class="team-drawer-card-title">${escape(shortName)}</h2><div class="team-drawer-summary"><div class="team-drawer-identity">${logo ? `<img class="team-drawer-crest" src="${escape(logo)}" alt="${escape(team.team)} crest">` : ''}<div class="team-drawer-owner">${escape(team.owner || 'Unassigned')}</div></div><div class="team-drawer-records"><div class="team-drawer-record"><span>Overall rank</span><strong>${rank}</strong></div><div class="team-drawer-record"><span>Overall record</span><strong>${formatRecord(team)}</strong></div><div class="team-drawer-record"><span>Home record</span><strong>${formatRecord(options.stats.homeStats?.[team.team] || team)}</strong></div><div class="team-drawer-record"><span>Away record</span><strong>${formatRecord(options.stats.awayStats?.[team.team] || team)}</strong></div></div></div></section><section class="team-drawer-card"><h2 class="team-drawer-card-title">Team Form</h2>${form ? `<div class="team-form-grid">${form}</div>` : '<p class="empty-detail">No matches available</p>'}</section><section class="team-drawer-card"><h2 class="team-drawer-card-title">Team stats</h2>${statRow('Goals', 'GF')}${statRow('Goal differential', 'GD')}${statRow('Clean sheets', 'cleanSheets')}${statRow('Yellow cards', 'yellowCards', 'yellow')}${statRow('Red cards', 'redCards', 'red')}</section>`;
    }

    window.TeamDrawerShared = { render };
})();
