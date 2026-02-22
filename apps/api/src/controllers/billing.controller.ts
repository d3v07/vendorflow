import { Request, Response, NextFunction } from 'express';
import { billingService } from '../services/billing.service';
import { getUsageSummary } from '../middleware/featureGate.middleware';
import { SubscriptionTier } from '../config/stripe';
import { BadRequestError } from '../utils/errors';

/**
 * Get subscription details and usage
 */
export const getSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [subscription, usage] = await Promise.all([
      billingService.getSubscriptionDetails(req.tenantId!),
      getUsageSummary(req.tenantId!),
    ]);

    res.json({
      success: true,
      data: {
        ...subscription,
        usage: usage.usage,
        features: usage.features,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create checkout session for subscription upgrade
 */
export const createCheckout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tier } = req.body;

    if (!tier || !['starter', 'pro'].includes(tier)) {
      throw new BadRequestError('Invalid tier. Must be "starter" or "pro"');
    }

    const session = await billingService.createCheckoutSession(
      req.tenantId!,
      tier as SubscriptionTier,
      req.user!.email,
      req.user!.name
    );

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create billing portal session
 */
export const createPortal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const session = await billingService.createPortalSession(req.tenantId!);

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel subscription at period end
 */
export const cancelSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await billingService.cancelSubscription(req.tenantId!);

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current billing period',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resume subscription (undo cancel at period end)
 */
export const resumeSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await billingService.resumeSubscription(req.tenantId!);

    res.json({
      success: true,
      message: 'Subscription has been resumed',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get usage summary only
 */
export const getUsage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const usage = await getUsageSummary(req.tenantId!);

    res.json({
      success: true,
      data: usage,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getSubscription,
  createCheckout,
  createPortal,
  cancelSubscription,
  resumeSubscription,
  getUsage,
};
