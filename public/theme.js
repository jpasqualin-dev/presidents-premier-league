(() => {
    const themeToggle = document.querySelector('.theme-toggle');

    const applyNavigationTemplate = () => {
        const siteMenu = document.querySelector('.site-menu');
        if (!siteMenu) return;

        const navigationWrapper = siteMenu.closest('.sticky-nav-wrapper');
        if (navigationWrapper) navigationWrapper.before(siteMenu);

        const pillNavigation = document.querySelector('.pills-nav-container');
        if (navigationWrapper && pillNavigation) siteMenu.after(pillNavigation);
        const updatePrimaryMenuHeight = () => {
            document.documentElement.style.setProperty(
                '--primary-menu-height',
                `${Math.ceil(siteMenu.getBoundingClientRect().height)}px`
            );
        };
        updatePrimaryMenuHeight();
        if ('ResizeObserver' in window) {
            new ResizeObserver(updatePrimaryMenuHeight).observe(siteMenu);
        }

        const menuBackdrop = document.createElement('div');
        menuBackdrop.className = 'menu-backdrop';
        document.body.prepend(menuBackdrop);

        if (document.querySelector('.main-container')) {
            document.body.classList.add('wide-page');
        }

        const navigationStyles = document.createElement('style');
        navigationStyles.textContent = `
            html { background: #ffffff; }
            html:has(body.dark-mode) { background: #121212; }
            body { --menu-page-pad: 16px; --menu-max-width: 600px; }
            body:not(.dark-mode) { background-color: #ffffff; }
            body.wide-page { --menu-max-width: 800px; }
            .menu-backdrop { position: fixed; top: 0; left: 50%; transform: translateX(-50%); width: min(calc(100vw - 2 * var(--menu-page-pad)), var(--menu-max-width)); height: 5px; background: rgba(255,255,255,0.96); z-index: 15; pointer-events: none; }
            .header-container { position: relative; top: auto; z-index: 25; }
            .header-container .theme-toggle { min-height: 60px; padding: 0 14px; border-radius: 4px; }
            .header-container .theme-toggle:focus-visible { outline-offset: 3px; }
            .site-menu { position: sticky; top: 0; z-index: 20; height: auto; padding: 6px 3px; margin-bottom: 0; background: #ffffff; border: 0; border-radius: 0; box-shadow: none; }
            .site-menu a, .players-menu summary { color: #38003c; }
            .players-menu[open] summary { background: #f0fff4; border-color: #c6f6d5; }
            .site-menu a.active::after { right: 8px; left: 8px; background: #38003c; }
            body.wide-page .header-container, body.wide-page .site-menu { margin-right: 0; margin-left: 0; }
            body.wide-page .sticky-nav-wrapper { position: static; background: transparent; }
            body.wide-page .pills-nav-container { position: sticky; top: var(--primary-menu-height, 36px); z-index: 19; background: #ffffff; }
            body:not(.wide-page) .profile-card { top: var(--primary-menu-height, 36px); z-index: 19; }
            body.wide-page::before { display: none; }
            @media (hover: hover) { .site-menu a:hover, .players-menu summary:hover { background: #f0fff4; border-color: #c6f6d5; } }
            @media (max-width: 768px) { body { --menu-page-pad: 10px; } }
            body.dark-mode .menu-backdrop, body.dark-mode .site-menu { background: #121212; }
            body.dark-mode.wide-page .pills-nav-container { background: #121212; }
            body.dark-mode .site-menu a, body.dark-mode .players-menu summary { color: #f2f2f2; }
            body.dark-mode .site-menu a.active::after { background: #00ff87; }
            body.dark-mode .players-menu[open] summary { background: #2a2a2a; border-color: #4b4b4b; }
            @media (hover: hover) { body.dark-mode .site-menu a:hover, body.dark-mode .players-menu summary:hover { background: #2a2a2a; border-color: #4b4b4b; } }
        `;
        document.head.append(navigationStyles);
    };

    const setTheme = theme => {
        const isDarkMode = theme === 'dark';
        document.body.classList.toggle('dark-mode', isDarkMode);
        localStorage.setItem('ppl-theme', theme);

        if (themeToggle) {
            themeToggle.setAttribute('aria-pressed', String(isDarkMode));
            themeToggle.setAttribute('aria-label', `Switch to ${isDarkMode ? 'light' : 'dark'} mode`);
        }
    };

    const initializeTheme = () => {
        setTheme(localStorage.getItem('ppl-theme') === 'dark' ? 'dark' : 'light');
        themeToggle?.addEventListener('click', () => {
            setTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark');
        });
    };

    const initialize = () => {
        applyNavigationTemplate();
        initializeTheme();
    };

    if (document.body) initialize();
    else document.addEventListener('DOMContentLoaded', initialize, { once: true });
})();