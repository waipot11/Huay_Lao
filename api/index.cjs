let cachedApp = null;
let loadError = null;

try {
  const mod = require('./_server.cjs');
  cachedApp = mod.app || (mod.default && mod.default.app) || mod.default || mod;
} catch (err) {
  loadError = err;
  console.error('[Vercel API Init Error]', err);
}

function normalizeVercelUrl(req) {
  try {
    const rawUrl = req.url || '/';
    const urlObj = new URL(rawUrl, 'http://localhost');
    const pathParam = urlObj.searchParams.get('__path');
    if (pathParam !== null) {
      urlObj.searchParams.delete('__path');
      const cleanSubpath = String(pathParam).replace(/^\/+/, '');
      const qs = urlObj.searchParams.toString();
      if (urlObj.pathname === '/api' || urlObj.pathname === '/api/' || urlObj.pathname === '/api/index' || urlObj.pathname === '/api/index.cjs') {
        req.url = `/api/${cleanSubpath}${qs ? `?${qs}` : ''}`;
      } else {
        req.url = `${urlObj.pathname}${qs ? `?${qs}` : ''}`;
      }
    }
  } catch (e) {
    console.warn('[Vercel URL Normalize Warning]', e);
  }
}

module.exports = function handler(req, res) {
  if (loadError || typeof cachedApp !== 'function') {
    const message = loadError ? loadError.message || String(loadError) : 'Express app handler not available';
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        success: false,
        error: 'Vercel Serverless initialization failed',
        detail: message,
      })
    );
    return;
  }

  normalizeVercelUrl(req);
  return cachedApp(req, res);
};
