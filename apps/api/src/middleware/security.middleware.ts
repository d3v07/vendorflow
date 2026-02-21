/**
 * Security Middleware
 * OWASP-compliant security hardening for VendorFlow API
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';

// Skip rate limiting during tests
const isTestEnv = process.env.NODE_ENV === 'test';

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Standard API rate limiter (IP-based)
 * 100 requests per 15 minutes for general API access
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  // Skip during tests or for authenticated users (handled by userRateLimiter)
  skip: (req) => isTestEnv || !!req.user,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(15 * 60), // seconds
      },
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 attempts per 15 minutes to prevent brute force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv, // Skip during tests
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (_req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: _req.ip,
      path: _req.path,
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
        retryAfter: Math.ceil(15 * 60),
      },
    });
  },
});

/**
 * Rate limiter for registration (prevent spam accounts)
 * 3 registrations per hour per IP
 */
export const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv, // Skip during tests
  handler: (_req, res) => {
    logger.warn('Registration rate limit exceeded', { ip: _req.ip });
    res.status(429).json({
      success: false,
      error: {
        code: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
        message: 'Too many registration attempts. Please try again in 1 hour.',
        retryAfter: Math.ceil(60 * 60),
      },
    });
  },
});

/**
 * User-based rate limiter for authenticated requests
 * 1000 requests per 15 minutes per user
 */
export const userRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv, // Skip during tests
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise fall back to IP
    return req.user?.id || req.ip || 'unknown';
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'USER_RATE_LIMIT_EXCEEDED',
        message: 'Request quota exceeded. Please slow down.',
        retryAfter: Math.ceil(15 * 60),
      },
    });
  },
});

/**
 * Password reset rate limiter
 * 3 attempts per hour
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv, // Skip during tests
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
        message: 'Too many password reset attempts. Please try again later.',
        retryAfter: Math.ceil(60 * 60),
      },
    });
  },
});

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize string input to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove potentially dangerous characters for NoSQL injection
    .replace(/[${}]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Recursively sanitize object values
 */
export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'string' ? sanitizeString(item) : sanitizeObject(item)
    );
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Block MongoDB operators in keys (NoSQL injection prevention)
    if (key.startsWith('$')) {
      logger.warn('Blocked potential NoSQL injection attempt', { key });
      continue;
    }

    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Request sanitization middleware
 * Sanitizes body, query, and params to prevent injection attacks
 */
export const sanitizeRequest = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query as Record<string, any>) as typeof req.query;
    }

    // Sanitize route parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error('Request sanitization error:', error);
    next(error);
  }
};

// ============================================================================
// SECURITY HEADERS
// ============================================================================

/**
 * Additional security headers beyond helmet defaults
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Enable XSS filter in browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy (disable unnecessary browser features)
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // Remove server identification
  res.removeHeader('X-Powered-By');

  next();
};

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

/**
 * Validate Content-Type header for POST/PUT/PATCH requests
 */
export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
  const methodsRequiringBody = ['POST', 'PUT', 'PATCH'];

  if (methodsRequiringBody.includes(req.method)) {
    const contentType = req.headers['content-type'];

    // Allow requests without body (empty POST)
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }

    // Require JSON content type for requests with body
    if (!contentType?.includes('application/json')) {
      res.status(415).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Content-Type must be application/json',
        },
      });
      return;
    }
  }

  next();
};

/**
 * Limit request body size (prevent DoS via large payloads)
 * Note: Also set in express.json(), but this provides explicit error handling
 */
export const validateRequestSize = (maxSizeKb: number = 100) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxBytes = maxSizeKb * 1024;

    if (contentLength > maxBytes) {
      res.status(413).json({
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Request body exceeds maximum size of ${maxSizeKb}KB`,
        },
      });
      return;
    }

    next();
  };
};

// ============================================================================
// PARAMETER POLLUTION PREVENTION
// ============================================================================

/**
 * Prevent HTTP Parameter Pollution
 * Takes only the last value if duplicate parameters are sent
 */
export const preventParameterPollution = (req: Request, _res: Response, next: NextFunction): void => {
  // Clean query parameters
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      const value = req.query[key];
      if (Array.isArray(value)) {
        // Take only the last value to prevent pollution attacks
        req.query[key] = value[value.length - 1];
        logger.warn('Parameter pollution detected', { key, originalValues: value });
      }
    }
  }

  next();
};

// ============================================================================
// SENSITIVE DATA PROTECTION
// ============================================================================

/**
 * Remove sensitive fields from response objects
 */
export const sensitiveFields = ['password', 'passwordHash', 'refreshToken', '__v', 'stripeCustomerId'];

export const removeSensitiveData = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeSensitiveData);
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.includes(key)) {
      continue;
    }
    cleaned[key] = typeof value === 'object' ? removeSensitiveData(value) : value;
  }
  return cleaned;
};

export default {
  apiRateLimiter,
  authRateLimiter,
  registrationRateLimiter,
  userRateLimiter,
  passwordResetRateLimiter,
  sanitizeRequest,
  securityHeaders,
  validateContentType,
  validateRequestSize,
  preventParameterPollution,
  sanitizeString,
  sanitizeObject,
  removeSensitiveData,
};
