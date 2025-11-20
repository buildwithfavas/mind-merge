import express from 'express';
import User from '../../models/User.js';

const router = express.Router();

// GET /api/admin/users
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const role = (req.query.role || '').toString().trim();
    const blocked = (req.query.blocked || '').toString().trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

    const filter = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }
    if (role === 'admin' || role === 'user') filter.role = role;
    if (blocked === 'true') filter.blocked = true;
    if (blocked === 'false') filter.blocked = { $ne: true };

    const total = await User.countDocuments(filter);
    const items = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    res.json({ items, page, pageSize: items.length, total, hasMore: page * pageSize < total });
  } catch (e) {
    console.error('admin users list error', e);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// POST /api/admin/users
router.post('/', async (req, res) => {
  try {
    const { _id, email, name, linkedinUrl, photoURL, role } = req.body || {};
    const doc = await User.create({
      _id: _id || undefined,
      email: (email || '').toString().trim() || undefined,
      name: (name || '').toString().trim() || undefined,
      linkedinUrl: (linkedinUrl || '').toString().trim() || undefined,
      photoURL: (photoURL || '').toString().trim() || undefined,
      role: role === 'admin' ? 'admin' : 'user'
    });
    res.status(201).json(doc);
  } catch (e) {
    console.error('admin user create error', e);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /api/admin/users/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, linkedinUrl, photoURL, role } = req.body || {};
    const updates = {};
    if (email !== undefined) updates.email = (email || '').toString().trim();
    if (name !== undefined) updates.name = (name || '').toString().trim();
    if (linkedinUrl !== undefined) updates.linkedinUrl = (linkedinUrl || '').toString().trim();
    if (photoURL !== undefined) updates.photoURL = (photoURL || '').toString().trim();
    if (role === 'admin' || role === 'user') updates.role = role;

    const updated = await User.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (e) {
    console.error('admin user update error', e);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// POST /api/admin/users/:id/block
router.post('/:id/block', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { blocked: true, blockedReason: (reason || '').toString().trim() || undefined, blockedAt: new Date() } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (e) {
    console.error('admin user block error', e);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// POST /api/admin/users/:id/unblock
router.post('/:id/unblock', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { blocked: false }, $unset: { blockedReason: 1, blockedAt: 1 } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (e) {
    console.error('admin user unblock error', e);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const me = req.user.uid;
    if (me === id) return res.status(400).json({ error: 'Cannot delete yourself' });

    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('admin user delete error', e);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
