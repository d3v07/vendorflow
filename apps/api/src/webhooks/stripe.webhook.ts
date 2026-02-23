import { Request, Response, Router } from 'express';
import Stripe from 'stripe';
import { getStripeClient } from '../config/stripe';
import config from '../config';
import { billingService } from '../services/billing.service';
import logger from '../utils/logger';

const router = Router();

/**
 * Stripe webhook endpoint
 * IMPORTANT: This route must use raw body parsing, not JSON
 */
router.post(
  '/',
  async (req: Request, res: Response): Promise<void> => {
    const stripe = getStripeClient();
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      logger.warn('Webhook received without signature');
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      // req.body should be raw buffer when using express.raw() middleware
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripe.webhookSecret
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`Webhook signature verification failed: ${message}`);
      res.status(400).json({ error: `Webhook Error: ${message}` });
      return;
    }

    logger.info(`Stripe webhook received: ${event.type}`, { eventId: event.id });

    try {
      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await billingService.handleCheckoutCompleted(session);
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await billingService.handleSubscriptionUpdated(subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await billingService.handleSubscriptionDeleted(subscription);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          logger.info('Payment succeeded', {
            invoiceId: invoice.id,
            customerId: invoice.customer,
            amount: invoice.amount_paid,
          });
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          logger.warn('Payment failed', {
            invoiceId: invoice.id,
            customerId: invoice.customer,
            attemptCount: invoice.attempt_count,
          });
          // Could send notification to tenant here
          break;
        }

        case 'customer.subscription.trial_will_end': {
          const subscription = event.data.object as Stripe.Subscription;
          logger.info('Trial ending soon', {
            subscriptionId: subscription.id,
            trialEnd: subscription.trial_end,
          });
          // Could send notification to tenant here
          break;
        }

        default:
          logger.debug(`Unhandled webhook event type: ${event.type}`);
      }

      // Return success response
      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Error processing webhook:', error);
      // Still return 200 to prevent Stripe from retrying
      // Log the error for manual investigation
      res.status(200).json({ received: true, error: 'Processing error logged' });
    }
  }
);

export default router;
