import { Router } from 'express';
import * as exportController from '../controllers/export.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/contacts.csv', exportController.exportContactsCsv);

export default router;
