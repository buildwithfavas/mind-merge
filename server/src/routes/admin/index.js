import express from 'express';
import adminOnly from '../../middleware/adminOnly.js';
import users from './users.js';
import posts from './posts.js';

const router = express.Router();

router.use(adminOnly);
router.use('/users', users);
router.use('/posts', posts);

export default router;
