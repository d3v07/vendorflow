import amqp, { Channel, ConfirmChannel } from 'amqplib';
import config from './index';
import logger from '../utils/logger';

// Use the actual type from amqplib
type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

let connection: AmqpConnection | null = null;
let channel: ConfirmChannel | null = null;

// Exchange names
export const EXCHANGES = {
  MAIN: 'vendorflow.main',
  DLX: 'vendorflow.dlx',
};

// Queue names
export const QUEUES = {
  INVOICE_PDF: 'invoice_pdf_generation',
  RENEWAL_EMAIL: 'renewal_email',
  DEAD_LETTER: 'dead_letter_queue',
};

// Routing keys
export const ROUTING_KEYS = {
  INVOICE_PDF: 'job.invoice.pdf',
  RENEWAL_EMAIL: 'job.renewal.email',
  DEAD_LETTER: 'dead',
};

/**
 * Connect to RabbitMQ and setup exchanges/queues
 */
export const connectRabbitMQ = async (): Promise<ConfirmChannel> => {
  if (channel) {
    return channel;
  }

  try {
    // Create connection
    connection = await amqp.connect(config.rabbitmq.url);
    logger.info('RabbitMQ connected successfully');

    // Handle connection errors
    connection.on('error', (error: Error) => {
      logger.error('RabbitMQ connection error:', error);
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      channel = null;
      connection = null;
    });

    // Create confirm channel for publisher confirms
    channel = await connection.createConfirmChannel();
    logger.info('RabbitMQ channel created');

    // Set prefetch for fair dispatch
    await channel.prefetch(1);

    // Setup exchanges and queues
    await setupExchangesAndQueues(channel);

    return channel;
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
};

/**
 * Setup exchanges and queues with dead letter configuration
 */
const setupExchangesAndQueues = async (ch: Channel): Promise<void> => {
  // Assert Dead Letter Exchange (DLX)
  await ch.assertExchange(EXCHANGES.DLX, 'direct', {
    durable: true,
  });
  logger.info(`Exchange '${EXCHANGES.DLX}' asserted`);

  // Assert Dead Letter Queue
  await ch.assertQueue(QUEUES.DEAD_LETTER, {
    durable: true,
  });
  await ch.bindQueue(QUEUES.DEAD_LETTER, EXCHANGES.DLX, ROUTING_KEYS.DEAD_LETTER);
  logger.info(`Queue '${QUEUES.DEAD_LETTER}' asserted and bound to DLX`);

  // Assert Main Exchange
  await ch.assertExchange(EXCHANGES.MAIN, 'direct', {
    durable: true,
  });
  logger.info(`Exchange '${EXCHANGES.MAIN}' asserted`);

  // Assert Invoice PDF Queue with DLX
  await ch.assertQueue(QUEUES.INVOICE_PDF, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': EXCHANGES.DLX,
      'x-dead-letter-routing-key': ROUTING_KEYS.DEAD_LETTER,
    },
  });
  await ch.bindQueue(QUEUES.INVOICE_PDF, EXCHANGES.MAIN, ROUTING_KEYS.INVOICE_PDF);
  logger.info(`Queue '${QUEUES.INVOICE_PDF}' asserted with DLX`);

  // Assert Renewal Email Queue with DLX
  await ch.assertQueue(QUEUES.RENEWAL_EMAIL, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': EXCHANGES.DLX,
      'x-dead-letter-routing-key': ROUTING_KEYS.DEAD_LETTER,
    },
  });
  await ch.bindQueue(QUEUES.RENEWAL_EMAIL, EXCHANGES.MAIN, ROUTING_KEYS.RENEWAL_EMAIL);
  logger.info(`Queue '${QUEUES.RENEWAL_EMAIL}' asserted with DLX`);
};

/**
 * Get the current RabbitMQ channel
 */
export const getRabbitMQChannel = (): ConfirmChannel | null => {
  return channel;
};

/**
 * Disconnect from RabbitMQ
 */
export const disconnectRabbitMQ = async (): Promise<void> => {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger.info('RabbitMQ disconnected');
  } catch (error) {
    logger.error('Error disconnecting from RabbitMQ:', error);
  }
};

export default {
  connectRabbitMQ,
  getRabbitMQChannel,
  disconnectRabbitMQ,
  EXCHANGES,
  QUEUES,
  ROUTING_KEYS,
};
