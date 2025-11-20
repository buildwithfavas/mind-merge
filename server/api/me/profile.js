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

  // Permissive preflight for this path to ensure CORS headers are always present
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.statusCode = 204;
    return res.end();
  }

  try {
    await ensureInitialized();
  } catch (e) {
    console.error('[EDGE-PROFILE] init error', e?.message || e);
  }
  return app(req, res);
}
