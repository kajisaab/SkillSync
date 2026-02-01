/**
 * Unit Tests: Auth Middleware
 */

const jwt = require('jsonwebtoken');
const {
  authenticate,
  requireRole,
  requireInstructor,
  optionalAuth,
  verifyAccessToken,
} = require('../../src/middlewares/auth.middleware');
const { UnauthorizedError, ForbiddenError } = require('../../src/utils/error.util');

// Mock JWT secret
const JWT_ACCESS_SECRET = 'test-secret';
process.env.JWT_ACCESS_SECRET = JWT_ACCESS_SECRET;

describe('Auth Middleware', () => {
  describe('verifyAccessToken', () => {
    it('should verify valid token and return payload', () => {
      const payload = { userId: '123', email: 'test@test.com', role: 'instructor' };
      const token = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });

      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe('123');
      expect(decoded.email).toBe('test@test.com');
      expect(decoded.role).toBe('instructor');
    });

    it('should throw UnauthorizedError for expired token', () => {
      const payload = { userId: '123', email: 'test@test.com', role: 'instructor' };
      const token = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '-1s' });

      expect(() => verifyAccessToken(token)).toThrow(UnauthorizedError);
      expect(() => verifyAccessToken(token)).toThrow('Access token has expired');
    });

    it('should throw UnauthorizedError for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyAccessToken(invalidToken)).toThrow(UnauthorizedError);
      expect(() => verifyAccessToken(invalidToken)).toThrow('Invalid access token');
    });

    it('should throw UnauthorizedError for token with wrong secret', () => {
      const payload = { userId: '123', email: 'test@test.com', role: 'instructor' };
      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '15m' });

      expect(() => verifyAccessToken(token)).toThrow(UnauthorizedError);
    });
  });

  describe('authenticate', () => {
    let req, res, next;

    beforeEach(() => {
      req = { headers: {} };
      res = {};
      next = jest.fn();
    });

    it('should attach user to request for valid token', () => {
      const payload = { userId: '123', email: 'test@test.com', role: 'instructor' };
      const token = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });

      req.headers.authorization = `Bearer ${token}`;

      authenticate(req, res, next);

      expect(req.user).toEqual({
        userId: '123',
        email: 'test@test.com',
        role: 'instructor',
      });
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with error if no authorization header', () => {
      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(next.mock.calls[0][0].message).toBe('Authorization header is required');
    });

    it('should call next with error if invalid authorization format', () => {
      req.headers.authorization = 'InvalidFormat token';

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(next.mock.calls[0][0].message).toContain('Invalid authorization format');
    });

    it('should call next with error if token is missing', () => {
      req.headers.authorization = 'Bearer ';

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(next.mock.calls[0][0].message).toBe('Access token is required');
    });

    it('should call next with error for invalid token', () => {
      req.headers.authorization = 'Bearer invalid.token.here';

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  describe('requireRole', () => {
    let req, res, next;

    beforeEach(() => {
      req = { user: { userId: '123', email: 'test@test.com', role: 'instructor' } };
      res = {};
      next = jest.fn();
    });

    it('should call next if user has required role', () => {
      const middleware = requireRole('instructor');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with ForbiddenError if user lacks required role', () => {
      req.user.role = 'student';
      const middleware = requireRole('instructor');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(next.mock.calls[0][0].message).toContain('Required role: instructor');
    });

    it('should call next with UnauthorizedError if user not authenticated', () => {
      delete req.user;
      const middleware = requireRole('instructor');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(next.mock.calls[0][0].message).toBe('Authentication required');
    });

    it('should accept multiple allowed roles', () => {
      const middleware = requireRole('instructor', 'admin');

      req.user.role = 'instructor';
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();

      next.mockClear();

      req.user.role = 'admin';
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireInstructor', () => {
    let req, res, next;

    beforeEach(() => {
      req = { user: { userId: '123', email: 'test@test.com', role: 'instructor' } };
      res = {};
      next = jest.fn();
    });

    it('should call next if user is instructor', () => {
      requireInstructor(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with ForbiddenError if user is not instructor', () => {
      req.user.role = 'student';

      requireInstructor(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  describe('optionalAuth', () => {
    let req, res, next;

    beforeEach(() => {
      req = { headers: {} };
      res = {};
      next = jest.fn();
    });

    it('should attach user if valid token provided', () => {
      const payload = { userId: '123', email: 'test@test.com', role: 'instructor' };
      const token = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });

      req.headers.authorization = `Bearer ${token}`;

      optionalAuth(req, res, next);

      expect(req.user).toEqual({
        userId: '123',
        email: 'test@test.com',
        role: 'instructor',
      });
      expect(next).toHaveBeenCalledWith();
    });

    it('should continue without user if no token provided', () => {
      optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should continue without user if invalid token provided', () => {
      req.headers.authorization = 'Bearer invalid.token';

      optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should continue without user if authorization format is invalid', () => {
      req.headers.authorization = 'InvalidFormat token';

      optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });
  });
});
