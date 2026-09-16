import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const key = err.path.join('.') || 'body';
          if (!formattedErrors[key]) formattedErrors[key] = [];
          formattedErrors[key].push(err.message);
        });
        next(new ValidationError('Validation failed', formattedErrors));
      } else {
        next(error);
      }
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as Record<string, any>;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const key = err.path.join('.') || 'query';
          if (!formattedErrors[key]) formattedErrors[key] = [];
          formattedErrors[key].push(err.message);
        });
        next(new ValidationError('Query validation failed', formattedErrors));
      } else {
        next(error);
      }
    }
  };
}
