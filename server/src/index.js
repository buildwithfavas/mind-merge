import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectMongo } from './config/mongo.js';
import { initFirebase } from './config/firebaseAdmin.js';
import auth from './middleware/auth.js';
import postsRouter from './routes/posts.js';
import meRouter from './routes/me.js';
import connectionsRouter from './routes/connections.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Health endpoint (no auth)
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Initialize Firebase Admin & Mongo
initFirebase();

// Apply auth for all routes below
app.use('/api', auth);
app.use('/api/posts', postsRouter);
app.use('/api/me', meRouter);
app.use('/api/connections', connectionsRouter);

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

connectMongo()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
