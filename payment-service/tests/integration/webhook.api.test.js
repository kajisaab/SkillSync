/**
 * Integration Tests for Webhook API
 */

const request = require('supertest');
const app = require('../../src/app');
const transactionRepository = require('../../src/repositories/transaction.repository');
const { learningServiceClient } = require('../../src/config/http-client');
const { stripe } = require('../../src/config/stripe');

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

describe('Webhook API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/payments/webhook', () => {
    const mockSignature = 't=123,v1=abc';

    it('should process checkout.session.completed webhook', async () => {
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
        status: 'pending',
      };

      stripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      transactionRepository.findById.mockResolvedValue(mockTransaction);
      transactionRepository.updateStatus.mockResolvedValue({});
      learningServiceClient.post.mockResolvedValue({
        data: { success: true },
      });

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', mockSignature)
        .send(JSON.stringify(mockEvent))
        .expect(200);

      expect(response.body.received).toBe(true);
      expect(response.body.eventType).toBe('checkout.session.completed');
      expect(transactionRepository.updateStatus).toHaveBeenCalledWith('txn_123', 'succeeded', 'pi_123');
    });

    it('should process payment_intent.succeeded webhook', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        id: 'evt_456',
        data: {
          object: {
            id: 'pi_456',
          },
        },
      };

      const mockTransaction = {
        transaction_id: 'txn_456',
        user_id: 'user_456',
        course_id: 'course_456',
        status: 'pending',
      };

      stripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      transactionRepository.findByStripePaymentId.mockResolvedValue(mockTransaction);
      transactionRepository.updateStatus.mockResolvedValue({});
      learningServiceClient.post.mockResolvedValue({
        data: { success: true },
      });

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', mockSignature)
        .send(JSON.stringify(mockEvent))
        .expect(200);

      expect(response.body.received).toBe(true);
      expect(response.body.eventType).toBe('payment_intent.succeeded');
    });

    it('should process payment_intent.payment_failed webhook', async () => {
      const mockEvent = {
        type: 'payment_intent.payment_failed',
        id: 'evt_789',
        data: {
          object: {
            id: 'pi_789',
          },
        },
      };

      const mockTransaction = {
        transaction_id: 'txn_789',
        user_id: 'user_789',
        course_id: 'course_789',
        status: 'pending',
      };

      stripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      transactionRepository.findByStripePaymentId.mockResolvedValue(mockTransaction);
      transactionRepository.updateStatus.mockResolvedValue({});

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', mockSignature)
        .send(JSON.stringify(mockEvent))
        .expect(200);

      expect(response.body.received).toBe(true);
      expect(response.body.eventType).toBe('payment_intent.payment_failed');
      expect(transactionRepository.updateStatus).toHaveBeenCalledWith('txn_789', 'failed', 'pi_789');
    });

    it('should return 400 if signature is missing', async () => {
      const response = await request(app)
        .post('/api/payments/webhook')
        .send(JSON.stringify({ type: 'test.event' }))
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Missing stripe-signature');
    });

    it('should return 400 for invalid signature', async () => {
      stripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'invalid-signature')
        .send(JSON.stringify({ type: 'test.event' }))
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('signature');
    });

    it('should handle unhandled event types gracefully', async () => {
      const mockEvent = {
        type: 'some.unhandled.event',
        id: 'evt_999',
        data: { object: {} },
      };

      stripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', mockSignature)
        .send(JSON.stringify(mockEvent))
        .expect(200);

      expect(response.body.received).toBe(true);
      expect(response.body.eventType).toBe('some.unhandled.event');
    });

    it('should return 500 for processing errors', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        id: 'evt_error',
        data: {
          object: {
            id: 'cs_error',
            metadata: {
              transactionId: 'txn_error',
              userId: 'user_error',
              courseId: 'course_error',
            },
          },
        },
      };

      stripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      transactionRepository.findById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', mockSignature)
        .send(JSON.stringify(mockEvent))
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROCESSING_ERROR');
    });

    it('should still succeed payment even if enrollment fails', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        id: 'evt_enroll_fail',
        data: {
          object: {
            id: 'cs_enroll_fail',
            metadata: {
              transactionId: 'txn_enroll_fail',
              userId: 'user_enroll_fail',
              courseId: 'course_enroll_fail',
            },
            payment_intent: 'pi_enroll_fail',
          },
        },
      };

      const mockTransaction = {
        transaction_id: 'txn_enroll_fail',
        user_id: 'user_enroll_fail',
        course_id: 'course_enroll_fail',
        status: 'pending',
      };

      stripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      transactionRepository.findById.mockResolvedValue(mockTransaction);
      transactionRepository.updateStatus.mockResolvedValue({});
      learningServiceClient.post.mockRejectedValue(new Error('Learning service down'));

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', mockSignature)
        .send(JSON.stringify(mockEvent))
        .expect(200);

      expect(response.body.received).toBe(true);
      // Transaction should still be marked as succeeded
      expect(transactionRepository.updateStatus).toHaveBeenCalledWith(
        'txn_enroll_fail',
        'succeeded',
        'pi_enroll_fail'
      );
    });
  });
});
