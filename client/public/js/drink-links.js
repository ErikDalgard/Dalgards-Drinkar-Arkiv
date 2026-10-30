// Drink entries preserve the current filter parameters and list position.
export function createDrinkNavigation(drinks, dialog) {
    const entryToken = `${Date.now()}-${Math.random()}`;
    let currentId = null;
    let returningToList = false;
    let afterClose = null;
    const notice = document.getElementById("drink-link-notice");
    const copyStatus = document.getElementById("copy-link-status");
    const fallback = document.getElementById("drink-link-fallback");

    function drinkUrl(id) {
        const url = new URL(window.location.href);
        if (id === null) url.searchParams.delete("drink");
        else url.searchParams.set("drink", id);
        return url;
    }
    function resetShare() {
        copyStatus.textContent = "";
        fallback.hidden = true;
        fallback.value = "";
    }
    function setNotFound(visible) {
        notice.hidden = !visible;
        document.body.classList.toggle("drink-not-found", visible);
        if (visible) {
            document.getElementById("drink-link-home").href = window.location.pathname;
            document.getElementById("drink-not-found-title").focus({ preventScroll: true });
        }
    }
    document.getElementById("home-link").addEventListener("click", () => {
        if (!notice.hidden) window.location.assign(window.location.pathname);
    });
    function show(drink) {
        currentId = String(drink.id);
        setNotFound(false);
        resetShare();
        dialog.open(drink);
    }
    function open(drink) {
        if (returningToList) return;
        const id = String(drink.id);
        if (currentId === id) return;
        // Opening a different drink within the overlay replaces its entry.
        const method = currentId === null ? "pushState" : "replaceState";
        window.history[method]({ ...window.history.state, drinkModalEntry: entryToken }, "", drinkUrl(id));
        show(drink);
    }
    function close() {
        currentId = null;
        resetShare();
        if (window.history.state?.drinkModalEntry === entryToken) {
            returningToList = true;
            window.history.back();
        } else {
            // A directly opened/shared URL must close onto this site's archive.
            window.history.replaceState(window.history.state, "", drinkUrl(null));
        }
    }
    function restore() {
        returningToList = false;
        const id = new URL(window.location.href).searchParams.get("drink");
        if (id === null) {
            currentId = null;
            resetShare();
            dialog.close({ updateHistory: false });
            setNotFound(false);
            return;
        }
        const drink = drinks.find((item) => String(item.id) === id);
        if (drink) {
            if (currentId !== id) show(drink);
        } else {
            currentId = null;
            dialog.close({ updateHistory: false });
            resetShare();
            setNotFound(true);
        }
    }
    window.addEventListener("popstate", restore);
    // Related theme/spirit links apply after Back has returned to the list entry.
    function whenClosed(callback) {
        if (returningToList) afterClose = callback;
        else callback();
    }
    window.addEventListener("popstate", () => {
        if (afterClose) {
            const callback = afterClose;
            afterClose = null;
            // Let filter URL restoration finish before applying the new selection.
            setTimeout(callback, 0);
        }
    });
    document.getElementById("copy-drink-link").addEventListener("click", async () => {
        if (currentId === null) return;
        const id = currentId;
        const link = drinkUrl(id).href;
        try {
            await navigator.clipboard.writeText(link);
            if (currentId === id) copyStatus.textContent = "Länk kopierad!";
        } catch {
            if (currentId !== id) return;
            copyStatus.textContent = "Markera och kopiera länken nedan.";
            fallback.value = link;
            fallback.hidden = false;
            fallback.focus();
            fallback.select();
        }
    });
    return { open, close, restore, whenClosed };
}
