export class BaseError extends Error {
  public code: string;
  public statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthError extends BaseError {
  constructor(message: string, code: string = 'AUTH_ERROR') {
    super(message, code, 401);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, code, 400);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string, code: string = 'NOT_FOUND') {
    super(message, code, 404);
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string = 'Too many failed attempts. Please try again later.', code: string = 'RATE_LIMIT') {
    super(message, code, 429);
  }
}