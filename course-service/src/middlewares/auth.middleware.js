/**
 * Authentication Middleware
 * Verifies JWT tokens and enforces role-based access control
 */

const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../utils/error.util');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key-change-in-production';

/**
 * Verify JWT access token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 * @throws {UnauthorizedError} If token is invalid or expired
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Access token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Invalid access token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
};

/**
 * Authenticate middleware - verifies JWT token
 * Attaches user data to req.user if valid
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Authorization header is required');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Invalid authorization format. Use: Bearer <token>');
    }

    const token = authHeader.substring(7);

    if (!token) {
      throw new UnauthorizedError('Access token is required');
    }

    const decoded = verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require specific role(s) middleware
 * Must be used after authenticate middleware
 * @param {...string} allowedRoles - Allowed role names
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new ForbiddenError(`Access denied. Required role: ${allowedRoles.join(' or ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require instructor role middleware
 * Shorthand for requireRole('instructor')
 */
const requireInstructor = requireRole('instructor');

/**
 * Optional authentication - doesn't fail if token is missing
 * Attaches user data if token is present and valid
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user data
      return next();
    }

    const token = authHeader.substring(7);

    if (!token) {
      return next();
    }

    try {
      const decoded = verifyAccessToken(token);
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      // Token invalid, but don't fail - just continue without user data
      // This allows public access to endpoints while still providing user context when available
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  requireRole,
  requireInstructor,
  optionalAuth,
  verifyAccessToken, // Export for testing
};
