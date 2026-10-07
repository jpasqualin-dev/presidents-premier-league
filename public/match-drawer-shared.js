(function () {
    const ignoredEventPattern = /kick.?off|match start|half.?time|halftime|start (of )?(the )?(second|2nd) half|second half|delay|delayed|end regular time|end of regular time|full time/i;
    let lastDrawerTrigger = null;
    let lastDrawerMatchId = null;
    let lastDrawerFromWeekly = false;
    let drawerRenderId = 0;

    function getDrawerFocusableElements() {
        const overlay = document.getElementById('match-drawer-overlay');
        return [...(overlay?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || [])]
            .filter(element => !element.disabled && element.offsetParent !== null);
    }

    function focusDrawer() {
        const closeButton = document.querySelector('#match-drawer-overlay .match-drawer-close');
        closeButton?.focus();
    }

    window.setSharedMatchDrawerTrigger = trigger => { lastDrawerTrigger = trigger; };

    function ensureSharedDrawer() {
        if (!document.getElementById('match-drawer-overlay')) {
            document.body.insertAdjacentHTML('beforeend', `<div class="match-drawer-overlay" id="match-drawer-overlay" aria-hidden="true" onclick="closeMatchDrawer(event)"><aside class="match-drawer" role="dialog" aria-modal="true" aria-labelledby="match-drawer-title" onclick="event.stopPropagation()"><div class="match-drawer-header"><span class="match-drawer-title" id="match-drawer-title">Match details</span><button class="match-drawer-close" type="button" aria-label="Close match details" onclick="closeMatchDrawer()">&times;</button></div><div class="match-detail-content" id="match-detail-content"><p class="empty-detail">Select a match to view its details.</p></div></aside></div>`);
        }
        if (!document.getElementById('shared-match-drawer-styles')) {
            const style = document.createElement('style');
            style.id = 'shared-match-drawer-styles';
            style.textContent = `.match-drawer-overlay{position:fixed;inset:0;z-index:200;height:100vh;height:100dvh;display:flex;justify-content:flex-end;background:rgba(15,23,42,.48);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .25s ease,visibility 0s linear .25s}.match-drawer-overlay.is-open{opacity:1;visibility:visible;pointer-events:auto;transition-delay:0s}.match-drawer{width:min(100%,560px);height:100vh;height:100dvh;overflow-y:auto;background:var(--bg-color);box-shadow:-10px 0 35px rgba(0,0,0,.2);transform:translateX(100%);transition:transform .3s ease}.match-drawer-overlay.is-open .match-drawer{transform:translateX(0)}.match-drawer-header{position:sticky;top:0;z-index:1;display:flex;justify-content:center;align-items:center;min-height:50px;padding:8px 58px;background:var(--card-bg);border-bottom:1px solid var(--border-color)}.match-drawer-title{font-size:.9rem;font-weight:700;color:var(--text-muted);text-align:center}.match-drawer-close{position:absolute;right:18px;width:34px;height:34px;border:0;border-radius:50%;background:var(--border-color);color:var(--text-main);font-size:1.3rem;line-height:1;cursor:pointer}.match-detail-content{padding:18px}.match-hero,.match-detail-section{margin-bottom:14px;padding:18px;background:var(--card-bg);border:1px solid var(--border-color);border-radius:12px}.match-meta{color:var(--text-muted);font-size:.82rem;text-align:center}.match-venue{margin-top:5px;color:var(--text-muted);font-size:.78rem;text-align:center}.match-scoreline{display:grid;grid-template-columns:1fr 100px 1fr;align-items:center;gap:10px;margin:18px 0}.match-team{display:grid;justify-items:center;gap:6px;text-align:center;font-weight:700}.match-team img{width:48px;height:48px;object-fit:contain}.match-team-owner{color:var(--text-muted);font-size:.72rem;font-weight:500}.match-score{font-size:1.8rem;font-weight:800;text-align:center;color:var(--text-main)}.match-status{display:block;margin-top:2px;color:var(--text-muted);font-size:.72rem;font-weight:600;text-align:center}.match-scorers{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;padding-top:14px;border-top:1px dashed var(--border-color)}.match-scorer-column{display:flex;flex-direction:column;gap:3px;color:var(--text-muted);font-size:.78rem;line-height:1.25}.match-scorer-column.away{text-align:right}.match-scorer-empty,.empty-detail{color:var(--text-muted);opacity:.75}.match-detail-section h3{margin-bottom:16px;color:var(--text-main);font-size:.95rem;text-align:center}.stat-row{display:grid;grid-template-columns:54px 1fr 54px;align-items:center;gap:10px;margin:13px 0;font-size:.78rem}.stat-value{font-weight:700;color:var(--text-main);text-align:center}.stat-value.stat-leader{justify-self:center;padding:3px 8px;border-radius:999px;color:#fff}.stat-value.stat-leader-home{background:#3b82f6}.stat-value.stat-leader-away{background:#ef4444}.stat-label{grid-column:1/-1;order:-1;text-align:center;color:var(--text-muted)}.stat-bars{display:flex;height:8px;overflow:hidden;grid-column:2;grid-row:2;border-radius:99px;background:var(--border-color)}.stat-bar-home,.stat-bar-away{display:block;height:8px}.stat-bar-home{background:#3b82f6}.stat-bar-away{background:#ef4444}.timeline{display:grid;gap:14px;padding:4px 0}.timeline-event{display:flex;align-items:center;min-height:42px;width:100%;color:var(--text-main)}.timeline-event.home{justify-content:flex-start}.timeline-event.away{justify-content:flex-end}.timeline-event.home .event-copy{order:2;padding-left:10px;text-align:left}.timeline-event.away .event-copy{order:1;padding-right:10px;text-align:right}.event-minute{display:flex;align-items:center;justify-content:center;min-width:34px;height:34px;border-radius:50%;background:var(--border-color);color:var(--text-main);font-size:.7rem;font-weight:700}.timeline-event.home .event-minute{order:1}.timeline-event.away .event-minute{order:3}.event-copy{max-width:70%;font-size:.82rem;line-height:1.25}.event-main{display:flex;align-items:center;gap:6px;font-weight:600}.event-icon{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;flex:0 0 20px;border-radius:50%;background:var(--border-color);font-size:.72rem}.event-icon.goal{background:transparent}.event-icon.yellow,.event-icon.red{width:12px;height:17px;border-radius:2px}.event-icon.yellow{background:#facc15}.event-icon.red{background:#ef4444}.event-assist{margin-top:3px;color:var(--text-muted);font-size:.72rem}.event-sub-on{color:#16a37a}.event-sub-off{color:#d05a62}.timeline-period{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;min-height:30px;color:var(--text-main);font-size:.78rem;font-weight:800;text-align:center}.timeline-period>span:first-child,.timeline-period>span:last-child{height:1px;background:var(--border-color)}.timeline-period-label{padding:0 4px;background:var(--card-bg)}.lineups{display:grid;grid-template-columns:1fr 1fr;gap:16px}.lineup-team h4{margin-bottom:8px;color:var(--text-main);font-size:.82rem}.formation{margin-bottom:12px;color:var(--text-muted);font-size:.75rem}.lineup-group+ .lineup-group{margin-top:14px}.lineup-group h5{margin:0 0 5px;color:var(--text-muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.04em}.lineup-team ol{margin:0;padding-left:20px;color:var(--text-muted);font-size:.78rem;line-height:1.8}.lineup-position{color:var(--text-main);font-size:.68rem}body.drawer-open{overflow:hidden}@media(max-width:600px){.match-drawer-overlay{background:transparent}.match-drawer{width:100%}.match-detail-content{padding:12px}}`;
            style.textContent = style.textContent.replace(/height:100vh;height:100dvh;/g, '');
            style.textContent += '.match-drawer-overlay{height:auto}.match-drawer{height:100%}.match-drawer{background:var(--bg-color,#f4f6f8)}.match-drawer-header,.match-hero,.match-detail-section{background:var(--card-bg,#fff)}.match-drawer-header,.match-detail-section{border-color:var(--border-color,#dfe5eb)}.match-drawer-title,.match-score,.match-scorer,.match-detail-section h3,.lineup-team h4{color:var(--text-main,#1a1a1a)}.match-drawer-close,.match-drawer-back{background:var(--border-color,#dfe5eb);color:var(--text-main,#1a1a1a)}';
            style.textContent += `.match-upcoming-scoreline{margin:8px 0 18px}.match-upcoming-date{display:grid;justify-items:center;gap:2px;text-align:center}.match-upcoming-weekday{color:var(--text-muted);font-size:.8rem;font-weight:600}.match-upcoming-month-day{color:var(--text-main);font-size:1rem;font-weight:700}.match-upcoming-kickoff{color:var(--text-main);font-size:1.35rem;font-weight:800;line-height:1.1;white-space:nowrap}.upcoming-table-scroll{overflow-x:auto}.upcoming-table{width:100%;min-width:440px;border-collapse:collapse;font-size:.76rem;text-align:center}.upcoming-table th,.upcoming-table td{padding:8px 5px;border-bottom:1px solid var(--border-color);white-space:nowrap}.upcoming-table th{color:var(--text-muted);font-size:.68rem;font-weight:700}.upcoming-table-team{display:flex;align-items:center;gap:7px;text-align:left;font-weight:600}.upcoming-table-team img{width:26px;height:26px;object-fit:contain}.match-form-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.match-form-column{min-width:0}.match-form-column h4{margin:0 0 10px;color:var(--text-main);font-size:.78rem;text-align:center}.match-form-results{display:grid;gap:9px}.match-form-result{display:grid;grid-template-columns:minmax(20px,1fr) auto minmax(20px,1fr);align-items:center;gap:5px}.match-form-crest{display:flex;align-items:center;justify-content:center;min-width:0}.match-form-crest img{width:25px;height:25px;object-fit:contain}.match-form-score{min-width:55px;padding:5px 4px;border-radius:6px;color:#fff;font-size:.76rem;font-weight:800;text-align:center;white-space:nowrap}.match-form-score-win{background:#00a667}.match-form-score-draw{background:#8a9298}.match-form-score-loss{background:#e53e3e}.match-form-no-crest{display:block;width:25px;height:25px}.match-form-empty{margin:0;font-size:.72rem;text-align:center}.upcoming-stat-row{grid-template-columns:minmax(74px,1fr) minmax(44px,2fr) minmax(74px,1fr)}.upcoming-stat-row .stat-value{font-size:.7rem;white-space:nowrap}.upcoming-stat-row .stat-label{font-size:.72rem}.stat-bars-neutral{background:var(--border-color)}.stat-bars-diverging{position:relative;overflow:hidden;background:transparent}.stat-gd-zero{position:absolute;top:0;bottom:0;left:calc(50% - .5px);width:1px;background:var(--border-color)}.stat-gd-bar{position:absolute;display:block;height:3px}.stat-gd-bar-home{top:1px;background:#3b82f6}.stat-gd-bar-away{bottom:1px;background:#ef4444}`;
            style.textContent += `.upcoming-table{table-layout:fixed}.upcoming-table-position{width:6%}.upcoming-table-team-column{width:34%}.upcoming-table-played{width:7%}.upcoming-table-result{width:6%}.upcoming-table-goals{width:14%}.upcoming-table-difference{width:8%}.upcoming-table-points{width:13%}.match-form-result{width:100%;padding:0;border:0;background:transparent;color:inherit;cursor:pointer;font:inherit}.match-form-result:focus-visible{outline:2px solid var(--text-main);outline-offset:2px;border-radius:6px}.stat-bars-diverging{display:block}@media(max-width:600px){.upcoming-table-scroll{overflow-x:hidden}.upcoming-table{min-width:0;font-size:.58rem}.upcoming-table th,.upcoming-table td{padding:6px 2px;font-size:.58rem}.upcoming-table th{font-size:.54rem;letter-spacing:-.02em}.upcoming-table-team{gap:3px;white-space:normal}.upcoming-table-team img{width:18px;height:18px;flex:0 0 18px}.upcoming-table-team span{min-width:0;line-height:1.05;overflow-wrap:anywhere;white-space:normal}}`;
            style.textContent += `.upcoming-table.overall-standings-table{width:100%;min-width:0;table-layout:auto;background:var(--surface-bg);font-size:.9rem;white-space:nowrap}.upcoming-table.overall-standings-table col.rank{width:6%}.upcoming-table.overall-standings-table col.team{width:38%}.upcoming-table.overall-standings-table col.stat{width:7%}.upcoming-table.overall-standings-table col.goals{width:10%}.upcoming-table.overall-standings-table col.gd{width:8%}.upcoming-table.overall-standings-table col.points{width:10%}.upcoming-table th,.upcoming-table td{padding:12px 6px;text-align:center;border-bottom:1px solid #eaeaea}.upcoming-table th{background-color:var(--surface-bg);color:#666;font-size:.8rem;font-weight:500;text-transform:uppercase;border-bottom:2px solid #eaeaea}.upcoming-table .text-left{text-align:left!important}.upcoming-table .fotmob-rank{width:25px;color:var(--text-main);font-weight:600}.upcoming-table .team-inline{display:inline-flex;align-items:center;gap:8px}.upcoming-table .team-icon{width:18px;height:18px;object-fit:contain;vertical-align:middle}.upcoming-table-identity{line-height:1.2}.upcoming-table .table-team-name{color:#1a1a1a;font-weight:600}.upcoming-table-owner{color:#888;font-size:.7rem}body.dark-mode .upcoming-table .table-team-name{color:#f1f1f1}@media(max-width:600px){.upcoming-table th,.upcoming-table td{padding:6px 2px;font-size:.8rem}.upcoming-table .team-inline{gap:4px;white-space:normal}.upcoming-table .team-icon{width:18px;height:18px;flex:0 0 18px}.upcoming-table-identity{min-width:0;overflow-wrap:anywhere}.upcoming-table-owner{font-size:.62rem}}`;
            style.textContent += `.upcoming-table .team-inline{gap:8px}.upcoming-table-owner{font-size:.7rem}.upcoming-table th{border-bottom:1px solid #eaeaea}`;
            document.head.appendChild(style);
        }
    }

    ensureSharedDrawer();

        window.resetSharedMatchDrawerHeader = function () {
            const header = document.querySelector('#match-drawer-overlay .match-drawer-header');
            if (!header) return;
            header.classList.remove('weekly-mode');
            header.innerHTML = '<span class="match-drawer-title" id="match-drawer-title">Match details</span><button class="match-drawer-close" type="button" aria-label="Close match details" onclick="closeMatchDrawer()">&times;</button>';
        };

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
        return `<div class="lineups">${['home', 'away'].map(side => { const lineup = lineups[side] || {}, players = Array.isArray(lineup.players) ? lineup.players : []; const renderPlayers = group => group.length ? `<ol>${group.map(player => { const playerName = (typeof player === 'string' ? player : player.name || player.displayName || player.athlete?.displayName || player.athlete?.shortName || 'Unknown player').replace(/\s*\(SUB\)\s*$/i, ''); const position = String(player.position || '').trim(); return `<li>${escapeHtml(playerName)}${position && !/^SUB$/i.test(position) ? ` <span class="lineup-position">(${escapeHtml(position)})</span>` : ''}</li>`; }).join('')}</ol>` : '<p class="empty-detail">Unavailable</p>'; return `<div class="lineup-team"><h4>${escapeHtml(getTeam(match, side).name)}</h4><div class="formation">${escapeHtml(lineup.formation || 'Formation unavailable')}</div><div class="lineup-group"><h5>Starting XI</h5>${renderPlayers(players.filter(player => player.starter))}</div><div class="lineup-group"><h5>Substitutes</h5>${renderPlayers(players.filter(player => !player.starter))}</div></div>`; }).join('')}</div>`;
    }

    function renderScorers(match) {
        const scorers = Array.isArray(match.scorers) ? match.scorers : [], minute = scorer => Number.isFinite(Number(scorer.minute)) ? Number(scorer.minute) : Infinity;
        const formatMinute = value => { const text = String(value || '').trim(); return text ? `${text.replace(/'+$/, '')}'` : ''; };
        const renderTeam = teamId => { const items = scorers.filter(scorer => String(scorer.teamProviderId) === String(teamId)).sort((a, b) => minute(a) - minute(b)); return items.length ? items.map(scorer => `<span class="match-scorer">${escapeHtml(scorer.athleteName)} ${escapeHtml(formatMinute(scorer.minute))}${scorer.ownGoal ? ' (OG)' : ''}${scorer.penalty ? ' (P)' : ''}</span>`).join('') : '<span class="match-scorer-empty">No goals</span>'; };
        return `<div class="match-scorers"><div class="match-scorer-column">${renderTeam(match.homeTeam.id || match.homeTeam.providerId)}</div><div class="match-scorer-column away">${renderTeam(match.awayTeam.id || match.awayTeam.providerId)}</div></div>`;
    }

    function getSeasonTeamStats(matches) {
        const teams = window.TeamNames?.teams || [];
        const statsById = new Map(teams.map(team => [String(team.id), {
            team,
            PL: 0,
            W: 0,
            D: 0,
            L: 0,
            GF: 0,
            GA: 0,
            GD: 0,
            PTS: 0,
            yellowCards: 0,
            redCards: 0
        }]));
        const statsByName = new Map(teams.flatMap(team => [
            team.longName,
            team.shortName,
            ...(team.aliases || [])
        ].filter(Boolean).map(name => [String(name).trim().toLowerCase(), statsById.get(String(team.id))])));
        const resolveStats = team => {
            const id = String(team?.id || team?.providerId || '');
            const canonical = window.TeamNames?.resolve?.(team?.name, id);
            return statsById.get(String(canonical?.id || id)) || statsByName.get(String(team?.name || '').trim().toLowerCase());
        };

        (matches || []).forEach(match => {
            const homeScore = match.score?.fullTime?.home, awayScore = match.score?.fullTime?.away;
            if (match.status !== 'FINISHED' || !Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return;
            const home = resolveStats(match.homeTeam), away = resolveStats(match.awayTeam);
            const sideStats = { home, away };
            const scores = { home: homeScore, away: awayScore };
            const events = Array.isArray(match.events) ? match.events : [];

            ['home', 'away'].forEach(side => {
                const teamStats = sideStats[side], opponentSide = side === 'home' ? 'away' : 'home';
                if (!teamStats) return;
                const goalsFor = scores[side], goalsAgainst = scores[opponentSide];
                teamStats.PL += 1;
                teamStats.GF += goalsFor;
                teamStats.GA += goalsAgainst;
                if (goalsFor > goalsAgainst) { teamStats.W += 1; teamStats.PTS += 3; }
                else if (goalsFor === goalsAgainst) { teamStats.D += 1; teamStats.PTS += 1; }
                else teamStats.L += 1;

                const cardCounts = match.teamCards?.[side] || {};
                const providerId = String(match[`${side}Team`]?.id || match[`${side}Team`]?.providerId || '');
                const cardEvents = events.filter(event => String(event.teamProviderId || '') === providerId);
                teamStats.yellowCards += Math.max(
                    Number(cardCounts.yellow) || 0,
                    cardEvents.filter(event => event.yellowCard).length
                );
                teamStats.redCards += Math.max(
                    Number(cardCounts.red) || 0,
                    cardEvents.filter(event => event.redCard).length
                );
            });
        });

        statsById.forEach(teamStats => { teamStats.GD = teamStats.GF - teamStats.GA; });
        return [...statsById.values()];
    }

    function findTeamStats(team, allStats) {
        const id = String(team?.id || team?.providerId || '');
        const canonical = window.TeamNames?.resolve?.(team?.name, id);
        return allStats.find(item => String(item.team.id) === String(canonical?.id || id))
            || allStats.find(item => [item.team.longName, item.team.shortName, ...(item.team.aliases || [])]
                .some(name => String(name).trim().toLowerCase() === String(team?.name || '').trim().toLowerCase()));
    }

    function isSameTeam(left, right) {
        const leftId = String(left?.id || left?.providerId || ''), rightId = String(right?.id || right?.providerId || '');
        if (leftId && rightId) return leftId === rightId;
        return String(left?.name || '').trim().toLowerCase() === String(right?.name || '').trim().toLowerCase();
    }

    function rankTeams(allStats, getValue, higherIsBetter) {
        const ranked = allStats
            .map(item => ({ item, value: getValue(item) }))
            .filter(entry => Number.isFinite(entry.value))
            .sort((left, right) => (higherIsBetter ? right.value - left.value : left.value - right.value)
                || left.item.team.longName.localeCompare(right.item.team.longName));
        const ranks = new Map();
        ranked.forEach((entry, index) => {
            const previous = ranked[index - 1];
            ranks.set(entry.item, previous && entry.value === previous.value ? ranks.get(previous.item) : index + 1);
        });
        return ranks;
    }

    function renderTableCard(match, allStats) {
        const rankedTeams = [...allStats].sort((left, right) => right.PTS - left.PTS || right.GD - left.GD || right.GF - left.GF || left.team.longName.localeCompare(right.team.longName));
        const positions = new Map(rankedTeams.map((team, index) => [team, index + 1]));
        const selected = [findTeamStats(match.homeTeam, allStats), findTeamStats(match.awayTeam, allStats)]
            .filter(Boolean)
            .sort((left, right) => (positions.get(left) || Infinity) - (positions.get(right) || Infinity));
        const rows = selected.map(teamStats => {
            const team = teamStats.team;
            const teamName = window.TeamNames?.shortName?.(team.longName, team.id) || team.shortName || team.longName;
            const goals = `${teamStats.GF}-${teamStats.GA}`;
            const difference = formatSignedMetric(teamStats.GD);
            return `<tr><td class="fotmob-rank">${positions.get(teamStats) || '-'}</td><td class="text-left"><div class="team-inline">${team.crest ? `<img src="${escapeHtml(team.crest)}" class="team-icon" alt="crest">` : ''}<div class="upcoming-table-identity"><div class="table-team-name">${escapeHtml(teamName)}</div><div class="upcoming-table-owner">${escapeHtml(getOwner(team.longName))}</div></div></div></td><td>${teamStats.PL}</td><td>${teamStats.W}</td><td>${teamStats.D}</td><td>${teamStats.L}</td><td>${goals}</td><td>${difference}</td><td><strong>${teamStats.PTS}</strong></td></tr>`;
        }).join('');

        return `<section class="match-detail-section upcoming-card upcoming-table-card"><h3>Table</h3><div class="upcoming-table-scroll"><table class="overall-standings-table upcoming-table"><colgroup><col class="rank"><col class="team"><col class="stat"><col class="stat"><col class="stat"><col class="stat"><col class="goals"><col class="gd"><col class="points"></colgroup><thead><tr><th>#</th><th class="text-left">Team</th><th>PL</th><th>W</th><th>D</th><th>L</th><th>+/-</th><th>GD</th><th>PTS</th></tr></thead><tbody>${rows || '<tr><td colspan="9" class="empty-detail">Table data is unavailable.</td></tr>'}</tbody></table></div></section>`;
    }

    function getMatchResult(match, team) {
        const homeScore = match.score.fullTime.home, awayScore = match.score.fullTime.away;
        const isHome = isSameTeam(match.homeTeam, team);
        const teamScore = isHome ? homeScore : awayScore, opponentScore = isHome ? awayScore : homeScore;
        return teamScore > opponentScore ? 'win' : teamScore === opponentScore ? 'draw' : 'loss';
    }

    function formCrest(team) {
        const crest = window.TeamNames?.crest?.(team.name, team.id || team.providerId) || team.crest;
        return crest
            ? `<img src="${escapeHtml(crest)}" alt="${escapeHtml(team.name)}" title="${escapeHtml(team.name)}">`
            : '<span class="match-form-no-crest" aria-hidden="true"></span>';
    }

    function renderFormMatch(match, team) {
        const result = getMatchResult(match, team);
        const home = match.homeTeam, away = match.awayTeam;
        return `<button type="button" class="match-form-result ${result}" data-match-id="${escapeHtml(match.id)}" aria-label="View ${escapeHtml(home.name)} ${match.score.fullTime.home}, ${escapeHtml(away.name)} ${match.score.fullTime.away} match details"><span class="match-form-crest">${formCrest(home)}</span><span class="match-form-score match-form-score-${result}">${match.score.fullTime.home} - ${match.score.fullTime.away}</span><span class="match-form-crest">${formCrest(away)}</span></button>`;
    }

    function renderTeamFormColumn(team, matches, beforeDate) {
        const recentMatches = matches
            .filter(match => match.status === 'FINISHED'
                && new Date(match.utcDate) < beforeDate
                && Number.isFinite(match.score?.fullTime?.home)
                && Number.isFinite(match.score?.fullTime?.away)
                && (isSameTeam(match.homeTeam, team) || isSameTeam(match.awayTeam, team)))
            .sort((left, right) => new Date(right.utcDate) - new Date(left.utcDate))
            .slice(0, 5);
        const title = escapeHtml(window.TeamNames?.shortName?.(team.name, team.id || team.providerId) || team.name);
        const rows = recentMatches.length
            ? recentMatches.map(match => renderFormMatch(match, team)).join('')
            : '<p class="empty-detail match-form-empty">No previous results.</p>';
        return `<div class="match-form-column"><h4>${title}</h4><div class="match-form-results">${rows}</div></div>`;
    }

    function renderFormCard(match, matches, beforeDate) {
        return `<section class="match-detail-section upcoming-card upcoming-form-card"><h3>Team form</h3><div class="match-form-columns">${renderTeamFormColumn(match.homeTeam, matches, beforeDate)}${renderTeamFormColumn(match.awayTeam, matches, beforeDate)}</div></section>`;
    }

    function formatMetric(value, decimals = 0) {
        return Number.isFinite(value)
            ? new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)
            : '—';
    }

    function formatSignedMetric(value) {
        return value < 0 ? `-${formatMetric(Math.abs(value))}` : `+${formatMetric(value)}`;
    }

    function renderStatBar(homeValue, awayValue, category, allStats, ranks, homeStats, awayStats) {
        let homeWidth;
        if (category === 'goalDifference') {
            const differences = allStats.map(item => item.GD).filter(Number.isFinite);
            const lowest = Math.min(...differences), highest = Math.max(...differences);
            if (!differences.length || lowest === highest) homeWidth = 50;
            else {
                const strength = value => Math.max(5, Math.min(95, 5 + 90 * (value - lowest) / (highest - lowest)));
                const homeStrength = strength(homeValue), awayStrength = strength(awayValue);
                homeWidth = homeStrength / (homeStrength + awayStrength) * 100;
            }
        } else if (category === 'yellowCards' || category === 'redCards') {
            const strength = team => Math.max(5, 100 - ((ranks.get(team) || allStats.length) - 1) * 5);
            const homeStrength = strength(homeStats), awayStrength = strength(awayStats);
            homeWidth = homeStrength / (homeStrength + awayStrength) * 100;
        } else {
            const total = homeValue + awayValue;
            if (!total) return '<span class="stat-bars stat-bars-neutral" aria-hidden="true"></span>';
            homeWidth = homeValue / total * 100;
        }
        return `<span class="stat-bars" aria-hidden="true"><span class="stat-bar-home" style="width:${homeWidth}%"></span><span class="stat-bar-away" style="width:${100 - homeWidth}%"></span></span>`;
    }

    function renderSeasonStatsCard(match, allStats) {
        const homeStats = findTeamStats(match.homeTeam, allStats), awayStats = findTeamStats(match.awayTeam, allStats);
        if (!homeStats || !awayStats) return '<section class="match-detail-section upcoming-card"><h3>Stats</h3><p class="empty-detail">Season stats are unavailable.</p></section>';
        const definitions = [
            ['Pts per match', 'pointsPerMatch', item => item.PL ? item.PTS / item.PL : null, true, 2],
            ['Goals per match', 'goalsPerMatch', item => item.PL ? item.GF / item.PL : null, true, 2],
            ['Goals conceded per match', 'goalsConcededPerMatch', item => item.PL ? item.GA / item.PL : null, false, 2],
            ['Goal Differential', 'goalDifference', item => item.GD, true, 0],
            ['Yellow Cards', 'yellowCards', item => item.yellowCards, false, 0],
            ['Red Cards', 'redCards', item => item.redCards, false, 0]
        ];
        const valuesByKey = new Map(definitions.map(([, key, getValue]) => [key, {
            home: getValue(homeStats),
            away: getValue(awayStats)
        }]));
        const ranksByKey = new Map(definitions.map(([, key, getValue, higherIsBetter]) => [
            key,
            rankTeams(allStats, getValue, higherIsBetter)
        ]));
        const rows = definitions.map(([label, key, , , decimals]) => {
            const values = valuesByKey.get(key), ranks = ranksByKey.get(key);
            const rankLabel = (team, value) => Number.isFinite(value) ? ` (#${ranks.get(team)})` : '';
            const formatValue = value => key === 'goalDifference' ? formatSignedMetric(value) : formatMetric(value, decimals);
            const homeDisplay = Number.isFinite(values.home) ? `${formatValue(values.home)}${rankLabel(homeStats, values.home)}` : '—';
            const awayDisplay = Number.isFinite(values.away) ? `${formatValue(values.away)}${rankLabel(awayStats, values.away)}` : '—';
            return `<div class="stat-row upcoming-stat-row"><span class="stat-value">${escapeHtml(homeDisplay)}</span><span class="stat-label">${escapeHtml(label)}</span><span class="stat-value">${escapeHtml(awayDisplay)}</span>${renderStatBar(values.home || 0, values.away || 0, key, allStats, ranks, homeStats, awayStats)}</div>`;
        }).join('');
        return `<section class="match-detail-section upcoming-card upcoming-stats-card"><h3>Stats</h3>${rows}</section>`;
    }

    function renderUpcomingMatchDetail(match, matches, renderTeam) {
        const date = new Date(match.utcDate);
        const weekday = date.toLocaleDateString([], { weekday: 'long' });
        const monthDay = date.toLocaleDateString([], { month: 'long', day: 'numeric' });
        const kickoff = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const allStats = getSeasonTeamStats(matches);
        const hero = `<section class="match-hero"><div class="match-scoreline match-upcoming-scoreline">${renderTeam(match.homeTeam)}<div class="match-upcoming-date"><span class="match-upcoming-month-day">${escapeHtml(monthDay)}</span><span class="match-upcoming-weekday">${escapeHtml(weekday)}</span><span class="match-upcoming-kickoff">${escapeHtml(kickoff)}</span></div>${renderTeam(match.awayTeam)}</div><div class="match-venue">${escapeHtml(match.venue || 'Venue unavailable')}</div></section>`;
        return `${hero}${renderTableCard(match, allStats)}${renderFormCard(match, matches, date)}${renderSeasonStatsCard(match, allStats)}`;
    }

    window.renderSharedMatchDetail = function (match, matches = []) {
        const home = match.homeTeam, away = match.awayTeam, score = match.score?.fullTime?.home == null ? 'vs' : `${match.score.fullTime.home} - ${match.score.fullTime.away}`;
        const status = match.status === 'FINISHED' ? 'Full time' : match.status === 'IN_PLAY' ? `${match.minute || 'Live'}'` : match.status === 'PAUSED' ? 'Half time' : 'Upcoming';
        const renderTeam = team => typeof window.openTeamDrawerFromMatch === 'function'
            ? `<div class="match-team match-team-link" role="button" tabindex="0" aria-label="View ${escapeHtml(team.name)} details" onclick="openTeamDrawerFromMatch('${escapeHtml(team.name)}')" onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openTeamDrawerFromMatch('${escapeHtml(team.name)}'); }"><span>${escapeHtml(team.name)}</span>${team.crest ? `<img src="${escapeHtml(team.crest)}" alt="">` : ''}<span class="match-team-owner">${escapeHtml(getOwner(team.name))}</span></div>`
            : `<div class="match-team"><span>${escapeHtml(team.name)}</span>${team.crest ? `<img src="${escapeHtml(team.crest)}" alt="">` : ''}<span class="match-team-owner">${escapeHtml(getOwner(team.name))}</span></div>`;
        if (!['FINISHED', 'IN_PLAY', 'PAUSED'].includes(match.status)) {
            return renderUpcomingMatchDetail(match, matches, renderTeam);
        }
        return `<section class="match-hero"><div class="match-meta">${escapeHtml(formatDate(match.utcDate))}</div><div class="match-scoreline">${renderTeam(home)}<div class="match-score">${escapeHtml(score)}<span class="match-status">${escapeHtml(status)}</span></div>${renderTeam(away)}</div><div class="match-venue">${escapeHtml(match.venue || 'Venue unavailable')}</div>${renderScorers(match)}</section><section class="match-detail-section"><h3>Match Stats</h3>${renderStats(match)}</section><section class="match-detail-section"><h3>Match Events</h3>${renderEvents(match)}</section><section class="match-detail-section"><h3>Lineups</h3>${renderLineups(match)}</section>`;
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
        return { match, matches: data.matches || [] };
    };

    window.openSharedMatchDrawer = async function (matchId, options = {}) {
        if (!options.skipRouter) {
            lastDrawerMatchId = String(matchId);
            lastDrawerFromWeekly = Boolean(document.querySelector(`#match-drawer-overlay .weekly-form-match[data-match-id="${CSS.escape(lastDrawerMatchId)}"]`));
            const activeElement = document.activeElement;
            lastDrawerTrigger = activeElement?.dataset?.matchId === String(matchId)
                ? activeElement
                : document.querySelector(`[data-match-id="${CSS.escape(String(matchId))}"]`) || activeElement;
        }
        if (window.DrawerRouter && !options.skipRouter) {
            return window.DrawerRouter.open({
                type: 'match',
                id: String(matchId),
                render: () => window.openSharedMatchDrawer(matchId, { ...options, skipRouter: true })
            });
        }

        const overlay = document.getElementById('match-drawer-overlay'), drawer = overlay.querySelector('.match-drawer'), content = document.getElementById('match-detail-content');
        const renderId = ++drawerRenderId;
        window.resetSharedMatchDrawerHeader();
        const header = overlay.querySelector('.match-drawer-header');
        const backButtonMarkup = window.DrawerRouter?.canGoBack()
            ? '<button class="match-drawer-back" type="button" aria-label="Back to previous drawer" onclick="DrawerRouter.back()">‹</button>'
            : options.backButtonMarkup || '';
        if (header && backButtonMarkup) header.insertAdjacentHTML('afterbegin', backButtonMarkup);
        document.getElementById('match-drawer-title').textContent = 'Match details';
        drawer.scrollTop = 0; overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden', 'false'); document.body.classList.add('drawer-open'); content.innerHTML = '<p class="empty-detail">Loading match details...</p>';
        focusDrawer();
        try {
            const { match, matches } = await window.fetchSharedMatchById(matchId);
            if (renderId !== drawerRenderId) return;
            content.innerHTML = window.renderSharedMatchDetail(match, matches);
            window.bindSharedMatchRows(content);
        }
        catch (error) {
            if (renderId !== drawerRenderId) return;
            console.error('Error fetching match details:', error);
            content.innerHTML = '<p class="empty-detail">Unable to load match details.</p>';
        }
    };

    window.closeSharedMatchDrawer = function (event) {
        if (event && event.target.id !== 'match-drawer-overlay') return;
        const closingWeeklyDrawer = window.DrawerRouter?.current()?.type === 'weekly';
        window.DrawerRouter?.closeAll();
        const overlay = document.getElementById('match-drawer-overlay'); overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden', 'true'); document.body.classList.remove('drawer-open');
        window.resetSharedMatchDrawerHeader();
        drawerRenderId += 1;
        const weeklyTrigger = lastDrawerFromWeekly && lastDrawerMatchId
            ? document.querySelector(`.weekly-form-match[data-match-id="${CSS.escape(lastDrawerMatchId)}"]`)
            : null;
        const weeklyOpener = document.querySelector('.mw-header[role="button"]');
        if (closingWeeklyDrawer && weeklyOpener) weeklyOpener.focus();
        else if (weeklyTrigger) weeklyTrigger.focus();
        else if (lastDrawerTrigger && typeof lastDrawerTrigger.focus === 'function' && lastDrawerTrigger.isConnected) lastDrawerTrigger.focus();
        lastDrawerTrigger = null;
        lastDrawerMatchId = null;
        lastDrawerFromWeekly = false;
    };

    window.closeMatchDrawer = window.closeSharedMatchDrawer;

    if (typeof window.openMatchDrawer !== 'function') window.openMatchDrawer = window.openSharedMatchDrawer;

    window.bindSharedMatchRows = function (container) {
        container.querySelectorAll('[data-match-id]').forEach(row => {
            row.addEventListener('click', () => window.openSharedMatchDrawer(row.dataset.matchId));
            row.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    window.openSharedMatchDrawer(row.dataset.matchId);
                }
            });
        });
    };

    document.addEventListener('keydown', event => {
        const overlay = document.getElementById('match-drawer-overlay');
        if (!overlay?.classList.contains('is-open')) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            window.closeSharedMatchDrawer();
            return;
        }
        if (event.key !== 'Tab') return;
        const focusable = getDrawerFocusableElements();
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });
})();
