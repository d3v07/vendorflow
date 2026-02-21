import { Request, Response, NextFunction } from 'express';
import { Tenant, User, Vendor, Contract, Invoice } from '../models';
import { SubscriptionTier, getTierLimits, isWithinLimit } from '../config/stripe';
import { ForbiddenError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Feature types that can be gated
 */
export type GatedFeature =
  | 'users'
  | 'vendors'
  | 'contracts'
  | 'invoices'
  | 'backgroundJobs'
  | 'apiAccess';

/**
 * Get current count for a feature
 */
async function getCurrentCount(tenantId: string, feature: GatedFeature): Promise<number> {
  switch (feature) {
    case 'users':
      return User.countDocuments({ tenantId, isActive: true });
    case 'vendors':
      return Vendor.countDocuments({ tenantId });
    case 'contracts':
      return Contract.countDocuments({ tenantId });
    case 'invoices':
      return Invoice.countDocuments({ tenantId });
    default:
      return 0;
  }
}

/**
 * Get limit for a feature from tier limits
 */
function getFeatureLimit(tier: SubscriptionTier, feature: GatedFeature): number {
  const limits = getTierLimits(tier);

  switch (feature) {
    case 'users':
      return limits.maxUsers;
    case 'vendors':
      return limits.maxVendors;
    case 'contracts':
      return limits.maxContracts;
    case 'invoices':
      return limits.maxInvoices;
    default:
      return -1; // Unlimited
  }
}

/**
 * Check if a feature is enabled for the tier
 */
function isFeatureEnabled(tier: SubscriptionTier, feature: GatedFeature): boolean {
  const limits = getTierLimits(tier);

  switch (feature) {
    case 'backgroundJobs':
      return limits.backgroundJobs;
    case 'apiAccess':
      return limits.apiAccess;
    default:
      return true;
  }
}

/**
 * Middleware factory to check feature limits
 * Use this before create operations
 */
export const checkFeatureLimit = (feature: GatedFeature) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.tenantId;

      if (!tenantId) {
        return next(new ForbiddenError('Tenant context required'));
      }

      // Get tenant subscription tier
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return next(new ForbiddenError('Tenant not found'));
      }

      const tier = (tenant.subscriptionTier as SubscriptionTier) || SubscriptionTier.FREE;

      // Check if it's a boolean feature (enabled/disabled)
      if (feature === 'backgroundJobs' || feature === 'apiAccess') {
        if (!isFeatureEnabled(tier, feature)) {
          logger.warn(`Feature ${feature} not available for tier ${tier}`, { tenantId });
          return next(new ForbiddenError(
            `${feature} is not available on the ${tier} plan. Please upgrade to access this feature.`
          ));
        }
        return next();
      }

      // Check count-based limits
      const currentCount = await getCurrentCount(tenantId, feature);
      const limit = getFeatureLimit(tier, feature);

      if (!isWithinLimit(currentCount, limit)) {
        logger.warn(`Feature limit exceeded for ${feature}`, {
          tenantId,
          tier,
          current: currentCount,
          limit,
        });
        return next(new ForbiddenError(
          `You've reached the ${feature} limit (${limit}) for the ${tier} plan. Please upgrade to add more.`
        ));
      }

      // Attach usage info to request for optional use in response
      req.usageInfo = {
        feature,
        current: currentCount,
        limit,
        tier,
      };

      next();
    } catch (error) {
      logger.error('Feature gate check failed:', error);
      next(error);
    }
  };
};

/**
 * Middleware to check if background jobs are enabled
 */
export const requireBackgroundJobs = checkFeatureLimit('backgroundJobs');

/**
 * Middleware to check if API access is enabled
 */
export const requireApiAccess = checkFeatureLimit('apiAccess');

/**
 * Get usage summary for a tenant
 */
export async function getUsageSummary(tenantId: string): Promise<{
  tier: SubscriptionTier;
  usage: {
    feature: GatedFeature;
    current: number;
    limit: number;
    percentage: number;
  }[];
  features: {
    feature: GatedFeature;
    enabled: boolean;
  }[];
}> {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const tier = (tenant.subscriptionTier as SubscriptionTier) || SubscriptionTier.FREE;
  const limits = getTierLimits(tier);

  // Get current counts
  const [usersCount, vendorsCount, contractsCount, invoicesCount] = await Promise.all([
    User.countDocuments({ tenantId, isActive: true }),
    Vendor.countDocuments({ tenantId }),
    Contract.countDocuments({ tenantId }),
    Invoice.countDocuments({ tenantId }),
  ]);

  const calculatePercentage = (current: number, limit: number): number => {
    if (limit === -1) return 0; // Unlimited
    return Math.round((current / limit) * 100);
  };

  return {
    tier,
    usage: [
      {
        feature: 'users',
        current: usersCount,
        limit: limits.maxUsers,
        percentage: calculatePercentage(usersCount, limits.maxUsers),
      },
      {
        feature: 'vendors',
        current: vendorsCount,
        limit: limits.maxVendors,
        percentage: calculatePercentage(vendorsCount, limits.maxVendors),
      },
      {
        feature: 'contracts',
        current: contractsCount,
        limit: limits.maxContracts,
        percentage: calculatePercentage(contractsCount, limits.maxContracts),
      },
      {
        feature: 'invoices',
        current: invoicesCount,
        limit: limits.maxInvoices,
        percentage: calculatePercentage(invoicesCount, limits.maxInvoices),
      },
    ],
    features: [
      { feature: 'backgroundJobs', enabled: limits.backgroundJobs },
      { feature: 'apiAccess', enabled: limits.apiAccess },
    ],
  };
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      usageInfo?: {
        feature: GatedFeature;
        current: number;
        limit: number;
        tier: SubscriptionTier;
      };
    }
  }
}

export default {
  checkFeatureLimit,
  requireBackgroundJobs,
  requireApiAccess,
  getUsageSummary,
};
