import express from 'express';
import Post from '../../models/Post.js';
import UserPostStatus from '../../models/UserPostStatus.js';

const router = express.Router();

// GET /api/admin/posts
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const userId = (req.query.userId || '').toString().trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

    const filter = {};
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { url: { $regex: q, $options: 'i' } }
      ];
    }
    if (userId) filter.addedByUserId = userId;

    const total = await Post.countDocuments(filter);
    const items = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    res.json({ items, page, pageSize: items.length, total, hasMore: page * pageSize < total });
  } catch (e) {
    console.error('admin posts list error', e);
    res.status(500).json({ error: 'Failed to list posts' });
  }
});

// DELETE /api/admin/posts/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    await Post.deleteOne({ _id: id });
    await UserPostStatus.deleteMany({ postId: id });
    res.json({ ok: true });
  } catch (e) {
    console.error('admin post delete error', e);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

export default router;
