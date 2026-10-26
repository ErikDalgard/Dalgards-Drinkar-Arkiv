import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import migration from "../migrations/0001_spirits.sql?raw";

function request(method = "GET", body?: unknown, key?: string) {
  return SELF.fetch("https://example.test/spirits", {
    method,
    headers: { "Content-Type": "application/json", ...(key === undefined ? {} : { "X-Admin-Key": key }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function catalog() {
  const response = await request();
  expect(response.status).toBe(200);
  return response.json<Array<{ name: string; synonyms: string[] }>>();
}
beforeEach(async () => {
  // Exercise the real migration, including the original catalog seed.
  for (const sql of migration.split(";").map((s) => s.trim()).filter(Boolean)) {
    await env.DB.prepare(sql).run();
  }
});
describe("spirit catalog", () => {
  it("reads the seeded catalog publicly in its original order", async () => {
    const data = await catalog();
    expect(data).toHaveLength(11);
    expect(data[0].name).toBe("Vodka");
    expect(data.find((item) => item.name === "Whiskey")?.synonyms).toContain("bourbon");
  });
  it("requires authentication without changing the catalog", async () => {
    const before = await catalog();
    for (const key of [undefined, "wrong"]) {
      const response = await request("PUT", [], key);
      expect(response.status).toBe(401);
      await response.text();
    }
    expect(await catalog()).toEqual(before);
  });
  it("adds, renames and removes categories, normalizing and deduplicating synonyms", async () => {
    const updated = [{ name: " Rom ", synonyms: [" ROM ", "rom", "Rhum"] }, { name: "Gin", synonyms: ["gin"] }];
    const response = await request("PUT", updated, env.ADMIN_KEY);
    expect(response.status).toBe(200);
    const expected = [{ name: "Rom", synonyms: ["rom", "rhum"] }, { name: "Gin", synonyms: ["gin"] }];
    expect(await response.json()).toEqual(expected);
    expect(await catalog()).toEqual(expected);
    const empty = await request("PUT", [], env.ADMIN_KEY);
    expect(empty.status).toBe(200);
    await empty.text();
    expect(await catalog()).toEqual([]);
  });
  it.each([
    {}, [{ name: "", synonyms: ["gin"] }], [{ name: "Gin", synonyms: [] }],
    [{ name: "Gin", synonyms: [" "] }], [{ name: "Gin", synonyms: [123] }],
    [{ name: "Gin", synonyms: ["gin"] }, { name: " gin ", synonyms: ["gin"] }],
    [{ name: "a".repeat(81), synonyms: ["gin"] }],
  ].map((body) => [body]))("rejects invalid drafts without deleting existing data: %j", async (body) => {
    const before = await catalog();
    const response = await request("PUT", body, env.ADMIN_KEY);
    expect(response.status).toBe(400);
    await response.text();
    expect(await catalog()).toEqual(before);
  });
  it("rejects malformed JSON", async () => {
    const response = await SELF.fetch("https://example.test/spirits", { method: "PUT", headers: { "X-Admin-Key": env.ADMIN_KEY }, body: "{" });
    expect(response.status).toBe(400);
    await response.text();
  });
});
