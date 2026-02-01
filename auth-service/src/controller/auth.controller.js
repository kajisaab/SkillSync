/**
 * Auth Controller
 * HTTP request handlers for authentication endpoints
 */

const authService = require("../services/auth.service");
const { asyncHandler } = require("../utils/error.util");

/**
 * Register new user
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    },
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    },
  });
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refresh(refreshToken);

  res.status(200).json({
    success: true,
    message: "Token refreshed successfully",
    data: {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    },
  });
});

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  // Token ID should be extracted from the JWT token
  const tokenId = req.body.tokenId;

  if (tokenId) {
    await authService.logout(tokenId);
  }

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

/**
 * Verify email
 * POST /api/auth/verify-email
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const result = await authService.verifyEmail(token);

  res.status(200).json({
    success: true,
    message: "Email verified successfully",
    data: result,
  });
});

/**
 * Request password reset
 * POST /api/auth/request-reset
 */
const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.requestPasswordReset(email);

  res.status(200).json({
    success: true,
    message: result.message,
    // Only include token in development
    ...(process.env.NODE_ENV === "development" && {
      resetToken: result.resetToken,
    }),
  });
});

/**
 * Reset password
 * POST /api/auth/reset-password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const result = await authService.resetPassword(token, newPassword);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Change password (authenticated)
 * POST /api/auth/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  const result = await authService.changePassword(
    userId,
    currentPassword,
    newPassword,
  );

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Get user profile (authenticated)
 * GET /api/auth/profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const user = await authService.getProfile(userId);

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * Update user profile (authenticated)
 * PUT /api/auth/profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const updatedUser = await authService.updateProfile(userId, req.body);

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: updatedUser,
  });
});

/**
 * Health check
 * GET /health
 */
const healthCheck = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Auth Service is healthy",
    timestamp: new Date().toISOString(),
    service: "auth-service",
    version: "1.0.0",
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  healthCheck,
};
