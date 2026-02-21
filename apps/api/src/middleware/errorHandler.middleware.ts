import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/apiResponse';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(
      res,
      'VALIDATION_ERROR',
      'Validation failed',
      422,
      details
    );
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    return sendError(
      res,
      err.code,
      err.message,
      err.statusCode,
      err.details
    );
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const mongooseError = err as any;
    const details = Object.keys(mongooseError.errors).map((key) => ({
      field: key,
      message: mongooseError.errors[key].message,
    }));
    return sendError(
      res,
      'VALIDATION_ERROR',
      'Validation failed',
      422,
      details
    );
  }

  // Handle Mongoose duplicate key errors
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern || {})[0] || 'field';
    return sendError(
      res,
      'DUPLICATE_KEY',
      `A record with this ${field} already exists`,
      409
    );
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return sendError(
      res,
      'INVALID_ID',
      'Invalid ID format',
      400
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(
      res,
      'INVALID_TOKEN',
      'Invalid token',
      401
    );
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(
      res,
      'TOKEN_EXPIRED',
      'Token has expired',
      401
    );
  }

  // Default error response
  const isProduction = process.env.NODE_ENV === 'production';
  return sendError(
    res,
    'INTERNAL_ERROR',
    isProduction ? 'An unexpected error occurred' : err.message,
    500,
    isProduction ? undefined : { stack: err.stack }
  );
};

export default errorHandler;
