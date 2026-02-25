/**
 * Contract renewal reminder service for VendorFlow.
 *
 * Scans contracts approaching their end date and builds a list of
 * renewal tasks. Designed to run as a nightly scheduled job.
 * Actual notification dispatch is handled by the outbound webhook service.
 */

export interface ContractSummary {
  id:         string;
  vendorId:   string;
  tenantId:   string;
  vendorName: string;
  title:      string;
  endDate:    string;     // ISO date
  value:      number;
  currency:   string;
  ownerId?:   string;
}

export interface RenewalTask {
  contract:           ContractSummary;
  daysUntilExpiry:    number;
  urgency:            'low' | 'medium' | 'high' | 'critical';
  suggestedAction:    string;
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyFromDays(days: number): RenewalTask['urgency'] {
  if (days <= 7)  return 'critical';
  if (days <= 30) return 'high';
  if (days <= 60) return 'medium';
  return 'low';
}

function actionFromDays(days: number): string {
  if (days <= 7)  return 'Immediate renewal required — contract expires in less than one week';
  if (days <= 30) return 'Schedule renewal discussion with vendor this week';
  if (days <= 60) return 'Begin internal review process for renewal or replacement';
  return 'Add to upcoming quarter planning agenda';
}

/**
 * Given a list of active contracts, return renewal tasks for those
 * expiring within the lookahead window (default 90 days).
 */
export function buildRenewalTasks(
  contracts: ContractSummary[],
  lookaheadDays = 90,
  asOf = new Date()
): RenewalTask[] {
  const tasks: RenewalTask[] = [];

  for (const contract of contracts) {
    const endDate = new Date(contract.endDate);
    const days    = daysBetween(asOf, endDate);

    if (days < 0 || days > lookaheadDays) continue;

    tasks.push({
      contract,
      daysUntilExpiry: days,
      urgency:         urgencyFromDays(days),
      suggestedAction: actionFromDays(days),
    });
  }

  // Sort by urgency (soonest first)
  return tasks.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

/**
 * Group renewal tasks by urgency level for dashboard display.
 */
export function groupByUrgency(
  tasks: RenewalTask[]
): Record<RenewalTask['urgency'], RenewalTask[]> {
  const groups: Record<RenewalTask['urgency'], RenewalTask[]> = {
    critical: [],
    high:     [],
    medium:   [],
    low:      [],
  };
  for (const task of tasks) {
    groups[task.urgency].push(task);
  }
  return groups;
}
