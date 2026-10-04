import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import recipeRoutes from './routes/recipes.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import { requireAdmin, requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import { HttpError } from './utils/http.js';
import pool from './config/db.js';

const app = express();
app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use((req, _res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || !req.headers.origin) return next();
  let allowedOrigin;
  try {
    allowedOrigin = new URL(process.env.CLIENT_URL || 'http://localhost:5173').origin;
  } catch {
    return next(new HttpError(503, 'Server configuration is incomplete. Please configure the backend.'));
  }
  if (req.headers.origin !== allowedOrigin) return next(new HttpError(403, 'Request origin is not allowed.'));
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads'), {
  dotfiles: 'deny', index: false, maxAge: '1d'
}));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' })
}));
app.get('/api/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, data: { status: 'ok' } });
  } catch (error) {
    next(error);
  }
});
app.use('/api/recipes', recipeRoutes);
app.use('/api', userRoutes);
app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
