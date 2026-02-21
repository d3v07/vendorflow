/**
 * Application Configuration
 * All sensitive values MUST come from environment variables
 * OWASP: No hardcoded secrets, validate required config at startup
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  env: string;
  port: number;
  isProduction: boolean;
  isDevelopment: boolean;
  mongodb: {
    uri: string;
  };
  redis: {
    url: string;
  };
  rabbitmq: {
    url: string;
  };
  jwt: {
    secret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  cors: {
    origin: string | string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
    priceIds: {
      starter: string;
      pro: string;
    };
  };
  frontendUrl: string;
  security: {
    bcryptRounds: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
}

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

/**
 * Validate required environment variables at startup
 * Prevents running with missing critical configuration
 */
function validateConfig(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];

  // Always required
  if (!process.env.MONGODB_URI && isProduction) {
    errors.push('MONGODB_URI is required');
  }

  // JWT secret is critical - NEVER use default in production
  if (!process.env.JWT_SECRET) {
    if (isProduction) {
      errors.push('JWT_SECRET is required in production');
    } else {
      console.warn(
        '⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable for production!'
      );
    }
  }

  // Check for weak JWT secret
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    if (isProduction) {
      errors.push('JWT_SECRET must be at least 32 characters');
    } else {
      console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters');
    }
  }

  // Stripe keys required if Stripe features are used
  if (isProduction && process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
    errors.push('STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set');
  }

  // CORS origin required in production
  if (isProduction && !process.env.CORS_ORIGIN) {
    errors.push('CORS_ORIGIN is required in production');
  }

  // Fail fast if critical config is missing
  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach((err) => console.error(`   - ${err}`));
    process.exit(1);
  }
}

// Run validation on import
validateConfig();

// ============================================================================
// CONFIGURATION OBJECT
// ============================================================================

const config: Config & { redisUrl: string } = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  // For backwards compatibility
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Database (no credentials in code)
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/vendorflow',
  },

  // Cache
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Message Queue
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  },

  // Authentication
  // SECURITY: JWT secret MUST be set via environment variable
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) || [
      'http://localhost:3000',
      'http://localhost:5173',
    ],
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Stripe (test mode by default, no keys = billing disabled)
  // SECURITY: Stripe keys MUST come from environment variables
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    priceIds: {
      starter: process.env.STRIPE_PRICE_STARTER || '',
      pro: process.env.STRIPE_PRICE_PRO || '',
    },
  },

  // Frontend URL for redirects
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Security settings
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000', 10), // 15 minutes
  },
};

// ============================================================================
// SECURITY: Prevent config object from being modified at runtime
// ============================================================================

export default Object.freeze(config);
