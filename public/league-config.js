(() => {
    const draftData = {
        Hef: ['Arsenal', 'AFC Bournemouth', 'Nottingham Forest', 'Hull City'],
        Jordan: ['Manchester City', 'Brighton & Hove Albion', 'Brentford', 'Ipswich Town'],
        Wes: ['Liverpool', 'Newcastle United', 'Sunderland', 'Coventry City'],
        Nate: ['Manchester United', 'Aston Villa', 'Everton', 'Fulham'],
        Jamey: ['Chelsea', 'Tottenham Hotspur', 'Crystal Palace', 'Leeds United']
    };

    const draftPicks = {
        Arsenal: 1,
        'Manchester City': 2,
        Liverpool: 3,
        'Manchester United': 4,
        Chelsea: 5,
        'Tottenham Hotspur': 6,
        'Aston Villa': 7,
        'Newcastle United': 8,
        'Brighton & Hove Albion': 9,
        'AFC Bournemouth': 10,
        'Nottingham Forest': 11,
        Brentford: 12,
        Sunderland: 13,
        Everton: 14,
        'Crystal Palace': 15,
        'Leeds United': 16,
        Fulham: 17,
        'Coventry City': 18,
        'Ipswich Town': 19,
        'Hull City': 20
    };

    const divisions = {
        'Red and Blue Division': ['Arsenal', 'Manchester City', 'Liverpool', 'Manchester United', 'Chelsea'],
        'Birds and Beasts Division': ['Tottenham Hotspur', 'Aston Villa', 'Newcastle United', 'Brighton & Hove Albion', 'AFC Bournemouth'],
        'Field and Forest Division': ['Nottingham Forest', 'Brentford', 'Sunderland', 'Everton', 'Crystal Palace'],
        'Cottage and Country Division': ['Leeds United', 'Fulham', 'Coventry City', 'Ipswich Town', 'Hull City']
    };

    const ownersByTeam = Object.fromEntries(Object.entries(draftData).flatMap(([owner, teams]) => teams.map(team => [team, owner])));
    const getOwnerOfTeam = teamName => {
        const value = String(teamName || '').toLowerCase();
        const entry = Object.entries(ownersByTeam).find(([team]) => value.includes(team.toLowerCase()) || team.toLowerCase().includes(value));
        return entry?.[1] || 'Free Agent / Unassigned';
    };

    window.PplLeagueConfig = Object.freeze({
        draftData,
        draftPicks,
        divisions,
        ownersByTeam,
        getOwnerOfTeam
    });
})();
