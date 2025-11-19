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
    return res.status(500).json({ error: 'Failed to create post' });
  }
});

// Update a post (only owner)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
    return res.status(500).json({ error: 'Failed to update post' });
  }
});

// List feed (exclude done by default)
router.get('/', async (req, res) => {
  const includeDone = req.query.includeDone === 'true';
  const mine = req.query.mine === 'true';
  try {
    let posts = await Post.find().sort({ createdAt: -1 }).lean();

    // Apply mine filter first: only my posts vs exclude my posts
    if (mine) {
      posts = posts.filter((p) => String(p.addedByUserId) === String(req.user.uid));
    } else {
      posts = posts.filter((p) => String(p.addedByUserId) !== String(req.user.uid));
    }

    if (!includeDone) {
      const done = await UserPostStatus.find({ userId: req.user.uid }).select('postId').lean();
      const doneSet = new Set(done.map((d) => String(d.postId)));
      const filtered = posts.filter((p) => !doneSet.has(String(p._id)));
      const userIds = Array.from(new Set(filtered.map((p) => p.addedByUserId)));
      const users = await User.find({ _id: { $in: userIds } }).select('name photoURL email').lean();
      const byId = new Map(users.map((u) => [u._id, u]));
      const ids = filtered.map((p) => p._id);
      // Aggregate metrics (likes, comments) across all users
      const metricsAgg = await UserPostStatus.aggregate([
        { $match: { postId: { $in: ids } } },
        {
          $group: {
            _id: '$postId',
            likes: { $sum: { $cond: ['$liked', 1, 0] } },
            comments: { $sum: { $cond: ['$commented', 1, 0] } }
          }
        }
      ]);
      const metricsById = new Map(metricsAgg.map((m) => [String(m._id), { likes: m.likes, comments: m.comments }]));
      // Current user's engagement
      const meStatuses = await UserPostStatus.find({ userId: req.user.uid, postId: { $in: ids } })
        .select('postId liked commented')
        .lean();
      const meById = new Map(meStatuses.map((s) => [String(s.postId), { liked: !!s.liked, commented: !!s.commented }]));
      const withSharer = filtered.map((p) => {
        const u = byId.get(p.addedByUserId) || {};
        const derivedName = u.name || (u.email ? String(u.email).split('@')[0] : 'Friend');
        const avatar = u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(derivedName)}&background=1f2937&color=f8fafc`;
        return {
          ...p,
          sharer: {
            name: derivedName,
            photoURL: avatar
          },
          metrics: metricsById.get(String(p._id)) || { likes: 0, comments: 0 },
          me: meById.get(String(p._id)) || { liked: false, commented: false }
        };
      });
      return res.json(withSharer);
    }

    const userIds = Array.from(new Set(posts.map((p) => p.addedByUserId)));
    const users = await User.find({ _id: { $in: userIds } }).select('name photoURL email').lean();
    const byId = new Map(users.map((u) => [u._id, u]));
    const ids = posts.map((p) => p._id);
    const metricsAgg = await UserPostStatus.aggregate([
      { $match: { postId: { $in: ids } } },
      {
        $group: {
          _id: '$postId',
          likes: { $sum: { $cond: ['$liked', 1, 0] } },
          comments: { $sum: { $cond: ['$commented', 1, 0] } }
        }
      }
    ]);
    const metricsById = new Map(metricsAgg.map((m) => [String(m._id), { likes: m.likes, comments: m.comments }]));
    const meStatuses = await UserPostStatus.find({ userId: req.user.uid, postId: { $in: ids } })
      .select('postId liked commented')
      .lean();
    const meById = new Map(meStatuses.map((s) => [String(s.postId), { liked: !!s.liked, commented: !!s.commented }]));
    const withSharer = posts.map((p) => {
      const u = byId.get(p.addedByUserId) || {};
      const derivedName = u.name || (u.email ? String(u.email).split('@')[0] : 'Friend');
      const avatar = u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(derivedName)}&background=1f2937&color=f8fafc`;
      return {
        ...p,
        sharer: {
          name: derivedName,
          photoURL: avatar
        },
        metrics: metricsById.get(String(p._id)) || { likes: 0, comments: 0 },
        me: meById.get(String(p._id)) || { liked: false, commented: false }
      };
    });
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
