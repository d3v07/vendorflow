import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/rbac.middleware';

const router = Router();

// All settings routes require authentication
router.use(authenticate);

// Read settings (all authenticated users)
router.get('/', settingsController.getSettings);

// Update settings (admin only)
router.patch('/', requireAdmin, settingsController.updateSettings);

export default router;
