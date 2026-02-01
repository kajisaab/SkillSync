/**
 * Auth Service
 * Business logic for authentication and authorization
 */

const userRepository = require("../repositories/user.repository");
const {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generatePasswordResetToken,
  generateEmailVerificationToken,
  hashToken,
} = require("../utils/password.util");
const {
  generateTokenPair,
  refreshAccessToken,
  revokeRefreshToken,
} = require("../utils/jwt.util");
const {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} = require("../utils/error.util");

/**
 * Register new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user with tokens
 */
const register = async (userData) => {
  const { email, password, role, firstName, lastName, avatarUrl } = userData;

  // Check if email already exists
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw new ConflictError("Email already registered");
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    throw new BadRequestError("Weak password", passwordValidation.errors);
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const newUser = await userRepository.create({
    email,
    passwordHash,
    role: role || "student",
    firstName,
    lastName,
    avatarUrl,
  });

  // Generate email verification token
  const { token: verificationToken, hashedToken } =
    generateEmailVerificationToken();
  await userRepository.setVerificationToken(newUser.user_id, hashedToken);

  // Generate tokens
  const tokens = await generateTokenPair({
    userId: newUser.user_id,
    email: newUser.email,
    role: newUser.role,
  });

  // Return user without password hash
  return {
    user: {
      userId: newUser.user_id,
      email: newUser.email,
      role: newUser.role,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      avatarUrl: newUser.avatar_url,
      isEmailVerified: newUser.is_email_verified,
      createdAt: newUser.created_at,
    },
    tokens,
    verificationToken, // Send this via email in real implementation
  };
};

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User with tokens
 */
const login = async (email, password) => {
  // Find user by email
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // Compare password
  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // Generate tokens
  const tokens = await generateTokenPair({
    userId: user.user_id,
    email: user.email,
    role: user.role,
  });

  // Return user without password hash
  return {
    user: {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      avatarUrl: user.avatar_url,
      isEmailVerified: user.is_email_verified,
      createdAt: user.created_at,
    },
    tokens,
  };
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New access token
 */
const refresh = async (refreshToken) => {
  if (!refreshToken) {
    throw new BadRequestError("Refresh token required");
  }

  try {
    const newTokens = await refreshAccessToken(refreshToken);
    return newTokens;
  } catch (error) {
    throw new UnauthorizedError(error.message);
  }
};

/**
 * Logout user (revoke refresh token)
 * @param {string} tokenId - Refresh token ID
 * @returns {Promise<void>}
 */
const logout = async (tokenId) => {
  await revokeRefreshToken(tokenId);
};

/**
 * Verify email
 * @param {string} token - Email verification token
 * @returns {Promise<Object>} Updated user
 */
const verifyEmail = async (token) => {
  if (!token) {
    throw new BadRequestError("Verification token required");
  }

  // Hash token to match stored hash
  const hashedToken = hashToken(token);

  // Find user by verification token
  const user = await userRepository.findByVerificationToken(hashedToken);
  if (!user) {
    throw new BadRequestError("Invalid or expired verification token");
  }

  if (user.is_email_verified) {
    throw new BadRequestError("Email already verified");
  }

  // Verify email
  const updatedUser = await userRepository.verifyEmail(user.user_id);

  return {
    userId: updatedUser.user_id,
    email: updatedUser.email,
    isEmailVerified: updatedUser.is_email_verified,
  };
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<Object>} Reset token
 */
const requestPasswordReset = async (email) => {
  // Find user by email
  const user = await userRepository.findByEmail(email);
  if (!user) {
    // Don't reveal if email exists (security best practice)
    return {
      message: "If the email exists, a password reset link has been sent",
    };
  }

  // Generate password reset token
  const { token, hashedToken } = generatePasswordResetToken();

  // Calculate expiry time (1 hour)
  const expiryHours = parseInt(process.env.PASSWORD_RESET_EXPIRY) || 1;
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  // Store reset token
  await userRepository.setResetToken(user.user_id, hashedToken, expiresAt);

  // Return token (send this via email in real implementation)
  return {
    message: "If the email exists, a password reset link has been sent",
    resetToken: token, // Only for development/testing
  };
};

/**
 * Reset password
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Success message
 */
const resetPassword = async (token, newPassword) => {
  if (!token || !newPassword) {
    throw new BadRequestError("Token and new password required");
  }

  // Validate new password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.isValid) {
    throw new BadRequestError("Weak password", passwordValidation.errors);
  }

  // Hash token to match stored hash
  const hashedToken = hashToken(token);

  // Find user by reset token
  const user = await userRepository.findByResetToken(hashedToken);
  if (!user) {
    throw new BadRequestError("Invalid or expired reset token");
  }

  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // Update password
  await userRepository.updatePassword(user.user_id, newPasswordHash);

  return {
    message: "Password reset successful",
  };
};

/**
 * Change password (authenticated user)
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Success message
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  // Find user
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Verify current password
  const isPasswordValid = await comparePassword(
    currentPassword,
    user.password_hash,
  );
  if (!isPasswordValid) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  // Validate new password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.isValid) {
    throw new BadRequestError("Weak password", passwordValidation.errors);
  }

  // Check if new password is same as current
  const isSamePassword = await comparePassword(newPassword, user.password_hash);
  if (isSamePassword) {
    throw new BadRequestError(
      "New password must be different from current password",
    );
  }

  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // Update password
  await userRepository.updatePassword(userId, newPasswordHash);

  return {
    message: "Password changed successfully",
  };
};

/**
 * Get user profile
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User profile
 */
const getProfile = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  return {
    userId: user.user_id,
    email: user.email,
    role: user.role,
    firstName: user.first_name,
    lastName: user.last_name,
    avatarUrl: user.avatar_url,
    isEmailVerified: user.is_email_verified,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated user
 */
const updateProfile = async (userId, updateData) => {
  const { firstName, lastName, avatarUrl } = updateData;

  const updates = {};
  if (firstName) updates.first_name = firstName;
  if (lastName) updates.last_name = lastName;
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

  if (Object.keys(updates).length === 0) {
    throw new BadRequestError("No fields to update");
  }

  const updatedUser = await userRepository.update(userId, updates);

  return {
    userId: updatedUser.user_id,
    email: updatedUser.email,
    role: updatedUser.role,
    firstName: updatedUser.first_name,
    lastName: updatedUser.last_name,
    avatarUrl: updatedUser.avatar_url,
    isEmailVerified: updatedUser.is_email_verified,
    updatedAt: updatedUser.updated_at,
  };
};

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
};
