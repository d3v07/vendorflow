import { describe, test, expect, vi, beforeEach } from 'vitest';
import { PerformanceService } from '../../services/performance.service';

// Mock Sequelize models
vi.mock('../../models/Vendor', () => ({
  Vendor: { findAll: vi.fn() },
}));
vi.mock('../../models/Contract', () => ({
  Contract: { findAll: vi.fn() },
}));
vi.mock('../../models/Invoice', () => ({
  Invoice: { findAll: vi.fn() },
}));

import { Vendor } from '../../models/Vendor';
import { Contract } from '../../models/Contract';
import { Invoice } from '../../models/Invoice';

describe('PerformanceService', () => {
  const service = new PerformanceService();

  beforeEach(() => vi.clearAllMocks());

  test('returns grade A for perfect vendor', async () => {
    vi.mocked(Contract.findAll).mockResolvedValue([
      { status: 'active' }, { status: 'signed' },
    ] as any);
    vi.mocked(Invoice.findAll).mockResolvedValue([
      { status: 'paid' }, { status: 'paid' },
    ] as any);

    const score = await service.scoreVendor('v1', 'tenant1');
    expect(score.overallScore).toBeGreaterThanOrEqual(90);
    expect(score.grade).toBe('A');
  });

  test('returns grade F for vendor with all expired contracts and overdue invoices', async () => {
    vi.mocked(Contract.findAll).mockResolvedValue([
      { status: 'expired' }, { status: 'expired' },
    ] as any);
    vi.mocked(Invoice.findAll).mockResolvedValue([
      { status: 'overdue' }, { status: 'overdue' }, { status: 'overdue' },
    ] as any);

    const score = await service.scoreVendor('v2', 'tenant1');
    expect(score.grade).toBe('F');
  });

  test('returns 100 compliance score with no contracts', async () => {
    vi.mocked(Contract.findAll).mockResolvedValue([] as any);
    vi.mocked(Invoice.findAll).mockResolvedValue([] as any);

    const score = await service.scoreVendor('v3', 'tenant1');
    expect(score.complianceScore).toBe(100);
    expect(score.paymentScore).toBe(100);
  });

  test('scorecard includes all required fields', async () => {
    vi.mocked(Contract.findAll).mockResolvedValue([] as any);
    vi.mocked(Invoice.findAll).mockResolvedValue([] as any);

    const score = await service.scoreVendor('v4', 'tenant1');
    expect(score).toMatchObject({
      vendorId: 'v4',
      tenantId: 'tenant1',
      overallScore: expect.any(Number),
      grade: expect.stringMatching(/^[A-F]$/),
      computedAt: expect.any(Date),
    });
  });
});
