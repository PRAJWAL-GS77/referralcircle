import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import authRoutes from './routes/auth.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  })
);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Sanitize MongoDB operators like $gt, $ne
app.use(mongoSanitize());

// Rate limiting (bypass in test environment)
if (process.env.NODE_ENV !== 'test') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests from this IP, please try again later.'
      }
    }
  });
  app.use('/api', limiter);
}

// Health check endpoint
const healthCheck = (req, res) => {
  res.status(200).json({
    data: {
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  });
};
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// API Routes
app.use('/api/auth', authRoutes);

// 404 & Central Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
