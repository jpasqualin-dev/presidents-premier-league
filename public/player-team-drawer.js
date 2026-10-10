(function () {
    let teamDrawerTeamName = '';
    let teamDrawerOpen = false;
    let detailedMatches = null;
    let detailedMatchesPromise = null;
    let detailedMatchesError = null;
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

    function renderTeamDrawer(teamName, matches, playerStatsStatus, skipRouter = false) {
        const overlay = document.getElementById('match-drawer-overlay');
        const openedFromMatch = overlay?.classList.contains('is-open');
        const stats = TeamDrawerShared.buildStats(matches, Object.values(draftData).flat(), getOwnerOfTeam);
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
        renderTeamDrawer(teamName, matches, detailedMatches ? null : detailedMatchesError ? { error: detailedMatchesError.message } : { loading: true });
        if (detailedMatches) return;

        detailedMatchesPromise ||= window.getMatchData({ includeDetails: true })
            .then(data => {
                if (!Array.isArray(data?.matches)) throw new Error('Detailed match data is unavailable.');
                detailedMatches = data.matches;
                window.matchDrawerMatches = detailedMatches;
                detailedMatchesError = null;
                return detailedMatches;
            })
            .catch(error => {
                console.error('Unable to load detailed team drawer stats:', error);
                detailedMatchesError = error;
                return null;
            })
            .finally(() => { detailedMatchesPromise = null; });

        detailedMatchesPromise.then(fullMatches => {
            if (!teamDrawerOpen || teamDrawerTeamName.toLowerCase() !== String(teamName).toLowerCase()) return;
            renderTeamDrawer(
                teamName,
                fullMatches || matches,
                fullMatches ? null : { error: detailedMatchesError?.message || 'Detailed match data is unavailable.' },
                true
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
