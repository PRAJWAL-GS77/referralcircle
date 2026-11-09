import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string({ required_error: 'Google ID token is required' }).min(1, 'Google ID token cannot be empty')
  })
});

router.post('/google', validate(googleAuthSchema), authController.googleLogin);
router.get('/me', authenticate, authController.getMe);
router.post('/logout-all', authenticate, authController.logoutAll);

export default router;
