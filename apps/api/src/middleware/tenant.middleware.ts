import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';
import mongoose from 'mongoose';

/**
 * Middleware to ensure tenant isolation
 * Adds tenantId filter to all queries
 */
export const ensureTenantIsolation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.tenantId) {
      throw new UnauthorizedError('Tenant context required');
    }

    // Validate tenantId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.tenantId)) {
      throw new UnauthorizedError('Invalid tenant context');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to get tenant ObjectId from request
 */
export const getTenantId = (req: Request): mongoose.Types.ObjectId => {
  if (!req.tenantId) {
    throw new UnauthorizedError('Tenant context required');
  }
  return new mongoose.Types.ObjectId(req.tenantId);
};

/**
 * Helper to build tenant filter for queries
 */
export const buildTenantFilter = (
  req: Request,
  additionalFilters: Record<string, unknown> = {}
): Record<string, unknown> => {
  return {
    tenantId: getTenantId(req),
    ...additionalFilters,
  };
};

export default { ensureTenantIsolation, getTenantId, buildTenantFilter };
