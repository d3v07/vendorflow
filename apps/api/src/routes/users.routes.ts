import { Router } from 'express';
import * as usersController from '../controllers/users.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { checkFeatureLimit } from '../middleware/featureGate.middleware';
import {
  createUserSchema,
  updateUserSchema,
  getUsersQuerySchema,
  getUserByIdSchema,
  toggleUserActiveSchema,
} from '../validators/users.validator';

const router = Router();

// All user routes require admin role
router.use(authenticate, requireAdmin);

router.get('/', validate(getUsersQuerySchema), usersController.getUsers);
router.get('/:id', validate(getUserByIdSchema), usersController.getUserById);
router.post('/', checkFeatureLimit('users'), validate(createUserSchema), usersController.createUser);
router.patch('/:id', validate(updateUserSchema), usersController.updateUser);
router.delete('/:id', validate(getUserByIdSchema), usersController.deleteUser);
router.patch('/:id/toggle-active', validate(toggleUserActiveSchema), usersController.toggleUserActive);

export default router;
