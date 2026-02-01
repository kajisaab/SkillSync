/**
 * Payment Controller
 * Handles HTTP requests for payment operations
 */

const paymentService = require('../services/payment.service');
const { SuccessResponse } = require('../utils/response.util');

/**
 * Create checkout session for course purchase
 * POST /api/payments/checkout
 */
const createCheckout = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { courseId, successUrl, cancelUrl } = req.body;

    const checkoutData = await paymentService.createCheckoutSession(
      userId,
      courseId,
      successUrl,
      cancelUrl
    );

    return res.status(201).json(
      new SuccessResponse('Checkout session created successfully', checkoutData)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's transaction history
 * GET /api/payments/transactions
 */
const getUserTransactions = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const result = await paymentService.getUserTransactions(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return res.status(200).json(new SuccessResponse('Transactions retrieved successfully', result));
  } catch (error) {
    next(error);
  }
};

/**
 * Get specific transaction details
 * GET /api/payments/transactions/:transactionId
 */
const getTransactionById = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { transactionId } = req.params;

    const transaction = await paymentService.getTransactionById(transactionId, userId);

    return res.status(200).json(new SuccessResponse('Transaction retrieved successfully', transaction));
  } catch (error) {
    next(error);
  }
};

/**
 * Get user payment statistics
 * GET /api/payments/stats
 */
const getUserPaymentStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const stats = await paymentService.getUserStats(userId);

    return res.status(200).json(new SuccessResponse('Payment statistics retrieved successfully', stats));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCheckout,
  getUserTransactions,
  getTransactionById,
  getUserPaymentStats,
};
