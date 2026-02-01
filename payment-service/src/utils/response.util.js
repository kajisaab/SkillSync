/**
 * Response Utility
 * Standardizes API response format
 */

/**
 * Success response wrapper
 */
class SuccessResponse {
  constructor(message = 'Success', data = null, meta = null) {
    this.success = true;
    this.message = message;
    if (data !== null) {
      this.data = data;
    }
    if (meta !== null) {
      this.meta = meta;
    }
  }
}

/**
 * Error response wrapper
 */
class ErrorResponse {
  constructor(message = 'An error occurred', code = 'ERROR', statusCode = 500) {
    this.success = false;
    this.error = {
      message,
      code,
    };
    this.statusCode = statusCode;
  }
}

module.exports = {
  SuccessResponse,
  ErrorResponse,
};
