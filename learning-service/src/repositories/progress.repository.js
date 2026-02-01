/**
 * Progress Repository
 * Database operations for lesson progress tracking
 */

const { query } = require('../config/database');

/**
 * Create or update progress for a lesson
 * @param {Object} progressData - Progress data
 * @returns {Promise<Object>} Progress record
 */
const upsert = async (progressData) => {
  const { enrollmentId, lessonId, isCompleted, lastPosition } = progressData;

  const result = await query(
    `INSERT INTO progress (enrollment_id, lesson_id, is_completed, last_position, completed_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (enrollment_id, lesson_id)
     DO UPDATE SET
       is_completed = EXCLUDED.is_completed,
       last_position = EXCLUDED.last_position,
       completed_at = EXCLUDED.completed_at
     RETURNING *`,
    [
      enrollmentId,
      lessonId,
      isCompleted || false,
      lastPosition || 0,
      isCompleted ? new Date() : null,
    ]
  );

  return result.rows[0];
};

/**
 * Find progress by enrollment ID and lesson ID
 * @param {string} enrollmentId - Enrollment ID
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<Object|null>} Progress or null
 */
const findByEnrollmentAndLesson = async (enrollmentId, lessonId) => {
  const result = await query(
    'SELECT * FROM progress WHERE enrollment_id = $1 AND lesson_id = $2',
    [enrollmentId, lessonId]
  );

  return result.rows[0] || null;
};

/**
 * Find all progress records for an enrollment
 * @param {string} enrollmentId - Enrollment ID
 * @returns {Promise<Array>} Progress records
 */
const findByEnrollmentId = async (enrollmentId) => {
  const result = await query(
    'SELECT * FROM progress WHERE enrollment_id = $1 ORDER BY created_at ASC',
    [enrollmentId]
  );

  return result.rows;
};

/**
 * Find all progress records for a user across all enrollments
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Progress records with enrollment info
 */
const findByUserId = async (userId) => {
  const result = await query(
    `SELECT p.*, e.course_id
     FROM progress p
     INNER JOIN enrollments e ON p.enrollment_id = e.enrollment_id
     WHERE e.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  );

  return result.rows;
};

/**
 * Count completed lessons for an enrollment
 * @param {string} enrollmentId - Enrollment ID
 * @returns {Promise<number>} Count of completed lessons
 */
const countCompletedByEnrollment = async (enrollmentId) => {
  const result = await query(
    'SELECT COUNT(*) FROM progress WHERE enrollment_id = $1 AND is_completed = true',
    [enrollmentId]
  );

  return parseInt(result.rows[0].count, 10);
};

/**
 * Get progress summary for an enrollment
 * @param {string} enrollmentId - Enrollment ID
 * @returns {Promise<Object>} Progress summary
 */
const getProgressSummary = async (enrollmentId) => {
  const result = await query(
    `SELECT
       COUNT(*) as total_lessons_started,
       COUNT(*) FILTER (WHERE is_completed = true) as completed_lessons,
       COALESCE(AVG(last_position) FILTER (WHERE NOT is_completed), 0) as avg_position
     FROM progress
     WHERE enrollment_id = $1`,
    [enrollmentId]
  );

  return result.rows[0];
};

/**
 * Update video playback position
 * @param {string} enrollmentId - Enrollment ID
 * @param {string} lessonId - Lesson ID
 * @param {number} position - Video position in seconds
 * @returns {Promise<Object>} Updated progress
 */
const updatePosition = async (enrollmentId, lessonId, position) => {
  const result = await query(
    `INSERT INTO progress (enrollment_id, lesson_id, last_position, is_completed)
     VALUES ($1, $2, $3, false)
     ON CONFLICT (enrollment_id, lesson_id)
     DO UPDATE SET
       last_position = EXCLUDED.last_position
     RETURNING *`,
    [enrollmentId, lessonId, position]
  );

  return result.rows[0];
};

/**
 * Mark lesson as completed
 * @param {string} enrollmentId - Enrollment ID
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<Object>} Updated progress
 */
const markAsCompleted = async (enrollmentId, lessonId) => {
  const result = await query(
    `INSERT INTO progress (enrollment_id, lesson_id, is_completed, completed_at)
     VALUES ($1, $2, true, CURRENT_TIMESTAMP)
     ON CONFLICT (enrollment_id, lesson_id)
     DO UPDATE SET
       is_completed = true,
       completed_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [enrollmentId, lessonId]
  );

  return result.rows[0];
};

/**
 * Get last accessed lesson for an enrollment
 * @param {string} enrollmentId - Enrollment ID
 * @returns {Promise<Object|null>} Last progress record or null
 */
const getLastAccessedLesson = async (enrollmentId) => {
  const result = await query(
    `SELECT * FROM progress
     WHERE enrollment_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [enrollmentId]
  );

  return result.rows[0] || null;
};

/**
 * Delete all progress for an enrollment (for testing)
 * @param {string} enrollmentId - Enrollment ID
 * @returns {Promise<boolean>} Success status
 */
const deleteByEnrollmentId = async (enrollmentId) => {
  await query('DELETE FROM progress WHERE enrollment_id = $1', [enrollmentId]);
  return true;
};

module.exports = {
  upsert,
  findByEnrollmentAndLesson,
  findByEnrollmentId,
  findByUserId,
  countCompletedByEnrollment,
  getProgressSummary,
  updatePosition,
  markAsCompleted,
  getLastAccessedLesson,
  deleteByEnrollmentId,
};
