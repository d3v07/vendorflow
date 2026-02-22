import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await dashboardService.getStats(req.tenantId!);
  return sendSuccess(res, stats);
});

export const getSpendByCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getSpendByCategory(req.tenantId!);
  return sendSuccess(res, data);
});

export const getMonthlySpend = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getMonthlySpend(req.tenantId!);
  return sendSuccess(res, data);
});

export const getUpcomingRenewals = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 5;
  const data = await dashboardService.getUpcomingRenewals(req.tenantId!, limit);
  return sendSuccess(res, data);
});

export const getUnpaidInvoices = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 5;
  const data = await dashboardService.getUnpaidInvoices(req.tenantId!, limit);
  return sendSuccess(res, data);
});

export default {
  getStats,
  getSpendByCategory,
  getMonthlySpend,
  getUpcomingRenewals,
  getUnpaidInvoices,
};
