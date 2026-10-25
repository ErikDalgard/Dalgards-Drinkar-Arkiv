import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const sample = {
  date: "2026-01-02", theme: "Fredag", drink: "Whiskey Sour",
  url: "video.mp4", photo: "photo.jpeg", note: "En fredagsdrink",
  ingredients: "6 cl whiskey;3 cl citronjuice", steps: "Skaka med is;Sila upp",
  taste: "2/5,3/5,0/5,2/5,0/5",
};
function request(path: string, method = "GET", body?: unknown, key?: string) {
  const headers = new Headers();
  if (key !== undefined) headers.set("X-Admin-Key", key);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  return SELF.fetch(`https://example.test${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function create(overrides = {}) {
  const response = await request("/drinks", "POST", { ...sample, ...overrides }, env.ADMIN_KEY);
  expect(response.status).toBe(201);
  return (await response.json<{ id: number }>()).id;
}
async function list() {
  const response = await request("/drinks");
  expect(response.status).toBe(200);
  return response.json<Array<typeof sample & { id: number }>>();
}
beforeEach(async () => {
  // Test schema matches the columns currently used by the API.
  await env.DB.exec(`CREATE TABLE IF NOT EXISTS drinks (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, theme TEXT, drink TEXT NOT NULL, video_url TEXT NOT NULL, photo_url TEXT, note TEXT, ingredients TEXT, steps TEXT, taste TEXT)`);
});

describe("public API", () => {
  it("returns an empty JSON list without authentication", async () => {
    const response = await request("/drinks");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(await response.json()).toEqual([]);
  });
  it("returns newest first with frontend field names and intact recipe separators", async () => {
    const oldId = await create({ date: "2025-01-01" });
    const newId = await create({ date: "2026-01-01" });
    expect(await list()).toEqual([{ ...sample, date: "2026-01-01", id: newId }, { ...sample, date: "2025-01-01", id: oldId }]);
  });
  it("defaults optional fields to empty strings", async () => {
    const response = await request("/drinks", "POST", { date: sample.date, drink: sample.drink, url: sample.url }, env.ADMIN_KEY);
    expect(response.status).toBe(201); await response.json();
    expect((await list())[0]).toMatchObject({ theme: "", photo: "", note: "", ingredients: "", steps: "", taste: "" });
  });
  it("returns 404 for unknown routes", async () => {
    const response = await request("/does-not-exist");
    expect(response.status).toBe(404); expect(await response.text()).toBe("Not found");
  });
  it("allows CORS preflight without authentication", async () => {
    const response = await request("/drinks", "OPTIONS");
    expect(response.ok).toBe(true);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("X-Admin-Key");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("DELETE");
    await response.text();
  });
});
describe("admin authentication", () => {
  it("accepts the test admin key", async () => {
    const response = await request("/admin/verify", "POST", undefined, env.ADMIN_KEY);
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ success: true });
  });
  it.each([
    ["POST", "/admin/verify"], ["POST", "/drinks"], ["PUT", "/drinks/1"], ["DELETE", "/drinks/1"],
    ["POST", "/upload"], ["POST", "/upload/start"], ["PUT", "/upload/part"], ["POST", "/upload/complete"], ["POST", "/upload/abort"],
  ])("rejects missing and incorrect keys for %s %s", async (method, path) => {
    const id = await create(); await env.MEDIA.put(sample.url, "original-video");
    for (const key of [undefined, "incorrect-key"]) {
      const response = await request(path, method, undefined, key);
      expect(response.status).toBe(401); expect(await response.json()).toEqual({ error: "Unauthorized" });
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    }
    expect(await list()).toEqual([{ ...sample, id }]);
    expect(await (await env.MEDIA.get(sample.url))!.text()).toBe("original-video");
  });
});
describe("drink lifecycle", () => {
  it("creates, edits, and deletes a drink and its associated media", async () => {
    const id = await create();
    await env.MEDIA.put(sample.url, "video"); await env.MEDIA.put(sample.photo, "photo"); await env.MEDIA.put("unrelated.mp4", "keep");
    const edited = { ...sample, drink: "Updated Sour", ingredients: "4 cl whiskey;2 cl citronjuice", steps: "Skaka;Sila;Servera" };
    const updated = await request(`/drinks/${id}`, "PUT", edited, env.ADMIN_KEY);
    expect(updated.status).toBe(200); expect(await updated.json()).toEqual({ success: true });
    expect(await list()).toEqual([{ ...edited, id }]);
    const deleted = await request(`/drinks/${id}`, "DELETE", undefined, env.ADMIN_KEY);
    expect(deleted.status).toBe(200); expect(await deleted.json()).toEqual({ success: true });
    expect(await list()).toEqual([]);
    expect(await env.MEDIA.head(sample.url)).toBeNull(); expect(await env.MEDIA.head(sample.photo)).toBeNull();
    expect(await env.MEDIA.head("unrelated.mp4")).not.toBeNull();
  });
  it("deletes a drink even if its media is already absent", async () => {
    const id = await create(); const response = await request(`/drinks/${id}`, "DELETE", undefined, env.ADMIN_KEY);
    expect(response.status).toBe(200); await response.json(); expect(await list()).toEqual([]);
  });
  it("returns 404 for nonexistent drinks without removing other media", async () => {
    await env.MEDIA.put("keep.jpeg", "keep");
    const response = await request("/drinks/999", "DELETE", undefined, env.ADMIN_KEY);
    expect(response.status).toBe(404); expect(await response.json()).toEqual({ error: "Drink not found" });
    expect(await env.MEDIA.head("keep.jpeg")).not.toBeNull();
  });
});
describe("media uploads", () => {
  it("stores uploaded bytes without overwriting an existing filename", async () => {
    await env.MEDIA.put("20260102.jpeg", "original");
    const response = await SELF.fetch("https://example.test/upload?filename=photo.JPEG&date=2026-01-02", {
      method: "POST", headers: { "X-Admin-Key": env.ADMIN_KEY, "Content-Type": "image/jpeg" }, body: "new-photo",
    });
    expect(response.status).toBe(201); expect(await response.json()).toEqual({ url: "20260102_1.jpeg" });
    expect(await (await env.MEDIA.get("20260102_1.jpeg"))!.text()).toBe("new-photo");
    expect(await (await env.MEDIA.get("20260102.jpeg"))!.text()).toBe("original");
  });
  it.each(["/upload", "/upload/start", "/upload/complete", "/upload/abort"])("rejects missing parameters at %s", async (path) => {
    const response = await request(path, "POST", undefined, env.ADMIN_KEY);
    expect(response.status).toBe(400); expect(await response.json()).toHaveProperty("error");
  });
});
