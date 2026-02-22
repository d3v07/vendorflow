import mongoose from 'mongoose';
import { Vendor, Contract, Invoice } from '../models';
import { DashboardStats, SpendByCategory, MonthlySpend, VendorCategory } from '../types';

export class DashboardService {
  /**
   * Get dashboard statistics
   */
  async getStats(tenantId: string): Promise<DashboardStats> {
    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Run all queries in parallel
    const [
      totalVendors,
      lastMonthVendors,
      activeContracts,
      lastMonthActiveContracts,
      unpaidInvoices,
      lastMonthUnpaidInvoices,
      thisMonthSpend,
      lastMonthSpend,
    ] = await Promise.all([
      // Total active vendors
      Vendor.countDocuments({
        tenantId: tenantObjectId,
        status: 'active',
      }),

      // Last month active vendors (for trend)
      Vendor.countDocuments({
        tenantId: tenantObjectId,
        status: 'active',
        createdAt: { $lt: thisMonth },
      }),

      // Active contracts (active + expiring_soon)
      Contract.countDocuments({
        tenantId: tenantObjectId,
        status: { $in: ['active', 'expiring_soon'] },
      }),

      // Last month active contracts
      Contract.countDocuments({
        tenantId: tenantObjectId,
        status: { $in: ['active', 'expiring_soon'] },
        createdAt: { $lt: thisMonth },
      }),

      // Unpaid invoices (pending + overdue)
      Invoice.countDocuments({
        tenantId: tenantObjectId,
        status: { $in: ['pending', 'overdue'] },
      }),

      // Last month unpaid invoices
      Invoice.countDocuments({
        tenantId: tenantObjectId,
        status: { $in: ['pending', 'overdue'] },
        createdAt: { $lt: thisMonth },
      }),

      // This month's paid invoices
      Invoice.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            status: 'paid',
            paidDate: { $gte: thisMonth },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),

      // Last month's paid invoices
      Invoice.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            status: 'paid',
            paidDate: { $gte: lastMonth, $lte: lastMonthEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const currentMonthlySpend = thisMonthSpend[0]?.total || 0;
    const previousMonthlySpend = lastMonthSpend[0]?.total || 0;

    // Calculate trends (percentage change)
    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      totalVendors,
      activeContracts,
      unpaidInvoices,
      monthlySpend: currentMonthlySpend,
      vendorsTrend: calculateTrend(totalVendors, lastMonthVendors),
      contractsTrend: calculateTrend(activeContracts, lastMonthActiveContracts),
      invoicesTrend: calculateTrend(unpaidInvoices, lastMonthUnpaidInvoices),
      spendTrend: calculateTrend(currentMonthlySpend, previousMonthlySpend),
    };
  }

  /**
   * Get spend by vendor category
   */
  async getSpendByCategory(tenantId: string): Promise<SpendByCategory[]> {
    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

    const result = await Invoice.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
          status: 'paid',
        },
      },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      { $unwind: '$vendor' },
      {
        $group: {
          _id: '$vendor.category',
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    const total = result.reduce((sum, item) => sum + item.amount, 0);

    return result.map((item) => ({
      category: item._id as VendorCategory,
      amount: item.amount,
      percentage: total > 0 ? Math.round((item.amount / total) * 100) : 0,
    }));
  }

  /**
   * Get monthly spend for the last 6 months
   */
  async getMonthlySpend(tenantId: string): Promise<MonthlySpend[]> {
    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const result = await Invoice.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
          status: 'paid',
          paidDate: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$paidDate' },
            month: { $month: '$paidDate' },
          },
          amount: { $sum: '$amount' },
          invoiceCount: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    // Generate all 6 months (including months with no data)
    const months: MonthlySpend[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthData = result.find(
        (r) => r._id.year === date.getFullYear() && r._id.month === date.getMonth() + 1
      );

      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        amount: monthData?.amount || 0,
        invoiceCount: monthData?.invoiceCount || 0,
      });
    }

    return months;
  }

  /**
   * Get upcoming contract renewals (within 60 days)
   */
  async getUpcomingRenewals(tenantId: string, limit: number = 5) {
    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
    const now = new Date();
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    const contracts = await Contract.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
          status: { $in: ['active', 'expiring_soon'] },
          endDate: { $gte: now, $lte: sixtyDaysFromNow },
        },
      },
      { $sort: { endDate: 1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
    ]);

    return contracts.map((c) => ({
      id: c._id.toString(),
      vendorId: c.vendorId.toString(),
      vendorName: c.vendor?.companyName || 'Unknown',
      title: c.title,
      endDate: c.endDate,
      value: c.value,
      autoRenew: c.autoRenew,
      daysUntilExpiry: Math.ceil((c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }));
  }

  /**
   * Get top unpaid invoices
   */
  async getUnpaidInvoices(tenantId: string, limit: number = 5) {
    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

    const invoices = await Invoice.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
          status: { $in: ['pending', 'overdue'] },
        },
      },
      { $sort: { dueDate: 1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
    ]);

    const now = new Date();

    return invoices.map((i) => ({
      id: i._id.toString(),
      invoiceNumber: i.invoiceNumber,
      vendorId: i.vendorId.toString(),
      vendorName: i.vendor?.companyName || 'Unknown',
      amount: i.amount,
      dueDate: i.dueDate,
      status: i.status,
      daysOverdue: i.status === 'overdue'
        ? Math.ceil((now.getTime() - i.dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    }));
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
