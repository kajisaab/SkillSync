/**
 * Payment Service Validation Schemas
 * Input validation using Joi
 */

const Joi = require('joi');

/**
 * Create checkout session schema
 */
const createCheckoutSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  successUrl: Joi.string().uri().required(),
  cancelUrl: Joi.string().uri().required(),
});

/**
 * Pagination query schema
 */
const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

/**
 * UUID param schema
 */
const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

/**
 * Transaction ID param schema
 */
const transactionIdParamSchema = Joi.object({
  transactionId: Joi.string().uuid().required(),
});

module.exports = {
  createCheckoutSchema,
  paginationQuerySchema,
  uuidParamSchema,
  transactionIdParamSchema,
};
