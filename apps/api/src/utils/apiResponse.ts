import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '../types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: PaginationMeta
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 500,
  details?: unknown
): Response => {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };

  return res.status(statusCode).json(response);
};

export const sendCreated = <T>(res: Response, data: T): Response => {
  return sendSuccess(res, data, 201);
};

export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};
