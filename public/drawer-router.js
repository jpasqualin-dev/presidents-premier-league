(function () {
    const stack = [];

    function render(entry, restoring = false) {
        return typeof entry?.render === 'function' ? entry.render({ scrollTop: entry.scrollTop, restoring }) : undefined;
    }

    function currentDrawerTop() {
        const drawer = document.querySelector('#match-drawer-overlay .match-drawer');
        return drawer ? window.DrawerScroll.getTop(drawer) : 0;
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

    // On mobile, end the scrollable page where the drawer's content ends, so the page underneath does not extend the scroll range.
    function fitBodyToDrawer() {
        const body = document.body;
        const drawer = document.querySelector('#match-drawer-overlay .match-drawer');
        if (!isDocumentMode() || !body.classList.contains('drawer-open') || !drawer) {
            body.style.height = '';
            return;
        }
        // Measure before changing the body height; clearing it first forces a layout that clamps the page scroll.
        const height = drawer.offsetHeight;
        body.style.height = `${height}px`;
    }

    function watchContent(overlay) {
        const drawer = overlay.querySelector('.match-drawer');
        if (!drawer || contentObserver || typeof ResizeObserver === 'undefined') return;
        contentObserver = new ResizeObserver(fitBodyToDrawer);
        contentObserver.observe(drawer);
    }

    function show(overlay) {
        if (!overlay) return;
        clearTimeout(closeTimer);
        closeTimer = null;
        if (savedScrollY === null && isDocumentMode()) savedScrollY = window.scrollY;
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('drawer-open');
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
            document.documentElement.classList.remove('drawer-open');
            document.body.classList.remove('drawer-open');
            document.body.style.height = '';
            return;
        }
        // Keep document mode until the panel finishes sliding out, then return the page to where it was.
        closeTimer = setTimeout(() => {
            const y = savedScrollY;
            savedScrollY = null;
            closeTimer = null;
            document.documentElement.classList.remove('drawer-open');
            document.body.classList.remove('drawer-open');
            document.body.style.height = '';
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
            if (isDocumentMode()) {
                fitBodyToDrawer();
                window.scrollTo(0, top);
            }
            else drawer.scrollTop = top;
        }
    };

    window.DrawerRouter = {
        open(entry) {
            const outgoing = stack[stack.length - 1];
            if (outgoing) outgoing.scrollTop = currentDrawerTop();
            stack.push(entry);
            return render(entry);
        },

        back() {
            if (stack.length <= 1) {
                this.closeAll();
                return;
            }
            const from = describe(stack.pop());
            const result = render(stack[stack.length - 1], true);
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
