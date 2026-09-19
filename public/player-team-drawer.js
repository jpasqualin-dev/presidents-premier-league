(function () {
    let teamDrawerReturn = false;
    let teamDrawerTeamName = '';

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
        teamDrawerReturn = true;
        teamDrawerTeamName = teamName;
        TeamDrawerShared.openFromMatch(teamName, {
            stats: TeamDrawerShared.buildStats(window.playerMatches || [], Object.values(draftData).flat(), getOwnerOfTeam),
            matches: window.playerMatches || [],
            getLogoByName,
            getShortTeamName,
            getOwnerOfTeam,
            openMatch: true
        });
    };

    window.openMatchDrawer = function (matchId) {
        const openedFromTeamDrawer = teamDrawerReturn;
        teamDrawerReturn = false;
        return window.openSharedMatchDrawer(matchId, {
            backButtonMarkup: openedFromTeamDrawer
                ? '<button class="match-drawer-back" type="button" aria-label="Back to team details" onclick="returnToTeamDrawer()">‹</button>'
                : ''
        });
    };

    window.returnToMatchFromTeamDrawer = function () {
        teamDrawerReturn = false;
        window.openMatchDrawer(window.activeSharedMatchId);
    };

    window.returnToTeamDrawer = function () {
        if (teamDrawerTeamName) window.openTeamDrawerFromMatch(teamDrawerTeamName);
    };
})();
