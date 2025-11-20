import express from 'express';
import Post from '../models/Post.js';
import UserPostStatus from '../models/UserPostStatus.js';
import { isValidLinkedInUrl } from '../utils/validators.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const router = express.Router();

// Create a post
router.post('/', async (req, res) => {
  const { url, title } = req.body || {};
  if (!url || !isValidLinkedInUrl(url)) {
    return res.status(400).json({ error: 'Invalid LinkedIn URL' });
  }
  const cleanTitle = (title || '').toString().trim().slice(0, 120);

  try {
    const existing = await Post.findOne({ url });
    if (existing) return res.status(409).json({ error: 'This LinkedIn post has already been shared.' });

    const post = await Post.create({ url, title: cleanTitle || undefined, addedByUserId: req.user.uid });
    return res.status(201).json(post);
  } catch (err) {
    console.error('Create post error:', err);
    // Handle duplicate key race condition gracefully
    if (err && (err.code === 11000 || String(err.message || '').includes('E11000'))) {
      return res.status(409).json({ error: 'This LinkedIn post has already been shared.' });
    }
    return res.status(500).json({ error: 'Failed to create post' });
  }
});

// Update a post (only owner)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid post id' });
    }
    const { title, url } = req.body || {};
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    if (post.addedByUserId !== req.user.uid) return res.status(403).json({ error: 'Forbidden' });

    const updates = {};
    if (typeof title === 'string') {
      const cleanTitle = title.toString().trim().slice(0, 120);
      updates.title = cleanTitle || undefined;
    }
    if (typeof url === 'string') {
      if (!isValidLinkedInUrl(url)) return res.status(400).json({ error: 'Invalid LinkedIn URL' });
      updates.url = url;
    }

    const updated = await Post.findByIdAndUpdate(id, updates, { new: true });
    return res.json(updated);
  } catch (err) {
    console.error('Update post error:', err);
    if (err && (err.code === 11000 || String(err.message || '').includes('E11000'))) {
      return res.status(409).json({ error: 'A post with this URL already exists.' });
    }
    return res.status(500).json({ error: 'Failed to update post' });
  }
});

// List feed (exclude done by default), optimized for DB-side filtering and pagination
router.get('/', async (req, res) => {
  const includeDone = req.query.includeDone === 'true';
  const mine = req.query.mine === 'true';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.max(1, Math.min(50, parseInt(req.query.pageSize, 10) || 10));
  const doPaginate = !!req.query.page; // only paginate if client requested a page
  try {
    // Build base filter
    const filter = {};
    if (mine) {
      filter.addedByUserId = req.user.uid;
    } else {
      filter.addedByUserId = { $ne: req.user.uid };
    }

    // Exclude posts the user has marked done (unless includeDone)
    let doneIds = [];
    if (!includeDone) {
      const done = await UserPostStatus.find({ userId: req.user.uid }).select('postId').lean();
      doneIds = done.map((d) => d.postId);
      if (doneIds.length > 0) {
        filter._id = { $nin: doneIds };
      }
    }

    // Total count for pagination
    const total = doPaginate ? await Post.countDocuments(filter) : 0;

    // Page items directly from DB
    const cursor = Post.find(filter)
      .sort({ createdAt: -1 })
      .select('url title addedByUserId createdAt')
      .lean();
    const pageList = doPaginate
      ? await cursor.skip((page - 1) * pageSize).limit(pageSize)
      : await cursor;

    // Resolve sharer users
    const userIds = Array.from(new Set(pageList.map((p) => p.addedByUserId)));
    const users = await User.find({ _id: { $in: userIds } }).select('name photoURL email').lean();
    const byId = new Map(users.map((u) => [u._id, u]));

    // Aggregate metrics only for posts in this page
    const ids = pageList.map((p) => p._id);
    const metricsAgg = ids.length
      ? await UserPostStatus.aggregate([
          { $match: { postId: { $in: ids } } },
          {
            $group: {
              _id: '$postId',
              likes: { $sum: { $cond: ['$liked', 1, 0] } },
              comments: { $sum: { $cond: ['$commented', 1, 0] } }
            }
          }
        ])
      : [];
    const metricsById = new Map(metricsAgg.map((m) => [String(m._id), { likes: m.likes, comments: m.comments }]));

    // Current user's engagement for these posts
    const meStatuses = ids.length
      ? await UserPostStatus.find({ userId: req.user.uid, postId: { $in: ids } })
          .select('postId liked commented')
          .lean()
      : [];
    const meById = new Map(meStatuses.map((s) => [String(s.postId), { liked: !!s.liked, commented: !!s.commented }]));

    const withSharer = pageList.map((p) => {
      const u = byId.get(p.addedByUserId) || {};
      const derivedName = u.name || (u.email ? String(u.email).split('@')[0] : 'Friend');
      const avatar = u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(derivedName)}&background=1f2937&color=f8fafc`;
      return {
        ...p,
        sharer: { name: derivedName, photoURL: avatar },
        metrics: metricsById.get(String(p._id)) || { likes: 0, comments: 0 },
        me: meById.get(String(p._id)) || { liked: false, commented: false }
      };
    });

    if (doPaginate) {
      const sliceEnd = page * pageSize;
      return res.json({ items: withSharer, page, pageSize, total, hasMore: sliceEnd < total });
    }
    return res.json(withSharer);
  } catch (err) {
    console.error('List posts error:', err);
    return res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Mark as done
router.post('/:id/done', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid post id' });
    }
    await UserPostStatus.findOneAndUpdate(
      { userId: req.user.uid, postId: id },
      { userId: req.user.uid, postId: id, status: 'done' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('Mark done error:', err);
    return res.status(500).json({ error: 'Failed to mark done' });
  }
});

// Undo done (optional)
router.delete('/:id/done', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid post id' });
    }
    await UserPostStatus.deleteOne({ userId: req.user.uid, postId: id });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Undo done error:', err);
    return res.status(500).json({ error: 'Failed to undo done' });
  }
});

// Save engagement (liked/commented)
router.post('/:id/engage', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid post id' });
    }
    const { liked, commented } = req.body || {};
    const likeVal = !!liked;
    const commVal = !!commented;
    await UserPostStatus.findOneAndUpdate(
      { userId: req.user.uid, postId: id },
      { $set: { liked: likeVal, commented: commVal }, $setOnInsert: { userId: req.user.uid, postId: id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const agg = await UserPostStatus.aggregate([
      { $match: { postId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: '$postId',
          likes: { $sum: { $cond: ['$liked', 1, 0] } },
          comments: { $sum: { $cond: ['$commented', 1, 0] } }
        }
      }
    ]);
    const metrics = agg[0] ? { likes: agg[0].likes, comments: agg[0].comments } : { likes: 0, comments: 0 };
    return res.json({ ok: true, metrics, me: { liked: likeVal, commented: commVal } });
  } catch (err) {
    console.error('Engage error:', err);
    return res.status(500).json({ error: 'Failed to save engagement' });
  }
});

// Delete post (only owner)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid post id' });
    }
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    if (post.addedByUserId !== req.user.uid) return res.status(403).json({ error: 'Forbidden' });

    await Post.deleteOne({ _id: id });
    await UserPostStatus.deleteMany({ postId: id });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Delete post error:', err);
    return res.status(500).json({ error: 'Failed to delete post' });
  }
});

export default router;
