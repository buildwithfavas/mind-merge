import express from 'express';
import UserPostStatus from '../models/UserPostStatus.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import { isValidLinkedInUrl, isValidHttpsUrl } from '../utils/validators.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const me = await User.findById(req.user.uid).select('linkedinUrl role blocked blockedReason').lean();
  return res.json({
    uid: req.user.uid,
    email: req.user.email,
    name: req.user.name,
    picture: req.user.picture,
    role: me?.role || 'user',
    blocked: !!me?.blocked,
    blockedReason: me?.blockedReason || null,
    linkedinUrl: me?.linkedinUrl || null
  });
});

router.get('/done', async (req, res) => {
  try {
    const statuses = await UserPostStatus.find({ userId: req.user.uid, status: 'done' })
      .select('postId updatedAt')
      .lean();
    const ids = statuses.map((s) => s.postId);
    if (ids.length === 0) return res.json([]);

    const posts = await Post.find({ _id: { $in: ids } }).lean();
    const userIds = Array.from(new Set(posts.map((p) => p.addedByUserId)));
    const users = await User.find({ _id: { $in: userIds } }).select('name photoURL email').lean();
    const byUser = new Map(users.map((u) => [String(u._id), u]));

    // Aggregate metrics (likes, comments) across all users for these posts
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

    const byPost = new Map(posts.map((p) => [String(p._id), p]));
    const list = statuses
      .map((s) => {
        const p = byPost.get(String(s.postId));
        if (!p) return null;
        const sharerUser = byUser.get(String(p.addedByUserId)) || {};
        const derivedName = sharerUser.name || (sharerUser.email ? String(sharerUser.email).split('@')[0] : 'Friend');
        const avatar = sharerUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(derivedName)}&background=1f2937&color=f8fafc`;
        return {
          ...p,
          doneAt: s.updatedAt,
          sharer: { name: derivedName, photoURL: avatar },
          metrics: metricsById.get(String(p._id)) || { likes: 0, comments: 0 }
        };
      })
      .filter(Boolean);
    return res.json(list);
  } catch (err) {
    console.error('Fetch done error:', err);
    return res.status(500).json({ error: 'Failed to fetch done posts' });
  }
});

// GET /api/me/profile -> 200 if profile exists, otherwise 404
router.get('/profile', async (req, res) => {
  try {
    const doc = await User.findById(req.user.uid).select('name linkedinUrl photoURL').lean();
    if (!doc || !doc.linkedinUrl) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    return res.json({ name: doc.name || null, linkedinUrl: doc.linkedinUrl, photoURL: doc.photoURL || null });
  } catch (e) {
    console.error('profile fetch error', e);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// POST /api/me/profile { name, linkedinUrl }
router.post('/profile', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { name, linkedinUrl, photoURL } = req.body || {};
    const cleanName = (name || '').toString().trim();
    const cleanUrl = (linkedinUrl || '').toString().trim();
    const cleanPhoto = (photoURL || '').toString().trim();
    if (!cleanName) return res.status(400).json({ error: 'Name is required' });
    if (!cleanUrl) return res.status(400).json({ error: 'LinkedIn URL is required' });
    if (!isValidLinkedInUrl(cleanUrl)) return res.status(400).json({ error: 'Invalid LinkedIn URL' });
    if (cleanPhoto && !isValidHttpsUrl(cleanPhoto)) return res.status(400).json({ error: 'Invalid photo URL (must be https)' });

    await User.findByIdAndUpdate(
      uid,
      { $set: { name: cleanName, linkedinUrl: cleanUrl, ...(cleanPhoto ? { photoURL: cleanPhoto } : {}) } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('profile save error', e);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

export default router;
