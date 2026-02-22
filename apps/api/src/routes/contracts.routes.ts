import { Router } from 'express';
import * as contractsController from '../controllers/contracts.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireManager, requireAdmin } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { invalidateContractCache } from '../middleware/cache.middleware';
import { checkFeatureLimit } from '../middleware/featureGate.middleware';
import {
  createContractSchema,
  updateContractSchema,
  getContractsQuerySchema,
  getContractByIdSchema,
} from '../validators/contracts.validator';

const router = Router();

// All contract routes require authentication
router.use(authenticate);

// Read operations (all authenticated users)
router.get('/', validate(getContractsQuerySchema), contractsController.getContracts);
router.get('/:id', validate(getContractByIdSchema), contractsController.getContractById);

// Write operations (manager+) - with cache invalidation and feature gating
router.post('/', requireManager, checkFeatureLimit('contracts'), validate(createContractSchema), invalidateContractCache, contractsController.createContract);
router.patch('/:id', requireManager, validate(updateContractSchema), invalidateContractCache, contractsController.updateContract);

// Delete operations (admin only) - with cache invalidation
router.delete('/:id', requireAdmin, validate(getContractByIdSchema), invalidateContractCache, contractsController.deleteContract);

export default router;
