/**
 * Authentication Middleware
 * Reads user info from headers set by nginx after centralized auth validation
 * Token validation is handled by auth-service via nginx auth_request
 */

const { UnauthorizedError, ForbiddenError } = require('../utils/error.util');

/**
 * Authenticate middleware - reads user info from nginx headers
 * Nginx validates token via auth-service and passes user info in headers
 */
const authenticate = (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const email = req.headers['x-user-email'];
    const role = req.headers['x-user-role'];

    // If headers are not present, nginx auth_request failed or wasn't used
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Attach user info to request
    req.user = {
      userId,
      email,
      role,
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
 * Require student role middleware
 */
const requireStudent = requireRole('student');

/**
 * Optional authentication - doesn't fail if headers are missing
 * Attaches user data if headers are present
 */
const optionalAuth = (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const email = req.headers['x-user-email'];
    const role = req.headers['x-user-role'];

    // If headers are present, attach user info
    if (userId) {
      req.user = {
        userId,
        email,
        role,
      };
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  requireRole,
  requireStudent,
  optionalAuth,
};
