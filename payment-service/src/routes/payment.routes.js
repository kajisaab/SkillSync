/**
 * Payment Routes
 * Routes for payment operations
 */

const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middlewares/validation.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const {
  createCheckoutSchema,
  paginationQuerySchema,
  transactionIdParamSchema,
} = require('../validators/payment.validator');

/**
 * POST /api/payments/checkout
 * Create checkout session for course purchase
 * @access Private
 */
router.post(
  '/checkout',
  authenticate,
  validateBody(createCheckoutSchema),
  asyncHandler(paymentController.createCheckout)
);

/**
 * GET /api/payments/transactions
 * Get user's transaction history
 * @access Private
 */
router.get(
  '/transactions',
  authenticate,
  validateQuery(paginationQuerySchema),
  asyncHandler(paymentController.getUserTransactions)
);

/**
 * GET /api/payments/transactions/:transactionId
 * Get specific transaction details
 * @access Private
 */
router.get(
  '/transactions/:transactionId',
  authenticate,
  validateParams(transactionIdParamSchema),
  asyncHandler(paymentController.getTransactionById)
);

/**
 * GET /api/payments/stats
 * Get user payment statistics
 * @access Private
 */
router.get('/stats', authenticate, asyncHandler(paymentController.getUserPaymentStats));

module.exports = router;
