/**
 * Password Utility Functions
 * Secure password hashing and comparison using bcrypt
 */

const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error("Error hashing password:", error.message);
    throw new Error("Failed to hash password");
  }
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
const comparePassword = async (password, hash) => {
  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    console.error("Error comparing password:", error.message);
    throw new Error("Failed to compare password");
  }
};

/**
 * Validate password strength
 * Minimum 8 characters, at least one uppercase, one lowercase, one number
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
const validatePasswordStrength = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Generate random token for email verification or password reset
 * @param {number} length - Token length in bytes (default 32)
 * @returns {string} Random hex token
 */
const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Hash token for storage (prevents token theft if database is compromised)
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Generate password reset token with expiry
 * @returns {Object} Token and hashed token
 */
const generatePasswordResetToken = () => {
  const token = generateRandomToken();
  const hashedToken = hashToken(token);

  return {
    token, // Send this to user
    hashedToken, // Store this in database
  };
};

/**
 * Generate email verification token
 * @returns {Object} Token and hashed token
 */
const generateEmailVerificationToken = () => {
  const token = generateRandomToken();
  const hashedToken = hashToken(token);

  return {
    token, // Send this to user
    hashedToken, // Store this in database
  };
};

module.exports = {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateRandomToken,
  hashToken,
  generatePasswordResetToken,
  generateEmailVerificationToken,
};
