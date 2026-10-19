(function () {
    const stack = [];

    function render(entry) {
        return typeof entry?.render === 'function' ? entry.render() : undefined;
    }

    function describe(entry) {
        if (!entry) return null;
        return Object.fromEntries(Object.entries({ type: entry.type, id: entry.id, teamName: entry.teamName }).filter(([, value]) => value !== undefined));
    }

    const MOBILE_QUERY = window.matchMedia('(max-width: 600px)');
    const CLOSE_DELAY_MS = 300;
    let savedScrollY = null;
    let closeTimer = null;
    let contentObserver = null;

    function isDocumentMode() {
        return MOBILE_QUERY.matches;
    }

    // On mobile the overlay is absolutely positioned over the page body, so grow the body when the drawer is taller than the page.
    function fitBodyToDrawer() {
        const body = document.body;
        const drawer = document.querySelector('#match-drawer-overlay .match-drawer');
        body.style.minHeight = '';
        if (!isDocumentMode() || !body.classList.contains('drawer-open') || !drawer) return;
        if (drawer.scrollHeight > body.offsetHeight) body.style.minHeight = `${drawer.scrollHeight}px`;
    }

    function watchContent(overlay) {
        const content = overlay.querySelector('#match-detail-content');
        if (!content || contentObserver || typeof ResizeObserver === 'undefined') return;
        contentObserver = new ResizeObserver(fitBodyToDrawer);
        contentObserver.observe(content);
    }

    function show(overlay) {
        if (!overlay) return;
        clearTimeout(closeTimer);
        closeTimer = null;
        if (savedScrollY === null && isDocumentMode()) savedScrollY = window.scrollY;
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('drawer-open');
        watchContent(overlay);
        fitBodyToDrawer();
    }

    function hide(overlay) {
        overlay?.classList.remove('is-open');
        overlay?.setAttribute('aria-hidden', 'true');
        clearTimeout(closeTimer);
        closeTimer = null;
        if (savedScrollY === null) {
            document.body.classList.remove('drawer-open');
            document.body.style.minHeight = '';
            return;
        }
        // Keep document mode until the panel finishes sliding out, then return the page to where it was.
        closeTimer = setTimeout(() => {
            const y = savedScrollY;
            savedScrollY = null;
            closeTimer = null;
            document.body.classList.remove('drawer-open');
            document.body.style.minHeight = '';
            window.scrollTo(0, y);
        }, CLOSE_DELAY_MS);
    }

    window.DrawerScroll = {
        show,
        hide,
        getTop(drawer) {
            return isDocumentMode() ? window.scrollY : drawer.scrollTop;
        },
        setTop(drawer, top) {
            if (isDocumentMode()) window.scrollTo(0, top);
            else drawer.scrollTop = top;
        }
    };

    window.DrawerRouter = {
        open(entry) {
            stack.push(entry);
            return render(entry);
        },

        back() {
            if (stack.length <= 1) {
                this.closeAll();
                return;
            }
            const from = describe(stack.pop());
            const result = render(stack[stack.length - 1]);
            document.dispatchEvent(new CustomEvent('drawer-router-back', { detail: { from, to: describe(stack[stack.length - 1]) } }));
            return result;
        },

        closeAll() {
            stack.length = 0;
            document.dispatchEvent(new CustomEvent('drawer-router-closed'));
        },

        canGoBack() {
            return stack.length > 1;
        },

        current() {
            return describe(stack[stack.length - 1]);
        },

        entries() {
            return stack.map(describe);
        }
    };
})();
