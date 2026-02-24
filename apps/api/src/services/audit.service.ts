/**
 * Lightweight contract-event audit log.
 *
 * Writes a structured JSON entry to a rotating log file whenever a contract
 * transitions between states. In production this would forward events to a
 * CloudWatch log group or a dedicated audit database table.
 */

import fs from 'fs';
import path from 'path';

export type ContractEvent =
  | 'created'
  | 'sent_for_signature'
  | 'signed'
  | 'activated'
  | 'amended'
  | 'expired'
  | 'terminated'
  | 'renewed';

export interface AuditEntry {
  eventId:    string;
  event:      ContractEvent;
  contractId: string;
  vendorId:   string;
  tenantId:   string;
  actorId:    string;         // user who triggered the event
  actorEmail: string;
  previousStatus?: string;
  newStatus?: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;         // ISO-8601
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export class AuditService {
  private readonly logDir: string;

  constructor(logDir = process.env.AUDIT_LOG_DIR ?? '/tmp/vendorflow-audit') {
    this.logDir = logDir;
    fs.mkdirSync(this.logDir, { recursive: true });
  }

  record(entry: Omit<AuditEntry, 'eventId' | 'occurredAt'>): AuditEntry {
    const full: AuditEntry = {
      ...entry,
      eventId: randomId(),
      occurredAt: new Date().toISOString(),
    };

    const filename = `audit-${new Date().toISOString().slice(0, 10)}.jsonl`;
    const filepath = path.join(this.logDir, filename);
    fs.appendFileSync(filepath, JSON.stringify(full) + '\n', 'utf8');

    return full;
  }

  readDay(date: string): AuditEntry[] {
    const filepath = path.join(this.logDir, `audit-${date}.jsonl`);
    if (!fs.existsSync(filepath)) return [];
    return fs
      .readFileSync(filepath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditEntry);
  }
}

export const auditService = new AuditService();
