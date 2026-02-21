import Redis from 'ioredis';
import config from './index';
import logger from '../utils/logger';

let redisClient: Redis | null = null;

export const connectRedis = async (): Promise<Redis> => {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  redisClient.on('error', (error) => {
    logger.error('Redis connection error:', error);
  });

  redisClient.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redisClient.on('reconnecting', () => {
    logger.info('Redis reconnecting...');
  });

  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    // Don't throw - allow app to run without cache
  }

  return redisClient;
};

export const getRedisClient = (): Redis | null => {
  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected');
  }
};

export default {
  connectRedis,
  getRedisClient,
  disconnectRedis,
};
