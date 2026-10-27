import { compareDrinks } from "./utils.js";
import { buildThemeColorMap } from "./themes.js";
import { createFilters } from "./filters.js";
import { makeCard } from "./cards.js";
import { createDrinkDialog } from "./dialogs.js";
import { createDrinkNavigation } from "./drink-links.js";
import { createSearchSuggestions } from "./search-suggestions.js";
import { loadSpirits } from "./spirits.js";
let allVideos = [];
let currentPage = 1;
const PAGE_SIZE = 24;
let filters;
let drinkDialog;
let drinkNavigation;
let searchSuggestions;
async function init() {
    try {
        const [res] = await Promise.all([fetch(`${API_BASE}/drinks`), loadSpirits(API_BASE)]);
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        allVideos = await res.json();
    }
    catch (err) {
        console.error(err);
        document.body.classList.add("archive-unavailable");
        document.getElementById("load-error").hidden = false;
        document.getElementById("load-error-title").focus({ preventScroll: true });
        return;
    }
    const themes = [...new Set(allVideos.map((v) => v.theme))].filter(Boolean).sort();
    buildThemeColorMap(themes);
    filters = createFilters(themes, () => {
        currentPage = 1;
        render();
    }, allVideos);
    drinkDialog = createDrinkDialog(filters.filterByTheme, () => drinkNavigation.close(), filters.filterBySpirit);
    drinkNavigation = createDrinkNavigation(allVideos, drinkDialog);
    searchSuggestions = createSearchSuggestions(drinkNavigation.open);
    render();
    drinkNavigation.restore();
}
function render() {
    const filtered = filters.apply(allVideos);
    searchSuggestions?.update(filtered);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    currentPage = Math.max(1, Math.min(currentPage, totalPages));
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const sortSelect = document.getElementById("sort-order");
    sortSelect.title = `Sortering: ${sortSelect.selectedOptions[0].textContent}`;
    filtered.sort((a, b) => compareDrinks(a, b, sortSelect.value));
    const pageItems = filtered.slice(start, end);
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    pageItems.forEach((v) => {
        grid.appendChild(makeCard(v, {
            onOpen: drinkNavigation.open,
            onThemeSelect: filters.filterByTheme,
        }));
    });
    document.getElementById("count").textContent =
        `${filtered.length} av ${allVideos.length} drinkar`;
    document.getElementById("empty").style.display =
        filtered.length ? "none" : "block";
    renderPagination(totalPages);
}
// ============================================
// Pagination
// ============================================
function renderPagination(totalPages) {
    const el = document.getElementById("pagination");
    el.innerHTML = "";
    if (totalPages <= 1)
        return;
    const goTo = (page) => {
        currentPage = page;
        render();
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };
    const first = document.createElement("button");
    first.textContent = "«";
    first.setAttribute("aria-label", "Första sidan");
    first.disabled = currentPage === 1;
    first.addEventListener("click", () => {
        goTo(1);
    });
    const prev = document.createElement("button");
    prev.textContent = "‹";
    prev.setAttribute("aria-label", "Föregående sida");
    prev.disabled = currentPage === 1;
    prev.addEventListener("click", () => {
        goTo(currentPage - 1);
    });
    const label = document.createElement("span");
    label.textContent =
        `Sida ${currentPage} av ${totalPages}`;
    const next = document.createElement("button");
    next.textContent = "›";
    next.setAttribute("aria-label", "Nästa sida");
    next.disabled = currentPage === totalPages;
    next.addEventListener("click", () => {
        goTo(currentPage + 1);
    });
    const last = document.createElement("button");
    last.textContent = "»";
    last.setAttribute("aria-label", "Sista sidan");
    last.disabled = currentPage === totalPages;
    last.addEventListener("click", () => {
        goTo(totalPages);
    });
    el.appendChild(first);
    el.appendChild(prev);
    el.appendChild(label);
    el.appendChild(next);
    el.appendChild(last);
}
document.getElementById("load-retry").addEventListener("click", () => {
    window.location.reload();
});
init();
