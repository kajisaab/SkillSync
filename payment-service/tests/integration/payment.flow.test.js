const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');
const stripe = require('stripe');

// Mock Stripe
jest.mock('stripe');

describe('Payment Flow Integration Tests', () => {
  let authToken;
  let mockStripe;

  beforeAll(async () => {
    // Setup: Get auth token
    authToken = 'Bearer test_jwt_token_for_student';

    // Mock Stripe
    mockStripe = {
      checkout: {
        sessions: {
          create: jest.fn()
        }
      },
      paymentIntents: {
        retrieve: jest.fn()
      }
    };

    stripe.mockReturnValue(mockStripe);
  });

  afterAll(async () => {
    // Cleanup
    await db.query('DELETE FROM transactions WHERE user_id = $1', ['test-user-123']);
    await db.end();
  });

  describe('Complete Payment Flow', () => {
    let sessionId;
    let transactionId;

    it('should create checkout session', async () => {
      const mockSession = {
        id: 'cs_test_123456',
        url: 'https://checkout.stripe.com/pay/cs_test_123456',
        payment_intent: 'pi_test_123',
        amount_total: 4999
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const response = await request(app)
        .post('/api/payments/checkout')
        .set('Authorization', authToken)
        .send({
          course_id: 'test-course-123',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('session_id');
      expect(response.body).toHaveProperty('checkout_url');
      expect(response.body).toHaveProperty('transaction_id');

      sessionId = response.body.session_id;
      transactionId = response.body.transaction_id;
    });

    it('should handle webhook for successful payment', async () => {
      const webhookPayload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: sessionId,
            payment_intent: 'pi_test_123',
            payment_status: 'paid',
            amount_total: 4999,
            metadata: {
              transaction_id: transactionId,
              user_id: 'test-user-123',
              course_id: 'test-course-123'
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/payments/webhook')
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('received');
    });

    it('should get transaction history', async () => {
      const response = await request(app)
        .get('/api/payments/history')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get specific transaction', async () => {
      if (!transactionId) {
        return; // Skip if transaction wasn't created
      }

      const response = await request(app)
        .get(`/api/payments/transaction/${transactionId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('transaction_id', transactionId);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('POST /api/payments/checkout', () => {
    it('should return 400 if course_id is missing', async () => {
      const response = await request(app)
        .post('/api/payments/checkout')
        .set('Authorization', authToken)
        .send({
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/payments/checkout')
        .send({
          course_id: 'test-course-123',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/payments/history', () => {
    it('should return payment history for authenticated user', async () => {
      const response = await request(app)
        .get('/api/payments/history')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/payments/history');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/payments/verify', () => {
    it('should verify payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 4999,
        currency: 'usd'
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const response = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', authToken)
        .send({
          payment_intent_id: 'pi_test_123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('verified');
      expect(response.body).toHaveProperty('status');
    });

    it('should return 400 if payment_intent_id is missing', async () => {
      const response = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', authToken)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/payments/refund', () => {
    it('should process refund successfully', async () => {
      // First create a completed transaction
      const transaction = await db.query(
        'INSERT INTO transactions (user_id, course_id, amount, status, stripe_payment_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        ['test-user-123', 'test-course-123', 4999, 'completed', 'pi_test_refund']
      );

      const transactionId = transaction.rows[0].transaction_id;

      const mockRefund = {
        id: 'ref_test_123',
        amount: 4999,
        status: 'succeeded'
      };

      mockStripe.refunds = {
        create: jest.fn().mockResolvedValue(mockRefund)
      };

      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', authToken)
        .send({
          transaction_id: transactionId,
          reason: 'Customer request'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('refund');

      // Cleanup
      await db.query('DELETE FROM transactions WHERE transaction_id = $1', [transactionId]);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/payments/refund')
        .send({
          transaction_id: 'txn-123',
          reason: 'Customer request'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe API errors gracefully', async () => {
      mockStripe.checkout.sessions.create.mockRejectedValue(
        new Error('Stripe API error')
      );

      const response = await request(app)
        .post('/api/payments/checkout')
        .set('Authorization', authToken)
        .send({
          course_id: 'test-course-123',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid course gracefully', async () => {
      const response = await request(app)
        .post('/api/payments/checkout')
        .set('Authorization', authToken)
        .send({
          course_id: 'non-existent-course',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});
