import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { readFilterState, filterUrl, createFilterLinks } from "../../public/js/filter-links.js";
import { createFilters } from "../../public/js/filters.js";
import { setSpirits } from "../../public/js/spirits.js";

const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
setSpirits(JSON.parse(readFileSync(new URL("../spirits.json", import.meta.url), "utf8")));

test("filter links round-trip selections and preserve drink, unrelated parameters and hash", () => {
    const state = { search: "gin & citron", theme: "Sommar", spirits: ["Gin", "Vodka"], tastes: ["sour", "strong"], dateFrom: "2026-01-01", dateTo: "2026-10-30", sort: "name-asc" };
    const url = filterUrl("https://example.com/?drink=584&source=share#archive", state);
    assert.deepEqual(readFilterState(url), state);
    assert.equal(url.searchParams.get("drink"), "584");
    assert.equal(url.searchParams.get("source"), "share");
    assert.equal(url.hash, "#archive");
    const cleared = filterUrl(url, { spirits: [], tastes: [], sort: "desc" });
    assert.equal(cleared.search, "?drink=584&source=share");
});

test("invalid dates and sort values are ignored and repeated selections deduplicated", () => {
    const state = readFilterState("https://example.com/?from=2026-02-30&to=nope&sort=unknown&spirit=Gin&spirit=Gin");
    assert.equal(state.dateFrom, "");
    assert.equal(state.dateTo, "");
    assert.equal(state.sort, "desc");
    assert.deepEqual(state.spirits, ["Gin"]);
});

test("restoration validates catalogs, refreshes controls, and keeps the history marker", () => {
    const dom = new JSDOM(html, { url: "https://example.com/?theme=Sommar&spirit=Gin&spirit=Unknown&taste=sour&taste=nope&q=citron&sort=asc" });
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    let links;
    try {
        window.history.replaceState({ drinkModalEntry: "marker" }, "");
        const filters = createFilters(["Sommar"], () => links?.update());
        links = createFilterLinks(filters);
        links.restore();
        assert.equal(document.getElementById("search").value, "citron");
        assert.equal(document.getElementById("sort-order").value, "asc");
        assert.deepEqual(filters.getState().spirits, ["Gin"]);
        assert.deepEqual(filters.getState().tastes, ["sour"]);
        assert.equal(filters.getState().theme, "Sommar");
        assert.equal(document.querySelectorAll("#active-filter-list button").length, 3);
        assert.equal(window.history.state.drinkModalEntry, "marker");
        assert.equal(window.history.length, 1);
        assert.equal(window.location.href.includes("Unknown"), false);
        window.history.replaceState(window.history.state, "", "/?theme=Unknown");
        window.dispatchEvent(new window.PopStateEvent("popstate"));
        assert.equal(filters.getState().theme, "");
        assert.equal(document.getElementById("search").value, "");
        assert.equal(window.location.search, "");
    } finally {
        dom.window.close();
        delete globalThis.window;
        delete globalThis.document;
    }
});
