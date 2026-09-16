import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../errors';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      status: 'fail',
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof ZodError) {
    const formattedErrors: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const key = e.path.join('.') || 'body';
      if (!formattedErrors[key]) formattedErrors[key] = [];
      formattedErrors[key].push(e.message);
    });
    res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: formattedErrors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'fail',
      message: err.message,
    });
    return;
  }

  console.error('Unhandled Error:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error',
  });
}
