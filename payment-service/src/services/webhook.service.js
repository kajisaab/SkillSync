/**
 * Webhook Service
 * Handles Stripe webhook events and triggers enrollments
 */

const { stripe, webhookSecret } = require('../config/stripe');
const transactionRepository = require('../repositories/transaction.repository');
const { learningServiceClient } = require('../config/http-client');
const { BadRequestError, ServiceUnavailableError } = require('../utils/error.util');

/**
 * Verify Stripe webhook signature
 * @param {Buffer} rawBody - Raw request body
 * @param {string} signature - Stripe signature header
 * @returns {Object} Verified event
 * @throws {BadRequestError} If signature verification fails
 */
const verifyWebhookSignature = (rawBody, signature) => {
  if (!webhookSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET not configured - skipping signature verification');
    // In development, we might not have webhook secret configured
    // Parse the body as JSON and return it as an event
    if (process.env.NODE_ENV === 'development') {
      return JSON.parse(rawBody.toString());
    }
    throw new BadRequestError('Webhook secret not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    throw new BadRequestError('Invalid webhook signature');
  }
};

/**
 * Trigger enrollment in Learning Service
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Enrollment response
 */
const triggerEnrollment = async (userId, courseId) => {
  try {
    console.log(`Triggering enrollment for user ${userId} in course ${courseId}`);

    const response = await learningServiceClient.post(
      '/enrollments',
      { courseId },
      {
        headers: {
          // Generate a system token or pass user context
          // For now, we'll use internal service communication
          'X-Internal-Service': 'payment-service',
          'X-User-Id': userId,
        },
      }
    );

    if (response.data && response.data.success) {
      console.log(`✓ Enrollment successful for user ${userId} in course ${courseId}`);
      return response.data.data;
    }

    throw new Error('Enrollment response was not successful');
  } catch (error) {
    console.error('Failed to trigger enrollment:', error.message);

    // Don't throw error - we want to mark payment as succeeded even if enrollment fails
    // The enrollment can be retried or done manually later
    if (error.response) {
      console.error('Learning Service error:', error.response.data);
    }

    // Return null to indicate enrollment failed but don't stop the webhook processing
    return null;
  }
};

/**
 * Handle checkout session completed event
 * @param {Object} session - Stripe checkout session
 * @returns {Promise<void>}
 */
const handleCheckoutSessionCompleted = async (session) => {
  console.log('Processing checkout.session.completed event:', session.id);

  const { metadata, client_reference_id, payment_intent } = session;

  if (!metadata || !metadata.transactionId) {
    console.error('Missing transaction ID in session metadata');
    return;
  }

  const transactionId = metadata.transactionId;
  const userId = metadata.userId || client_reference_id;
  const courseId = metadata.courseId;

  // Find transaction
  const transaction = await transactionRepository.findById(transactionId);

  if (!transaction) {
    console.error(`Transaction ${transactionId} not found`);
    return;
  }

  // Update transaction status to succeeded
  await transactionRepository.updateStatus(transactionId, 'succeeded', payment_intent);

  console.log(`✓ Transaction ${transactionId} marked as succeeded`);

  // Trigger enrollment in Learning Service
  if (userId && courseId) {
    await triggerEnrollment(userId, courseId);
  } else {
    console.error('Missing userId or courseId for enrollment');
  }
};

/**
 * Handle payment intent succeeded event
 * @param {Object} paymentIntent - Stripe payment intent
 * @returns {Promise<void>}
 */
const handlePaymentIntentSucceeded = async (paymentIntent) => {
  console.log('Processing payment_intent.succeeded event:', paymentIntent.id);

  // Find transaction by Stripe payment ID
  const transaction = await transactionRepository.findByStripePaymentId(paymentIntent.id);

  if (!transaction) {
    console.warn(`No transaction found for payment intent ${paymentIntent.id}`);
    return;
  }

  // If transaction is already succeeded, skip
  if (transaction.status === 'succeeded') {
    console.log('Transaction already marked as succeeded');
    return;
  }

  // Update transaction status
  await transactionRepository.updateStatus(transaction.transaction_id, 'succeeded', paymentIntent.id);

  console.log(`✓ Transaction ${transaction.transaction_id} marked as succeeded`);

  // Trigger enrollment
  await triggerEnrollment(transaction.user_id, transaction.course_id);
};

/**
 * Handle payment intent failed event
 * @param {Object} paymentIntent - Stripe payment intent
 * @returns {Promise<void>}
 */
const handlePaymentIntentFailed = async (paymentIntent) => {
  console.log('Processing payment_intent.payment_failed event:', paymentIntent.id);

  // Find transaction by Stripe payment ID
  const transaction = await transactionRepository.findByStripePaymentId(paymentIntent.id);

  if (!transaction) {
    console.warn(`No transaction found for payment intent ${paymentIntent.id}`);
    return;
  }

  // Update transaction status to failed
  await transactionRepository.updateStatus(transaction.transaction_id, 'failed', paymentIntent.id);

  console.log(`✓ Transaction ${transaction.transaction_id} marked as failed`);
};

/**
 * Process webhook event
 * @param {Object} event - Verified Stripe event
 * @returns {Promise<Object>} Processing result
 */
const processWebhookEvent = async (event) => {
  console.log(`Processing webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return {
      received: true,
      eventType: event.type,
      eventId: event.id,
    };
  } catch (error) {
    console.error('Error processing webhook event:', error);
    throw error;
  }
};

module.exports = {
  verifyWebhookSignature,
  processWebhookEvent,
  triggerEnrollment, // Export for testing
  handleCheckoutSessionCompleted, // Export for testing
  handlePaymentIntentSucceeded, // Export for testing
  handlePaymentIntentFailed, // Export for testing
};
