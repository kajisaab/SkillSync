/**
 * Authentication Middleware
 * Reads user info from headers set by nginx after centralized auth validation
 * Token validation is handled by auth-service via nginx auth_request
 */

const { UnauthorizedError } = require('../utils/error.util');

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

module.exports = {
  authenticate,
};
