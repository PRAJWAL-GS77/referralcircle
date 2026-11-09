import { Router } from 'express';
import { z } from 'zod';
import * as templateController from '../controllers/template.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();
router.use(authenticate);

const kindEnum = z.enum(['initial', 'followup', 'thank_you']);

const createTemplateSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }).trim().min(1, 'Title cannot be empty'),
    kind: kindEnum,
    body: z.string({ required_error: 'Template body is required' }).min(1, 'Template body cannot be empty')
  })
});

const updateTemplateSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid template ID format')
  }),
  body: z.object({
    title: z.string().trim().min(1).optional(),
    kind: kindEnum.optional(),
    body: z.string().min(1).optional()
  })
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid template ID format')
  })
});

const renderSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid template ID format')
  }),
  query: z.object({
    contactId: z.string({ required_error: 'contactId query parameter is required' }).regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID format')
  })
});

router.get('/', templateController.listTemplates);
router.post('/', validate(createTemplateSchema), templateController.createTemplate);
router.get('/:id/render', validate(renderSchema), templateController.renderTemplate);
router.get('/:id', validate(idParamSchema), templateController.getTemplate);
router.patch('/:id', validate(updateTemplateSchema), templateController.updateTemplate);
router.delete('/:id', validate(idParamSchema), templateController.deleteTemplate);

export default router;
