/**
 * Integration Tests for Payment API
 */

const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');
const transactionRepository = require('../../src/repositories/transaction.repository');
const { courseServiceClient } = require('../../src/config/http-client');
const { stripe } = require('../../src/config/stripe');
const jwt = require('jsonwebtoken');

// Mock external dependencies
jest.mock('../../src/config/http-client');
jest.mock('../../src/config/stripe');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key-change-in-production';

describe('Payment API Integration Tests', () => {
  let authToken;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockCourseId = '223e4567-e89b-12d3-a456-426614174001';

  beforeAll(async () => {
    // Generate test JWT token
    authToken = jwt.sign(
      {
        userId: mockUserId,
        email: 'test@example.com',
        role: 'student',
      },
      JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/payments/checkout', () => {
    const checkoutData = {
      courseId: mockCourseId,
      successUrl: 'http://localhost:5173/success',
      cancelUrl: 'http://localhost:5173/cancel',
    };

    const mockCourse = {
      course_id: mockCourseId,
      title: 'Test Course',
      description: 'Test Description',
      price: 49.99,
      thumbnail_url: 'http://example.com/thumb.jpg',
      is_published: true,
    };

    it('should create checkout session successfully', async () => {
      courseServiceClient.get.mockResolvedValue({
        data: { success: true, data: mockCourse },
      });

      jest.spyOn(transactionRepository, 'findByUserAndCourse').mockResolvedValue(null);
      jest.spyOn(transactionRepository, 'create').mockResolvedValue({
        transaction_id: 'txn_123',
        user_id: mockUserId,
        course_id: mockCourseId,
        amount: 4999,
        status: 'pending',
      });

      stripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      const response = await request(app)
        .post('/api/payments/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data).toHaveProperty('sessionUrl');
      expect(response.body.data).toHaveProperty('transactionId');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/payments/checkout')
        .send(checkoutData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Authorization header is required');
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/api/payments/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          courseId: 'invalid-uuid',
          successUrl: 'not-a-url',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 if course not found', async () => {
      courseServiceClient.get.mockRejectedValue({
        response: { status: 404 },
      });

      const response = await request(app)
        .post('/api/payments/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Course not found');
    });

    it('should return 409 if course already purchased', async () => {
      courseServiceClient.get.mockResolvedValue({
        data: { success: true, data: mockCourse },
      });

      jest.spyOn(transactionRepository, 'findByUserAndCourse').mockResolvedValue({
        transaction_id: 'existing_txn',
        status: 'succeeded',
      });

      const response = await request(app)
        .post('/api/payments/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already purchased');
    });
  });

  describe('GET /api/payments/transactions', () => {
    it('should return user transactions with pagination', async () => {
      const mockTransactions = [
        {
          transaction_id: 'txn_1',
          user_id: mockUserId,
          course_id: mockCourseId,
          amount: 4999,
          status: 'succeeded',
          created_at: new Date(),
        },
      ];

      const mockCourse = {
        course_id: mockCourseId,
        title: 'Test Course',
      };

      jest.spyOn(transactionRepository, 'findByUserId').mockResolvedValue({
        data: mockTransactions,
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });

      courseServiceClient.get.mockResolvedValue({
        data: { success: true, data: mockCourse },
      });

      const response = await request(app)
        .get('/api/payments/transactions?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      await request(app).get('/api/payments/transactions').expect(401);
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/payments/transactions?page=0&limit=1000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/payments/transactions/:transactionId', () => {
    const mockTransactionId = 'txn_123';

    it('should return transaction details', async () => {
      const mockTransaction = {
        transaction_id: mockTransactionId,
        user_id: mockUserId,
        course_id: mockCourseId,
        amount: 4999,
        status: 'succeeded',
        created_at: new Date(),
      };

      const mockCourse = {
        course_id: mockCourseId,
        title: 'Test Course',
      };

      jest.spyOn(transactionRepository, 'findById').mockResolvedValue(mockTransaction);

      courseServiceClient.get.mockResolvedValue({
        data: { success: true, data: mockCourse },
      });

      const response = await request(app)
        .get(`/api/payments/transactions/${mockTransactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction_id).toBe(mockTransactionId);
      expect(response.body.data.courseDetails).toBeDefined();
    });

    it('should return 404 for non-existent transaction', async () => {
      jest.spyOn(transactionRepository, 'findById').mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/payments/transactions/${mockTransactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for unauthorized access', async () => {
      const mockTransaction = {
        transaction_id: mockTransactionId,
        user_id: 'different-user',
        course_id: mockCourseId,
      };

      jest.spyOn(transactionRepository, 'findById').mockResolvedValue(mockTransaction);

      const response = await request(app)
        .get(`/api/payments/transactions/${mockTransactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/payments/stats', () => {
    it('should return user payment statistics', async () => {
      const mockStats = {
        total_transactions: 5,
        total_spent: 24995,
        successful_payments: 4,
        failed_payments: 1,
      };

      jest.spyOn(transactionRepository, 'getUserStats').mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/payments/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });

    it('should return 401 without authentication', async () => {
      await request(app).get('/api/payments/stats').expect(401);
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.service).toBe('payment-service');
    });
  });
});
