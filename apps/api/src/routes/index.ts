import { Router } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import vendorsRoutes from './vendors.routes';
import contractsRoutes from './contracts.routes';
import invoicesRoutes from './invoices.routes';
import dashboardRoutes from './dashboard.routes';
import settingsRoutes from './settings.routes';
import billingRoutes from './billing.routes';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/vendors', vendorsRoutes);
router.use('/contracts', contractsRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/billing', billingRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

export default router;
