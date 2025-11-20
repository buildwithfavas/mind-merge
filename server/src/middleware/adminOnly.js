import User from '../models/User.js';

export default function adminOnly(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    return next();
  } catch (e) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
