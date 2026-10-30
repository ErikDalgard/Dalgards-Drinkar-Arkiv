import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
const spirits = JSON.parse(readFileSync(new URL("../spirits.json", import.meta.url), "utf8"));
const base = { url: "test.mp4", photo: "", note: "", steps: "Skaka;Sila", taste: "4/5,4/5,0/5,4/5,0/5" };
const drinks = [
    { ...base, id: 1, drink: "Gin Sour", theme: "Sommar", date: "2026-01-01", ingredients: "6 cl gin;citron" },
    { ...base, id: 2, drink: "Vodka Sour", theme: "Vinter", date: "2026-02-01", ingredients: "6 cl vodka;citron" },
    { ...base, id: 3, drink: "Gin och vodka", theme: "Sommar", date: "2026-03-01", ingredients: "3 cl gin;3 cl vodka" },
];
test.beforeEach(async ({ page }) => {
    await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === "http://localhost:8787" && url.pathname === "/spirits") await route.fulfill({ json: spirits });
        else if (url.origin === "http://localhost:8787" && url.pathname === "/drinks") await route.fulfill({ json: drinks });
        else if (url.origin === "http://127.0.0.1:4173") await route.continue();
        else await route.abort();
    });
});

test("shared filters restore controls and results, survive reload, and clear from the URL", async ({ page }) => {
    await page.goto("/?theme=Sommar&spirit=Gin&spirit=Vodka&taste=sour&from=2026-02-01&to=2026-12-31&sort=name-asc&q=gin");
    await expect(page.locator("#grid .card")).toHaveCount(1);
    await expect(page.locator("#grid")).toContainText("Gin och vodka");
    await expect(page.locator("#search")).toHaveValue("gin");
    await expect(page.locator("#sort-order")).toHaveValue("name-asc");
    await expect(page.locator("#active-filter-list button")).toHaveCount(6);
    await page.reload();
    await expect(page.locator("#grid .card")).toHaveCount(1);
    await page.locator("#active-filter-clear").click();
    await expect(page).toHaveURL((url) => url.searchParams.get("q") === "gin" && !url.searchParams.has("spirit") && !url.searchParams.has("theme") && !url.searchParams.has("taste") && !url.searchParams.has("from"));
    await expect(page.locator("#grid .card")).toHaveCount(2);
});

test("modal Back and Forward preserve filters and related spirit links update the returned list", async ({ page }) => {
    await page.goto("/?theme=Sommar&sort=asc");
    await page.getByRole("button", { name: "Gin Sour", exact: true }).click();
    await expect(page).toHaveURL((url) => url.searchParams.get("drink") === "1" && url.searchParams.get("theme") === "Sommar");
    await page.goBack();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.locator("#grid .card")).toHaveCount(2);
    await page.goForward();
    await expect(page.locator("#modal-drink")).toHaveText("Gin Sour");
    await page.getByRole("button", { name: "Visa alla drinkar med Gin", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page).toHaveURL((url) => url.searchParams.get("spirit") === "Gin" && !url.searchParams.has("drink") && !url.searchParams.has("theme"));
    await expect(page.locator("#active-filter-list")).toContainText("Gin");
    await expect(page.locator("#filter-panel")).not.toHaveClass(/open/);
    await page.reload();
    await expect(page.locator("#grid .card")).toHaveCount(2);
});

test("search edits replace history and a direct drink link closes with its filters intact", async ({ page }) => {
    await page.goto("/?drink=1&spirit=Gin");
    await expect(page.locator("#modal-drink")).toHaveText("Gin Sour");
    await page.getByRole("button", { name: "Stäng drink", exact: true }).click();
    await expect(page).toHaveURL((url) => url.searchParams.get("spirit") === "Gin" && !url.searchParams.has("drink"));
    const length = await page.evaluate(() => history.length);
    await page.locator("#search").fill("gin");
    await expect(page).toHaveURL((url) => url.searchParams.get("q") === "gin");
    expect(await page.evaluate(() => history.length)).toBe(length);
    await page.locator("#search").fill("");
    await expect(page).toHaveURL((url) => !url.searchParams.has("q"));
});


test("a related theme link applies after the modal closes", async ({ page }) => {
    await page.goto("/?spirit=Gin");
    await page.getByRole("button", { name: "Gin Sour", exact: true }).click();
    await page.locator("#modal-theme").click();
    await expect(page).toHaveURL((url) => url.searchParams.get("theme") === "Sommar" && !url.searchParams.has("drink"));
    await expect(page.locator("#active-filter-list")).toContainText("Sommar");
    await expect(page.locator("#grid .card")).toHaveCount(2);
});
