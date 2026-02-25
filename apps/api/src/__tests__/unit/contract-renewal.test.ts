import { describe, test, expect } from 'vitest';
import { buildRenewalTasks, groupByUrgency } from '../../services/contract-renewal.service';

function makeContract(daysFromNow: number, id = 'c1') {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return {
    id,
    vendorId:   'v1',
    tenantId:   'tenant1',
    vendorName: 'Acme Corp',
    title:      'Service Agreement',
    endDate:    d.toISOString().slice(0, 10),
    value:      5000,
    currency:   'USD',
  };
}

describe('buildRenewalTasks', () => {
  test('returns empty array when no contracts', () => {
    expect(buildRenewalTasks([])).toHaveLength(0);
  });

  test('excludes contracts beyond lookahead window', () => {
    const tasks = buildRenewalTasks([makeContract(120)], 90);
    expect(tasks).toHaveLength(0);
  });

  test('excludes already-expired contracts', () => {
    const tasks = buildRenewalTasks([makeContract(-5)], 90);
    expect(tasks).toHaveLength(0);
  });

  test('assigns critical urgency to contracts expiring within 7 days', () => {
    const tasks = buildRenewalTasks([makeContract(3)], 90);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].urgency).toBe('critical');
  });

  test('assigns high urgency to contracts expiring within 30 days', () => {
    const tasks = buildRenewalTasks([makeContract(20)], 90);
    expect(tasks[0].urgency).toBe('high');
  });

  test('assigns medium urgency to contracts expiring within 60 days', () => {
    const tasks = buildRenewalTasks([makeContract(45)], 90);
    expect(tasks[0].urgency).toBe('medium');
  });

  test('assigns low urgency to contracts expiring within 61-90 days', () => {
    const tasks = buildRenewalTasks([makeContract(75)], 90);
    expect(tasks[0].urgency).toBe('low');
  });

  test('sorts tasks by days until expiry ascending', () => {
    const contracts = [makeContract(50, 'c2'), makeContract(5, 'c1'), makeContract(25, 'c3')];
    const tasks = buildRenewalTasks(contracts, 90);
    expect(tasks[0].contract.id).toBe('c1');
    expect(tasks[2].contract.id).toBe('c2');
  });
});

describe('groupByUrgency', () => {
  test('groups tasks into correct urgency buckets', () => {
    const tasks = buildRenewalTasks(
      [makeContract(3, 'c1'), makeContract(20, 'c2'), makeContract(45, 'c3'), makeContract(75, 'c4')],
      90
    );
    const grouped = groupByUrgency(tasks);
    expect(grouped.critical).toHaveLength(1);
    expect(grouped.high).toHaveLength(1);
    expect(grouped.medium).toHaveLength(1);
    expect(grouped.low).toHaveLength(1);
  });
});
