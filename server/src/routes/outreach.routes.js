import { Router } from 'express';
import { z } from 'zod';
import * as outreachController from '../controllers/outreach.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();
router.use(authenticate);

const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid outreach ID format')
  })
});

// DELETE /api/outreach/:id
router.delete('/:id', validate(idParamSchema), outreachController.deleteOutreach);

export default router;
