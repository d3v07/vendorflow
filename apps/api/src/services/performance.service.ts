import { Vendor } from '../models/Vendor';
import { Contract } from '../models/Contract';
import { Invoice } from '../models/Invoice';

export interface VendorScorecard {
  vendorId: string;
  tenantId: string;
  overallScore: number;       // 0-100
  deliveryScore: number;      // on-time contract deliverables
  paymentScore: number;       // invoice settlement rate
  responseScore: number;      // average response time indicator
  complianceScore: number;    // active vs expired contracts ratio
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  computedAt: Date;
}

function gradeFromScore(score: number): VendorScorecard['grade'] {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

export class PerformanceService {
  async scoreVendor(vendorId: string, tenantId: string): Promise<VendorScorecard> {
    const [contracts, invoices] = await Promise.all([
      Contract.findAll({ where: { vendorId, tenantId } }),
      Invoice.findAll({ where: { vendorId, tenantId } }),
    ]);

    const totalContracts = contracts.length;
    const activeContracts = contracts.filter(
      (c: any) => c.status === 'active' || c.status === 'signed'
    ).length;
    const expiredContracts = contracts.filter((c: any) => c.status === 'expired').length;

    // Compliance: ratio of non-expired contracts
    const complianceScore =
      totalContracts === 0
        ? 100
        : Math.round(((totalContracts - expiredContracts) / totalContracts) * 100);

    // Payment: paid invoices / total invoices
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((i: any) => i.status === 'paid').length;
    const paymentScore =
      totalInvoices === 0 ? 100 : Math.round((paidInvoices / totalInvoices) * 100);

    // Delivery: active / (active + expired) — rough proxy
    const deliveryScore =
      totalContracts === 0
        ? 100
        : Math.round((activeContracts / totalContracts) * 100);

    // Response: static 80 — would be populated from support ticket data
    const responseScore = 80;

    const overallScore = Math.round(
      complianceScore * 0.3 +
      paymentScore    * 0.35 +
      deliveryScore   * 0.25 +
      responseScore   * 0.1
    );

    return {
      vendorId,
      tenantId,
      overallScore,
      deliveryScore,
      paymentScore,
      responseScore,
      complianceScore,
      grade: gradeFromScore(overallScore),
      computedAt: new Date(),
    };
  }

  async scoreAllVendors(tenantId: string): Promise<VendorScorecard[]> {
    const vendors = await Vendor.findAll({ where: { tenantId } });
    return Promise.all(
      vendors.map((v: any) => this.scoreVendor(v.id, tenantId))
    );
  }
}

export const performanceService = new PerformanceService();
