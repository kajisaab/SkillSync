/**
 * Auth Routes
 * Define authentication API endpoints
 */

const express = require("express");
const authController = require("../controller/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validation.middleware");
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  verifyEmailSchema,
  requestResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} = require("../validators/auth.validator");

const router = express.Router();

/**
 * Public routes (no authentication required)
 */

// POST /api/auth/register - Register new user
router.post("/register", validate(registerSchema), authController.register);

// POST /api/auth/login - Login user
router.post("/login", validate(loginSchema), authController.login);

// POST /api/auth/refresh - Refresh access token
router.post("/refresh", validate(refreshSchema), authController.refresh);

// POST /api/auth/verify-email - Verify email address
router.post(
  "/verify-email",
  validate(verifyEmailSchema),
  authController.verifyEmail,
);

// POST /api/auth/request-reset - Request password reset
router.post(
  "/request-reset",
  validate(requestResetSchema),
  authController.requestPasswordReset,
);

// POST /api/auth/reset-password - Reset password with token
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  authController.resetPassword,
);

/**
 * Protected routes (authentication required)
 */

// POST /api/auth/logout - Logout user
router.post("/logout", authenticate, authController.logout);

// POST /api/auth/change-password - Change password
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);

// GET /api/auth/profile - Get user profile
router.get("/profile", authenticate, authController.getProfile);

// PUT /api/auth/profile - Update user profile
router.put(
  "/profile",
  authenticate,
  validate(updateProfileSchema),
  authController.updateProfile,
);

// GET /api/auth/validate - Validate token (used by nginx for centralized auth)
router.get("/validate", authenticate, authController.validateToken);

module.exports = router;
