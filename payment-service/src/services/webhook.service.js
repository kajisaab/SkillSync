/**
 * Webhook Service
 * Handles Stripe webhook events and triggers enrollments
 * Implements Saga Pattern with Circuit Breaker and Retry
 */

const { stripe, webhookSecret } = require('../config/stripe');
const transactionRepository = require('../repositories/transaction.repository');
const { learningServiceClient, learningServiceBreaker } = require('../config/http-client');
const { BadRequestError } = require('../utils/error.util');
const { executePaymentSaga } = require('../sagas/payment.saga');
const { retry, RetryableErrors } = require('../utils/retry');

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
 * Trigger enrollment in Learning Service with Circuit Breaker and Retry
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @param {string} transactionId - Transaction ID for saga tracking
 * @returns {Promise<Object>} Enrollment response
 */
const triggerEnrollment = async (userId, courseId, transactionId = null) => {
  console.log(`Triggering enrollment for user ${userId} in course ${courseId}`);

  const enrollmentFn = async () => {
    const response = await learningServiceClient.post(
      '/enrollments/internal',
      {
        userId,
        courseId,
        transactionId,
        source: 'payment_webhook',
      },
      {
        headers: {
          'X-Internal-Service': 'payment-service',
          'X-User-Id': userId,
          'X-Saga-Transaction-Id': transactionId || '',
        },
        timeout: 10000,
      }
    );

    if (response.data && response.data.success) {
      console.log(`✓ Enrollment successful for user ${userId} in course ${courseId}`);
      return response.data.data;
    }

    throw new Error('Enrollment response was not successful');
  };

  try {
    // Execute with circuit breaker and retry
    const result = await learningServiceBreaker.execute(async () => {
      return retry(enrollmentFn, {
        maxRetries: 3,
        initialDelay: 1000,
        retryableErrors: [...RetryableErrors.NETWORK, ...RetryableErrors.HTTP],
        onRetry: (error, attempt, delay) => {
          console.log(`[Enrollment] Retry ${attempt} for user ${userId}, course ${courseId}, delay: ${delay}ms`);
        },
      });
    });

    return result;
  } catch (error) {
    console.error('Failed to trigger enrollment:', error.message);

    if (error.code === 'CIRCUIT_OPEN') {
      console.error('Learning Service circuit breaker is OPEN - service unavailable');
    }

    if (error.response) {
      console.error('Learning Service error:', error.response.data);
    }

    // Return null to indicate enrollment failed but don't stop the webhook processing
    return null;
  }
};

/**
 * Handle checkout session completed event
 * Uses Saga Pattern for distributed transaction management
 * @param {Object} session - Stripe checkout session
 * @returns {Promise<Object>} Saga result
 */
const handleCheckoutSessionCompleted = async (session) => {
  console.log('Processing checkout.session.completed event:', session.id);

  const { metadata, client_reference_id, payment_intent } = session;

  if (!metadata || !metadata.transactionId) {
    console.error('Missing transaction ID in session metadata');
    return { success: false, error: 'Missing transaction ID' };
  }

  const transactionId = metadata.transactionId;
  const userId = metadata.userId || client_reference_id;
  const courseId = metadata.courseId;

  // Find transaction
  const transaction = await transactionRepository.findById(transactionId);

  if (!transaction) {
    console.error(`Transaction ${transactionId} not found`);
    return { success: false, error: 'Transaction not found' };
  }

  // Check if userId and courseId are available
  if (!userId || !courseId) {
    console.error('Missing userId or courseId for saga execution');
    await transactionRepository.updateStatus(transactionId, 'succeeded', payment_intent);
    return { success: false, error: 'Missing userId or courseId' };
  }

  // Execute the Payment Saga
  // This handles: Payment Verification → Enrollment → Compensation (refund) on failure
  console.log(`Starting Payment Saga for transaction ${transactionId}`);

  const sagaResult = await executePaymentSaga(
    transactionId,
    userId,
    courseId,
    payment_intent
  );

  if (sagaResult.success) {
    console.log(`✓ Payment Saga completed successfully for transaction ${transactionId}`);
  } else {
    console.error(`✗ Payment Saga failed for transaction ${transactionId}:`, sagaResult.error);

    if (sagaResult.compensated) {
      console.log(`Payment was refunded due to enrollment failure`);
    }

    if (sagaResult.requiresManualIntervention) {
      console.error(`ALERT: Transaction ${transactionId} requires manual intervention`);
    }
  }

  return sagaResult;
};

/**
 * Handle payment intent succeeded event
 * Uses Circuit Breaker and Retry for resilience
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

  // Trigger enrollment with Circuit Breaker and Retry
  await triggerEnrollment(
    transaction.user_id,
    transaction.course_id,
    transaction.transaction_id
  );
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
