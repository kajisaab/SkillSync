/**
 * Unit Tests for Payment Service
 */

const paymentService = require('../../src/services/payment.service');
const transactionRepository = require('../../src/repositories/transaction.repository');
const { courseServiceClient } = require('../../src/config/http-client');
const { stripe } = require('../../src/config/stripe');
const { NotFoundError, ConflictError } = require('../../src/utils/error.util');

// Mock dependencies
jest.mock('../../src/repositories/transaction.repository');
jest.mock('../../src/config/http-client');
jest.mock('../../src/config/stripe');

describe('Payment Service - createCheckoutSession', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockCourseId = '223e4567-e89b-12d3-a456-426614174001';
  const mockSuccessUrl = 'http://localhost:5173/success';
  const mockCancelUrl = 'http://localhost:5173/cancel';

  const mockCourse = {
    course_id: mockCourseId,
    title: 'Test Course',
    description: 'Test Description',
    price: 49.99,
    thumbnail_url: 'http://example.com/thumb.jpg',
    is_published: true,
  };

  const mockTransaction = {
    transaction_id: '323e4567-e89b-12d3-a456-426614174002',
    user_id: mockUserId,
    course_id: mockCourseId,
    amount: 4999,
    currency: 'usd',
    status: 'pending',
  };

  const mockStripeSession = {
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/pay/cs_test_123',
    payment_intent: 'pi_test_123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create checkout session successfully', async () => {
    // Mock course service response
    courseServiceClient.get.mockResolvedValue({
      data: {
        success: true,
        data: mockCourse,
      },
    });

    // Mock no existing purchase
    transactionRepository.findByUserAndCourse.mockResolvedValue(null);

    // Mock transaction creation
    transactionRepository.create.mockResolvedValue(mockTransaction);

    // Mock Stripe session creation
    stripe.checkout.sessions.create.mockResolvedValue(mockStripeSession);

    // Mock transaction update
    transactionRepository.updateStatus.mockResolvedValue({});

    const result = await paymentService.createCheckoutSession(
      mockUserId,
      mockCourseId,
      mockSuccessUrl,
      mockCancelUrl
    );

    expect(result).toEqual({
      sessionId: mockStripeSession.id,
      sessionUrl: mockStripeSession.url,
      transactionId: mockTransaction.transaction_id,
    });

    expect(courseServiceClient.get).toHaveBeenCalledWith(`/courses/${mockCourseId}`);
    expect(transactionRepository.findByUserAndCourse).toHaveBeenCalledWith(mockUserId, mockCourseId);
    expect(transactionRepository.create).toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).toHaveBeenCalled();
  });

  it('should throw NotFoundError if course does not exist', async () => {
    courseServiceClient.get.mockRejectedValue({
      response: { status: 404 },
    });

    await expect(
      paymentService.createCheckoutSession(mockUserId, mockCourseId, mockSuccessUrl, mockCancelUrl)
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw ConflictError if course already purchased', async () => {
    courseServiceClient.get.mockResolvedValue({
      data: { success: true, data: mockCourse },
    });

    transactionRepository.findByUserAndCourse.mockResolvedValue({
      ...mockTransaction,
      status: 'succeeded',
    });

    await expect(
      paymentService.createCheckoutSession(mockUserId, mockCourseId, mockSuccessUrl, mockCancelUrl)
    ).rejects.toThrow(ConflictError);
  });

  it('should throw error if course is not published', async () => {
    courseServiceClient.get.mockResolvedValue({
      data: {
        success: true,
        data: { ...mockCourse, is_published: false },
      },
    });

    await expect(
      paymentService.createCheckoutSession(mockUserId, mockCourseId, mockSuccessUrl, mockCancelUrl)
    ).rejects.toThrow('Course is not available for purchase');
  });

  it('should mark transaction as failed if Stripe fails', async () => {
    courseServiceClient.get.mockResolvedValue({
      data: { success: true, data: mockCourse },
    });

    transactionRepository.findByUserAndCourse.mockResolvedValue(null);
    transactionRepository.create.mockResolvedValue(mockTransaction);
    stripe.checkout.sessions.create.mockRejectedValue(new Error('Stripe error'));
    transactionRepository.updateStatus.mockResolvedValue({});

    await expect(
      paymentService.createCheckoutSession(mockUserId, mockCourseId, mockSuccessUrl, mockCancelUrl)
    ).rejects.toThrow('Stripe error');

    expect(transactionRepository.updateStatus).toHaveBeenCalledWith(
      mockTransaction.transaction_id,
      'failed',
      null
    );
  });
});

describe('Payment Service - getUserTransactions', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  it('should return paginated transactions with course enrichment', async () => {
    const mockTransactions = [
      {
        transaction_id: '1',
        course_id: 'course-1',
        amount: 4999,
        status: 'succeeded',
      },
    ];

    const mockCourse = {
      course_id: 'course-1',
      title: 'Test Course',
    };

    transactionRepository.findByUserId.mockResolvedValue({
      data: mockTransactions,
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    courseServiceClient.get.mockResolvedValue({
      data: { success: true, data: mockCourse },
    });

    const result = await paymentService.getUserTransactions(mockUserId, { page: 1, limit: 10 });

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].courseDetails).toEqual(mockCourse);
    expect(result.pagination.total).toBe(1);
  });

  it('should handle course service errors gracefully', async () => {
    const mockTransactions = [
      {
        transaction_id: '1',
        course_id: 'course-1',
        amount: 4999,
        status: 'succeeded',
      },
    ];

    transactionRepository.findByUserId.mockResolvedValue({
      data: mockTransactions,
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    courseServiceClient.get.mockRejectedValue(new Error('Service unavailable'));

    const result = await paymentService.getUserTransactions(mockUserId, { page: 1, limit: 10 });

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].courseDetails).toBeNull();
  });
});

describe('Payment Service - getTransactionById', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockTransactionId = '323e4567-e89b-12d3-a456-426614174002';

  it('should return transaction with course details', async () => {
    const mockTransaction = {
      transaction_id: mockTransactionId,
      user_id: mockUserId,
      course_id: 'course-1',
      amount: 4999,
      status: 'succeeded',
    };

    const mockCourse = {
      course_id: 'course-1',
      title: 'Test Course',
    };

    transactionRepository.findById.mockResolvedValue(mockTransaction);
    courseServiceClient.get.mockResolvedValue({
      data: { success: true, data: mockCourse },
    });

    const result = await paymentService.getTransactionById(mockTransactionId, mockUserId);

    expect(result.transaction_id).toBe(mockTransactionId);
    expect(result.courseDetails).toEqual(mockCourse);
  });

  it('should throw NotFoundError if transaction does not exist', async () => {
    transactionRepository.findById.mockResolvedValue(null);

    await expect(paymentService.getTransactionById(mockTransactionId, mockUserId)).rejects.toThrow(
      NotFoundError
    );
  });

  it('should throw error if transaction belongs to different user', async () => {
    const mockTransaction = {
      transaction_id: mockTransactionId,
      user_id: 'different-user',
      course_id: 'course-1',
    };

    transactionRepository.findById.mockResolvedValue(mockTransaction);

    await expect(paymentService.getTransactionById(mockTransactionId, mockUserId)).rejects.toThrow(
      'Unauthorized access to transaction'
    );
  });
});

describe('Payment Service - getUserStats', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  it('should return user payment statistics', async () => {
    const mockStats = {
      total_transactions: 5,
      total_spent: 24995,
      successful_payments: 4,
      failed_payments: 1,
    };

    transactionRepository.getUserStats.mockResolvedValue(mockStats);

    const result = await paymentService.getUserStats(mockUserId);

    expect(result).toEqual(mockStats);
    expect(transactionRepository.getUserStats).toHaveBeenCalledWith(mockUserId);
  });
});
