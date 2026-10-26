// Social crawlers read the HTML response before browser JavaScript runs.
const siteTitle = "Dalgards Drinkar – Urkällan";
const siteDescription = "Fredagsdrinkar från Dalgards Drinkar. Upptäck recept, bilder och videor i Urkällan.";
function escapeAttribute(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function assetUrl(base, key) {
  return base.replace(/\/$/, '') + '/' + key.split('/').map(encodeURIComponent).join('/');
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!['GET', 'HEAD'].includes(request.method) || !['/', '/index.html'].includes(url.pathname)) {
      return env.ASSETS.fetch(request);
    }
    const id = url.searchParams.get('drink');
    if (id === null) return env.ASSETS.fetch(request);

    let drink = null;
    let notFound = !/^\d+$/.test(id);
    if (!notFound) {
      try {
        const apiRequest = new Request(`${env.API_BASE_URL}/drinks/${encodeURIComponent(id)}`, {
          signal: AbortSignal.timeout(4000),
        });
        // Production Workers communicate internally; local dev uses the local API URL.
        const response = env.API ? await env.API.fetch(apiRequest) : await fetch(apiRequest);
        if (response.status === 404) {
          // Only an explicit API error proves the drink is missing, not a routing 404.
          if (response.headers.get('Content-Type')?.includes('application/json')) {
            const error = await response.json();
            notFound = error.error === 'Drink not found';
          }
        } else if (response.ok) {
          const data = await response.json();
          if (String(data.id) === id && typeof data.drink === 'string') drink = data;
        }
      } catch {
        // Keep the archive accessible if the metadata lookup fails.
      }
    }
    const canonical = new URL(env.SITE_URL);
    if (drink) canonical.searchParams.set('drink', String(drink.id));
    const title = drink ? drink.drink : notFound ? 'Drinken kunde inte hittas – Dalgards Drinkar' : siteTitle;
    const description = drink ? (drink.note?.trim() || `Se receptet och hur du blandar ${drink.drink}.`).slice(0, 200) : siteDescription;
    const image = drink?.photo ? assetUrl(env.MEDIA_BASE_URL, drink.photo) : new URL('public/assets/glass.png', env.SITE_URL).href;
    const metadata = [
      ['name', 'description', description], ['property', 'og:type', 'website'],
      ['property', 'og:site_name', 'Dalgards Drinkar'], ['property', 'og:locale', 'sv_SE'],
      ['property', 'og:title', title], ['property', 'og:description', description],
      ['property', 'og:url', canonical.href], ['property', 'og:image', image],
      ['property', 'og:image:alt', drink ? drink.drink : 'Dalgards Drinkar'],
      ['name', 'twitter:card', drink?.photo ? 'summary_large_image' : 'summary'],
      ['name', 'twitter:title', title], ['name', 'twitter:description', description],
      ['name', 'twitter:image', image],
      ...(notFound ? [['name', 'robots', 'noindex']] : []),
    ].map(([attribute, key, value]) => `<meta ${attribute}="${key}" content="${escapeAttribute(value)}">`).join('\n');

    // Conditional asset headers must not yield a bodyless 304 before rewriting.
    const headers = new Headers(request.headers);
    headers.delete('If-None-Match');
    headers.delete('If-Modified-Since');
    const asset = await env.ASSETS.fetch(new Request(request.url, { method: 'GET', headers }));
    if (!asset.ok || !asset.headers.get('Content-Type')?.includes('text/html')) return asset;
    const rewritten = new HTMLRewriter()
      .on('title', { element(element) { element.setInnerContent(title); } })
      .on('[data-share]', { element(element) { element.remove(); } })
      .on('head', { element(element) { element.append(metadata, { html: true }); } })
      .transform(asset);
    const resultHeaders = new Headers(rewritten.headers);
    resultHeaders.set('Cache-Control', 'no-store');
    resultHeaders.delete('ETag');
    resultHeaders.delete('Last-Modified');
    resultHeaders.delete('Content-Length');
    return new Response(request.method === 'HEAD' ? null : rewritten.body, {
      status: notFound ? 404 : rewritten.status, headers: resultHeaders,
    });
  },
};
