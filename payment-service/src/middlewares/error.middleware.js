/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */

const { APIError } = require('../utils/error.util');

/**
 * Determine if error is operational (expected) or programmer error
 * @param {Error} error - Error object
 * @returns {boolean} True if operational error
 */
const isOperationalError = (error) => {
  return error instanceof APIError && error.isOperational;
};

/**
 * Global error handler middleware
 * Must be registered last in middleware chain
 */
const errorHandler = (err, req, res, next) => {
  // Log error details for debugging
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle operational errors (expected errors)
  if (isOperationalError(err)) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
      },
    });
  }

  // Handle unexpected errors (programmer errors)
  return res.status(500).json({
    success: false,
    error: {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
    },
  });
};

/**
 * Handle 404 Not Found errors
 * Should be registered before error handler but after all routes
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'ROUTE_NOT_FOUND',
    },
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function that catches errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  isOperationalError,
};
