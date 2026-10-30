const FILTER_PARAMS = ["q", "theme", "spirit", "taste", "from", "to", "sort"];
const SORT_ORDERS = ["desc", "asc", "name-asc", "name-desc"];

function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
}

export function readFilterState(url) {
    const params = new URL(url).searchParams;
    return {
        search: params.get("q") || "",
        theme: params.get("theme") || "",
        spirits: [...new Set(params.getAll("spirit"))],
        tastes: [...new Set(params.getAll("taste"))],
        dateFrom: validDate(params.get("from")),
        dateTo: validDate(params.get("to")),
        sort: SORT_ORDERS.includes(params.get("sort")) ? params.get("sort") : "desc",
    };
}

export function filterUrl(url, state) {
    const result = new URL(url);
    FILTER_PARAMS.forEach((key) => result.searchParams.delete(key));
    for (const [key, value] of [["q", state.search], ["theme", state.theme], ["from", state.dateFrom], ["to", state.dateTo]]) {
        if (value) result.searchParams.set(key, value);
    }
    for (const spirit of new Set(state.spirits)) result.searchParams.append("spirit", spirit);
    for (const taste of new Set(state.tastes)) result.searchParams.append("taste", taste);
    if (state.sort && state.sort !== "desc") result.searchParams.set("sort", state.sort);
    return result;
}

export function createFilterLinks(filters) {
    let restoring = false;
    let initialized = false;
    function update() {
        if (restoring) return;
        const url = filterUrl(window.location.href, filters.getState());
        if (url.href !== window.location.href) {
            // Keep the drink navigation marker and avoid a history entry per keystroke.
            window.history.replaceState(window.history.state, "", url);
        }
    }
    function restore() {
        const state = readFilterState(window.location.href);
        // A modal entry has the same filters; keep the current list page in that case.
        const base = "https://filters.invalid/";
        if (initialized && filterUrl(base, state).href === filterUrl(base, filters.getState()).href) return;
        restoring = true;
        try {
            filters.setState(state);
            initialized = true;
        } finally {
            restoring = false;
        }
        // Remove invalid selections after the loaded catalogs have validated them.
        update();
    }
    window.addEventListener("popstate", restore);
    return { update, restore };
}
