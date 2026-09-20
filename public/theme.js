(() => {
    const themeToggle = document.querySelector('.theme-toggle');
    const themeColors = {
        light: '#f4f6f8',
        dark: '#121212'
    };

    const updateBrowserTheme = theme => {
        const existingThemeColor = document.querySelector('meta[name="theme-color"]');
        const themeColor = document.createElement('meta');
        themeColor.name = 'theme-color';
        const pageBackground = getComputedStyle(document.body).backgroundColor;
        themeColor.content = pageBackground === 'rgba(0, 0, 0, 0)' ? themeColors[theme] : pageBackground;
        document.documentElement.style.backgroundColor = themeColor.content;
        if (existingThemeColor) existingThemeColor.replaceWith(themeColor);
        else document.head.append(themeColor);

        const existingStatusBarStyle = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        const statusBarStyle = document.createElement('meta');
        statusBarStyle.name = 'apple-mobile-web-app-status-bar-style';
        statusBarStyle.content = theme === 'dark' ? 'black' : 'default';
        if (existingStatusBarStyle) existingStatusBarStyle.replaceWith(statusBarStyle);
        else document.head.append(statusBarStyle);
    };

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
            html { background: var(--page-bg); }
            html:has(body.dark-mode) { background: var(--page-bg); }
            body { --menu-page-pad: 16px; --menu-max-width: 600px; }
            body:not(.dark-mode) { background-color: var(--page-bg); }
            body.wide-page { --menu-max-width: 800px; }
            .menu-backdrop { position: fixed; top: 0; left: 50%; transform: translateX(-50%); width: min(calc(100vw - 2 * var(--menu-page-pad)), var(--menu-max-width)); height: 5px; background: var(--mask-bg); z-index: 15; pointer-events: none; }
            .header-container .theme-toggle:focus-visible { outline-offset: 3px; }
            .site-menu { position: sticky; top: 0; z-index: 20; isolation: isolate; height: auto; padding: 10px 3px 12px; margin-bottom: 0; background: var(--sticky-bg); border: 0; border-radius: 0; box-shadow: none; }
            .site-menu::before { content: ""; position: absolute; z-index: -1; top: -8px; bottom: -8px; left: 50%; width: 100vw; transform: translateX(-50%); background: var(--sticky-bg); pointer-events: none; }
            .site-menu > * { position: relative; z-index: 1; }
            .site-menu a, .players-menu summary { color: var(--brand-color); }
            .players-menu[open] summary { background: var(--nav-hover-bg); border-color: var(--nav-hover-border); }
            .site-menu a.active::after, .players-menu summary.active::before { right: 8px; left: 8px; background: var(--brand-color); }
            body.wide-page .site-menu { margin: 0 16px; }
            body.wide-page .sticky-nav-wrapper { position: static; background: transparent; }
            body.wide-page .pills-nav-container { position: sticky; top: var(--primary-menu-height, 36px); z-index: 19; padding: 2px 20px 10px; background: var(--sticky-bg); }
            body:not(.wide-page) .profile-card { top: var(--primary-menu-height, 36px); z-index: 19; }
            body.wide-page::before { display: none; }
            @media (hover: hover) { .site-menu a:hover, .players-menu summary:hover { background: var(--nav-hover-bg); border-color: var(--nav-hover-border); } }
            @media (max-width: 768px) {
                body { --menu-page-pad: 10px; }
                body.wide-page .site-menu { margin: 0 10px; }
            }
            body.dark-mode .menu-backdrop, body.dark-mode .site-menu { background: var(--sticky-bg); }
            body.dark-mode.wide-page .pills-nav-container { background: var(--sticky-bg); }
            body.dark-mode .site-menu a, body.dark-mode .players-menu summary { color: var(--brand-color); }
            body.dark-mode .site-menu a.active::after, body.dark-mode .players-menu summary.active::before { background: #00ff87; }
            body.dark-mode .players-menu[open] summary { background: var(--nav-hover-bg); border-color: var(--nav-hover-border); }
            @media (hover: hover) { body.dark-mode .site-menu a:hover, body.dark-mode .players-menu summary:hover { background: var(--nav-hover-bg); border-color: var(--nav-hover-border); } }
        `;
        document.head.append(navigationStyles);
    };

    const setTheme = theme => {
        const isDarkMode = theme === 'dark';
        document.body.classList.toggle('dark-mode', isDarkMode);
        document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
        updateBrowserTheme(theme);
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