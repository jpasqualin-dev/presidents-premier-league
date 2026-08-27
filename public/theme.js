(() => {
    const applySavedTheme = () => {
        document.body.classList.toggle('dark-mode', localStorage.getItem('ppl-theme') === 'dark');
    };

    if (document.body) applySavedTheme();
    else document.addEventListener('DOMContentLoaded', applySavedTheme, { once: true });
})();