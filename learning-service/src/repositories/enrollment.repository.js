/**
 * Enrollment Repository
 * Database operations for course enrollments
 */

const { query } = require('../config/database');

/**
 * Create a new enrollment
 * @param {Object} enrollmentData - Enrollment data
 * @returns {Promise<Object>} Created enrollment
 */
const create = async (enrollmentData) => {
  const { userId, courseId } = enrollmentData;

  const result = await query(
    `INSERT INTO enrollments (user_id, course_id, progress_percentage, enrolled_at, last_accessed)
     VALUES ($1, $2, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING *`,
    [userId, courseId]
  );

  return result.rows[0];
};

/**
 * Find enrollment by ID
 * @param {string} enrollmentId - Enrollment ID
 * @returns {Promise<Object|null>} Enrollment or null
 */
const findById = async (enrollmentId) => {
  const result = await query(
    'SELECT * FROM enrollments WHERE enrollment_id = $1',
    [enrollmentId]
  );

  return result.rows[0] || null;
};

/**
 * Find enrollment by user ID and course ID
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Object|null>} Enrollment or null
 */
const findByUserAndCourse = async (userId, courseId) => {
  const result = await query(
    'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [userId, courseId]
  );

  return result.rows[0] || null;
};

/**
 * Find all enrollments for a user with pagination
 * @param {string} userId - User ID
 * @param {number} limit - Items per page
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Object>} Enrollments and total count
 */
const findByUserId = async (userId, limit, offset) => {
  // Get enrollments
  const enrollmentsResult = await query(
    `SELECT * FROM enrollments
     WHERE user_id = $1
     ORDER BY enrolled_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  // Get total count
  const countResult = await query(
    'SELECT COUNT(*) FROM enrollments WHERE user_id = $1',
    [userId]
  );

  return {
    enrollments: enrollmentsResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
};

/**
 * Find all enrollments for a course with pagination
 * @param {string} courseId - Course ID
 * @param {number} limit - Items per page
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Object>} Enrollments and total count
 */
const findByCourseId = async (courseId, limit, offset) => {
  // Get enrollments
  const enrollmentsResult = await query(
    `SELECT * FROM enrollments
     WHERE course_id = $1
     ORDER BY enrolled_at DESC
     LIMIT $2 OFFSET $3`,
    [courseId, limit, offset]
  );

  // Get total count
  const countResult = await query(
    'SELECT COUNT(*) FROM enrollments WHERE course_id = $1',
    [courseId]
  );

  return {
    enrollments: enrollmentsResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
};

/**
 * Update enrollment progress
 * @param {string} enrollmentId - Enrollment ID
 * @param {number} progressPercentage - Progress percentage (0-100)
 * @returns {Promise<Object>} Updated enrollment
 */
const updateProgress = async (enrollmentId, progressPercentage) => {
  const result = await query(
    `UPDATE enrollments
     SET progress_percentage = $1,
         last_accessed = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE enrollment_id = $2
     RETURNING *`,
    [progressPercentage, enrollmentId]
  );

  return result.rows[0];
};

/**
 * Mark enrollment as completed
 * @param {string} enrollmentId - Enrollment ID
 * @returns {Promise<Object>} Updated enrollment
 */
const markAsCompleted = async (enrollmentId) => {
  const result = await query(
    `UPDATE enrollments
     SET progress_percentage = 100,
         completed_at = CURRENT_TIMESTAMP,
         last_accessed = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE enrollment_id = $1
     RETURNING *`,
    [enrollmentId]
  );

  return result.rows[0];
};

/**
 * Update last accessed timestamp
 * @param {string} enrollmentId - Enrollment ID
 * @returns {Promise<Object>} Updated enrollment
 */
const updateLastAccessed = async (enrollmentId) => {
  const result = await query(
    `UPDATE enrollments
     SET last_accessed = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE enrollment_id = $1
     RETURNING *`,
    [enrollmentId]
  );

  return result.rows[0];
};

/**
 * Count total enrollments for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Total count
 */
const countByUserId = async (userId) => {
  const result = await query(
    'SELECT COUNT(*) FROM enrollments WHERE user_id = $1',
    [userId]
  );

  return parseInt(result.rows[0].count, 10);
};

/**
 * Count total enrollments for a course
 * @param {string} courseId - Course ID
 * @returns {Promise<number>} Total count
 */
const countByCourseId = async (courseId) => {
  const result = await query(
    'SELECT COUNT(*) FROM enrollments WHERE course_id = $1',
    [courseId]
  );

  return parseInt(result.rows[0].count, 10);
};

/**
 * Delete enrollment (hard delete - for testing)
 * @param {string} enrollmentId - Enrollment ID
 * @returns {Promise<boolean>} Success status
 */
const deleteEnrollment = async (enrollmentId) => {
  await query('DELETE FROM enrollments WHERE enrollment_id = $1', [enrollmentId]);
  return true;
};

module.exports = {
  create,
  findById,
  findByUserAndCourse,
  findByUserId,
  findByCourseId,
  updateProgress,
  markAsCompleted,
  updateLastAccessed,
  countByUserId,
  countByCourseId,
  deleteEnrollment,
};
