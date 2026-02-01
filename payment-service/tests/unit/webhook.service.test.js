/**
 * Unit Tests for Webhook Service
 */

const webhookService = require('../../src/services/webhook.service');
const transactionRepository = require('../../src/repositories/transaction.repository');
const { learningServiceClient } = require('../../src/config/http-client');
const { stripe, webhookSecret } = require('../../src/config/stripe');
const { BadRequestError } = require('../../src/utils/error.util');

// Mock dependencies
jest.mock('../../src/repositories/transaction.repository');
jest.mock('../../src/config/http-client');
jest.mock('../../src/config/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
  webhookSecret: 'whsec_test_secret',
}));

describe('Webhook Service - verifyWebhookSignature', () => {
  const mockRawBody = Buffer.from(JSON.stringify({ type: 'test.event' }));
  const mockSignature = 't=123,v1=abc';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should verify signature successfully', () => {
    const mockEvent = { type: 'checkout.session.completed', id: 'evt_123' };
    stripe.webhooks.constructEvent.mockReturnValue(mockEvent);

    const result = webhookService.verifyWebhookSignature(mockRawBody, mockSignature);

    expect(result).toEqual(mockEvent);
    expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
      mockRawBody,
      mockSignature,
      webhookSecret
    );
  });

  it('should throw BadRequestError on signature verification failure', () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    expect(() => webhookService.verifyWebhookSignature(mockRawBody, mockSignature)).toThrow(
      BadRequestError
    );
  });
});

describe('Webhook Service - handleCheckoutSessionCompleted', () => {
  const mockSession = {
    id: 'cs_test_123',
    metadata: {
      transactionId: 'txn_123',
      userId: 'user_123',
      courseId: 'course_123',
    },
    client_reference_id: 'user_123',
    payment_intent: 'pi_123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle checkout session completed successfully', async () => {
    const mockTransaction = {
      transaction_id: 'txn_123',
      user_id: 'user_123',
      course_id: 'course_123',
      status: 'pending',
    };

    transactionRepository.findById.mockResolvedValue(mockTransaction);
    transactionRepository.updateStatus.mockResolvedValue({});
    learningServiceClient.post.mockResolvedValue({
      data: { success: true },
    });

    await webhookService.handleCheckoutSessionCompleted(mockSession);

    expect(transactionRepository.updateStatus).toHaveBeenCalledWith(
      'txn_123',
      'succeeded',
      'pi_123'
    );
    expect(learningServiceClient.post).toHaveBeenCalledWith(
      '/enrollments',
      { courseId: 'course_123' },
      expect.any(Object)
    );
  });

  it('should handle missing transaction gracefully', async () => {
    transactionRepository.findById.mockResolvedValue(null);

    await expect(
      webhookService.handleCheckoutSessionCompleted(mockSession)
    ).resolves.not.toThrow();

    expect(transactionRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('should handle enrollment failure gracefully', async () => {
    const mockTransaction = {
      transaction_id: 'txn_123',
      user_id: 'user_123',
      course_id: 'course_123',
      status: 'pending',
    };

    transactionRepository.findById.mockResolvedValue(mockTransaction);
    transactionRepository.updateStatus.mockResolvedValue({});
    learningServiceClient.post.mockRejectedValue(new Error('Service unavailable'));

    // Should not throw error
    await expect(
      webhookService.handleCheckoutSessionCompleted(mockSession)
    ).resolves.not.toThrow();

    // Transaction should still be marked as succeeded
    expect(transactionRepository.updateStatus).toHaveBeenCalledWith(
      'txn_123',
      'succeeded',
      'pi_123'
    );
  });

  it('should handle missing metadata gracefully', async () => {
    const sessionWithoutMetadata = {
      id: 'cs_test_123',
      metadata: {},
    };

    await expect(
      webhookService.handleCheckoutSessionCompleted(sessionWithoutMetadata)
    ).resolves.not.toThrow();

    expect(transactionRepository.findById).not.toHaveBeenCalled();
  });
});

describe('Webhook Service - handlePaymentIntentSucceeded', () => {
  const mockPaymentIntent = {
    id: 'pi_123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle payment intent succeeded successfully', async () => {
    const mockTransaction = {
      transaction_id: 'txn_123',
      user_id: 'user_123',
      course_id: 'course_123',
      status: 'pending',
    };

    transactionRepository.findByStripePaymentId.mockResolvedValue(mockTransaction);
    transactionRepository.updateStatus.mockResolvedValue({});
    learningServiceClient.post.mockResolvedValue({
      data: { success: true },
    });

    await webhookService.handlePaymentIntentSucceeded(mockPaymentIntent);

    expect(transactionRepository.updateStatus).toHaveBeenCalledWith('txn_123', 'succeeded', 'pi_123');
    expect(learningServiceClient.post).toHaveBeenCalled();
  });

  it('should skip if transaction already succeeded', async () => {
    const mockTransaction = {
      transaction_id: 'txn_123',
      user_id: 'user_123',
      course_id: 'course_123',
      status: 'succeeded',
    };

    transactionRepository.findByStripePaymentId.mockResolvedValue(mockTransaction);

    await webhookService.handlePaymentIntentSucceeded(mockPaymentIntent);

    expect(transactionRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('should handle missing transaction gracefully', async () => {
    transactionRepository.findByStripePaymentId.mockResolvedValue(null);

    await expect(webhookService.handlePaymentIntentSucceeded(mockPaymentIntent)).resolves.not.toThrow();

    expect(transactionRepository.updateStatus).not.toHaveBeenCalled();
  });
});

describe('Webhook Service - handlePaymentIntentFailed', () => {
  const mockPaymentIntent = {
    id: 'pi_123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should mark transaction as failed', async () => {
    const mockTransaction = {
      transaction_id: 'txn_123',
      user_id: 'user_123',
      course_id: 'course_123',
      status: 'pending',
    };

    transactionRepository.findByStripePaymentId.mockResolvedValue(mockTransaction);
    transactionRepository.updateStatus.mockResolvedValue({});

    await webhookService.handlePaymentIntentFailed(mockPaymentIntent);

    expect(transactionRepository.updateStatus).toHaveBeenCalledWith('txn_123', 'failed', 'pi_123');
  });

  it('should handle missing transaction gracefully', async () => {
    transactionRepository.findByStripePaymentId.mockResolvedValue(null);

    await expect(webhookService.handlePaymentIntentFailed(mockPaymentIntent)).resolves.not.toThrow();

    expect(transactionRepository.updateStatus).not.toHaveBeenCalled();
  });
});

describe('Webhook Service - processWebhookEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process checkout.session.completed event', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      id: 'evt_123',
      data: {
        object: {
          id: 'cs_123',
          metadata: {
            transactionId: 'txn_123',
            userId: 'user_123',
            courseId: 'course_123',
          },
          payment_intent: 'pi_123',
        },
      },
    };

    const mockTransaction = {
      transaction_id: 'txn_123',
      user_id: 'user_123',
      course_id: 'course_123',
    };

    transactionRepository.findById.mockResolvedValue(mockTransaction);
    transactionRepository.updateStatus.mockResolvedValue({});
    learningServiceClient.post.mockResolvedValue({
      data: { success: true },
    });

    const result = await webhookService.processWebhookEvent(mockEvent);

    expect(result).toEqual({
      received: true,
      eventType: 'checkout.session.completed',
      eventId: 'evt_123',
    });
  });

  it('should handle unhandled event types', async () => {
    const mockEvent = {
      type: 'some.unhandled.event',
      id: 'evt_123',
      data: { object: {} },
    };

    const result = await webhookService.processWebhookEvent(mockEvent);

    expect(result).toEqual({
      received: true,
      eventType: 'some.unhandled.event',
      eventId: 'evt_123',
    });
  });
});

describe('Webhook Service - triggerEnrollment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger enrollment successfully', async () => {
    const mockEnrollment = {
      enrollment_id: 'enr_123',
      user_id: 'user_123',
      course_id: 'course_123',
    };

    learningServiceClient.post.mockResolvedValue({
      data: {
        success: true,
        data: mockEnrollment,
      },
    });

    const result = await webhookService.triggerEnrollment('user_123', 'course_123');

    expect(result).toEqual(mockEnrollment);
    expect(learningServiceClient.post).toHaveBeenCalledWith(
      '/enrollments',
      { courseId: 'course_123' },
      {
        headers: {
          'X-Internal-Service': 'payment-service',
          'X-User-Id': 'user_123',
        },
      }
    );
  });

  it('should return null on enrollment failure', async () => {
    learningServiceClient.post.mockRejectedValue(new Error('Service unavailable'));

    const result = await webhookService.triggerEnrollment('user_123', 'course_123');

    expect(result).toBeNull();
  });
});
