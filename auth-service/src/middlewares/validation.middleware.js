/**
 * Validation Middleware
 * Request body validation using Joi schemas
 */

const { ValidationError } = require("../utils/error.util");

/**
 * Validate request body against Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Middleware function
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      // Format validation errors
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return next(new ValidationError("Validation failed", errors));
    }

    // Replace request body with validated and sanitized data
    req.body = value;
    next();
  };
};

/**
 * Validate query parameters
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Middleware function
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return next(new ValidationError("Query validation failed", errors));
    }

    req.query = value;
    next();
  };
};

/**
 * Validate route parameters
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Middleware function
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return next(new ValidationError("Parameter validation failed", errors));
    }

    req.params = value;
    next();
  };
};

module.exports = {
  validate,
  validateQuery,
  validateParams,
};
