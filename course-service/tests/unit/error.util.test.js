/**
 * Unit Tests: Error Utilities
 */

const {
  APIError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
} = require('../../src/utils/error.util');

describe('Error Utilities', () => {
  describe('APIError', () => {
    it('should create API error with correct properties', () => {
      const error = new APIError('Test error', 500, 'TEST_ERROR');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(APIError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('APIError');
    });

    it('should use default code if not provided', () => {
      const error = new APIError('Test error', 500);

      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('BadRequestError', () => {
    it('should create 400 error with correct properties', () => {
      const error = new BadRequestError('Invalid input');

      expect(error).toBeInstanceOf(APIError);
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.isOperational).toBe(true);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create 401 error with correct properties', () => {
      const error = new UnauthorizedError('Authentication required');

      expect(error).toBeInstanceOf(APIError);
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ForbiddenError', () => {
    it('should create 403 error with correct properties', () => {
      const error = new ForbiddenError('Access denied');

      expect(error).toBeInstanceOf(APIError);
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.isOperational).toBe(true);
    });
  });

  describe('NotFoundError', () => {
    it('should create 404 error with correct properties', () => {
      const error = new NotFoundError('Resource not found');

      expect(error).toBeInstanceOf(APIError);
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ConflictError', () => {
    it('should create 409 error with correct properties', () => {
      const error = new ConflictError('Resource already exists');

      expect(error).toBeInstanceOf(APIError);
      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should create 422 error with correct properties', () => {
      const error = new ValidationError('Validation failed');

      expect(error).toBeInstanceOf(APIError);
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.isOperational).toBe(true);
    });
  });

  describe('InternalServerError', () => {
    it('should create 500 error with correct properties', () => {
      const error = new InternalServerError('Server error');

      expect(error).toBeInstanceOf(APIError);
      expect(error.message).toBe('Server error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.isOperational).toBe(true);
    });
  });

  describe('Error inheritance', () => {
    it('should maintain correct prototype chain', () => {
      const errors = [
        new BadRequestError('test'),
        new UnauthorizedError('test'),
        new ForbiddenError('test'),
        new NotFoundError('test'),
        new ConflictError('test'),
        new ValidationError('test'),
        new InternalServerError('test'),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(APIError);
      });
    });

    it('should have correct stack trace', () => {
      const error = new BadRequestError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('BadRequestError');
      expect(error.stack).toContain('Test error');
    });
  });
});
