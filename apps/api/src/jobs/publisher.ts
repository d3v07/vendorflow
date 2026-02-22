import { v4 as uuidv4 } from 'uuid';
import { getRabbitMQChannel, EXCHANGES, ROUTING_KEYS } from '../config/rabbitmq';
import logger from '../utils/logger';

/**
 * Job message structure
 */
export interface JobMessage<T = unknown> {
  id: string;
  type: string;
  tenantId: string;
  payload: T;
  idempotencyKey: string;
  attempt: number;
  maxAttempts: number;
  createdAt: string;
  scheduledFor?: string;
}

/**
 * Job types
 */
export enum JobType {
  INVOICE_PDF = 'invoice_pdf_generation',
  RENEWAL_EMAIL = 'renewal_email',
}

/**
 * Publish options
 */
export interface PublishOptions {
  idempotencyKey?: string;
  maxAttempts?: number;
  delay?: number; // milliseconds
}

/**
 * Get routing key for job type
 */
const getRoutingKey = (jobType: JobType): string => {
  switch (jobType) {
    case JobType.INVOICE_PDF:
      return ROUTING_KEYS.INVOICE_PDF;
    case JobType.RENEWAL_EMAIL:
      return ROUTING_KEYS.RENEWAL_EMAIL;
    default:
      throw new Error(`Unknown job type: ${jobType}`);
  }
};

/**
 * Publish a job to the queue
 */
export const publishJob = async <T>(
  jobType: JobType,
  tenantId: string,
  payload: T,
  options: PublishOptions = {}
): Promise<string> => {
  const channel = getRabbitMQChannel();

  if (!channel) {
    logger.error('RabbitMQ channel not available');
    throw new Error('RabbitMQ channel not available');
  }

  const jobId = uuidv4();
  const idempotencyKey = options.idempotencyKey || jobId;
  const maxAttempts = options.maxAttempts || 3;

  const message: JobMessage<T> = {
    id: jobId,
    type: jobType,
    tenantId,
    payload,
    idempotencyKey,
    attempt: 1,
    maxAttempts,
    createdAt: new Date().toISOString(),
  };

  const routingKey = getRoutingKey(jobType);
  const messageBuffer = Buffer.from(JSON.stringify(message));

  return new Promise((resolve, reject) => {
    channel.publish(
      EXCHANGES.MAIN,
      routingKey,
      messageBuffer,
      {
        persistent: true,
        contentType: 'application/json',
        messageId: jobId,
        headers: {
          'x-idempotency-key': idempotencyKey,
          'x-tenant-id': tenantId,
        },
      },
      (error) => {
        if (error) {
          logger.error(`Failed to publish job ${jobId}:`, error);
          reject(error);
        } else {
          logger.info(`Job published: ${jobType}`, {
            jobId,
            tenantId,
            idempotencyKey,
          });
          resolve(jobId);
        }
      }
    );
  });
};

/**
 * Republish a job for retry with incremented attempt
 */
export const republishForRetry = async <T>(
  originalMessage: JobMessage<T>,
  routingKey: string
): Promise<void> => {
  const channel = getRabbitMQChannel();

  if (!channel) {
    throw new Error('RabbitMQ channel not available');
  }

  const retryMessage: JobMessage<T> = {
    ...originalMessage,
    attempt: originalMessage.attempt + 1,
  };

  const messageBuffer = Buffer.from(JSON.stringify(retryMessage));

  return new Promise((resolve, reject) => {
    channel.publish(
      EXCHANGES.MAIN,
      routingKey,
      messageBuffer,
      {
        persistent: true,
        contentType: 'application/json',
        messageId: originalMessage.id,
        headers: {
          'x-idempotency-key': originalMessage.idempotencyKey,
          'x-tenant-id': originalMessage.tenantId,
          'x-retry-attempt': retryMessage.attempt,
        },
      },
      (error) => {
        if (error) {
          logger.error(`Failed to republish job for retry:`, error);
          reject(error);
        } else {
          logger.info(`Job republished for retry (attempt ${retryMessage.attempt}):`, {
            jobId: originalMessage.id,
            type: originalMessage.type,
          });
          resolve();
        }
      }
    );
  });
};

/**
 * Convenience function to publish invoice PDF generation job
 */
export const publishInvoicePdfJob = async (
  tenantId: string,
  invoiceId: string,
  idempotencyKey?: string
): Promise<string> => {
  return publishJob(
    JobType.INVOICE_PDF,
    tenantId,
    { invoiceId },
    { idempotencyKey: idempotencyKey || `invoice-pdf-${invoiceId}` }
  );
};

/**
 * Convenience function to publish renewal email job
 */
export const publishRenewalEmailJob = async (
  tenantId: string,
  contractId: string,
  idempotencyKey?: string
): Promise<string> => {
  return publishJob(
    JobType.RENEWAL_EMAIL,
    tenantId,
    { contractId },
    { idempotencyKey: idempotencyKey || `renewal-email-${contractId}` }
  );
};

export default {
  publishJob,
  republishForRetry,
  publishInvoicePdfJob,
  publishRenewalEmailJob,
  JobType,
};
