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

  // Serve CORS preflight and health without waiting for init
  if (req.method === 'OPTIONS' || isHealth) {
    return app(req, res);
  }

  try {
    await ensureInitialized();
  } catch (e) {
    console.error('Init failed before handling request:', e);
    // Fall through to app anyway so global error handler / CORS can respond
  }
  return app(req, res);
}
