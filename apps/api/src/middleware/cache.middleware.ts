import { Request, Response, NextFunction } from 'express';
import { CacheService, CACHE_TTL } from '../services/cache.service';
import logger from '../utils/logger';

/**
 * Cache middleware for GET requests
 * Checks cache before hitting the controller, stores response in cache
 */
export const cacheMiddleware = (cacheKey: string, ttlSeconds: number = CACHE_TTL.DEFAULT) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Need tenant ID for cache isolation
    if (!req.tenantId) {
      return next();
    }

    const cache = new CacheService(req.tenantId);

    try {
      // Check if response is in cache
      const cached = await cache.get<any>(cacheKey);

      if (cached !== null) {
        // Return cached response with cache indicator
        res.json({
          success: true,
          data: cached,
          _cached: true,
          _cachedAt: new Date().toISOString(),
        });
        return;
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache the response
      res.json = function (body: any): Response {
        // Only cache successful responses
        if (body && body.success && body.data) {
          cache.set(cacheKey, body.data, ttlSeconds).catch((error) => {
            logger.error(`Failed to cache response for ${cacheKey}:`, error);
          });
        }

        // Add cache indicator
        if (body && body.success) {
          body._cached = false;
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error(`Cache middleware error for ${cacheKey}:`, error);
      // On error, proceed without caching
      next();
    }
  };
};

/**
 * Middleware to invalidate cache after write operations
 */
export const invalidateCacheMiddleware = (
  invalidateFn: (cache: CacheService) => Promise<void>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to invalidate cache after successful response
    res.json = function (body: any): Response {
      // Only invalidate on successful write operations
      if (body && body.success && req.tenantId) {
        const cache = new CacheService(req.tenantId);
        invalidateFn(cache).catch((error) => {
          logger.error('Cache invalidation error:', error);
        });
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Pre-built invalidation middlewares
 */
export const invalidateVendorCache = invalidateCacheMiddleware(
  (cache) => cache.invalidateVendorCaches()
);

export const invalidateContractCache = invalidateCacheMiddleware(
  (cache) => cache.invalidateContractCaches()
);

export const invalidateInvoiceCache = invalidateCacheMiddleware(
  (cache) => cache.invalidateInvoiceCaches()
);

export const invalidateDashboardCache = invalidateCacheMiddleware(
  (cache) => cache.invalidateDashboard()
);

export default cacheMiddleware;
