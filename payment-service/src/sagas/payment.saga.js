/**
 * Payment Saga Orchestrator
 * Implements the Saga Pattern for distributed transactions
 * Handles payment → enrollment flow with compensation (refund) on failure
 */

const { stripe } = require('../config/stripe');
const transactionRepository = require('../repositories/transaction.repository');
const { learningServiceClient } = require('../config/http-client');

/**
 * Saga States
 */
const SagaState = {
  STARTED: 'saga_started',
  PAYMENT_COMPLETED: 'payment_completed',
  ENROLLMENT_PENDING: 'enrollment_pending',
  ENROLLMENT_COMPLETED: 'enrollment_completed',
  COMPENSATION_STARTED: 'compensation_started',
  REFUND_COMPLETED: 'refund_completed',
  SAGA_COMPLETED: 'saga_completed',
  SAGA_FAILED: 'saga_failed',
};

/**
 * Saga Step Results
 */
class SagaStepResult {
  constructor(success, data = null, error = null) {
    this.success = success;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }

  static success(data) {
    return new SagaStepResult(true, data, null);
  }

  static failure(error) {
    return new SagaStepResult(false, null, error);
  }
}

/**
 * Payment Saga Orchestrator
 * Coordinates the distributed transaction across services
 */
class PaymentSagaOrchestrator {
  constructor(transactionId) {
    this.transactionId = transactionId;
    this.sagaLog = [];
    this.currentState = SagaState.STARTED;
  }

  /**
   * Log saga step
   */
  log(step, state, details = {}) {
    const entry = {
      step,
      state,
      timestamp: new Date().toISOString(),
      transactionId: this.transactionId,
      ...details,
    };
    this.sagaLog.push(entry);
    console.log(`[SAGA] ${step}:`, JSON.stringify(entry));
  }

  /**
   * Update saga state in transaction metadata
   */
  async updateSagaState(state, additionalMetadata = {}) {
    this.currentState = state;
    const transaction = await transactionRepository.findById(this.transactionId);

    if (transaction) {
      const metadata = {
        ...(transaction.metadata || {}),
        sagaState: state,
        sagaLog: this.sagaLog,
        lastUpdated: new Date().toISOString(),
        ...additionalMetadata,
      };

      await transactionRepository.updateMetadata(this.transactionId, metadata);
    }
  }

  /**
   * Step 1: Verify Payment Completed
   * This step confirms that Stripe payment was successful
   */
  async verifyPaymentCompleted(stripePaymentId) {
    this.log('VERIFY_PAYMENT', 'started', { stripePaymentId });

    try {
      // Verify payment with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentId);

      if (paymentIntent.status !== 'succeeded') {
        this.log('VERIFY_PAYMENT', 'failed', {
          reason: 'Payment not succeeded',
          stripeStatus: paymentIntent.status
        });
        return SagaStepResult.failure('Payment verification failed');
      }

      await this.updateSagaState(SagaState.PAYMENT_COMPLETED, {
        stripePaymentId,
        amountPaid: paymentIntent.amount,
      });

      this.log('VERIFY_PAYMENT', 'completed', {
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      });

      return SagaStepResult.success({ paymentIntent });
    } catch (error) {
      this.log('VERIFY_PAYMENT', 'error', { error: error.message });
      return SagaStepResult.failure(error.message);
    }
  }

  /**
   * Step 2: Create Enrollment
   * Calls Learning Service to enroll user in course
   */
  async createEnrollment(userId, courseId) {
    this.log('CREATE_ENROLLMENT', 'started', { userId, courseId });
    await this.updateSagaState(SagaState.ENROLLMENT_PENDING);

    try {
      const response = await learningServiceClient.post(
        '/enrollments/internal',
        {
          userId,
          courseId,
          transactionId: this.transactionId,
          source: 'payment_saga',
        },
        {
          headers: {
            'X-Internal-Service': 'payment-service',
            'X-User-Id': userId,
            'X-Saga-Transaction-Id': this.transactionId,
          },
          timeout: 10000,
        }
      );

      if (response.data && response.data.success) {
        await this.updateSagaState(SagaState.ENROLLMENT_COMPLETED, {
          enrollmentId: response.data.data.enrollmentId,
        });

        this.log('CREATE_ENROLLMENT', 'completed', {
          enrollmentId: response.data.data.enrollmentId
        });

        return SagaStepResult.success(response.data.data);
      }

      throw new Error('Enrollment response was not successful');
    } catch (error) {
      this.log('CREATE_ENROLLMENT', 'failed', {
        error: error.message,
        response: error.response?.data
      });

      // Enrollment failed - need to compensate
      return SagaStepResult.failure(error.message);
    }
  }

  /**
   * Compensation: Refund Payment
   * Called when enrollment fails after payment succeeded
   */
  async compensateWithRefund(stripePaymentId, reason) {
    this.log('COMPENSATION_REFUND', 'started', { stripePaymentId, reason });
    await this.updateSagaState(SagaState.COMPENSATION_STARTED);

    try {
      // Create refund in Stripe
      const refund = await stripe.refunds.create({
        payment_intent: stripePaymentId,
        reason: 'requested_by_customer',
        metadata: {
          saga_transaction_id: this.transactionId,
          compensation_reason: reason,
        },
      });

      // Update transaction status to refunded
      await transactionRepository.updateStatus(
        this.transactionId,
        'refunded',
        stripePaymentId
      );

      await this.updateSagaState(SagaState.REFUND_COMPLETED, {
        refundId: refund.id,
        refundAmount: refund.amount,
      });

      this.log('COMPENSATION_REFUND', 'completed', {
        refundId: refund.id,
        amount: refund.amount
      });

      return SagaStepResult.success({ refund });
    } catch (error) {
      this.log('COMPENSATION_REFUND', 'failed', { error: error.message });

      // Mark for manual intervention
      await this.updateSagaState(SagaState.SAGA_FAILED, {
        requiresManualIntervention: true,
        failureReason: `Refund failed: ${error.message}`,
      });

      return SagaStepResult.failure(error.message);
    }
  }

  /**
   * Execute the complete saga
   * Orchestrates all steps with compensation on failure
   */
  async execute(userId, courseId, stripePaymentId) {
    this.log('SAGA', 'started', { userId, courseId, stripePaymentId });

    try {
      // Step 1: Verify Payment
      const paymentResult = await this.verifyPaymentCompleted(stripePaymentId);
      if (!paymentResult.success) {
        await this.updateSagaState(SagaState.SAGA_FAILED, {
          failedStep: 'VERIFY_PAYMENT',
          reason: paymentResult.error,
        });
        return { success: false, error: 'Payment verification failed' };
      }

      // Step 2: Create Enrollment
      const enrollmentResult = await this.createEnrollment(userId, courseId);
      if (!enrollmentResult.success) {
        // Compensation: Refund the payment
        this.log('SAGA', 'compensation_triggered', {
          reason: 'Enrollment failed'
        });

        const refundResult = await this.compensateWithRefund(
          stripePaymentId,
          `Enrollment failed: ${enrollmentResult.error}`
        );

        if (refundResult.success) {
          return {
            success: false,
            compensated: true,
            error: 'Enrollment failed - payment refunded',
            refund: refundResult.data.refund,
          };
        } else {
          return {
            success: false,
            compensated: false,
            error: 'Enrollment failed and refund failed - requires manual intervention',
            requiresManualIntervention: true,
          };
        }
      }

      // All steps completed successfully
      await this.updateSagaState(SagaState.SAGA_COMPLETED);
      this.log('SAGA', 'completed', {
        enrollmentId: enrollmentResult.data.enrollmentId
      });

      return {
        success: true,
        enrollment: enrollmentResult.data,
        sagaLog: this.sagaLog,
      };
    } catch (error) {
      this.log('SAGA', 'unexpected_error', { error: error.message });
      await this.updateSagaState(SagaState.SAGA_FAILED, {
        unexpectedError: error.message,
      });

      return {
        success: false,
        error: `Saga failed unexpectedly: ${error.message}`,
      };
    }
  }
}

/**
 * Execute payment saga
 * Factory function to create and execute saga
 */
const executePaymentSaga = async (transactionId, userId, courseId, stripePaymentId) => {
  const saga = new PaymentSagaOrchestrator(transactionId);
  return saga.execute(userId, courseId, stripePaymentId);
};

module.exports = {
  PaymentSagaOrchestrator,
  executePaymentSaga,
  SagaState,
  SagaStepResult,
};
