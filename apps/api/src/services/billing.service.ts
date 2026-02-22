import Stripe from 'stripe';
import { Tenant } from '../models';
import { getStripeClient, SubscriptionTier, getPriceId, getTierLimits, TierLimits } from '../config/stripe';
import config from '../config';
import { NotFoundError, BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

export class BillingService {
  private stripe: Stripe;

  constructor() {
    this.stripe = getStripeClient();
  }

  /**
   * Create or get Stripe customer for a tenant
   */
  async getOrCreateCustomer(tenantId: string, email: string, name: string): Promise<string> {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    // Return existing customer ID if present
    if (tenant.stripeCustomerId) {
      return tenant.stripeCustomerId;
    }

    // Create new Stripe customer
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          tenantId,
          tenantSlug: tenant.slug,
        },
      });

      // Save customer ID to tenant
      tenant.stripeCustomerId = customer.id;
      await tenant.save();

      logger.info(`Stripe customer created for tenant ${tenantId}`, { customerId: customer.id });
      return customer.id;
    } catch (error) {
      logger.error('Failed to create Stripe customer:', error);
      throw new BadRequestError('Failed to create billing account');
    }
  }

  /**
   * Create checkout session for subscription upgrade
   */
  async createCheckoutSession(
    tenantId: string,
    tier: SubscriptionTier,
    email: string,
    name: string
  ): Promise<{ sessionId: string; url: string }> {
    if (tier === SubscriptionTier.FREE) {
      throw new BadRequestError('Cannot checkout for free tier');
    }

    const priceId = getPriceId(tier);
    if (!priceId) {
      throw new BadRequestError(`Price not configured for tier: ${tier}`);
    }

    const customerId = await this.getOrCreateCustomer(tenantId, email, name);

    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${config.frontendUrl}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.frontendUrl}/settings/billing?canceled=true`,
        metadata: {
          tenantId,
          tier,
        },
        subscription_data: {
          metadata: {
            tenantId,
            tier,
          },
        },
      });

      logger.info(`Checkout session created for tenant ${tenantId}`, {
        sessionId: session.id,
        tier,
      });

      return {
        sessionId: session.id,
        url: session.url || '',
      };
    } catch (error) {
      logger.error('Failed to create checkout session:', error);
      throw new BadRequestError('Failed to create checkout session');
    }
  }

  /**
   * Create billing portal session for subscription management
   */
  async createPortalSession(tenantId: string): Promise<{ url: string }> {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    if (!tenant.stripeCustomerId) {
      throw new BadRequestError('No billing account found');
    }

    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: tenant.stripeCustomerId,
        return_url: `${config.frontendUrl}/settings/billing`,
      });

      return { url: session.url };
    } catch (error) {
      logger.error('Failed to create portal session:', error);
      throw new BadRequestError('Failed to access billing portal');
    }
  }

  /**
   * Get subscription details for a tenant
   */
  async getSubscriptionDetails(tenantId: string): Promise<{
    tier: SubscriptionTier;
    status: string;
    limits: TierLimits;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  }> {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    const tier = (tenant.subscriptionTier as SubscriptionTier) || SubscriptionTier.FREE;
    const limits = getTierLimits(tier);

    let currentPeriodEnd: Date | undefined;
    let cancelAtPeriodEnd: boolean | undefined;

    // Fetch subscription details from Stripe if available
    if (tenant.stripeSubscriptionId) {
      try {
        const subscription = await this.stripe.subscriptions.retrieve(
          tenant.stripeSubscriptionId,
          { expand: ['items.data'] }
        ) as Stripe.Subscription;
        // In newer Stripe API, current_period_end is on subscription items
        const firstItem = subscription.items?.data?.[0];
        if (firstItem?.current_period_end) {
          currentPeriodEnd = new Date(firstItem.current_period_end * 1000);
        }
        cancelAtPeriodEnd = subscription.cancel_at_period_end;
      } catch (error) {
        logger.warn('Failed to fetch subscription details:', error);
      }
    }

    return {
      tier,
      status: tenant.subscriptionStatus || 'active',
      limits,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    };
  }

  /**
   * Handle successful checkout - update tenant subscription
   */
  async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const tenantId = session.metadata?.tenantId;
    const tier = session.metadata?.tier as SubscriptionTier;

    if (!tenantId) {
      logger.error('Checkout session missing tenantId metadata');
      return;
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      logger.error(`Tenant not found for checkout: ${tenantId}`);
      return;
    }

    // Get subscription ID from session
    const subscriptionId = session.subscription as string;

    tenant.stripeSubscriptionId = subscriptionId;
    tenant.subscriptionTier = tier || 'starter';
    tenant.subscriptionStatus = 'active';
    await tenant.save();

    logger.info(`Subscription activated for tenant ${tenantId}`, {
      tier,
      subscriptionId,
    });
  }

  /**
   * Handle subscription updated
   */
  async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const tenantId = subscription.metadata?.tenantId;

    if (!tenantId) {
      // Try to find tenant by subscription ID
      const tenant = await Tenant.findOne({ stripeSubscriptionId: subscription.id });
      if (!tenant) {
        logger.warn('Tenant not found for subscription update:', subscription.id);
        return;
      }
      await this.updateTenantFromSubscription(tenant._id.toString(), subscription);
    } else {
      await this.updateTenantFromSubscription(tenantId, subscription);
    }
  }

  /**
   * Handle subscription deleted/canceled
   */
  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const tenant = await Tenant.findOne({ stripeSubscriptionId: subscription.id });

    if (!tenant) {
      logger.warn('Tenant not found for subscription deletion:', subscription.id);
      return;
    }

    // Downgrade to free tier
    tenant.subscriptionTier = 'free';
    tenant.subscriptionStatus = 'canceled';
    tenant.stripeSubscriptionId = undefined;
    await tenant.save();

    logger.info(`Subscription canceled for tenant ${tenant._id}`, {
      previousTier: subscription.metadata?.tier,
    });
  }

  /**
   * Update tenant from subscription object
   */
  private async updateTenantFromSubscription(
    tenantId: string,
    subscription: Stripe.Subscription
  ): Promise<void> {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return;
    }

    // Map Stripe status to our status
    const statusMap: Record<string, string> = {
      active: 'active',
      past_due: 'past_due',
      canceled: 'canceled',
      incomplete: 'incomplete',
      incomplete_expired: 'canceled',
      trialing: 'trialing',
      unpaid: 'past_due',
    };

    tenant.subscriptionStatus = (statusMap[subscription.status] || 'active') as any;
    tenant.subscriptionTier = (subscription.metadata?.tier as any) || tenant.subscriptionTier;
    await tenant.save();

    logger.info(`Subscription updated for tenant ${tenantId}`, {
      status: subscription.status,
      tier: subscription.metadata?.tier,
    });
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(tenantId: string): Promise<void> {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    if (!tenant.stripeSubscriptionId) {
      throw new BadRequestError('No active subscription');
    }

    try {
      await this.stripe.subscriptions.update(tenant.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      logger.info(`Subscription scheduled for cancellation: ${tenantId}`);
    } catch (error) {
      logger.error('Failed to cancel subscription:', error);
      throw new BadRequestError('Failed to cancel subscription');
    }
  }

  /**
   * Resume subscription (undo cancel at period end)
   */
  async resumeSubscription(tenantId: string): Promise<void> {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    if (!tenant.stripeSubscriptionId) {
      throw new BadRequestError('No active subscription');
    }

    try {
      await this.stripe.subscriptions.update(tenant.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      logger.info(`Subscription resumed: ${tenantId}`);
    } catch (error) {
      logger.error('Failed to resume subscription:', error);
      throw new BadRequestError('Failed to resume subscription');
    }
  }
}

export const billingService = new BillingService();
export default billingService;
