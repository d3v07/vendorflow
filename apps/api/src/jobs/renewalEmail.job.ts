import { ConsumeMessage } from 'amqplib';
import { getRabbitMQChannel, ROUTING_KEYS } from '../config/rabbitmq';
import { JobMessage, republishForRetry } from './publisher';
import { Contract } from '../models/Contract';
import { Vendor } from '../models/Vendor';
import { User } from '../models/User';
import logger from '../utils/logger';

/**
 * Renewal email job payload
 */
interface RenewalEmailPayload {
  contractId: string;
}

/**
 * Email sent record (for idempotency tracking)
 */
interface EmailRecord {
  contractId: string;
  sentAt: Date;
  recipients: string[];
}

// In-memory store for demo (use Redis in production)
const sentEmails = new Map<string, EmailRecord>();

/**
 * Process renewal email job
 */
export const processRenewalEmailJob = async (msg: ConsumeMessage | null): Promise<void> => {
  if (!msg) {
    return;
  }

  const channel = getRabbitMQChannel();
  if (!channel) {
    logger.error('Channel not available for processing');
    return;
  }

  let job: JobMessage<RenewalEmailPayload>;

  try {
    job = JSON.parse(msg.content.toString()) as JobMessage<RenewalEmailPayload>;
  } catch (parseError) {
    logger.error('Failed to parse job message:', parseError);
    channel.nack(msg, false, false);
    return;
  }

  const { id: jobId, payload, idempotencyKey, attempt, maxAttempts, tenantId } = job;
  const { contractId } = payload;

  logger.info(`Processing renewal email job`, {
    jobId,
    contractId,
    attempt,
    maxAttempts,
    tenantId,
  });

  try {
    // Check idempotency
    if (sentEmails.has(idempotencyKey)) {
      logger.info(`Job ${jobId} already processed (idempotent skip)`, {
        contractId,
        previouslySentAt: sentEmails.get(idempotencyKey)?.sentAt,
      });
      channel.ack(msg);
      return;
    }

    // Fetch contract
    const contract = await Contract.findOne({
      _id: contractId,
      tenantId,
    });

    if (!contract) {
      logger.error(`Contract not found: ${contractId}`);
      channel.ack(msg);
      return;
    }

    // Check if contract is actually expiring soon
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (contract.endDate > thirtyDaysFromNow || contract.endDate < now) {
      logger.info(`Contract ${contractId} not in renewal window, skipping email`, {
        endDate: contract.endDate,
        status: contract.status,
      });
      channel.ack(msg);
      return;
    }

    // Fetch vendor info
    const vendor = await Vendor.findById(contract.vendorId);

    // Fetch admin/manager users to notify
    const recipients = await User.find({
      tenantId,
      role: { $in: ['admin', 'manager'] },
      isActive: true,
    }).select('email name');

    if (recipients.length === 0) {
      logger.warn(`No recipients found for tenant ${tenantId}`);
      channel.ack(msg);
      return;
    }

    // Send email (mock implementation)
    await sendRenewalEmail(contract, vendor, recipients);

    // Record for idempotency
    sentEmails.set(idempotencyKey, {
      contractId,
      sentAt: new Date(),
      recipients: recipients.map((r) => r.email),
    });

    logger.info(`Renewal email sent successfully`, {
      jobId,
      contractId,
      recipientCount: recipients.length,
    });

    channel.ack(msg);
  } catch (error) {
    logger.error(`Renewal email job failed`, {
      jobId,
      contractId,
      attempt,
      error: error instanceof Error ? error.message : error,
    });

    // Retry logic
    if (attempt < maxAttempts) {
      logger.info(`Retrying job (attempt ${attempt + 1}/${maxAttempts})`, { jobId });

      try {
        channel.ack(msg);
        await republishForRetry(job, ROUTING_KEYS.RENEWAL_EMAIL);
      } catch (retryError) {
        logger.error(`Failed to republish job for retry:`, retryError);
        channel.nack(msg, false, false);
      }
    } else {
      logger.error(`Job ${jobId} exceeded max attempts, sending to DLQ`, {
        contractId,
        maxAttempts,
      });
      channel.nack(msg, false, false);
    }
  }
};

/**
 * Send renewal email (mock implementation)
 * In production, use SendGrid, AWS SES, or other email service
 */
async function sendRenewalEmail(
  contract: any,
  vendor: any,
  recipients: any[]
): Promise<void> {
  // Simulate email sending delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  const daysUntilExpiry = Math.ceil(
    (new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // In production, this would:
  // 1. Render email template with contract/vendor data
  // 2. Send via email service provider
  // 3. Track delivery status

  logger.info(`Mock email sent`, {
    subject: `Contract Renewal Reminder: ${contract.title}`,
    contractId: contract._id,
    vendorName: vendor?.companyName || 'Unknown',
    daysUntilExpiry,
    contractValue: contract.value,
    autoRenew: contract.autoRenew,
    recipients: recipients.map((r) => r.email),
  });
}

/**
 * Schedule renewal emails for all expiring contracts
 * Called by a cron job or scheduler
 */
export const scheduleRenewalEmails = async (tenantId: string): Promise<number> => {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  // Find contracts expiring within 30 days
  const expiringContracts = await Contract.find({
    tenantId,
    status: { $in: ['active', 'expiring_soon'] },
    endDate: { $gte: now, $lte: thirtyDaysFromNow },
  });

  const { publishRenewalEmailJob } = await import('./publisher');

  let scheduledCount = 0;
  for (const contract of expiringContracts) {
    try {
      // Use date-based idempotency key to allow daily reminders
      const today = new Date().toISOString().split('T')[0];
      const idempotencyKey = `renewal-${contract._id}-${today}`;

      await publishRenewalEmailJob(tenantId, contract._id.toString(), idempotencyKey);
      scheduledCount++;
    } catch (error) {
      logger.error(`Failed to schedule renewal email for contract ${contract._id}:`, error);
    }
  }

  logger.info(`Scheduled ${scheduledCount} renewal emails for tenant ${tenantId}`);
  return scheduledCount;
};

export default processRenewalEmailJob;
