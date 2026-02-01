/**
 * Error Utility Functions
 * Custom error classes and error handling
 */

class APIError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends APIError {
  constructor(message = 'Bad Request', errors = null) {
    super(message, 400, errors);
  }
}

class UnauthorizedError extends APIError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

class ForbiddenError extends APIError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

class NotFoundError extends APIError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ConflictError extends APIError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

class ValidationError extends APIError {
  constructor(message = 'Validation failed', errors = null) {
    super(message, 422, errors);
  }
}

class InternalServerError extends APIError {
  constructor(message = 'Internal server error') {
    super(message, 500);
  }
}

const formatErrorResponse = (error) => {
  const response = {
    success: false,
    message: error.message || 'An unexpected error occurred',
    statusCode: error.statusCode || 500,
  };

  if (error.errors) {
    response.errors = error.errors;
  }

  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  return response;
};

const isOperationalError = (error) => {
  return error instanceof APIError && error.isOperational;
};

const handleDatabaseError = (error) => {
  if (error.code === '23505') {
    return new ConflictError('Resource already exists');
  }

  if (error.code === '23503') {
    return new BadRequestError('Invalid reference');
  }

  if (error.code === '23502') {
    return new BadRequestError('Missing required field');
  }

  return new InternalServerError('Database operation failed');
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  APIError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
  formatErrorResponse,
  isOperationalError,
  handleDatabaseError,
  asyncHandler,
};
