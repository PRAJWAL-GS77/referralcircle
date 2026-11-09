import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import authRoutes from './routes/auth.routes.js';
import contactRoutes from './routes/contact.routes.js';
import templateRoutes from './routes/template.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import exportRoutes from './routes/export.routes.js';
import outreachRoutes from './routes/outreach.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

const app = express();

// Security headers
app.use(helmet());

// CORS configuration with production whitelist check
const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Support comma-separated origins if multiple are configured
      const allowedOrigins = clientOrigin.split(',').map((o) => o.trim());
      if (
        allowedOrigins.includes(origin) ||
        (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:'))
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS error: Origin ${origin} not permitted`));
    },
    credentials: true
  })
);

// Logging (disabled during automated test execution)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Body parsers with payload size restrictions (DDoS protection)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Sanitize MongoDB operators like $gt, $ne to prevent query injection
app.use(mongoSanitize());

// Rate limiters (bypass in test environment)
if (process.env.NODE_ENV !== 'test') {
  // Stricter rate limiting on authentication routes (prevent brute-force)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many authentication attempts. Please try again after 15 minutes.'
      }
    }
  });
  app.use('/api/auth', authLimiter);

  // General rate limiter across all other API endpoints
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests from this IP. Please try again later.'
      }
    }
  });
  app.use('/api', apiLimiter);
}

// Health check endpoint for Render/uptime monitors
const healthCheck = (req, res) => {
  res.status(200).json({
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
};
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 & Central Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
