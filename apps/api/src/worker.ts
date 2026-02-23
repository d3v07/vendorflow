import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRabbitMQ, disconnectRabbitMQ, QUEUES } from './config/rabbitmq';
import { contractsService } from './services/contracts.service';
import { invoicesService } from './services/invoices.service';
import { Tenant } from './models';
import { processInvoicePdfJob, processRenewalEmailJob, scheduleRenewalEmails } from './jobs';
import logger from './utils/logger';

/**
 * Background worker for:
 * - Processing RabbitMQ job queues (invoice PDF, renewal emails)
 * - Periodic tasks (update contract/invoice statuses)
 */

const PERIODIC_INTERVAL_MS = 60000; // Run periodic tasks every minute
const RENEWAL_CHECK_INTERVAL_MS = 3600000; // Check for renewals every hour

/**
 * Run periodic status update tasks
 */
async function runPeriodicTasks(): Promise<void> {
  try {
    logger.info('Running periodic status update tasks...');

    // Get all active tenants
    const tenants = await Tenant.find({ isActive: true });

    for (const tenant of tenants) {
      const tenantId = tenant._id.toString();

      // Update contract statuses
      const contractsUpdated = await contractsService.updateContractStatuses(tenantId);
      if (contractsUpdated > 0) {
        logger.info(`Updated ${contractsUpdated} contract statuses for tenant ${tenant.name}`);
      }

      // Update invoice statuses
      const invoicesUpdated = await invoicesService.updateInvoiceStatuses(tenantId);
      if (invoicesUpdated > 0) {
        logger.info(`Updated ${invoicesUpdated} invoice statuses for tenant ${tenant.name}`);
      }
    }

    logger.info('Periodic tasks completed');
  } catch (error) {
    logger.error('Error running periodic tasks:', error);
  }
}

/**
 * Schedule renewal email jobs for expiring contracts
 */
async function scheduleRenewalEmailJobs(): Promise<void> {
  try {
    logger.info('Checking for contracts needing renewal reminders...');

    const tenants = await Tenant.find({ isActive: true });

    for (const tenant of tenants) {
      const tenantId = tenant._id.toString();
      await scheduleRenewalEmails(tenantId);
    }
  } catch (error) {
    logger.error('Error scheduling renewal emails:', error);
  }
}

/**
 * Start RabbitMQ consumers
 */
async function startQueueConsumers(): Promise<void> {
  try {
    const channel = await connectRabbitMQ();

    // Start consuming invoice PDF jobs
    await channel.consume(QUEUES.INVOICE_PDF, processInvoicePdfJob, {
      noAck: false, // Manual acknowledgment
    });
    logger.info(`Consuming from queue: ${QUEUES.INVOICE_PDF}`);

    // Start consuming renewal email jobs
    await channel.consume(QUEUES.RENEWAL_EMAIL, processRenewalEmailJob, {
      noAck: false,
    });
    logger.info(`Consuming from queue: ${QUEUES.RENEWAL_EMAIL}`);

    // Also consume from DLQ for monitoring (just log, don't process)
    await channel.consume(
      QUEUES.DEAD_LETTER,
      (msg) => {
        if (msg) {
          const content = JSON.parse(msg.content.toString());
          logger.error('Job moved to DLQ:', {
            jobId: content.id,
            type: content.type,
            attempt: content.attempt,
            maxAttempts: content.maxAttempts,
          });
          channel.ack(msg);
        }
      },
      { noAck: false }
    );
    logger.info(`Monitoring dead letter queue: ${QUEUES.DEAD_LETTER}`);

  } catch (error) {
    logger.error('Failed to start queue consumers:', error);
    throw error;
  }
}

/**
 * Main worker entry point
 */
async function startWorker(): Promise<void> {
  try {
    logger.info('========================================');
    logger.info('Starting VendorFlow Background Worker');
    logger.info('========================================');

    // Connect to database
    await connectDatabase();
    logger.info('Database connected');

    // Start RabbitMQ consumers
    await startQueueConsumers();
    logger.info('RabbitMQ consumers started');

    // Run periodic tasks immediately
    await runPeriodicTasks();

    // Schedule renewal email check
    await scheduleRenewalEmailJobs();

    // Schedule periodic execution
    const periodicIntervalId = setInterval(runPeriodicTasks, PERIODIC_INTERVAL_MS);
    const renewalIntervalId = setInterval(scheduleRenewalEmailJobs, RENEWAL_CHECK_INTERVAL_MS);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down worker...`);

      clearInterval(periodicIntervalId);
      clearInterval(renewalIntervalId);

      await disconnectRabbitMQ();
      await disconnectDatabase();

      logger.info('Worker shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', { promise, reason });
    });

    logger.info('========================================');
    logger.info('Worker ready and processing jobs');
    logger.info(`Periodic tasks: every ${PERIODIC_INTERVAL_MS / 1000}s`);
    logger.info(`Renewal checks: every ${RENEWAL_CHECK_INTERVAL_MS / 1000}s`);
    logger.info('========================================');

  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
}

startWorker();
