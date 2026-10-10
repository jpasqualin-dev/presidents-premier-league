(function () {
    const style = document.createElement('style');
    style.id = 'shared-team-drawer-styles';
    style.textContent = `.team-drawer-card{margin-bottom:14px;padding:18px;background:var(--card-bg,#fff);border:1px solid var(--border-color,#dfe5eb);border-radius:12px}.team-drawer-summary{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:18px}.team-drawer-identity{display:flex;width:150px;flex-direction:column;align-items:center;justify-self:start}.team-drawer-crest{width:150px;height:150px;object-fit:contain}.team-drawer-owner{width:100%;margin-top:8px;color:var(--text-main,#1a1a1a);font-size:.85rem;font-weight:600;text-align:center}.team-drawer-records{display:grid;gap:10px;color:var(--text-muted,#718096);font-size:.78rem}.team-drawer-record{display:flex;justify-content:space-between;gap:12px;padding-bottom:8px;border-bottom:1px solid var(--border-color,#dfe5eb)}.team-drawer-record strong{color:var(--text-main,#1a1a1a);font-size:.9rem}.team-drawer-card-title{margin-bottom:16px;color:var(--text-main,#1a1a1a);font-size:.95rem;text-align:center}.team-drawer-stat{display:grid;grid-template-columns:120px 42px minmax(0,1fr) 62px;align-items:center;gap:10px;color:var(--text-muted,#718096);font-size:.82rem}.team-drawer-stat+.team-drawer-stat{margin-top:10px}.team-drawer-stat>span{white-space:nowrap}.team-drawer-stat strong{color:var(--text-main,#1a1a1a);text-align:right}.team-drawer-bar{position:relative;height:10px;border-radius:99px;background:var(--border-color,#dfe5eb)}.team-drawer-bar-fill{position:absolute;inset:0 auto 0 0;height:100%;border-radius:inherit;background:#00a667}.team-drawer-bar-rank{color:var(--text-main,#1a1a1a);font-size:.82rem;font-weight:600;line-height:1;text-align:left;white-space:nowrap}.team-drawer-bar-fill.yellow{background:#facc15}.team-drawer-bar-fill.red{background:#ef4444}.team-form-grid{display:flex;gap:8px;overflow-x:auto;scroll-behavior:smooth;scroll-snap-type:x proximity}.team-form-grid .weekly-form-match{display:flex;flex:0 0 calc((100% - 32px) / 5);min-width:78px;flex-direction:column;align-items:center;gap:5px;padding:4px 2px;background:transparent;color:var(--text-main,#1a1a1a);text-align:center;scroll-snap-align:start}.team-form-grid .weekly-form-match.latest-played{border:1px solid color-mix(in srgb,#00a667 45%,transparent);border-radius:6px;background:color-mix(in srgb,#00a667 7%,transparent)}.team-form-grid .weekly-form-date{margin:0;color:var(--text-muted,#718096);font-size:.64rem;line-height:1}.team-form-grid .weekly-form-venue{padding:1px 6px;border-radius:4px;background:#f1f5f9;color:var(--text-muted,#718096);font-size:.58rem;font-weight:600;line-height:1.1}.team-form-grid .weekly-form-team{min-height:0;font-size:.66rem;font-weight:700;line-height:1.05;white-space:nowrap}.team-form-grid .weekly-form-crest{display:block;width:26px;height:26px;margin:0 auto;object-fit:contain}.team-form-grid .weekly-form-crest.empty{visibility:hidden}.team-form-grid .weekly-form-score{display:table;min-width:38px;margin:0 auto;padding:3px 6px;border-radius:4px;color:#fff;font-size:.82rem;font-weight:800;line-height:1.1}.team-form-grid .weekly-form-score-win{background:var(--win-color,#00a667);color:#fff}.team-form-grid .weekly-form-score-draw{background:var(--draw-color,#718096);color:#fff}.team-form-grid .weekly-form-score-loss{background:var(--loss-color,#e53e3e);color:#fff}.team-form-grid .weekly-form-opponent-owner{min-height:0;color:var(--text-muted,#718096);font-size:.62rem;line-height:1.05}body.dark-mode .team-drawer-owner{color:#f1f1f1}body.dark-mode .team-drawer-bar-fill{background:#00ff87}body.dark-mode .team-drawer-bar-fill.yellow{background:#facc15}body.dark-mode .team-drawer-bar-fill.red{background:#ef4444}body.dark-mode .team-form-grid .weekly-form-venue{background:#303030;color:#b8b8b8}@media(max-width:600px){.team-drawer-identity,.team-drawer-crest{width:120px}.team-drawer-crest{height:120px}.team-drawer-stat{grid-template-columns:108px 36px minmax(0,1fr) 62px;gap:7px}.team-form-grid .weekly-form-match{flex-basis:calc((100% - 24px) / 4)}}`;
        style.textContent = style.textContent.replace('.team-drawer-summary{display:grid;grid-template-columns:1fr 1fr;', '.team-drawer-summary{display:grid;grid-template-columns:minmax(0,150px) minmax(0,1fr);');
    style.textContent += '.team-drawer-card-title{margin-top:0;margin-bottom:16px;border-bottom:2px solid #00ff87;padding-bottom:8px}.team-drawer-records{min-width:0}.team-drawer-record{min-width:0}.team-drawer-record>span,.team-drawer-record>strong{min-width:0}.team-drawer-rank-pick{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}.team-drawer-rank-pick>span{min-width:0;white-space:normal;text-align:center}.team-drawer-rank-pick .team-drawer-record-label{display:block;text-align:center}.team-drawer-rank-pick strong{display:block;text-align:center}.team-drawer-draft-diff{color:inherit;font:inherit;font-weight:400}.team-drawer-chevron{color:var(--text-muted,#718096);font-size:.85rem;transition:transform .25s ease}.team-drawer-player-card.expanded .team-drawer-chevron{transform:rotate(90deg)}';
    style.textContent += '.team-drawer-player-stat{display:grid;grid-template-columns:28px minmax(0,1fr) 42px;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border-color,#dfe5eb);color:var(--text-main,#1a1a1a);font-size:.85rem}.team-drawer-player-stat:last-child{border-bottom:0}.team-drawer-player-rank{color:var(--text-muted,#718096);font-weight:600}.team-drawer-player-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.team-drawer-player-stat strong{text-align:right}.team-drawer-player-card{transition:all .2s ease}.team-drawer-player-card .team-drawer-card-title{display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none}.team-drawer-player-card.expanded .team-drawer-card-title{color:#00a854}.team-drawer-player-card.collapsed .team-drawer-player-stat:nth-child(n+4){display:none}';
    style.textContent += '.weekly-form-team{display:block;width:100%;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';
    document.head.appendChild(style);

    function escape(value) {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
    }

    function isPlayed(match) {
        return match?.status === 'FINISHED' || match?.status === 'FT' || match?.status === 'post' || match?.status_completed === true;
    }

    function matchesTeam(match, teamName) {
        return sameTeam(match.homeTeam.name, teamName) || sameTeam(match.awayTeam.name, teamName);
    }

    function sameTeam(leftName, rightName) {
        const left = String(leftName || '').toLowerCase();
        const right = String(rightName || '').toLowerCase();
        return left.includes(right) || right.includes(left);
    }

    function buildStats(matches, teamNames, getOwnerOfTeam, { auditCardEvents = false } = {}) {
        const create = team => ({ team, owner: getOwnerOfTeam(team), PL: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, PTS: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 });
        const allStats = {}, homeStats = {}, awayStats = {};
        const cardMismatches = [];
        teamNames.forEach(team => {
            allStats[team] = create(team);
            homeStats[team] = create(team);
            awayStats[team] = create(team);
        });
        const findKey = name => Object.keys(allStats).find(key => name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase()));
        const apply = (stat, goalsFor, goalsAgainst) => {
            stat.PL += 1;
            stat.GF += goalsFor;
            stat.GA += goalsAgainst;
            if (goalsFor > goalsAgainst) { stat.W += 1; stat.PTS += 3; }
            else if (goalsFor === goalsAgainst) { stat.D += 1; stat.PTS += 1; }
            else stat.L += 1;
            stat.GD = stat.GF - stat.GA;
        };
        const addCardStats = (teamKey, side, match) => {
            const cardCounts = match.teamCards?.[side] || {};
            const providerId = String(match[`${side}Team`].id || match[`${side}Team`].providerId || '');
            const cardEvents = (match.events || []).filter(event => String(event.teamProviderId || '') === providerId);
            [['yellow', 'yellowCard'], ['red', 'redCard']].forEach(([cardType, eventType]) => {
                const normalizedCount = Number(cardCounts[cardType]) || 0;
                const eventCount = cardEvents.filter(event => event[eventType]).length;
                if (auditCardEvents && normalizedCount !== eventCount) {
                    cardMismatches.push({
                        matchId: String(match.id || 'unknown'),
                        team: allStats[teamKey].team,
                        cardType,
                        normalizedCount,
                        eventCount
                    });
                }
                allStats[teamKey][`${cardType}Cards`] += Math.max(normalizedCount, eventCount);
            });
        };
        (matches || []).forEach(match => {
            if (!isPlayed(match) || match.score?.fullTime?.home == null || match.score?.fullTime?.away == null) return;
            const homeKey = findKey(match.homeTeam.name);
            const awayKey = findKey(match.awayTeam.name);
            const homeScore = match.score.fullTime.home;
            const awayScore = match.score.fullTime.away;
            if (homeKey) {
                apply(allStats[homeKey], homeScore, awayScore);
                apply(homeStats[homeKey], homeScore, awayScore);
                if (awayScore === 0) allStats[homeKey].cleanSheets += 1;
                addCardStats(homeKey, 'home', match);
            }
            if (awayKey) {
                apply(allStats[awayKey], awayScore, homeScore);
                apply(awayStats[awayKey], awayScore, homeScore);
                if (homeScore === 0) allStats[awayKey].cleanSheets += 1;
                addCardStats(awayKey, 'away', match);
            }
        });
        return { allStats, homeStats, awayStats, cardMismatches };
    }

    function buildPlayerStats(matches, teamName) {
        const players = {};
        const teamMatches = (matches || []).filter(match => isPlayed(match) && matchesTeam(match, teamName));
        teamMatches.forEach(match => {
            window.getIndividualScoringEvents(match.scorers).forEach(scorer => {
                const scorerTeamId = String(scorer.teamProviderId || '');
                const homeTeamId = String(match.homeTeam.id || match.homeTeam.providerId || '');
                const awayTeamId = String(match.awayTeam.id || match.awayTeam.providerId || '');
                const scorerTeam = scorerTeamId === homeTeamId ? match.homeTeam.name : scorerTeamId === awayTeamId ? match.awayTeam.name : '';
                if (!scorerTeam || !sameTeam(scorerTeam, teamName)) return;
                const scorerKey = String(scorer.athleteProviderId || scorer.athleteName || 'Unknown scorer');
                if (!players[scorerKey]) players[scorerKey] = { name: scorer.athleteName || 'Unknown scorer', goals: 0, assists: 0 };
                players[scorerKey].goals += 1;
                if (scorer.assistName || scorer.assistProviderId) {
                    const assistKey = String(scorer.assistProviderId || scorer.assistName);
                    if (!players[assistKey]) players[assistKey] = { name: scorer.assistName || 'Unknown assister', goals: 0, assists: 0 };
                    players[assistKey].assists += 1;
                }
            });
        });
        return Object.values(players);
    }

    function renderPlayerStatCards(matches, teamName, playerStatsStatus) {
        if (playerStatsStatus?.loading || playerStatsStatus?.error) {
            const message = playerStatsStatus.loading
                ? 'Loading player stats…'
                : `Unable to load player stats: ${playerStatsStatus.error}`;
            return `<section class="team-drawer-card"><h2 class="team-drawer-card-title">Player Stats</h2><p class="empty-detail">${escape(message)}</p></section>`;
        }
        const generatedAt = playerStatsStatus?.generatedAt ? new Date(playerStatsStatus.generatedAt) : null;
        const lastLoadedAt = playerStatsStatus?.lastSuccessfulSync ? new Date(playerStatsStatus.lastSuccessfulSync) : null;
        const dataFreshness = generatedAt && Number.isFinite(generatedAt.getTime())
            ? `${playerStatsStatus.stale ? 'Showing cached stats generated' : 'Stats generated'} ${generatedAt.toLocaleString()}${playerStatsStatus.stale ? `; cached copy last synced ${lastLoadedAt?.toLocaleString() || 'at an unknown time'}` : ''}.`
            : playerStatsStatus?.stale ? 'Showing previously cached detailed stats.' : '';
        const freshnessNotice = dataFreshness
            ? `<section class="team-drawer-card"><p class="empty-detail" role="status">${escape(dataFreshness)}</p></section>`
            : '';
        const dataWarnings = [];
        if (playerStatsStatus?.historicalAvailable === false) dataWarnings.push('Historical match data is unavailable; these totals may cover only recent matches.');
        else if (playerStatsStatus?.detailsComplete === false) dataWarnings.push('Some match details are unavailable; these totals may be incomplete.');
        if (playerStatsStatus?.scoringComplete === false) dataWarnings.push('Scorer totals do not reconcile with finished-match scores; player totals may be incomplete.');
        const qualityNotice = dataWarnings.length
            ? `<section class="team-drawer-card"><p class="empty-detail" role="alert">${dataWarnings.map(escape).join(' ')}</p></section>`
            : '';
        const players = buildPlayerStats(matches, teamName);
        const configs = [
            { title: 'Goal involvements', value: player => player.goals + player.assists },
            { title: 'Goals', value: player => player.goals },
            { title: 'Assists', value: player => player.assists }
        ];
            return freshnessNotice + qualityNotice + configs.map(config => {
            const rankedPlayers = players
                .filter(player => config.value(player) > 0)
                .sort((a, b) => config.value(b) - config.value(a) || a.name.localeCompare(b.name));
            const rows = rankedPlayers.map((player, index) => `<div class="team-drawer-player-stat"><span class="team-drawer-player-rank">${index + 1}</span><span class="team-drawer-player-name">${escape(player.name)}</span><strong>${config.value(player)}</strong></div>`).join('');
            return `<section class="team-drawer-card team-drawer-player-card collapsed"><h2 class="team-drawer-card-title" onclick="toggleTeamDrawerPlayerCard(this)"><span>${config.title}</span><span class="team-drawer-chevron">❯</span></h2><div class="team-drawer-player-body">${rows || '<p class="empty-detail">No player stats available</p>'}</div></section>`;
        }).join('');
    }

    function renderTableCard(teams, selectedTeam, options) {
        const selectedIndex = teams.findIndex(item => item.team === selectedTeam.team);
        const start = Math.max(0, selectedIndex - 2);
        const end = Math.min(teams.length, selectedIndex + 3);
        const rows = teams.slice(start, end).map((item, index) => {
            const isSelected = item.team === selectedTeam.team;
            const teamName = options.getShortTeamName(item.team) || item.team;
            const logo = options.getLogoByName?.(item.team) || '';
            const owner = item.owner || options.getOwnerOfTeam?.(item.team) || 'Unassigned';
            const difference = item.GD > 0 ? `+${item.GD}` : item.GD;
            const teamNameArgument = escape(JSON.stringify(item.team));
            return `<tr${isSelected ? ' class="team-drawer-table-selected" aria-current="true"' : ''} role="button" tabindex="0" aria-label="View ${escape(item.team)} details" onclick="event.stopPropagation(); openTeamDrawerFromMatch(${teamNameArgument})" onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); openTeamDrawerFromMatch(${teamNameArgument}); }"><td class="fotmob-rank">${start + index + 1}</td><td class="text-left"><div class="team-inline">${logo ? `<img src="${escape(logo)}" class="team-icon" alt="">` : ''}<div class="upcoming-table-identity"><div class="table-team-name">${escape(teamName)}</div><div class="upcoming-table-owner">${escape(owner)}</div></div></div></td><td>${item.PL}</td><td>${item.W}</td><td>${item.D}</td><td>${item.L}</td><td>${item.GF}-${item.GA}</td><td>${difference}</td><td><strong>${item.PTS}</strong></td></tr>`;
        }).join('');
        return `<section class="team-drawer-card team-drawer-table-card"><h2 class="team-drawer-card-title">Table</h2><div class="upcoming-table-scroll"><table class="overall-standings-table upcoming-table"><colgroup><col class="rank"><col class="team"><col class="stat"><col class="stat"><col class="stat"><col class="stat"><col class="goals"><col class="gd"><col class="points"></colgroup><thead><tr><th>#</th><th class="text-left">Team</th><th>PL</th><th>W</th><th>D</th><th>L</th><th>+/-</th><th>GD</th><th>PTS</th></tr></thead><tbody>${rows || '<tr><td colspan="9" class="empty-detail">Table data is unavailable.</td></tr>'}</tbody></table></div></section>`;
    }

    window.toggleTeamDrawerPlayerCard = function (titleElement) {
        const card = titleElement.closest('.team-drawer-player-card');
        if (!card) return;
        card.classList.toggle('expanded', !card.classList.contains('expanded'));
        card.classList.toggle('collapsed', !card.classList.contains('expanded'));
    };

    function render(teamName, options) {
        const allStats = options.stats.allStats || options.stats;
        const teamKey = Object.keys(allStats).find(key => key.toLowerCase() === teamName.toLowerCase()) || Object.keys(allStats).find(key => matchesTeam({ homeTeam: { name: key }, awayTeam: { name: key } }, teamName));
        const team = allStats[teamKey];
        if (!team) return '<section class="team-drawer-card"><p class="empty-detail">Team details are unavailable.</p></section>';
        const shortName = options.getShortTeamName(team.team);
        const logo = options.getLogoByName(team.team);
        const teams = Object.values(allStats).sort((a, b) => b.PTS - a.PTS || b.GD - a.GD || b.GF - a.GF || a.team.localeCompare(b.team));
        const rank = teams.findIndex(item => item.team === team.team) + 1;
        const formatRecord = value => `${value.W}-${value.D}-${value.L}`;
        const statRank = field => {
            const lowerIsBetter = field === 'GA' || field === 'yellowCards' || field === 'redCards';
            return Object.values(allStats).filter(item => lowerIsBetter ? item[field] < team[field] : item[field] > team[field]).length + 1;
        };
        const statRow = (label, field, colorClass = '') => {
            const value = team[field] ?? 0;
            const valueText = field === 'GD' && value > 0 ? `+${value}` : value;
            const fieldRank = statRank(field);
            const lowerIsBetter = field === 'GA' || field === 'yellowCards' || field === 'redCards';
            const percentage = field === 'GA' || !lowerIsBetter
                ? Math.max(5, 100 - (fieldRank - 1) * 5)
                : Math.min(100, fieldRank * 5);
            return `<div class="team-drawer-stat"><span>${label}</span><strong>${valueText}</strong><div class="team-drawer-bar" aria-label="${label} rank ${fieldRank} of 20"><div class="team-drawer-bar-fill${colorClass ? ` ${colorClass}` : ''}" style="width:${percentage}%"></div></div><span class="team-drawer-bar-rank">Rank: ${fieldRank}</span></div>`;
        };
        const matches = (options.matches || []).filter(match => matchesTeam(match, team.team)).sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
        const playedMatches = matches.filter(isPlayed);
        const latestPlayedMatch = playedMatches.reduce((latest, match) => !latest || new Date(match.utcDate) > new Date(latest.utcDate) ? match : latest, null);
        const form = matches.map(match => {
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
            const latestClass = match === latestPlayedMatch ? ' latest-played' : '';
            return `<div class="weekly-form-match${latestClass}" role="button" tabindex="0" aria-label="${latestClass ? 'Most recently played match. ' : ''}View details for ${escape(ownTeam.name)} versus ${escape(opponent.name)}" onclick="event.stopPropagation(); ${options.openMatch ? `openMatchDrawer('${escape(String(match.id))}')` : ''}" onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); ${options.openMatch ? `openMatchDrawer('${escape(String(match.id))}');` : ''} }"><div class="weekly-form-date">${escape(date)}</div><div class="weekly-form-team">${escape(options.getShortTeamName(ownTeam.name))}</div>${ownLogo ? `<img class="weekly-form-crest" src="${escape(ownLogo)}" alt="${escape(ownTeam.name)} crest">` : '<span class="weekly-form-crest empty"></span>'}<div class="weekly-form-venue">${isHome ? 'HOME' : 'AWAY'}</div><div class="weekly-form-score${scoreClass}">${hasScore ? `${ownScore} - ${opponentScore}` : ' - '}</div><div class="weekly-form-team">${escape(options.getShortTeamName(opponent.name))}</div>${opponentLogo ? `<img class="weekly-form-crest" src="${escape(opponentLogo)}" alt="${escape(opponent.name)} crest">` : '<span class="weekly-form-crest empty"></span>'}<div class="weekly-form-opponent-owner">${escape(options.getOwnerOfTeam(opponent.name) || '')}</div></div>`;
        }).join('');
        const draftPickValue = window.TeamNames?.resolve?.(team.team)?.draftPick ?? rank;
        const draftDiff = draftPickValue - rank;
        const draftDiffText = `${draftDiff >= 0 ? '+' : ''}${draftDiff}`;
        const cardMismatches = (options.stats.cardMismatches || []).filter(item => item.team === team.team);
        const cardWarning = cardMismatches.length
            ? `<p class="empty-detail team-drawer-data-warning" role="alert">Card totals differ from match events in ${cardMismatches.length} instance${cardMismatches.length === 1 ? '' : 's'}. Displayed totals use the higher count per match. ${cardMismatches.map(item => `Match ${escape(item.matchId)}: ${escape(item.cardType)} cards show ${item.normalizedCount} in totals versus ${item.eventCount} events.`).join(' ')}</p>`
            : '';
        return `<section class="team-drawer-card"><div class="team-drawer-summary"><div class="team-drawer-identity">${logo ? `<img class="team-drawer-crest" src="${escape(logo)}" alt="${escape(team.team)} crest">` : ''}<div class="team-drawer-owner">${escape(team.owner || 'Unassigned')}</div></div><div class="team-drawer-records"><div class="team-drawer-record team-drawer-rank-pick"><span><span class="team-drawer-record-label">Overall rank</span><strong>${rank}</strong></span><span><span class="team-drawer-record-label">Draft pick</span><strong>${draftPickValue} <span class="team-drawer-draft-diff">(${draftDiffText})</span></strong></span></div><div class="team-drawer-record"><span>Overall record</span><strong>${formatRecord(team)}</strong></div><div class="team-drawer-record"><span>Home record</span><strong>${formatRecord(options.stats.homeStats?.[team.team] || team)}</strong></div><div class="team-drawer-record"><span>Away record</span><strong>${formatRecord(options.stats.awayStats?.[team.team] || team)}</strong></div></div></div></section><section class="team-drawer-card"><h2 class="team-drawer-card-title">Team Form</h2>${form ? `<div class="team-form-grid">${form}</div>` : '<p class="empty-detail">No matches available</p>'}</section>${renderTableCard(teams, team, options)}<section class="team-drawer-card"><h2 class="team-drawer-card-title">Team Stats</h2>${cardWarning}${statRow('Goals', 'GF')}${statRow('Goals Conceded', 'GA')}${statRow('Goal differential', 'GD')}${statRow('Clean sheets', 'cleanSheets')}${statRow('Yellow cards', 'yellowCards', 'yellow')}${statRow('Red cards', 'redCards', 'red')}</section>${renderPlayerStatCards(options.matches, team.team, options.playerStatsStatus)}`;
    }

    function resetFormScroll(content) {
        const formGrid = content?.querySelector('.team-form-grid');
        if (!formGrid) return;
        formGrid.scrollLeft = 0;
        const latestPlayed = formGrid.querySelector('.latest-played');
        if (latestPlayed) formGrid.scrollLeft = Math.max(0, latestPlayed.offsetLeft - formGrid.clientWidth + latestPlayed.offsetWidth);
    }

    function getLongTeamName(teamName) {
        return window.TeamNames?.longName ? window.TeamNames.longName(teamName) : teamName;
    }

    function openFromMatch(teamName, options) {
        const displayTeamName = getLongTeamName(teamName);
        const drawer = document.querySelector('.match-drawer');
        if (!options.skipRouter && drawer) drawer.scrollTop = 0;
        if (window.DrawerRouter && !options.skipRouter) {
            return window.DrawerRouter.open({
                type: 'team',
                teamName: displayTeamName,
                render: () => openFromMatch(displayTeamName, { ...options, skipRouter: true })
            });
        }

        const header = document.querySelector('.match-drawer-header');
        const title = document.getElementById('match-drawer-title');
        const content = document.getElementById('match-detail-content');
        header?.classList.remove('weekly-mode');
        header?.querySelector('.match-drawer-back')?.remove();
        if (window.DrawerRouter?.canGoBack() || options.showBackButton !== false && !window.DrawerRouter) {
            const backAction = window.DrawerRouter ? 'DrawerRouter.back()' : 'returnToMatchFromTeamDrawer()';
            header?.insertAdjacentHTML('afterbegin', `<button class="match-drawer-back" type="button" aria-label="Back to previous drawer" onclick="${backAction}">‹</button>`);
        }
        if (title) title.textContent = displayTeamName;
        if (content) {
            content.innerHTML = render(displayTeamName, options);
            resetFormScroll(content);
        }
        header?.querySelector('.match-drawer-close')?.focus({ preventScroll: true });
    }

    function getShortTeamNameForDrawer(teamName, options) {
        return options.getShortTeamName(teamName);
    }

    window.TeamDrawerShared = { render, openFromMatch, buildStats };
})();
