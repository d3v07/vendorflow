import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { UserRole, ROLE_HIERARCHY } from '../types';

type RoleRequirement = UserRole | UserRole[];

/**
 * Check if user has required role(s)
 * Roles are hierarchical: admin > manager > viewer
 */
export const requireRole = (requiredRole: RoleRequirement) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.userRole) {
        throw new UnauthorizedError('Authentication required');
      }

      const userRoleLevel = ROLE_HIERARCHY[req.userRole];

      // If array of roles, check if user has any of them
      if (Array.isArray(requiredRole)) {
        const hasAccess = requiredRole.some(
          (role) => userRoleLevel >= ROLE_HIERARCHY[role]
        );
        if (!hasAccess) {
          throw new ForbiddenError(
            `Required role: ${requiredRole.join(' or ')}`
          );
        }
      } else {
        // Check if user role level is >= required role level
        const requiredLevel = ROLE_HIERARCHY[requiredRole];
        if (userRoleLevel < requiredLevel) {
          throw new ForbiddenError(`Required role: ${requiredRole} or higher`);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require admin role
 */
export const requireAdmin = requireRole('admin');

/**
 * Require manager role (or admin)
 */
export const requireManager = requireRole('manager');

/**
 * Require viewer role (any authenticated user)
 */
export const requireViewer = requireRole('viewer');

/**
 * Check if user can access a specific resource
 * For example, check if user owns the resource
 */
export const requireOwnership = (
  getOwnerId: (req: Request) => string | undefined
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('Authentication required');
      }

      // Admins can access any resource
      if (req.userRole === 'admin') {
        return next();
      }

      const ownerId = getOwnerId(req);
      if (ownerId && ownerId !== req.userId) {
        throw new ForbiddenError('Access denied');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default { requireRole, requireAdmin, requireManager, requireViewer, requireOwnership };
