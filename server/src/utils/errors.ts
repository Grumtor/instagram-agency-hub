export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  public readonly details: Record<string, string[]> | undefined;

  constructor(message = 'Validation failed', details?: Record<string, string[]>) {
    super(message, 400);
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

export class MetaApiError extends AppError {
  public readonly metaCode: number;
  public readonly metaSubcode?: number;
  public readonly metaType: string;

  constructor(
    message: string,
    metaCode: number,
    metaType: string,
    metaSubcode?: number,
  ) {
    super(`Meta API Error: ${message}`, 502);
    this.metaCode = metaCode;
    this.metaType = metaType;
    this.metaSubcode = metaSubcode;
  }
}
