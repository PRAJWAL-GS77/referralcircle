import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { User } from '../models/user.model.js';
import { generateToken } from '../services/auth.service.js';

const router = Router();

const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string({ required_error: 'Google ID token is required' }).min(1, 'Google ID token cannot be empty')
  })
});

router.post('/google', validate(googleAuthSchema), authController.googleLogin);
router.get('/me', authenticate, authController.getMe);
router.post('/logout-all', authenticate, authController.logoutAll);

// Dev-only demo login for local testing without Google Client ID setup
if (process.env.NODE_ENV !== 'production') {
  router.post('/demo', async (req, res, next) => {
    try {
      let user = await User.findOne({ email: 'demo@referralcircle.com' });
      if (!user) {
        user = await User.create({
          googleId: 'demo_google_id_999999',
          email: 'demo@referralcircle.com',
          name: 'Alex Rivera (Demo Student)',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          tokenVersion: 0,
          settings: { defaultCooldownDays: 7, maxFollowUps: 5 }
        });
      }
      const token = generateToken(user);
      res.status(200).json({ data: { token, user } });
    } catch (err) {
      next(err);
    }
  });
}

export default router;
