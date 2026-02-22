import { Router } from 'express';
import * as invoicesController from '../controllers/invoices.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireManager, requireAdmin } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { invalidateInvoiceCache } from '../middleware/cache.middleware';
import { checkFeatureLimit } from '../middleware/featureGate.middleware';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  getInvoicesQuerySchema,
  getInvoiceByIdSchema,
  markAsPaidSchema,
} from '../validators/invoices.validator';

const router = Router();

// All invoice routes require authentication
router.use(authenticate);

// Read operations (all authenticated users)
router.get('/', validate(getInvoicesQuerySchema), invoicesController.getInvoices);
router.get('/:id', validate(getInvoiceByIdSchema), invoicesController.getInvoiceById);

// Write operations (manager+) - with cache invalidation and feature gating
router.post('/', requireManager, checkFeatureLimit('invoices'), validate(createInvoiceSchema), invalidateInvoiceCache, invoicesController.createInvoice);
router.patch('/:id', requireManager, validate(updateInvoiceSchema), invalidateInvoiceCache, invoicesController.updateInvoice);
router.patch('/:id/mark-as-paid', requireManager, validate(markAsPaidSchema), invalidateInvoiceCache, invoicesController.markAsPaid);

// Delete operations (admin only) - with cache invalidation
router.delete('/:id', requireAdmin, validate(getInvoiceByIdSchema), invalidateInvoiceCache, invoicesController.deleteInvoice);

export default router;
