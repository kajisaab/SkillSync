/**
 * Error Utility Functions
 * Custom error classes and error handling
 */

/**
 * Base API Error Class
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

/**
 * Bad Request Error (400)
 */
class BadRequestError extends APIError {
  constructor(message = "Bad Request", errors = null) {
    super(message, 400, errors);
  }
}

/**
 * Unauthorized Error (401)
 */
class UnauthorizedError extends APIError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

/**
 * Forbidden Error (403)
 */
class ForbiddenError extends APIError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends APIError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

/**
 * Conflict Error (409)
 */
class ConflictError extends APIError {
  constructor(message = "Resource conflict") {
    super(message, 409);
  }
}

/**
 * Validation Error (422)
 */
class ValidationError extends APIError {
  constructor(message = "Validation failed", errors = null) {
    super(message, 422, errors);
  }
}

/**
 * Internal Server Error (500)
 */
class InternalServerError extends APIError {
  constructor(message = "Internal server error") {
    super(message, 500);
  }
}

/**
 * Format error response
 * @param {Error} error - Error object
 * @returns {Object} Formatted error response
 */
const formatErrorResponse = (error) => {
  const response = {
    success: false,
    message: error.message || "An unexpected error occurred",
    statusCode: error.statusCode || 500,
  };

  // Add validation errors if present
  if (error.errors) {
    response.errors = error.errors;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === "development") {
    response.stack = error.stack;
  }

  return response;
};

/**
 * Check if error is operational (expected error)
 * @param {Error} error - Error object
 * @returns {boolean}
 */
const isOperationalError = (error) => {
  return error instanceof APIError && error.isOperational;
};

/**
 * Handle database errors
 * @param {Error} error - Database error
 * @returns {APIError}
 */
const handleDatabaseError = (error) => {
  // PostgreSQL unique constraint violation
  if (error.code === "23505") {
    return new ConflictError("Resource already exists");
  }

  // PostgreSQL foreign key violation
  if (error.code === "23503") {
    return new BadRequestError("Invalid reference");
  }

  // PostgreSQL not null violation
  if (error.code === "23502") {
    return new BadRequestError("Missing required field");
  }

  // Default internal server error
  return new InternalServerError("Database operation failed");
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * @param {Function} fn - Async function
 * @returns {Function} Wrapped function
 */
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
