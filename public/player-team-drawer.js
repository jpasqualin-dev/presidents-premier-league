(function () {
    let teamDrawerReturn = false;
    let teamDrawerTeamName = '';
    let teamDrawerOpen = false;

    function getLogoByName(teamName) {
        const logos = window.playerTeamLogos || {};
        const key = Object.keys(logos).find(name => teamName.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(teamName.toLowerCase()));
        return key ? logos[key] : '';
    }

    function getShortTeamName(teamName) {
        return String(teamName)
            .replace(' FC', '')
            .replace(' & Hove Albion', '')
            .replace(' Hotspur', '')
            .replace('A.F.C. ', '');
    }

    window.openTeamDrawerFromMatch = function (teamName) {
        const overlay = document.getElementById('match-drawer-overlay');
        const openedFromMatch = overlay?.classList.contains('is-open');
        teamDrawerReturn = openedFromMatch;
        teamDrawerOpen = true;
        teamDrawerTeamName = teamName;
        TeamDrawerShared.openFromMatch(teamName, {
            stats: TeamDrawerShared.buildStats(window.playerMatches || [], Object.values(draftData).flat(), getOwnerOfTeam),
            matches: window.playerMatches || [],
            getLogoByName,
            getShortTeamName,
            getOwnerOfTeam,
            openMatch: true
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
})();
