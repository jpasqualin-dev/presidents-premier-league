(() => {
    const playerByPage = {
        'hef.html': 'Hef',
        'jamey.html': 'Jamey',
        'jordan.html': 'Jordan',
        'nate.html': 'Nate',
        'wes.html': 'Wes'
    };
    const pageName = window.location.pathname.split('/').pop().toLowerCase();
    const playerName = playerByPage[pageName];
    if (!playerName) return;

    const destination = new URL('jordan2.html', window.location.href);
    destination.searchParams.set('player', playerName);
    window.location.replace(destination.href);
})();