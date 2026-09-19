(function () {
    const style = document.createElement('style');
    style.textContent = `.profile-card{display:block!important;padding:12px 14px!important}.profile-card-top-row{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px}.profile-card .profile-info{text-align:center}.profile-card .profile-info p{display:none}.profile-card .profile-info h1{margin:0}.profile-card .profile-info h1::after{content:none}.profile-card-chevron{display:flex;width:34px;height:34px;align-items:center;justify-content:center;justify-self:center;border-radius:50%;background:var(--border-color,#dfe5eb);color:var(--text-main,#1a1a1a);font-size:.95rem;line-height:1;transition:transform .25s ease}.profile-card[aria-expanded="true"] .profile-card-chevron{transform:rotate(90deg)}.profile-card-team-row{display:block;margin-top:10px}.profile-card-teams{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));width:100%;gap:8px}.profile-card-team{display:flex;width:100%;min-width:0;min-height:88px;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:4px 2px;border:0;border-radius:8px;background:transparent;cursor:pointer}.profile-card-team:hover,.profile-card-team:focus-visible{background:var(--border-color,#edf2f7)}.profile-card-team:focus-visible{outline:2px solid #00a667;outline-offset:2px}.profile-card-team img{width:50px;height:50px;object-fit:contain}.profile-card-team .empty{width:50px;height:50px}.profile-card-team-name{max-width:100%;overflow:hidden;color:var(--text-main,#1a1a1a);font-size:.68rem;font-weight:700;line-height:1.1;text-align:center;text-overflow:ellipsis;white-space:nowrap}.profile-card[aria-expanded="true"] .profile-card-team-row{margin-bottom:2px}@media(max-width:480px){.profile-card-top-row{gap:8px}.profile-card-teams{gap:2px}.profile-card-team{min-height:82px}.profile-card-team img,.profile-card-team .empty{width:46px;height:46px}.profile-card-team-name{font-size:.62rem}.points-badge{padding:8px 10px!important}}`;
    document.head.appendChild(style);

    document.addEventListener('DOMContentLoaded', () => {
        const card = document.querySelector('.profile-card');
        const info = card?.querySelector('.profile-info');
        const points = card?.querySelector('.points-badge');
        const teams = window.playerTeams || [];
        if (!card || !info || !points) return;

        const topRow = document.createElement('div');
        topRow.className = 'profile-card-top-row';
        const chevron = document.createElement('span');
        chevron.className = 'profile-card-chevron';
        chevron.setAttribute('aria-hidden', 'true');
        chevron.textContent = '❯';
        topRow.append(info, points, chevron);

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
            button.innerHTML = `${logo ? `<img src="${logo}" alt="${teamName} crest">` : '<span class="empty" aria-hidden="true"></span>'}<span class="profile-card-team-name">${teamName}</span>`;
            button.addEventListener('click', event => {
                event.stopPropagation();
                window.openTeamDrawerFromMatch?.(teamName);
            });
            teamButtons.appendChild(button);
        });
        teamRow.append(teamButtons);
        card.insertBefore(topRow, card.firstChild);
        card.insertBefore(teamRow, card.querySelector('.achievement-summary'));
    });
})();
