import { getRedisClient } from '../config/redis';
import logger from '../utils/logger';

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  DASHBOARD_STATS: 60,           // 1 minute
  DASHBOARD_SPEND_CATEGORY: 300, // 5 minutes
  DASHBOARD_MONTHLY_SPEND: 300,  // 5 minutes
  DASHBOARD_RENEWALS: 120,       // 2 minutes
  DASHBOARD_UNPAID: 60,          // 1 minute
  VENDOR_LIST: 120,              // 2 minutes
  DEFAULT: 300,                  // 5 minutes
};

// Cache key patterns
export const CACHE_KEYS = {
  DASHBOARD_STATS: 'dashboard:stats',
  DASHBOARD_SPEND_CATEGORY: 'dashboard:spend-by-category',
  DASHBOARD_MONTHLY_SPEND: 'dashboard:monthly-spend',
  DASHBOARD_RENEWALS: 'dashboard:upcoming-renewals',
  DASHBOARD_UNPAID: 'dashboard:unpaid-invoices',
  VENDOR_LIST: 'vendors:list',
};

export class CacheService {
  private keyPrefix: string;

  constructor(tenantId: string) {
    this.keyPrefix = `vendorflow:${tenantId}:`;
  }

  /**
   * Generate a tenant-scoped cache key
   */
  private key(name: string): string {
    return `${this.keyPrefix}${name}`;
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const redis = getRedisClient();
    if (!redis) {
      return null;
    }

    try {
      const data = await redis.get(this.key(key));
      if (data) {
        logger.debug(`Cache HIT: ${this.key(key)}`);
        return JSON.parse(data) as T;
      }
      logger.debug(`Cache MISS: ${this.key(key)}`);
      return null;
    } catch (error) {
      logger.error(`Cache GET error for ${this.key(key)}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set(key: string, value: unknown, ttlSeconds: number = CACHE_TTL.DEFAULT): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
      return false;
    }

    try {
      await redis.setex(this.key(key), ttlSeconds, JSON.stringify(value));
      logger.debug(`Cache SET: ${this.key(key)} (TTL: ${ttlSeconds}s)`);
      return true;
    } catch (error) {
      logger.error(`Cache SET error for ${this.key(key)}:`, error);
      return false;
    }
  }

  /**
   * Delete a specific key from cache
   */
  async del(key: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
      return false;
    }

    try {
      await redis.del(this.key(key));
      logger.debug(`Cache DEL: ${this.key(key)}`);
      return true;
    } catch (error) {
      logger.error(`Cache DEL error for ${this.key(key)}:`, error);
      return false;
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const redis = getRedisClient();
    if (!redis) {
      return 0;
    }

    try {
      const keys = await redis.keys(this.key(pattern));
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug(`Cache INVALIDATE: ${keys.length} keys matching ${this.key(pattern)}`);
        return keys.length;
      }
      return 0;
    } catch (error) {
      logger.error(`Cache INVALIDATE error for ${this.key(pattern)}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate all dashboard caches for this tenant
   */
  async invalidateDashboard(): Promise<void> {
    await this.invalidatePattern('dashboard:*');
  }

  /**
   * Invalidate caches when a vendor is modified
   */
  async invalidateVendorCaches(): Promise<void> {
    await Promise.all([
      this.del(CACHE_KEYS.DASHBOARD_STATS),
      this.del(CACHE_KEYS.DASHBOARD_SPEND_CATEGORY),
      this.invalidatePattern('vendors:*'),
    ]);
  }

  /**
   * Invalidate caches when a contract is modified
   */
  async invalidateContractCaches(): Promise<void> {
    await Promise.all([
      this.del(CACHE_KEYS.DASHBOARD_STATS),
      this.del(CACHE_KEYS.DASHBOARD_RENEWALS),
      this.invalidatePattern('contracts:*'),
    ]);
  }

  /**
   * Invalidate caches when an invoice is modified
   */
  async invalidateInvoiceCaches(): Promise<void> {
    await Promise.all([
      this.del(CACHE_KEYS.DASHBOARD_STATS),
      this.del(CACHE_KEYS.DASHBOARD_SPEND_CATEGORY),
      this.del(CACHE_KEYS.DASHBOARD_MONTHLY_SPEND),
      this.del(CACHE_KEYS.DASHBOARD_UNPAID),
      this.invalidatePattern('invoices:*'),
    ]);
  }

  /**
   * Get or set pattern - fetch from cache or compute and store
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.DEFAULT
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Compute the value
    const value = await fetchFn();

    // Store in cache (don't await - fire and forget)
    this.set(key, value, ttlSeconds).catch(() => {});

    return value;
  }
}

/**
 * Factory function to create a cache service for a tenant
 */
export const createCacheService = (tenantId: string): CacheService => {
  return new CacheService(tenantId);
};

export default CacheService;
