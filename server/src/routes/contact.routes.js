import { Router } from 'express';
import { z } from 'zod';
import * as contactController from '../controllers/contact.controller.js';
import * as outreachController from '../controllers/outreach.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();
router.use(authenticate);

const relationshipTypeEnum = z.enum([
  'alumni',
  'former_colleague',
  'professor',
  'friend_referral',
  'cold_contact',
  'other'
]);

const relationshipStrengthEnum = z.enum(['cold', 'warm', 'strong']);

const statusEnum = z.enum([
  'not_contacted',
  'contacted',
  'awaiting_response',
  'replied',
  'referral_given',
  'declined',
  'no_response'
]);

const referralOutcomeEnum = z.enum(['none', 'referral_given', 'interview', 'offer']);

const channelEnum = z.enum([
  'email',
  'linkedin',
  'whatsapp',
  'phone',
  'in_person',
  'other'
]);

const createContactSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name cannot be empty'),
    company: z.string().trim().optional(),
    role: z.string().trim().optional(),
    email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
    linkedinUrl: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    relationshipType: relationshipTypeEnum.optional(),
    relationshipStrength: relationshipStrengthEnum.optional(),
    howWeMet: z.string().optional(),
    tags: z.array(z.string().trim()).optional(),
    notes: z.string().optional(),
    status: statusEnum.optional(),
    referralOutcome: referralOutcomeEnum.optional(),
    cooldownDays: z.number().int().min(1).nullable().optional()
  })
});

const updateContactSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID format')
  }),
  body: z.object({
    name: z.string().trim().min(1, 'Name cannot be empty').optional(),
    company: z.string().trim().optional(),
    role: z.string().trim().optional(),
    email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
    linkedinUrl: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    relationshipType: relationshipTypeEnum.optional(),
    relationshipStrength: relationshipStrengthEnum.optional(),
    howWeMet: z.string().optional(),
    tags: z.array(z.string().trim()).optional(),
    notes: z.string().optional(),
    status: statusEnum.optional(),
    referralOutcome: referralOutcomeEnum.optional(),
    cooldownDays: z.number().int().min(1).nullable().optional()
  })
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID format')
  })
});

const listContactsSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    status: statusEnum.optional(),
    tag: z.string().optional(),
    relationshipType: relationshipTypeEnum.optional(),
    relationshipStrength: relationshipStrengthEnum.optional(),
    dueOnly: z.enum(['true', 'false']).optional(),
    sort: z.string().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional()
  }).optional()
});

const createOutreachSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID format')
  }),
  body: z.object({
    direction: z.enum(['sent', 'received'], { required_error: 'Direction is required (sent or received)' }),
    channel: channelEnum,
    messageSummary: z.string({ required_error: 'Message summary is required' }).trim().min(1, 'Message summary cannot be empty'),
    messageBody: z.string().optional(),
    override: z.boolean().optional(),
    overrideReason: z.string().optional(),
    sentAt: z.string().datetime().optional()
  })
});

router.get('/', validate(listContactsSchema), contactController.listContacts);
router.post('/', validate(createContactSchema), contactController.createContact);
router.get('/:id', validate(idParamSchema), contactController.getContact);
router.patch('/:id', validate(updateContactSchema), contactController.updateContact);
router.delete('/:id', validate(idParamSchema), contactController.deleteContact);

// Outreach sub-routes for contact
router.get('/:id/outreach', validate(idParamSchema), outreachController.listOutreach);
router.post('/:id/outreach', validate(createOutreachSchema), outreachController.createOutreach);

export default router;
