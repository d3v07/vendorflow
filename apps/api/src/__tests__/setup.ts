import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Create in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect mongoose to in-memory database
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Disconnect and stop MongoDB server
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Mock Redis for tests
jest.mock('../config/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    quit: jest.fn().mockResolvedValue('OK'),
  }),
  getRedisClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
  }),
  disconnectRedis: jest.fn().mockResolvedValue(undefined),
}));

// Mock RabbitMQ for tests
jest.mock('../config/rabbitmq', () => ({
  connectRabbitMQ: jest.fn().mockResolvedValue({
    publish: jest.fn(),
    consume: jest.fn(),
    ack: jest.fn(),
    nack: jest.fn(),
  }),
  getRabbitMQChannel: jest.fn().mockReturnValue(null),
  disconnectRabbitMQ: jest.fn().mockResolvedValue(undefined),
  EXCHANGES: { MAIN: 'vendorflow.main', DLX: 'vendorflow.dlx' },
  QUEUES: { INVOICE_PDF: 'invoice_pdf', RENEWAL_EMAIL: 'renewal_email', DEAD_LETTER: 'dead_letter' },
  ROUTING_KEYS: { INVOICE_PDF: 'job.invoice.pdf', RENEWAL_EMAIL: 'job.renewal.email' },
}));

// Mock job publisher
jest.mock('../jobs/publisher', () => ({
  publishInvoicePdfJob: jest.fn().mockResolvedValue('mock-job-id'),
  publishRenewalEmailJob: jest.fn().mockResolvedValue('mock-job-id'),
  publishJob: jest.fn().mockResolvedValue('mock-job-id'),
  republishForRetry: jest.fn().mockResolvedValue(undefined),
  JobType: { INVOICE_PDF: 'invoice_pdf', RENEWAL_EMAIL: 'renewal_email' },
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes';
