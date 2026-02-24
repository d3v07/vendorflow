/**
 * Outbound webhook dispatcher for contract and vendor lifecycle events.
 *
 * Tenant admins can register HTTPS endpoint URLs that receive signed
 * POST payloads whenever key events occur (contract signed, expired, etc.).
 * Each delivery is retried up to MAX_ATTEMPTS times with exponential backoff.
 */

import crypto from 'crypto';

export type WebhookEvent =
  | 'contract.created'
  | 'contract.signed'
  | 'contract.expired'
  | 'contract.terminated'
  | 'contract.renewed'
  | 'vendor.created'
  | 'vendor.deactivated'
  | 'invoice.paid'
  | 'invoice.overdue';

export interface WebhookEndpoint {
  id: string;
  tenantId: string;
  url: string;
  secret: string;      // HMAC-SHA256 signing secret
  events: WebhookEvent[];
  active: boolean;
}

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  tenantId: string;
  data: Record<string, unknown>;
  sentAt: string;
}

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 500;

function sign(secret: string, body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

async function deliverOnce(
  endpoint: WebhookEndpoint,
  payload: WebhookPayload
): Promise<boolean> {
  const body = JSON.stringify(payload);
  const signature = sign(endpoint.secret, body);

  try {
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VendorFlow-Signature': signature,
        'X-VendorFlow-Event': payload.event,
        'X-VendorFlow-Delivery': payload.id,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export class OutboundWebhookService {
  private endpoints: WebhookEndpoint[] = [];

  register(endpoint: WebhookEndpoint): void {
    this.endpoints.push(endpoint);
  }

  remove(endpointId: string): void {
    this.endpoints = this.endpoints.filter((e) => e.id !== endpointId);
  }

  async dispatch(
    tenantId: string,
    event: WebhookEvent,
    data: Record<string, unknown>
  ): Promise<void> {
    const payload: WebhookPayload = {
      id: crypto.randomUUID(),
      event,
      tenantId,
      data,
      sentAt: new Date().toISOString(),
    };

    const targets = this.endpoints.filter(
      (e) => e.active && e.tenantId === tenantId && e.events.includes(event)
    );

    await Promise.allSettled(
      targets.map((endpoint) => this.deliverWithRetry(endpoint, payload))
    );
  }

  private async deliverWithRetry(
    endpoint: WebhookEndpoint,
    payload: WebhookPayload
  ): Promise<void> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const ok = await deliverOnce(endpoint, payload);
      if (ok) return;
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(BASE_DELAY_MS * 2 ** attempt);
      }
    }
    // Final failure — in production, persist to a DLQ for manual review
    console.error(`[webhook] failed to deliver ${payload.event} to ${endpoint.url}`);
  }
}

export const outboundWebhookService = new OutboundWebhookService();
