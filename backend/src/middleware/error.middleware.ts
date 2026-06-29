import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error
  logger.error(`${req.method} ${req.path} - Error: ${message}`, err.stack);

  res.status(statusCode).json({
    error: message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
