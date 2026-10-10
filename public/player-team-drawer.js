(function () {
    let teamDrawerTeamName = '';
    let teamDrawerOpen = false;
    let detailedMatches = null;
    let detailedMatchesPromise = null;
    let detailedMatchesError = null;
    let detailedMatchesStatus = null;
    const { draftData, getOwnerOfTeam } = window.PplLeagueConfig;

    function getLogoByName(teamName) {
        const canonicalLogo = window.TeamNames?.crest(teamName);
        if (canonicalLogo) return canonicalLogo;
        const logos = window.playerTeamLogos || {};
        const key = Object.keys(logos).find(name => teamName.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(teamName.toLowerCase()));
        return key ? logos[key] : '';
    }

    function getShortTeamName(teamName) {
        return window.TeamNames ? window.TeamNames.shortName(teamName) : String(teamName);
    }

    function renderTeamDrawer(teamName, matches, playerStatsStatus, skipRouter = false, auditCardEvents = false) {
        const overlay = document.getElementById('match-drawer-overlay');
        const openedFromMatch = overlay?.classList.contains('is-open');
        const stats = TeamDrawerShared.buildStats(matches, Object.values(draftData).flat(), getOwnerOfTeam, { auditCardEvents });
        TeamDrawerShared.openFromMatch(teamName, {
            stats,
            matches,
            playerStatsStatus,
            getLogoByName,
            getShortTeamName,
            getOwnerOfTeam,
            skipRouter,
            openMatch: true,
            showBackButton: openedFromMatch
        });
        if (!openedFromMatch) {
            overlay?.classList.add('is-open');
            overlay?.setAttribute('aria-hidden', 'false');
            document.body.classList.add('drawer-open');
            overlay?.querySelector('.match-drawer-back')?.remove();
        }
    }

    window.openTeamDrawerFromMatch = function (teamName) {
        teamDrawerOpen = true;
        teamDrawerTeamName = teamName;
        if (!detailedMatches && !detailedMatchesPromise) detailedMatchesError = null;
        const matches = detailedMatches || window.matchDrawerMatches || window.playerMatches || [];
        renderTeamDrawer(
            teamName,
            matches,
            detailedMatches ? detailedMatchesStatus : detailedMatchesError ? { error: detailedMatchesError.message } : { loading: true },
            false,
            Boolean(detailedMatches)
        );
        if (detailedMatches) return;

        detailedMatchesPromise ||= window.getMatchData({ includeDetails: true })
            .then(data => {
                if (data?.dataQuality?.detailLevel !== 'full'
                    || !Array.isArray(data.matches)
                    || data.matches.length === 0
                    || !data.matches.every(match => Array.isArray(match.scorers)
                        && Array.isArray(match.events)
                        && Array.isArray(match.teamStats)
                        && match.teamCards
                        && typeof match.teamCards === 'object')) {
                    throw new Error('Detailed season match data is incomplete.');
                }
                detailedMatches = data.matches;
                window.matchDrawerMatches = detailedMatches;
                detailedMatchesError = null;
                detailedMatchesStatus = window.DataManager.getStatus({ includeDetails: true });
                return detailedMatches;
            })
            .catch(error => {
                console.error('Unable to load detailed team drawer stats:', error);
                const summaryStatus = window.DataManager.getStatus();
                const staleNote = summaryStatus.stale
                    ? ` Summary data was last synced ${summaryStatus.lastSuccessfulSync ? new Date(summaryStatus.lastSuccessfulSync).toLocaleString() : 'at an unknown time'}.`
                    : '';
                detailedMatchesError = new Error(`${error.message}${staleNote}`);
                return null;
            })
            .finally(() => { detailedMatchesPromise = null; });

        detailedMatchesPromise.then(fullMatches => {
            if (!teamDrawerOpen || teamDrawerTeamName.toLowerCase() !== String(teamName).toLowerCase()) return;
            renderTeamDrawer(
                teamName,
                fullMatches || matches,
                fullMatches ? detailedMatchesStatus : { error: detailedMatchesError?.message || 'Detailed match data is unavailable.' },
                true,
                Boolean(fullMatches)
            );
        });
    };

    window.openMatchDrawer = function (matchId) {
        const openedFromTeamDrawer = teamDrawerOpen;
        teamDrawerOpen = false;
        return window.openSharedMatchDrawer(matchId, {
            backButtonMarkup: openedFromTeamDrawer
                ? '<button class="match-drawer-back" type="button" aria-label="Back to team details" onclick="returnToTeamDrawer()">‹</button>'
                : ''
        });
    };

    window.returnToMatchFromTeamDrawer = function () {
        teamDrawerOpen = false;
        window.openMatchDrawer(window.activeSharedMatchId);
    };

    window.returnToTeamDrawer = function () {
        if (teamDrawerTeamName) window.openTeamDrawerFromMatch(teamDrawerTeamName);
    };

    document.addEventListener('drawer-router-closed', () => {
        teamDrawerOpen = false;
    });
})();
