import { Router } from 'express';
import { z } from 'zod';
import * as settingsController from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();
router.use(authenticate);

const updateSettingsSchema = z.object({
  body: z.object({
    defaultCooldownDays: z.number().int().min(1, 'Cooldown must be at least 1 day').optional(),
    maxFollowUps: z.number().int().min(1, 'Max follow-ups must be at least 1').optional()
  }).refine((data) => data.defaultCooldownDays !== undefined || data.maxFollowUps !== undefined, {
    message: 'At least one setting property must be provided'
  })
});

router.get('/', settingsController.getSettings);
router.patch('/', validate(updateSettingsSchema), settingsController.updateSettings);
router.delete('/', settingsController.deleteAccount);

export default router;
