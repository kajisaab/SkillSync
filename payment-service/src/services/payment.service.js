/**
 * Payment Service
 * Business logic for payment processing with Stripe
 */

const { stripe } = require('../config/stripe');
const transactionRepository = require('../repositories/transaction.repository');
const { courseServiceClient, learningServiceClient } = require('../config/http-client');
const { formatPaginatedResponse, parsePaginationParams } = require('../utils/pagination.util');
const {
  NotFoundError,
  BadRequestError,
  ConflictError,
  ServiceUnavailableError,
  PaymentError,
} = require('../utils/error.util');

/**
 * Fetch course details from Course Service
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Course data
 */
const fetchCourseDetails = async (courseId) => {
  try {
    const response = await courseServiceClient.get(`/courses/${courseId}`);

    if (!response.data || !response.data.success) {
      throw new NotFoundError('Course not found');
    }

    const course = response.data.data;

    // Verify course is published
    if (!course.isPublished) {
      throw new BadRequestError('Cannot purchase unpublished course');
    }

    return course;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new NotFoundError('Course not found');
    }

    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      throw error;
    }

    console.error('Course Service communication error:', error.message);
    throw new ServiceUnavailableError('Unable to verify course. Please try again later.');
  }
};

/**
 * Check if user already purchased the course
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @returns {Promise<boolean>} True if already purchased
 */
const checkExistingPurchase = async (userId, courseId) => {
  const existingTransaction = await transactionRepository.findByUserAndCourse(userId, courseId);

  if (existingTransaction && existingTransaction.status === 'succeeded') {
    return true;
  }

  return false;
};

/**
 * Create Stripe checkout session
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @param {string} successUrl - Success redirect URL
 * @param {string} cancelUrl - Cancel redirect URL
 * @returns {Promise<Object>} Checkout session data
 */
const createCheckoutSession = async (userId, courseId, successUrl, cancelUrl) => {
  // Fetch course details
  const course = await fetchCourseDetails(courseId);

  // Check if user already purchased this course
  const alreadyPurchased = await checkExistingPurchase(userId, courseId);
  if (alreadyPurchased) {
    throw new ConflictError('You have already purchased this course');
  }

  // Create transaction record with pending status
  const transaction = await transactionRepository.create({
    userId,
    courseId,
    amount: Math.round(course.price * 100), // Convert to cents
    currency: 'usd',
    status: 'pending',
    metadata: {
      courseTitle: course.title,
      courseCategory: course.category,
    },
  });

  try {
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: course.title,
              description: course.description.substring(0, 500), // Stripe limit
              images: course.thumbnailUrl ? [course.thumbnailUrl] : [],
            },
            unit_amount: Math.round(course.price * 100), // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId, // To identify the user in webhook
      metadata: {
        transactionId: transaction.transaction_id,
        userId,
        courseId,
      },
    });

    // Update transaction with Stripe session ID
    await transactionRepository.updateStatus(
      transaction.transaction_id,
      'pending',
      null
    );

    // Store session ID
    await transactionRepository.findById(transaction.transaction_id);
    const updatedTransaction = await transactionRepository.create({
      ...transaction,
      stripeSessionId: session.id,
    });

    // Delete the old transaction and use the new one
    await transactionRepository.updateStatus(transaction.transaction_id, 'cancelled', null);

    return {
      sessionId: session.id,
      sessionUrl: session.url,
      transactionId: updatedTransaction.transaction_id,
      amount: course.price,
      currency: 'usd',
      courseTitle: course.title,
    };
  } catch (error) {
    // Mark transaction as failed if Stripe session creation fails
    await transactionRepository.updateStatus(transaction.transaction_id, 'failed', null);

    console.error('Stripe checkout session creation error:', error);
    throw new PaymentError('Failed to create checkout session. Please try again.');
  }
};

/**
 * Get user's transaction history
 * @param {string} userId - User ID
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>} Paginated transactions
 */
const getUserTransactions = async (userId, query) => {
  const { page, limit, offset } = parsePaginationParams(query);

  const { transactions, total } = await transactionRepository.findByUserId(userId, limit, offset);

  // Enrich transactions with course details
  const enrichedTransactions = await Promise.all(
    transactions.map(async (transaction) => {
      let courseDetails = null;

      try {
        const response = await courseServiceClient.get(`/courses/${transaction.course_id}`);
        courseDetails = response.data.data;
      } catch (error) {
        console.error(`Failed to fetch course ${transaction.course_id}:`, error.message);
      }

      return {
        transactionId: transaction.transaction_id,
        courseId: transaction.course_id,
        courseTitle: courseDetails ? courseDetails.title : 'Course details unavailable',
        courseThumbnailUrl: courseDetails ? courseDetails.thumbnailUrl : null,
        amount: parseFloat(transaction.amount) / 100, // Convert from cents
        currency: transaction.currency,
        status: transaction.status,
        createdAt: transaction.created_at,
        updatedAt: transaction.updated_at,
      };
    })
  );

  return formatPaginatedResponse(enrichedTransactions, total, page, limit);
};

/**
 * Get transaction by ID
 * @param {string} transactionId - Transaction ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} Transaction details
 */
const getTransactionById = async (transactionId, userId) => {
  const transaction = await transactionRepository.findById(transactionId);

  if (!transaction) {
    throw new NotFoundError('Transaction not found');
  }

  // Verify user owns this transaction
  if (transaction.user_id !== userId) {
    throw new NotFoundError('Transaction not found');
  }

  // Fetch course details
  let courseDetails = null;
  try {
    const response = await courseServiceClient.get(`/courses/${transaction.course_id}`);
    courseDetails = response.data.data;
  } catch (error) {
    console.error('Failed to fetch course details:', error.message);
  }

  return {
    transactionId: transaction.transaction_id,
    userId: transaction.user_id,
    courseId: transaction.course_id,
    courseTitle: courseDetails ? courseDetails.title : 'Course details unavailable',
    courseDescription: courseDetails ? courseDetails.description : null,
    amount: parseFloat(transaction.amount) / 100,
    currency: transaction.currency,
    status: transaction.status,
    stripePaymentId: transaction.stripe_payment_id,
    stripeSessionId: transaction.stripe_session_id,
    metadata: transaction.metadata,
    createdAt: transaction.created_at,
    updatedAt: transaction.updated_at,
  };
};

/**
 * Get user's payment statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Payment statistics
 */
const getUserStats = async (userId) => {
  const stats = await transactionRepository.getUserStats(userId);

  return {
    totalTransactions: parseInt(stats.total_transactions, 10),
    successfulTransactions: parseInt(stats.successful_transactions, 10),
    pendingTransactions: parseInt(stats.pending_transactions, 10),
    failedTransactions: parseInt(stats.failed_transactions, 10),
    totalSpent: parseFloat(stats.total_spent) / 100, // Convert from cents
  };
};

module.exports = {
  createCheckoutSession,
  getUserTransactions,
  getTransactionById,
  getUserStats,
  fetchCourseDetails, // Export for testing
  checkExistingPurchase, // Export for testing
};
