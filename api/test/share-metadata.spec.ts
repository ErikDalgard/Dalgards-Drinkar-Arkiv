import { fetchMock } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import frontend from '../../client/worker/index.js';
import html from '../../client/index.html?raw';
const config = {
  API_BASE_URL: 'https://api.example.test', MEDIA_BASE_URL: 'https://media.example.test/', SITE_URL: 'https://site.example.test/',
  ASSETS: { fetch: async () => new Response(html, { headers: { 'Content-Type': 'text/html', ETag: 'static-template' } }) },
};
const drink = { id: 42, drink: 'Whiskey Sour', note: 'En fredagsdrink', photo: 'drink photo.jpeg' };
function lookup(status: number, data: unknown) {
  fetchMock.get(config.API_BASE_URL).intercept({ path: '/drinks/42' }).reply(status, JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}
const get = (query = '?drink=42', method = 'GET') => frontend.fetch(new Request(`https://preview.example.test/${query}`, { method }), config);
beforeEach(() => { fetchMock.activate(); fetchMock.disableNetConnect(); });
afterEach(() => { fetchMock.assertNoPendingInterceptors(); fetchMock.deactivate(); });
describe('server-side share metadata', () => {
  it('embeds the drink metadata in actual HTML while retaining the modal', async () => {
    lookup(200, drink); const response = await get(); const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toContain('<title>Whiskey Sour</title>');
    expect(body).toContain('property="og:title" content="Whiskey Sour"');
    expect(body).toContain('property="og:image" content="https://media.example.test/drink%20photo.jpeg"');
    expect(body).toContain('property="og:url" content="https://site.example.test/?drink=42"');
    expect(body.match(/property="og:title"/g)).toHaveLength(1);
    expect(body).toContain('id="modal-backdrop"');
    expect(response.headers.get('ETag')).toBeNull();
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it('uses the internal API service binding in production, not public fetch', async () => {
    let requestedPath = '';
    const response = await frontend.fetch(new Request('https://site.example.test/?drink=42'), {
      ...config,
      API: { fetch: async (request: Request) => {
        requestedPath = new URL(request.url).pathname;
        return Response.json(drink);
      } },
    });
    expect(requestedPath).toBe('/drinks/42');
    expect(await response.text()).toContain('property="og:title" content="Whiskey Sour"');
  });
  it('does not label a routing failure as a missing drink', async () => {
    fetchMock.get(config.API_BASE_URL).intercept({ path: '/drinks/42' })
      .reply(404, 'Not found', { headers: { 'Content-Type': 'text/plain' } });
    const response = await get();
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('property="og:title" content="Dalgards Drinkar – Urkällan"');
  });
  it('escapes drink names and notes', async () => {
    lookup(200, { ...drink, drink: 'Gin "special" <script>alert(1)</script>', note: 'A & B "quoted"' });
    const body = await (await get()).text();
    expect(body).not.toContain('<script>alert(1)</script>');
    expect(body).toContain('Gin &quot;special&quot; &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(body).toContain('A &amp; B &quot;quoted&quot;');
  });
  it('returns an unindexed 404 retaining the recovery UI for missing drinks', async () => {
    lookup(404, { error: 'Drink not found' }); const response = await get(); const body = await response.text();
    expect(response.status).toBe(404); expect(body).toContain('name="robots" content="noindex"');
    expect(body).toContain('id="drink-link-home"');
  });
  it('rejects malformed IDs without contacting the API', async () => {
    const response = await get('?drink=abc'); expect(response.status).toBe(404); await response.text();
  });
  it('falls back to the archive when the API fails', async () => {
    lookup(503, {}); const response = await get(); expect(response.status).toBe(200);
    expect(await response.text()).toContain('property="og:title" content="Dalgards Drinkar – Urkällan"');
  });
  it('serves normal visits statically without contacting the API', async () => {
    expect(await (await get('')).text()).toBe(html);
  });
  it('supports HEAD without returning a response body', async () => {
    lookup(200, drink); const response = await get('?drink=42', 'HEAD');
    expect(response.status).toBe(200); expect(await response.text()).toBe('');
  });
});
