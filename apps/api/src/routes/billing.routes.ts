import { Router } from 'express';
import billingController from '../controllers/billing.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

// All billing routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/billing
 * @desc    Get subscription details and usage
 * @access  Private (any role)
 */
router.get('/', billingController.getSubscription);

/**
 * @route   GET /api/billing/usage
 * @desc    Get usage summary only
 * @access  Private (any role)
 */
router.get('/usage', billingController.getUsage);

/**
 * @route   POST /api/billing/checkout
 * @desc    Create Stripe checkout session for subscription upgrade
 * @access  Private (admin only)
 * @body    { tier: 'starter' | 'pro' }
 */
router.post('/checkout', requireRole('admin'), billingController.createCheckout);

/**
 * @route   POST /api/billing/portal
 * @desc    Create Stripe billing portal session
 * @access  Private (admin only)
 */
router.post('/portal', requireRole('admin'), billingController.createPortal);

/**
 * @route   POST /api/billing/cancel
 * @desc    Cancel subscription at period end
 * @access  Private (admin only)
 */
router.post('/cancel', requireRole('admin'), billingController.cancelSubscription);

/**
 * @route   POST /api/billing/resume
 * @desc    Resume subscription (undo cancel at period end)
 * @access  Private (admin only)
 */
router.post('/resume', requireRole('admin'), billingController.resumeSubscription);

export default router;
