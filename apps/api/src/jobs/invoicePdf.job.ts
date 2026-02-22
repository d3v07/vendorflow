import { ConsumeMessage } from 'amqplib';
import { getRabbitMQChannel, ROUTING_KEYS } from '../config/rabbitmq';
import { JobMessage, republishForRetry } from './publisher';
import { Invoice } from '../models/Invoice';
import { Vendor } from '../models/Vendor';
import logger from '../utils/logger';

/**
 * Invoice PDF job payload
 */
interface InvoicePdfPayload {
  invoiceId: string;
}

/**
 * Process invoice PDF generation job
 */
export const processInvoicePdfJob = async (msg: ConsumeMessage | null): Promise<void> => {
  if (!msg) {
    return;
  }

  const channel = getRabbitMQChannel();
  if (!channel) {
    logger.error('Channel not available for processing');
    return;
  }

  let job: JobMessage<InvoicePdfPayload>;

  try {
    job = JSON.parse(msg.content.toString()) as JobMessage<InvoicePdfPayload>;
  } catch (parseError) {
    logger.error('Failed to parse job message:', parseError);
    // Reject without requeue - invalid message
    channel.nack(msg, false, false);
    return;
  }

  const { id: jobId, payload, idempotencyKey, attempt, maxAttempts, tenantId } = job;
  const { invoiceId } = payload;

  logger.info(`Processing invoice PDF job`, {
    jobId,
    invoiceId,
    attempt,
    maxAttempts,
    tenantId,
  });

  try {
    // Check idempotency - has this job already been processed?
    const existingInvoice = await Invoice.findOne({
      _id: invoiceId,
      tenantId,
      idempotencyKey,
      pdfUrl: { $exists: true, $ne: null },
    });

    if (existingInvoice) {
      logger.info(`Job ${jobId} already processed (idempotent skip)`, {
        invoiceId,
        pdfUrl: existingInvoice.pdfUrl,
      });
      channel.ack(msg);
      return;
    }

    // Fetch invoice with vendor info
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      tenantId,
    });

    if (!invoice) {
      logger.error(`Invoice not found: ${invoiceId}`);
      channel.ack(msg); // Don't retry - invoice doesn't exist
      return;
    }

    // Fetch vendor for PDF generation
    const vendor = await Vendor.findById(invoice.vendorId);

    // Generate PDF (mock implementation for demo)
    const pdfUrl = await generateInvoicePdf(invoice, vendor);

    // Update invoice with PDF URL and idempotency key
    await Invoice.findByIdAndUpdate(invoiceId, {
      pdfUrl,
      idempotencyKey,
    });

    logger.info(`Invoice PDF generated successfully`, {
      jobId,
      invoiceId,
      pdfUrl,
    });

    // Acknowledge successful processing
    channel.ack(msg);
  } catch (error) {
    logger.error(`Invoice PDF job failed`, {
      jobId,
      invoiceId,
      attempt,
      error: error instanceof Error ? error.message : error,
    });

    // Retry logic
    if (attempt < maxAttempts) {
      logger.info(`Retrying job (attempt ${attempt + 1}/${maxAttempts})`, { jobId });

      try {
        // Acknowledge original message
        channel.ack(msg);
        // Republish with incremented attempt
        await republishForRetry(job, ROUTING_KEYS.INVOICE_PDF);
      } catch (retryError) {
        logger.error(`Failed to republish job for retry:`, retryError);
        // If retry fails, nack to DLQ
        channel.nack(msg, false, false);
      }
    } else {
      logger.error(`Job ${jobId} exceeded max attempts, sending to DLQ`, {
        invoiceId,
        maxAttempts,
      });
      // Reject without requeue - will go to DLQ
      channel.nack(msg, false, false);
    }
  }
};

/**
 * Generate invoice PDF (mock implementation)
 * In production, use puppeteer, PDFKit, or external service
 */
async function generateInvoicePdf(
  invoice: any,
  vendor: any
): Promise<string> {
  // Simulate PDF generation delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In production, this would:
  // 1. Generate HTML template with invoice data
  // 2. Convert to PDF using puppeteer or PDFKit
  // 3. Upload to S3 or cloud storage
  // 4. Return the URL

  const timestamp = Date.now();
  const pdfUrl = `https://storage.vendorflow.dev/invoices/${invoice._id}_${timestamp}.pdf`;

  logger.info(`Mock PDF generated`, {
    invoiceId: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    vendorName: vendor?.companyName || 'Unknown',
    amount: invoice.amount,
    pdfUrl,
  });

  return pdfUrl;
}

export default processInvoicePdfJob;
