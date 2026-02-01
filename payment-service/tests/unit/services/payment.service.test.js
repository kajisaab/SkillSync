const paymentService = require('../../../src/services/payment.service');
const transactionRepository = require('../../../src/repositories/transaction.repository');
const stripe = require('stripe');
const axios = require('axios');

// Mock dependencies
jest.mock('../../../src/repositories/transaction.repository');
jest.mock('stripe');
jest.mock('axios');

describe('Payment Service Tests', () => {
  let mockStripe;

  beforeEach(() => {
    jest.clearAllMocks();

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

  describe('createCheckoutSession', () => {
    it('should create Stripe checkout session successfully', async () => {
      const mockCourse = {
        course_id: 'course-123',
        title: 'Advanced JavaScript',
        price: 4999,
        instructor_id: 'instructor-123'
      };

      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        payment_intent: 'pi_123',
        amount_total: 4999
      };

      const mockTransaction = {
        transaction_id: 'txn-123',
        user_id: 'user-123',
        course_id: 'course-123',
        amount: 4999,
        status: 'pending',
        stripe_session_id: 'cs_test_123',
        created_at: new Date()
      };

      axios.get.mockResolvedValue({ data: mockCourse });
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);
      transactionRepository.create.mockResolvedValue(mockTransaction);

      const result = await paymentService.createCheckoutSession({
        user_id: 'user-123',
        course_id: 'course-123',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      });

      expect(result).toHaveProperty('session_id', 'cs_test_123');
      expect(result).toHaveProperty('checkout_url');
      expect(result).toHaveProperty('transaction_id');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
      expect(transactionRepository.create).toHaveBeenCalled();
    });

    it('should throw error if user_id is missing', async () => {
      await expect(
        paymentService.createCheckoutSession({
          course_id: 'course-123',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        })
      ).rejects.toThrow('Missing required fields');
    });

    it('should throw error if course_id is missing', async () => {
      await expect(
        paymentService.createCheckoutSession({
          user_id: 'user-123',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        })
      ).rejects.toThrow('Missing required fields');
    });

    it('should throw error if course not found', async () => {
      axios.get.mockRejectedValue({ response: { status: 404 } });

      await expect(
        paymentService.createCheckoutSession({
          user_id: 'user-123',
          course_id: 'non-existent-course',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        })
      ).rejects.toThrow('Course not found');
    });

    it('should throw error if Stripe session creation fails', async () => {
      const mockCourse = {
        course_id: 'course-123',
        title: 'Advanced JavaScript',
        price: 4999
      };

      axios.get.mockResolvedValue({ data: mockCourse });
      mockStripe.checkout.sessions.create.mockRejectedValue(new Error('Stripe API error'));

      await expect(
        paymentService.createCheckoutSession({
          user_id: 'user-123',
          course_id: 'course-123',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        })
      ).rejects.toThrow('Stripe API error');
    });

    it('should handle course with zero price', async () => {
      const mockCourse = {
        course_id: 'course-123',
        title: 'Free Course',
        price: 0
      };

      axios.get.mockResolvedValue({ data: mockCourse });

      await expect(
        paymentService.createCheckoutSession({
          user_id: 'user-123',
          course_id: 'course-123',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        })
      ).rejects.toThrow('Free courses do not require payment');
    });
  });

  describe('getTransactionById', () => {
    it('should return transaction by id', async () => {
      const mockTransaction = {
        transaction_id: 'txn-123',
        user_id: 'user-123',
        course_id: 'course-123',
        amount: 4999,
        status: 'completed',
        stripe_session_id: 'cs_test_123'
      };

      transactionRepository.findById.mockResolvedValue(mockTransaction);

      const result = await paymentService.getTransactionById('txn-123');

      expect(result).toEqual(mockTransaction);
      expect(transactionRepository.findById).toHaveBeenCalledWith('txn-123');
    });

    it('should throw error if transaction not found', async () => {
      transactionRepository.findById.mockResolvedValue(null);

      await expect(
        paymentService.getTransactionById('non-existent-id')
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('getTransactionsByUser', () => {
    it('should return all transactions for a user', async () => {
      const mockTransactions = [
        {
          transaction_id: 'txn-1',
          user_id: 'user-123',
          course_id: 'course-1',
          amount: 4999,
          status: 'completed'
        },
        {
          transaction_id: 'txn-2',
          user_id: 'user-123',
          course_id: 'course-2',
          amount: 5999,
          status: 'completed'
        }
      ];

      const mockCourses = [
        { course_id: 'course-1', title: 'Course 1' },
        { course_id: 'course-2', title: 'Course 2' }
      ];

      transactionRepository.findByUserId.mockResolvedValue(mockTransactions);
      axios.get.mockResolvedValueOnce({ data: mockCourses[0] });
      axios.get.mockResolvedValueOnce({ data: mockCourses[1] });

      const result = await paymentService.getTransactionsByUser('user-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('course_details');
      expect(transactionRepository.findByUserId).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array if no transactions found', async () => {
      transactionRepository.findByUserId.mockResolvedValue([]);

      const result = await paymentService.getTransactionsByUser('user-123');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('updateTransactionStatus', () => {
    it('should update transaction status to completed', async () => {
      const mockTransaction = {
        transaction_id: 'txn-123',
        user_id: 'user-123',
        course_id: 'course-123',
        amount: 4999,
        status: 'completed',
        stripe_payment_id: 'pi_123',
        updated_at: new Date()
      };

      transactionRepository.updateStatus.mockResolvedValue(mockTransaction);

      const result = await paymentService.updateTransactionStatus('txn-123', 'completed', 'pi_123');

      expect(result.status).toBe('completed');
      expect(result.stripe_payment_id).toBe('pi_123');
      expect(transactionRepository.updateStatus).toHaveBeenCalledWith('txn-123', 'completed', 'pi_123');
    });

    it('should update transaction status to failed', async () => {
      const mockTransaction = {
        transaction_id: 'txn-123',
        status: 'failed',
        stripe_payment_id: null
      };

      transactionRepository.updateStatus.mockResolvedValue(mockTransaction);

      const result = await paymentService.updateTransactionStatus('txn-123', 'failed');

      expect(result.status).toBe('failed');
    });
  });

  describe('verifyPayment', () => {
    it('should verify successful payment', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        status: 'succeeded',
        amount: 4999,
        currency: 'usd'
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const result = await paymentService.verifyPayment('pi_123');

      expect(result).toHaveProperty('verified', true);
      expect(result).toHaveProperty('status', 'succeeded');
      expect(result).toHaveProperty('amount', 4999);
    });

    it('should return not verified for failed payment', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        status: 'failed',
        amount: 4999
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const result = await paymentService.verifyPayment('pi_123');

      expect(result).toHaveProperty('verified', false);
      expect(result).toHaveProperty('status', 'failed');
    });

    it('should handle Stripe API errors', async () => {
      mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error('Payment intent not found'));

      await expect(
        paymentService.verifyPayment('invalid-pi')
      ).rejects.toThrow('Payment intent not found');
    });
  });

  describe('calculateRevenue', () => {
    it('should calculate total revenue for instructor', async () => {
      const mockTransactions = [
        { amount: 4999, status: 'completed' },
        { amount: 5999, status: 'completed' },
        { amount: 3999, status: 'completed' }
      ];

      transactionRepository.findByInstructor.mockResolvedValue(mockTransactions);

      const result = await paymentService.calculateRevenue('instructor-123');

      expect(result).toHaveProperty('total_revenue', 14997);
      expect(result).toHaveProperty('total_sales', 3);
      expect(result).toHaveProperty('average_sale', 4999);
    });

    it('should return zero revenue if no transactions', async () => {
      transactionRepository.findByInstructor.mockResolvedValue([]);

      const result = await paymentService.calculateRevenue('instructor-123');

      expect(result).toHaveProperty('total_revenue', 0);
      expect(result).toHaveProperty('total_sales', 0);
    });

    it('should exclude pending and failed transactions', async () => {
      const mockTransactions = [
        { amount: 4999, status: 'completed' },
        { amount: 5999, status: 'pending' },
        { amount: 3999, status: 'failed' },
        { amount: 6999, status: 'completed' }
      ];

      transactionRepository.findByInstructor.mockResolvedValue(
        mockTransactions.filter(t => t.status === 'completed')
      );

      const result = await paymentService.calculateRevenue('instructor-123');

      expect(result).toHaveProperty('total_revenue', 11998);
      expect(result).toHaveProperty('total_sales', 2);
    });
  });

  describe('refundPayment', () => {
    it('should process refund successfully', async () => {
      const mockTransaction = {
        transaction_id: 'txn-123',
        stripe_payment_id: 'pi_123',
        amount: 4999,
        status: 'completed'
      };

      const mockRefund = {
        id: 'ref_123',
        amount: 4999,
        status: 'succeeded'
      };

      transactionRepository.findById.mockResolvedValue(mockTransaction);
      mockStripe.refunds = {
        create: jest.fn().mockResolvedValue(mockRefund)
      };
      transactionRepository.updateStatus.mockResolvedValue({
        ...mockTransaction,
        status: 'refunded'
      });

      const result = await paymentService.refundPayment('txn-123', 'Customer request');

      expect(result).toHaveProperty('status', 'refunded');
      expect(mockStripe.refunds.create).toHaveBeenCalled();
    });

    it('should throw error if transaction cannot be refunded', async () => {
      const mockTransaction = {
        transaction_id: 'txn-123',
        status: 'pending'
      };

      transactionRepository.findById.mockResolvedValue(mockTransaction);

      await expect(
        paymentService.refundPayment('txn-123', 'Customer request')
      ).rejects.toThrow('Transaction cannot be refunded');
    });
  });
});
