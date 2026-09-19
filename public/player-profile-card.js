(function () {
    const style = document.createElement('style');
    style.textContent = `.profile-card{display:block!important;padding:12px 14px!important}.profile-card .profile-info{text-align:center}.profile-card .profile-info p{display:none}.profile-card .profile-info h1{margin:0}.profile-card .profile-info h1::after{content:"❯"}.profile-card-team-row{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:10px}.profile-card-teams{display:flex;align-items:center;justify-content:center;gap:12px;min-width:0}.profile-card-team{display:inline-flex;width:58px;height:58px;align-items:center;justify-content:center;padding:4px;border:0;border-radius:8px;background:transparent;cursor:pointer}.profile-card-team:hover,.profile-card-team:focus-visible{background:var(--border-color,#edf2f7)}.profile-card-team:focus-visible{outline:2px solid #00a667;outline-offset:2px}.profile-card-team img{width:50px;height:50px;object-fit:contain}.profile-card-team .empty{width:50px;height:50px}.profile-card-team-row .points-badge{flex:0 0 auto}.profile-card[aria-expanded="true"] .profile-card-team-row{margin-bottom:2px}@media(max-width:480px){.profile-card-team-row{gap:6px}.profile-card-teams{gap:2px}.profile-card-team{width:52px;height:52px}.profile-card-team img,.profile-card-team .empty{width:46px;height:46px}.points-badge{padding:8px 10px!important}}`;
    document.head.appendChild(style);

    document.addEventListener('DOMContentLoaded', () => {
        const card = document.querySelector('.profile-card');
        const info = card?.querySelector('.profile-info');
        const points = card?.querySelector('.points-badge');
        const teams = window.playerTeams || [];
        if (!card || !info || !points) return;

        const teamRow = document.createElement('div');
        teamRow.className = 'profile-card-team-row';
        const teamButtons = document.createElement('div');
        teamButtons.className = 'profile-card-teams';
        const logos = window.playerTeamLogos || {};
        const getLogo = teamName => {
            const key = Object.keys(logos).find(name => teamName.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(teamName.toLowerCase()));
            return key ? logos[key] : '';
        };
        teams.forEach(teamName => {
            const button = document.createElement('button');
            button.className = 'profile-card-team';
            button.type = 'button';
            button.setAttribute('aria-label', `View ${teamName} details`);
            const logo = getLogo(teamName);
            button.innerHTML = logo ? `<img src="${logo}" alt="${teamName} crest">` : '<span class="empty" aria-hidden="true"></span>';
            button.addEventListener('click', event => {
                event.stopPropagation();
                window.openTeamDrawerFromMatch?.(teamName);
            });
            teamButtons.appendChild(button);
        });
        teamRow.append(teamButtons, points);
        card.insertBefore(teamRow, card.querySelector('.achievement-summary'));
    });
})();
