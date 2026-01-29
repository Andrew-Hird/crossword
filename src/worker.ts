export default {
  async fetch(request: Request, env: { ASSETS: { fetch: (req: Request) => Promise<Response> } }) {
    // Serve static assets from `assets.directory` (Vite build output).
    const assetResponse = await env.ASSETS.fetch(request);

    // If the asset exists, return it.
    if (assetResponse.status !== 404) return assetResponse;

    // SPA fallback: for non-file routes, serve index.html.
    const url = new URL(request.url);
    const looksLikeFile = url.pathname.includes('.') && !url.pathname.endsWith('.');
    if (request.method !== 'GET' || looksLikeFile) return assetResponse;

    const indexRequest = new Request(new URL('/index.html', url).toString(), request);
    return env.ASSETS.fetch(indexRequest);
  },
};

