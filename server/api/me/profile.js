import app from '../../src/app.js';
import { initFirebase } from '../../src/config/firebaseAdmin.js';
import { connectMongo } from '../../src/config/mongo.js';

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
  const origin = req.headers.origin || '';
  const rid = Math.random().toString(36).slice(2, 10);
  const started = Date.now();
  console.log(`[EDGE-PROFILE ${rid}] start method=${req.method} url=/api/me/profile origin=${origin}`);

  // Permissive preflight for this path to ensure CORS headers are always present
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.statusCode = 204;
    console.log(`[EDGE-PROFILE ${rid}] preflight (permissive) -> 204 in ${Date.now()-started}ms`);
    return res.end();
  }

  try {
    await ensureInitialized();
  } catch (e) {
    console.error(`[EDGE-PROFILE ${rid}] init error`, e);
  }
  console.log(`[EDGE-PROFILE ${rid}] delegating to Express`);
  return app(req, res);
}
