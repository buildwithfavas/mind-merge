import { getFirebaseAdmin } from '../config/firebaseAdmin.js';
import User from '../models/User.js';
import ADMIN_EMAILS from '../config/adminEmails.js';

export default async function auth(req, res, next) {
  try {
    const rid = req.id || Math.random().toString(36).slice(2, 10);
    console.log(`[AUTH ${rid}] enter path=${req.path} method=${req.method}`);
    if (req.path === '/health') return next();

    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      console.warn(`[AUTH ${rid}] missing bearer token`);
      return res.status(401).json({ error: 'Missing Bearer token' });
    }

    const admin = getFirebaseAdmin();
    if (!admin || (admin.apps && admin.apps.length === 0)) {
      console.error(`[AUTH ${rid}] firebase admin not configured`);
      return res.status(500).json({ error: 'Auth not configured on server' });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    console.log(`[AUTH ${rid}] token verified uid=${decoded.uid} email=${decoded.email || ''}`);
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
    console.log(`[AUTH ${rid}] user upserted uid=${req.user.uid}`);
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

    // Elevate admins from hardcoded list if email matches
    const adminEmails = Array.isArray(ADMIN_EMAILS) ? ADMIN_EMAILS : [];
    const elevate = req.user.email && adminEmails.includes(req.user.email);
    console.log(`[AUTH ${rid}] admin list size=${adminEmails.length} elevate=${!!elevate}`);
    if (elevate) {
      await User.updateOne({ _id: req.user.uid }, { $set: { role: 'admin' } });
    }

    // Fetch role/blocked status
    const me = await User.findById(req.user.uid).select('role blocked blockedReason blockedAt').lean();
    req.user.role = me?.role || 'user';
    req.user.blocked = !!me?.blocked;
    req.user.blockedReason = me?.blockedReason || null;
    console.log(`[AUTH ${rid}] user meta role=${req.user.role} blocked=${req.user.blocked}`);

    if (req.user.blocked) {
      console.warn(`[AUTH ${rid}] blocked uid=${req.user.uid} reason=${req.user.blockedReason || ''}`);
      return res.status(423).json({ error: 'Account blocked', reason: req.user.blockedReason || null });
    }

    next();
  } catch (err) {
    console.error('[AUTH ERR] ', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
