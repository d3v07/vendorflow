import Stripe from 'stripe';
import config from './index';
import logger from '../utils/logger';

/**
 * Stripe client instance
 * Uses test mode keys for development/demo
 */
let stripeClient: Stripe | null = null;

export const getStripeClient = (): Stripe => {
  if (!stripeClient) {
    if (!config.stripe.secretKey) {
      logger.warn('Stripe secret key not configured - billing features disabled');
      // Return a mock-safe client for demo purposes
      stripeClient = new Stripe('sk_test_placeholder', {
        typescript: true,
      });
    } else {
      stripeClient = new Stripe(config.stripe.secretKey, {
        typescript: true,
      });
      logger.info('Stripe client initialized');
    }
  }
  return stripeClient;
};

/**
 * Subscription tier definitions
 */
export enum SubscriptionTier {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
}

/**
 * Feature limits per tier
 */
export interface TierLimits {
  maxUsers: number;
  maxVendors: number;
  maxContracts: number;
  maxInvoices: number;
  backgroundJobs: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    maxUsers: 3,
    maxVendors: 25,
    maxContracts: 50,
    maxInvoices: 100,
    backgroundJobs: false,
    apiAccess: false,
    prioritySupport: false,
  },
  [SubscriptionTier.STARTER]: {
    maxUsers: 10,
    maxVendors: 100,
    maxContracts: 250,
    maxInvoices: 1000,
    backgroundJobs: true,
    apiAccess: false,
    prioritySupport: false,
  },
  [SubscriptionTier.PRO]: {
    maxUsers: -1, // Unlimited
    maxVendors: -1,
    maxContracts: -1,
    maxInvoices: -1,
    backgroundJobs: true,
    apiAccess: true,
    prioritySupport: true,
  },
};

/**
 * Get tier limits
 */
export const getTierLimits = (tier: SubscriptionTier): TierLimits => {
  return TIER_LIMITS[tier] || TIER_LIMITS[SubscriptionTier.FREE];
};

/**
 * Check if a limit is exceeded
 * Returns true if within limit, false if exceeded
 */
export const isWithinLimit = (current: number, limit: number): boolean => {
  if (limit === -1) return true; // Unlimited
  return current < limit;
};

/**
 * Price IDs mapping (set in Stripe Dashboard)
 */
export const getPriceId = (tier: SubscriptionTier): string | null => {
  switch (tier) {
    case SubscriptionTier.STARTER:
      return config.stripe.priceIds.starter || null;
    case SubscriptionTier.PRO:
      return config.stripe.priceIds.pro || null;
    default:
      return null; // Free tier has no price
  }
};

export default {
  getStripeClient,
  SubscriptionTier,
  TIER_LIMITS,
  getTierLimits,
  isWithinLimit,
  getPriceId,
};
