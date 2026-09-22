(function () {
    const stack = [];

    function render(entry) {
        return typeof entry?.render === 'function' ? entry.render() : undefined;
    }

    function describe(entry) {
        if (!entry) return null;
        return Object.fromEntries(Object.entries({ type: entry.type, id: entry.id, teamName: entry.teamName }).filter(([, value]) => value !== undefined));
    }

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
