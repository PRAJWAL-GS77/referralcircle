import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { AppError } from '../middleware/error.middleware.js';

let googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Allow test suites to inject a mock verifier
export const setGoogleClient = (client) => {
  googleClient = client;
};

export const verifyGoogleToken = async (idToken) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new Error('Incomplete token payload');
    }
    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      avatar: payload.picture || ''
    };
  } catch (error) {
    throw new AppError('Invalid Google ID token', 401, 'INVALID_GOOGLE_TOKEN');
  }
};

export const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT_SECRET is not configured', 500, 'CONFIG_ERROR');
  }
  return jwt.sign(
    {
      userId: user._id.toString(),
      tokenVersion: user.tokenVersion
    },
    secret,
    { expiresIn: '7d' }
  );
};

export const loginWithGoogle = async (idToken) => {
  const payload = await verifyGoogleToken(idToken);

  let user = await User.findOne({ googleId: payload.googleId });

  if (!user) {
    user = await User.findOne({ email: payload.email.toLowerCase() });
    if (user) {
      user.googleId = payload.googleId;
      if (payload.avatar && !user.avatar) user.avatar = payload.avatar;
      await user.save();
    } else {
      user = await User.create({
        googleId: payload.googleId,
        email: payload.email.toLowerCase(),
        name: payload.name,
        avatar: payload.avatar,
        tokenVersion: 0
      });
    }
  } else {
    let updated = false;
    if (payload.avatar && user.avatar !== payload.avatar) {
      user.avatar = payload.avatar;
      updated = true;
    }
    if (payload.name && user.name !== payload.name) {
      user.name = payload.name;
      updated = true;
    }
    if (updated) {
      await user.save();
    }
  }

  const token = generateToken(user);
  return { token, user };
};

export const logoutAllSessions = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { tokenVersion: 1 } },
    { new: true }
  );
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  return user;
};
