import express from 'express';
import Connection from '../models/Connection.js';
import User from '../models/User.js';

const router = express.Router();

function pair(u1, u2) {
  const [aId, bId] = [u1, u2].sort();
  return { aId, bId };
}

// GET /api/connections/friends?q=&page=&limit=
router.get('/friends', async (req, res) => {
  try {
    const uid = req.user.uid;
    const cons = await Connection.find({
      status: 'accepted',
      $or: [{ aId: uid }, { bId: uid }]
    }).lean();

    const otherIds = cons.map((c) => (c.aId === uid ? c.bId : c.aId));
    const q = (req.query.q || '').toString().trim();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);

    const filter = { _id: { $in: otherIds } };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ name: 1, email: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const items = users.map((u) => ({ _id: u._id, name: u.name || null, email: u.email || null, photoURL: u.photoURL || null, linkedinUrl: u.linkedinUrl || null }));
    const pageSize = items.length;
    const hasMore = page * limit < total;
    res.json({ items, page, pageSize, total, hasMore });
  } catch (e) {
    console.error('friends error', e);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// GET /api/connections/requests (incoming)
router.get('/requests', async (req, res) => {
  try {
    const uid = req.user.uid;
    const cons = await Connection.find({ status: 'pending', bId: uid, requesterId: { $ne: uid } }).lean();
    const requesterIds = cons.map((c) => c.requesterId);
    const users = await User.find({ _id: { $in: requesterIds } }).lean();
    const byId = new Map(users.map((u) => [u._id, u]));

    const out = cons.map((c) => ({
      requesterId: c.requesterId,
      name: byId.get(c.requesterId)?.name || null,
      email: byId.get(c.requesterId)?.email || null,
      photoURL: byId.get(c.requesterId)?.photoURL || null,
      linkedinUrl: byId.get(c.requesterId)?.linkedinUrl || null,
      createdAt: c.createdAt
    }));

    res.json(out);
  } catch (e) {
    console.error('requests error', e);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// GET /api/connections/suggestions?q=&page=&limit=
router.get('/suggestions', async (req, res) => {
  try {
    const uid = req.user.uid;
    const q = (req.query.q || '').toString().trim();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    // Build set of users to exclude: self + already connected or pending with either direction
    const cons = await Connection.find({
      $or: [{ aId: uid }, { bId: uid }]
    }).lean();
    const exclude = new Set([uid]);
    for (const c of cons) {
      exclude.add(c.aId === uid ? c.bId : c.aId);
    }
    const baseFilter = { _id: { $nin: Array.from(exclude) } };
    if (q) {
      baseFilter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }
    const total = await User.countDocuments(baseFilter);
    const users = await User.find(baseFilter)
      .sort({ name: 1, email: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const items = users.map((u) => ({ _id: u._id, name: u.name || null, email: u.email || null, photoURL: u.photoURL || null, linkedinUrl: u.linkedinUrl || null }));
    const pageSize = items.length;
    const hasMore = page * limit < total;
    res.json({ items, page, pageSize, total, hasMore });
  } catch (e) {
    console.error('suggestions error', e);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// POST /api/connections/request { addresseeId }
router.post('/request', async (req, res) => {
  try {
    const requesterId = req.user.uid;
    const { addresseeId } = req.body || {};
    if (!addresseeId || addresseeId === requesterId) return res.status(400).json({ error: 'Invalid addressee' });

    const { aId, bId } = pair(requesterId, addresseeId);
    let doc = await Connection.findOne({ aId, bId });
    if (doc) {
      // If already accepted, nothing to do
      if (doc.status === 'accepted') return res.json({ ok: true });
      // If pending but opposite requester, keep as is
      if (doc.status === 'pending') return res.json({ ok: true });
    }
    doc = await Connection.findOneAndUpdate(
      { aId, bId },
      { aId, bId, requesterId, status: 'pending' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('request error', e);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// POST /api/connections/respond { requesterId, action }
router.post('/respond', async (req, res) => {
  try {
    const me = req.user.uid;
    const { requesterId, action } = req.body || {};
    if (!requesterId || (action !== 'accept' && action !== 'decline')) return res.status(400).json({ error: 'Bad input' });

    const { aId, bId } = pair(me, requesterId);
    const doc = await Connection.findOne({ aId, bId });
    if (!doc || doc.status !== 'pending') return res.status(404).json({ error: 'No pending request' });

    // Only addressee can respond
    const addresseeId = me;
    if (doc.requesterId === addresseeId) return res.status(403).json({ error: 'Not allowed' });

    if (action === 'accept') {
      await Connection.updateOne({ aId, bId }, { $set: { status: 'accepted' } });
    } else {
      await Connection.deleteOne({ aId, bId });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('respond error', e);
    res.status(500).json({ error: 'Failed to respond' });
  }
});

// POST /api/connections/mark { addresseeId }
// Instantly records a connection as accepted (used when users connect externally, e.g., on LinkedIn)
router.post('/mark', async (req, res) => {
  try {
    const me = req.user.uid;
    const { addresseeId } = req.body || {};
    if (!addresseeId || addresseeId === me) return res.status(400).json({ error: 'Invalid addressee' });

    const { aId, bId } = pair(me, addresseeId);
    // Upsert as accepted regardless of prior state
    await Connection.findOneAndUpdate(
      { aId, bId },
      { aId, bId, requesterId: me, status: 'accepted' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('mark connection error', e);
    res.status(500).json({ error: 'Failed to mark connection' });
  }
});

// DELETE /api/connections/unfriend/:userId
router.delete('/unfriend/:userId', async (req, res) => {
  try {
    const uid = req.user.uid;
    const other = req.params.userId;
    const { aId, bId } = pair(uid, other);
    await Connection.deleteOne({ aId, bId, status: 'accepted' });
    res.json({ ok: true });
  } catch (e) {
    console.error('unfriend error', e);
    res.status(500).json({ error: 'Failed to unfriend' });
  }
});

export default router;
