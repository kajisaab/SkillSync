/**
 * Validation Middleware
 * Validates request data against Joi schemas
 */

const { ValidationError } = require('../utils/error.util');

/**
 * Validate request body against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return next(new ValidationError(errorMessage));
    }

    // Replace request body with validated and sanitized data
    req.body = value;
    next();
  };
};

/**
 * Validate request query parameters against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return next(new ValidationError(errorMessage));
    }

    // Replace request query with validated and sanitized data
    req.query = value;
    next();
  };
};

/**
 * Validate request params against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return next(new ValidationError(errorMessage));
    }

    // Replace request params with validated data
    req.params = value;
    next();
  };
};

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
};
