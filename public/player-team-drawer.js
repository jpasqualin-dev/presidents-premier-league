(function () {
    let teamDrawerReturn = false;
    let teamDrawerTeamName = '';
    let teamDrawerOpen = false;

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

    window.openTeamDrawerFromMatch = function (teamName) {
        const overlay = document.getElementById('match-drawer-overlay');
        const openedFromMatch = overlay?.classList.contains('is-open');
        const matches = window.matchDrawerMatches || window.playerMatches || [];
        teamDrawerReturn = openedFromMatch;
        teamDrawerOpen = true;
        teamDrawerTeamName = teamName;
        TeamDrawerShared.openFromMatch(teamName, {
            stats: TeamDrawerShared.buildStats(matches, Object.values(draftData).flat(), getOwnerOfTeam),
            matches,
            getLogoByName,
            getShortTeamName,
            getOwnerOfTeam,
            openMatch: true,
            showBackButton: openedFromMatch
        });
        if (!openedFromMatch) {
            overlay?.classList.add('is-open');
            overlay?.setAttribute('aria-hidden', 'false');
            document.body.classList.add('drawer-open');
            overlay?.querySelector('.match-drawer-back')?.remove();
        }
    };

    window.openMatchDrawer = function (matchId) {
        const openedFromTeamDrawer = teamDrawerOpen;
        teamDrawerReturn = false;
        teamDrawerOpen = false;
        return window.openSharedMatchDrawer(matchId, {
            backButtonMarkup: openedFromTeamDrawer
                ? '<button class="match-drawer-back" type="button" aria-label="Back to team details" onclick="returnToTeamDrawer()">‹</button>'
                : ''
        });
    };

    window.returnToMatchFromTeamDrawer = function () {
        teamDrawerReturn = false;
        teamDrawerOpen = false;
        window.openMatchDrawer(window.activeSharedMatchId);
    };

    window.returnToTeamDrawer = function () {
        if (teamDrawerTeamName) window.openTeamDrawerFromMatch(teamDrawerTeamName);
    };

    document.addEventListener('drawer-router-closed', () => {
        teamDrawerReturn = false;
        teamDrawerOpen = false;
    });
})();
