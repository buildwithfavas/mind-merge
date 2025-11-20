import express from 'express';
import User from '../models/User.js';
import Connection from '../models/Connection.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const uid = req.user?.uid;

    // Build exclusion set: self + any user already connected or with pending connection
    const exclude = new Set([uid]);
    if (uid) {
      const cons = await Connection.find({ $or: [{ aId: uid }, { bId: uid }] }).select('aId bId').lean();
      for (const c of cons) {
        const other = c.aId === uid ? c.bId : c.aId;
        exclude.add(other);
      }
    }

    const filter = { _id: { $nin: Array.from(exclude) }, linkedinUrl: { $exists: true, $ne: '' } };
    const total = await User.countDocuments(filter);
    const items = await User.find(filter)
      .select('name linkedinUrl photoURL _id')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();
    res.json({ items, total, hasMore: page * pageSize < total });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load users' });
  }
});

export default router;
