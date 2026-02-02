/**
 * Transaction Repository
 * Database operations for payment transactions
 */

const { query } = require('../config/database');

/**
 * Create a new transaction
 * @param {Object} transactionData - Transaction data
 * @returns {Promise<Object>} Created transaction
 */
const create = async (transactionData) => {
  const {
    userId,
    courseId,
    amount,
    currency,
    status,
    stripePaymentId,
    stripeSessionId,
    metadata,
  } = transactionData;

  const result = await query(
    `INSERT INTO transactions (
      user_id, course_id, amount, currency, status,
      stripe_payment_id, stripe_session_id, metadata, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    RETURNING *`,
    [
      userId,
      courseId,
      amount,
      currency || 'usd',
      status,
      stripePaymentId || null,
      stripeSessionId || null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );

  return result.rows[0];
};

/**
 * Find transaction by ID
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object|null>} Transaction or null
 */
const findById = async (transactionId) => {
  const result = await query(
    'SELECT * FROM transactions WHERE transaction_id = $1',
    [transactionId]
  );

  return result.rows[0] || null;
};

/**
 * Find transaction by Stripe payment ID
 * @param {string} stripePaymentId - Stripe payment intent ID
 * @returns {Promise<Object|null>} Transaction or null
 */
const findByStripePaymentId = async (stripePaymentId) => {
  const result = await query(
    'SELECT * FROM transactions WHERE stripe_payment_id = $1',
    [stripePaymentId]
  );

  return result.rows[0] || null;
};

/**
 * Find transaction by Stripe session ID
 * @param {string} stripeSessionId - Stripe checkout session ID
 * @returns {Promise<Object|null>} Transaction or null
 */
const findByStripeSessionId = async (stripeSessionId) => {
  const result = await query(
    'SELECT * FROM transactions WHERE stripe_session_id = $1',
    [stripeSessionId]
  );

  return result.rows[0] || null;
};

/**
 * Find all transactions for a user with pagination
 * @param {string} userId - User ID
 * @param {number} limit - Items per page
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Object>} Transactions and total count
 */
const findByUserId = async (userId, limit, offset) => {
  // Get transactions
  const transactionsResult = await query(
    `SELECT * FROM transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  // Get total count
  const countResult = await query(
    'SELECT COUNT(*) FROM transactions WHERE user_id = $1',
    [userId]
  );

  return {
    transactions: transactionsResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
};

/**
 * Find all transactions for a course with pagination
 * @param {string} courseId - Course ID
 * @param {number} limit - Items per page
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Object>} Transactions and total count
 */
const findByCourseId = async (courseId, limit, offset) => {
  // Get transactions
  const transactionsResult = await query(
    `SELECT * FROM transactions
     WHERE course_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [courseId, limit, offset]
  );

  // Get total count
  const countResult = await query(
    'SELECT COUNT(*) FROM transactions WHERE course_id = $1',
    [courseId]
  );

  return {
    transactions: transactionsResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
};

/**
 * Update transaction status
 * @param {string} transactionId - Transaction ID
 * @param {string} status - New status
 * @param {string} stripePaymentId - Stripe payment intent ID (optional)
 * @returns {Promise<Object>} Updated transaction
 */
const updateStatus = async (transactionId, status, stripePaymentId = null) => {
  const result = await query(
    `UPDATE transactions
     SET status = $1,
         stripe_payment_id = COALESCE($2, stripe_payment_id),
         updated_at = CURRENT_TIMESTAMP
     WHERE transaction_id = $3
     RETURNING *`,
    [status, stripePaymentId, transactionId]
  );

  return result.rows[0];
};

/**
 * Find transaction by user and course
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Object|null>} Transaction or null
 */
const findByUserAndCourse = async (userId, courseId) => {
  const result = await query(
    `SELECT * FROM transactions
     WHERE user_id = $1 AND course_id = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, courseId]
  );

  return result.rows[0] || null;
};

/**
 * Get transaction statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Transaction statistics
 */
const getUserStats = async (userId) => {
  const result = await query(
    `SELECT
       COUNT(*) as total_transactions,
       COUNT(*) FILTER (WHERE status = 'succeeded') as successful_transactions,
       COUNT(*) FILTER (WHERE status = 'pending') as pending_transactions,
       COUNT(*) FILTER (WHERE status = 'failed') as failed_transactions,
       COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0) as total_spent
     FROM transactions
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0];
};

/**
 * Count successful transactions for a course
 * @param {string} courseId - Course ID
 * @returns {Promise<number>} Count of successful transactions
 */
const countSuccessfulByCourse = async (courseId) => {
  const result = await query(
    `SELECT COUNT(*) FROM transactions
     WHERE course_id = $1 AND status = 'succeeded'`,
    [courseId]
  );

  return parseInt(result.rows[0].count, 10);
};

/**
 * Update transaction metadata
 * @param {string} transactionId - Transaction ID
 * @param {Object} metadata - New metadata to merge
 * @returns {Promise<Object>} Updated transaction
 */
const updateMetadata = async (transactionId, metadata) => {
  const result = await query(
    `UPDATE transactions
     SET metadata = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE transaction_id = $2
     RETURNING *`,
    [JSON.stringify(metadata), transactionId]
  );

  return result.rows[0];
};

/**
 * Find transactions requiring manual intervention
 * @returns {Promise<Array>} Transactions needing attention
 */
const findRequiringIntervention = async () => {
  const result = await query(
    `SELECT * FROM transactions
     WHERE metadata->>'requiresManualIntervention' = 'true'
     ORDER BY created_at DESC`
  );

  return result.rows;
};

module.exports = {
  create,
  findById,
  findByStripePaymentId,
  findByStripeSessionId,
  findByUserId,
  findByCourseId,
  updateStatus,
  updateMetadata,
  findByUserAndCourse,
  getUserStats,
  countSuccessfulByCourse,
  findRequiringIntervention,
};
