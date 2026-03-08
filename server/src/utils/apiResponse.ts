import { Response } from 'express';
import { AppError, ValidationError } from './errors';

interface SuccessResponseBody<T> {
  success: true;
  data: T;
}

interface ErrorResponseBody {
  success: false;
  error: {
    message: string;
    details?: Record<string, string[]>;
  };
}

export function successResponse<T>(res: Response, data: T, statusCode = 200): Response {
  const body: SuccessResponseBody<T> = { success: true, data };
  return res.status(statusCode).json(body);
}

export function errorResponse(res: Response, error: unknown): Response {
  if (error instanceof ValidationError) {
    const body: ErrorResponseBody = {
      success: false,
      error: {
        message: error.message,
        details: error.details,
      },
    };
    return res.status(error.statusCode).json(body);
  }

  if (error instanceof AppError) {
    const body: ErrorResponseBody = {
      success: false,
      error: { message: error.message },
    };
    return res.status(error.statusCode).json(body);
  }

  const body: ErrorResponseBody = {
    success: false,
    error: { message: 'Internal server error' },
  };
  return res.status(500).json(body);
}
