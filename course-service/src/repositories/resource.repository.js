/**
 * Resource Repository
 * Database operations for resources table
 */

const { query } = require('../config/database');
const { handleDatabaseError } = require('../utils/error.util');

const create = async (resourceData) => {
  const { lessonId, title, fileUrl, fileType } = resourceData;

  try {
    const result = await query(
      `INSERT INTO resources (lesson_id, title, file_url, file_type)
       VALUES ($1, $2, $3, $4)
       RETURNING resource_id, lesson_id, title, file_url, file_type, created_at`,
      [lessonId, title, fileUrl, fileType]
    );

    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const findById = async (resourceId) => {
  try {
    const result = await query(
      `SELECT resource_id, lesson_id, title, file_url, file_type, created_at
       FROM resources
       WHERE resource_id = $1`,
      [resourceId]
    );

    return result.rows[0] || null;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const findByLessonId = async (lessonId) => {
  try {
    const result = await query(
      `SELECT resource_id, lesson_id, title, file_url, file_type, created_at
       FROM resources
       WHERE lesson_id = $1
       ORDER BY created_at ASC`,
      [lessonId]
    );

    return result.rows;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const deleteResource = async (resourceId) => {
  try {
    const result = await query(
      `DELETE FROM resources WHERE resource_id = $1`,
      [resourceId]
    );

    return result.rowCount > 0;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

module.exports = {
  create,
  findById,
  findByLessonId,
  deleteResource,
};
