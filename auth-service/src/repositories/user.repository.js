/**
 * User Repository
 * Database operations for users table
 */

const { query } = require("../config/database");
const { handleDatabaseError } = require("../utils/error.util");

/**
 * Create new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
const create = async (userData) => {
  const { email, passwordHash, role, firstName, lastName, avatarUrl } =
    userData;

  try {
    const result = await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, email, role, first_name, last_name, avatar_url,
                 is_email_verified, created_at, updated_at`,
      [email, passwordHash, role, firstName, lastName, avatarUrl || null],
    );

    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

/**
 * Find user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User object or null
 */
const findById = async (userId) => {
  try {
    const result = await query(
      `SELECT user_id, email, password_hash, role, first_name, last_name,
              avatar_url, is_email_verified, email_verification_token,
              password_reset_token, password_reset_expires, created_at, updated_at
       FROM users
       WHERE user_id = $1`,
      [userId],
    );

    return result.rows[0] || null;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null
 */
const findByEmail = async (email) => {
  try {
    const result = await query(
      `SELECT user_id, email, password_hash, role, first_name, last_name,
              avatar_url, is_email_verified, email_verification_token,
              password_reset_token, password_reset_expires, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email],
    );

    return result.rows[0] || null;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

/**
 * Find user by email verification token
 * @param {string} token - Hashed verification token
 * @returns {Promise<Object|null>} User object or null
 */
const findByVerificationToken = async (token) => {
  try {
    const result = await query(
      `SELECT user_id, email, role, first_name, last_name,
              is_email_verified, email_verification_token
       FROM users
       WHERE email_verification_token = $1`,
      [token],
    );

    return result.rows[0] || null;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

/**
 * Find user by password reset token
 * @param {string} token - Hashed reset token
 * @returns {Promise<Object|null>} User object or null
 */
const findByResetToken = async (token) => {
  try {
    const result = await query(
      `SELECT user_id, email, password_reset_token, password_reset_expires
       FROM users
       WHERE password_reset_token = $1
         AND password_reset_expires > NOW()`,
      [token],
    );

    return result.rows[0] || null;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

/**
 * Update user
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated user
 */
const update = async (userId, updateData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  // Build dynamic UPDATE query
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(updateData[key]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error("No fields to update");
  }

  values.push(userId);

  try {
    const result = await query(
      `UPDATE users
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE user_id = $${paramIndex}
       RETURNING user_id, email, role, first_name, last_name, avatar_url,
                 is_email_verified, created_at, updated_at`,
      values,
    );

    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

/**
 * Set email verification token
 * @param {string} userId - User ID
 * @param {string} hashedToken - Hashed verification token
 * @returns {Promise<void>}
 */
const setVerificationToken = async (userId, hashedToken) => {
  try {
    await query(
      `UPDATE users
       SET email_verification_token = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [hashedToken, userId],
    );
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

/**
 * Verify email
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated user
 */
const verifyEmail = async (userId) => {
  try {
    const result = await query(
      `UPDATE users
       SET is_email_verified = true,
           email_verification_token = NULL,
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING user_id, email, role, first_name, last_name,
                 is_email_verified, created_at, updated_at`,
      [userId],
    );

    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

/**
 * Set password reset token
 * @param {string} userId - User ID
 * @param {string} hashedToken - Hashed reset token
 * @param {Date} expiresAt - Token expiration time
 * @returns {Promise<void>}
 */
const setResetToken = async (userId, hashedToken, expiresAt) => {
  try {
    await query(
      `UPDATE users
       SET password_reset_token = $1,
           password_reset_expires = $2,
           updated_at = NOW()
       WHERE user_id = $3`,
      [hashedToken, expiresAt, userId],
    );
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

/**
 * Update password
 * @param {string} userId - User ID
 * @param {string} newPasswordHash - New password hash
 * @returns {Promise<void>}
 */
const updatePassword = async (userId, newPasswordHash) => {
  try {
    await query(
      `UPDATE users
       SET password_hash = $1,
           password_reset_token = NULL,
           password_reset_expires = NULL,
           updated_at = NOW()
       WHERE user_id = $2`,
      [newPasswordHash, userId],
    );
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

/**
 * Delete user (hard delete)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if deleted
 */
const deleteUser = async (userId) => {
  try {
    const result = await query(`DELETE FROM users WHERE user_id = $1`, [
      userId,
    ]);

    return result.rowCount > 0;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

/**
 * Get user count
 * @returns {Promise<number>} Total number of users
 */
const count = async () => {
  try {
    const result = await query(`SELECT COUNT(*) FROM users`);
    return parseInt(result.rows[0].count);
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

/**
 * Check if email exists
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if email exists
 */
const emailExists = async (email) => {
  try {
    const result = await query(
      `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`,
      [email],
    );

    return result.rows[0].exists;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

module.exports = {
  create,
  findById,
  findByEmail,
  findByVerificationToken,
  findByResetToken,
  update,
  setVerificationToken,
  verifyEmail,
  setResetToken,
  updatePassword,
  deleteUser,
  count,
  emailExists,
};
