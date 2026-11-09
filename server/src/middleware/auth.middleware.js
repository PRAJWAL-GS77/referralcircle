import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { AppError } from './error.middleware.js';

// Verifies JWT token and checks tokenVersion against user record in DB
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(new AppError('JWT_SECRET is not configured', 500, 'CONFIG_ERROR'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
    }

    if (!decoded.userId || decoded.tokenVersion === undefined) {
      return next(new AppError('Malformed token payload', 401, 'INVALID_TOKEN'));
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new AppError('User not found', 401, 'USER_NOT_FOUND'));
    }

    // tokenVersion check: if user called logout-all, older tokens are rejected
    if (user.tokenVersion !== decoded.tokenVersion) {
      return next(new AppError('Session invalidated. Please log in again.', 401, 'SESSION_INVALIDATED'));
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    next(error);
  }
};
