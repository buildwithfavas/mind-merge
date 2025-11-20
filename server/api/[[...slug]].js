import app from '../src/app.js';
import { initFirebase } from '../src/config/firebaseAdmin.js';
import { connectMongo } from '../src/config/mongo.js';

let initPromise;

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      initFirebase();
      await connectMongo();
    })();
  }
  return initPromise;
}

export default async function handler(req, res) {
  const url = req.url || '';
  const isHealth = url === '/api/health' || url.endsWith('/api/health');
  const isRoot = url === '/' || url === '';

  // Manual CORS preflight handling to ensure OPTIONS never 404s on platform
  if (req.method === 'OPTIONS') {
    try {
      const origin = req.headers.origin || '';
      const list = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
      const ok = !origin || list.includes(origin);
      if (ok) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        res.setHeader('Access-Control-Max-Age', '86400');
        res.statusCode = 204;
        return res.end();
      }
    } catch {}
    // Fall back to Express which also has cors preflight configured
    return app(req, res);
  }

  // Serve health without waiting for init
  if (isHealth) {
    return app(req, res);
  }

  // Simple landing page for base URL (outside /api)
  if (req.method === 'GET' && isRoot) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.statusCode = 200;
    return res.end(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Mind Merge API</title>
          <style>
            body{background:#0b0b0f;color:#e5e7eb;font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto;display:grid;place-items:center;height:100vh;margin:0}
            .card{border:1px solid #27272a;border-radius:12px;padding:24px;max-width:640px}
            a{color:#818cf8;text-decoration:none}
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Mind Merge API</h1>
            <p>Server is running. Use the <code>/api</code> endpoints from the client.</p>
            <ul>
              <li>Health: <a href="/api/health">/api/health</a></li>
              <li>Me: <code>/api/me</code></li>
              <li>Posts: <code>/api/posts</code></li>
              <li>Admin: <code>/api/admin/*</code> (requires admin token)</li>
            </ul>
          </div>
        </body>
      </html>`);
  }

  try {
    await ensureInitialized();
  } catch (e) {
    console.error('Init failed before handling request:', e);
    // Fall through to app anyway so global error handler / CORS can respond
  }
  return app(req, res);
}
