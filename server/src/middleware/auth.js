import { getFirebaseAdmin } from '../config/firebaseAdmin.js';
import User from '../models/User.js';

export default async function auth(req, res, next) {
  try {
    if (req.path === '/health') return next();

    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Missing Bearer token' });
    }

    const admin = getFirebaseAdmin();
    if (!admin || (admin.apps && admin.apps.length === 0)) {
      return res.status(500).json({ error: 'Auth not configured on server' });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      name: decoded.name || null,
      picture: decoded.picture || null
    };

    // Upsert user record: do not overwrite existing name or photoURL chosen by the user
    await User.findByIdAndUpdate(
      req.user.uid,
      {
        $set: { email: req.user.email },
        $setOnInsert: { _id: req.user.uid, name: req.user.name, photoURL: req.user.picture }
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    // Backfill missing/empty name without overwriting a user's chosen profile name
    if (req.user.name) {
      await User.updateOne(
        { _id: req.user.uid, $or: [ { name: { $exists: false } }, { name: null }, { name: '' } ] },
        { $set: { name: req.user.name } }
      );
    }
    // Backfill missing/empty photoURL from provider picture only if user's photoURL is not already set
    if (req.user.picture) {
      await User.updateOne(
        { _id: req.user.uid, $or: [ { photoURL: { $exists: false } }, { photoURL: null }, { photoURL: '' } ] },
        { $set: { photoURL: req.user.picture } }
      );
    }

    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
