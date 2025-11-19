import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { connectMongo } from './config/mongo.js';
import { initFirebase } from './config/firebaseAdmin.js';
import auth from './middleware/auth.js';
import postsRouter from './routes/posts.js';
import meRouter from './routes/me.js';
import connectionsRouter from './routes/connections.js';

dotenv.config();

const app = express();
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
const PORT = process.env.PORT || 4000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Security headers
app.use(helmet());

// CORS with explicit methods/headers
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true,
  optionsSuccessStatus: 204
}));

// Body limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Compression
app.use(compression());

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health endpoint (no auth)
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Initialize Firebase Admin & Mongo
initFirebase();

// Apply auth for all routes below
app.use('/api', auth);

// Rate limits
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
// General limiter for all API
app.use('/api', generalLimiter);
// Stricter limiter for write methods (must be BEFORE routers)
app.use('/api', (req, res, next) => {
  if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});

// Routes
app.use('/api/posts', postsRouter);
app.use('/api/me', meRouter);
app.use('/api/connections', connectionsRouter);

connectMongo()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

// Global error handler (last)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err?.message?.includes('Not allowed by CORS')) {
    return res.status(403).json({ error: 'CORS: Origin not allowed' });
  }
  return res.status(500).json({ error: 'Internal server error' });
});
