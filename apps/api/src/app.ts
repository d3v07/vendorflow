import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from './config';
import routes from './routes';
import stripeWebhook from './webhooks/stripe.webhook';
import { setupSwagger } from './config/swagger';
import { errorHandler } from './middleware/errorHandler.middleware';
import { NotFoundError } from './utils/errors';
import logger from './utils/logger';
import {
  sanitizeRequest,
  securityHeaders,
  validateContentType,
  preventParameterPollution,
} from './middleware/security.middleware';

// Create Express app
const app: Express = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Stripe webhook (must be before JSON body parser - needs raw body)
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

// Body parsing
app.use(express.json({ limit: '100kb' })); // Reduced from 10mb for security
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Security: Additional headers beyond helmet
app.use(securityHeaders);

// Security: Sanitize all incoming requests (XSS/NoSQL injection prevention)
app.use(sanitizeRequest);

// Security: Validate Content-Type for POST/PUT/PATCH
app.use(validateContentType);

// Security: Prevent HTTP Parameter Pollution
app.use(preventParameterPollution);

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );
}

// Request ID middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.headers['x-request-id'] =
    req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  next();
});

// API routes
app.use('/api', routes);

// Swagger documentation
setupSwagger(app);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: 'VendorFlow API',
      version: '1.0.0',
      documentation: '/api/health',
    },
  });
});

// 404 handler
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError('Route'));
});

// Error handler
app.use(errorHandler);

export default app;
