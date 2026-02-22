import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { CACHE_TTL, CACHE_KEYS } from '../services/cache.service';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Returns KPI metrics including vendor count, active contracts, unpaid invoices, and monthly spend. Cached for 60 seconds.
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         headers:
 *           X-Cache:
 *             description: Cache status (HIT or MISS)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DashboardStats'
 *                 _cached:
 *                   type: boolean
 *                   description: Whether the response was served from cache
 */
router.get(
  '/stats',
  cacheMiddleware(CACHE_KEYS.DASHBOARD_STATS, CACHE_TTL.DASHBOARD_STATS),
  dashboardController.getStats
);

/**
 * @swagger
 * /api/dashboard/spend-by-category:
 *   get:
 *     summary: Get spend breakdown by vendor category
 *     description: Returns spending aggregated by vendor category. Cached for 5 minutes.
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Spend by category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                         example: Technology
 *                       amount:
 *                         type: number
 *                         example: 50000
 *                       percentage:
 *                         type: number
 *                         example: 35.5
 */
router.get(
  '/spend-by-category',
  cacheMiddleware(CACHE_KEYS.DASHBOARD_SPEND_CATEGORY, CACHE_TTL.DASHBOARD_SPEND_CATEGORY),
  dashboardController.getSpendByCategory
);

/**
 * @swagger
 * /api/dashboard/monthly-spend:
 *   get:
 *     summary: Get monthly spend trend
 *     description: Returns spending data for the last 6 months. Cached for 5 minutes.
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Monthly spend data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: string
 *                         example: "2024-01"
 *                       amount:
 *                         type: number
 *                         example: 45000
 *                       invoiceCount:
 *                         type: integer
 *                         example: 12
 */
router.get(
  '/monthly-spend',
  cacheMiddleware(CACHE_KEYS.DASHBOARD_MONTHLY_SPEND, CACHE_TTL.DASHBOARD_MONTHLY_SPEND),
  dashboardController.getMonthlySpend
);

/**
 * @swagger
 * /api/dashboard/upcoming-renewals:
 *   get:
 *     summary: Get upcoming contract renewals
 *     description: Returns contracts expiring within 60 days. Cached for 2 minutes.
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Upcoming renewals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contract'
 */
router.get(
  '/upcoming-renewals',
  cacheMiddleware(CACHE_KEYS.DASHBOARD_RENEWALS, CACHE_TTL.DASHBOARD_RENEWALS),
  dashboardController.getUpcomingRenewals
);

/**
 * @swagger
 * /api/dashboard/unpaid-invoices:
 *   get:
 *     summary: Get unpaid invoices
 *     description: Returns pending and overdue invoices sorted by due date. Cached for 1 minute.
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Unpaid invoices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Invoice'
 */
router.get(
  '/unpaid-invoices',
  cacheMiddleware(CACHE_KEYS.DASHBOARD_UNPAID, CACHE_TTL.DASHBOARD_UNPAID),
  dashboardController.getUnpaidInvoices
);

export default router;
