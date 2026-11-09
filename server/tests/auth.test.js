import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test_jwt_secret_key_1234567890123456';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

// Mock User model
vi.mock('../src/models/user.model.js', () => {
  return {
    User: {
      findOne: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      findByIdAndUpdate: vi.fn()
    }
  };
});

// Import app and dependencies after mocking
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { setGoogleClient } from '../src/services/auth.service.js';

describe('API Smoke and Auth Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 and status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ok');
    });

    it('should return 200 on /api/health as well', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ok');
    });
  });

  describe('Auth Middleware & Endpoints', () => {
    const mockUser = {
      _id: '672cb5e634ab9c3491df2801',
      googleId: 'google_12345',
      email: 'student@college.edu',
      name: 'College Student',
      avatar: 'https://example.com/photo.jpg',
      tokenVersion: 0,
      settings: { defaultCooldownDays: 7, maxFollowUps: 5 }
    };

    it('should reject request without Bearer token on protected route', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject request with an invalid JWT', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.value');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should validate Google login payload (requires idToken)', async () => {
      const res = await request(app).post('/api/auth/google').send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should login with valid Google ID token, returning JWT and user', async () => {
      // Mock Google verifier
      setGoogleClient({
        verifyIdToken: vi.fn().mockResolvedValue({
          getPayload: () => ({
            sub: mockUser.googleId,
            email: mockUser.email,
            name: mockUser.name,
            picture: mockUser.avatar
          })
        })
      });

      User.findOne.mockResolvedValueOnce(null); // No existing googleId
      User.findOne.mockResolvedValueOnce(null); // No existing email
      User.create.mockResolvedValueOnce(mockUser);

      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'valid-mock-google-token' });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(mockUser.email);
    });

    it('should authenticate valid JWT and return user profile on /api/auth/me', async () => {
      const token = jwt.sign(
        { userId: mockUser._id, tokenVersion: 0 },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      User.findById.mockResolvedValueOnce(mockUser);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(mockUser.email);
    });

    it('should reject token if tokenVersion does not match (session invalidated via logout-all)', async () => {
      const token = jwt.sign(
        { userId: mockUser._id, tokenVersion: 0 },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // User has bumped tokenVersion to 1
      User.findById.mockResolvedValueOnce({
        ...mockUser,
        tokenVersion: 1
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('SESSION_INVALIDATED');
    });

    it('should increment tokenVersion on /api/auth/logout-all', async () => {
      const token = jwt.sign(
        { userId: mockUser._id, tokenVersion: 0 },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      User.findById.mockResolvedValueOnce(mockUser);
      User.findByIdAndUpdate.mockResolvedValueOnce({
        ...mockUser,
        tokenVersion: 1
      });

      const res = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toMatch(/invalidated/i);
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        { $inc: { tokenVersion: 1 } },
        { new: true }
      );
    });
  });
});
