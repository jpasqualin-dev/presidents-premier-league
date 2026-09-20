(function () {
    const stack = [];

    function render(entry) {
        return typeof entry?.render === 'function' ? entry.render() : undefined;
    }

    function describe(entry) {
        return entry ? { type: entry.type, id: entry.id, teamName: entry.teamName } : null;
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
            stack.pop();
            return render(stack[stack.length - 1]);
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
