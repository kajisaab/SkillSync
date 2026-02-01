/**
 * Error Handling Middleware
 * Centralized error handling for Express app
 */

const {
  formatErrorResponse,
  isOperationalError,
} = require("../utils/error.util");

/**
 * 404 Not Found handler
 * Catches requests to undefined routes
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404,
  });
};

/**
 * Global error handler
 * Catches all errors and formats response
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  if (process.env.NODE_ENV === "development") {
    console.error("Error:", err);
  } else {
    console.error("Error:", err.message);
  }

  // Format error response
  const errorResponse = formatErrorResponse(err);

  // Send error response
  res.status(errorResponse.statusCode).json(errorResponse);

  // Exit process if error is not operational (unexpected error)
  if (!isOperationalError(err) && process.env.NODE_ENV === "production") {
    console.error("FATAL: Unexpected error occurred. Shutting down...");
    process.exit(1);
  }
};

/**
 * Async error wrapper
 * Catches errors in async route handlers
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncErrorHandler,
};
