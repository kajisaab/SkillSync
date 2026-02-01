/**
 * Lesson Repository
 * Database operations for lessons table
 */

const { query } = require('../config/database');
const { handleDatabaseError } = require('../utils/error.util');

const create = async (lessonData) => {
  const { sectionId, title, description, videoUrl, videoDuration, orderIndex } = lessonData;

  try {
    const result = await query(
      `INSERT INTO lessons (section_id, title, description, video_url, video_duration, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING lesson_id, section_id, title, description, video_url,
                 video_duration, order_index, created_at`,
      [sectionId, title, description || null, videoUrl || null, videoDuration || null, orderIndex]
    );

    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const findById = async (lessonId) => {
  try {
    const result = await query(
      `SELECT lesson_id, section_id, title, description, video_url,
              video_duration, order_index, created_at
       FROM lessons
       WHERE lesson_id = $1 AND deleted_at IS NULL`,
      [lessonId]
    );

    return result.rows[0] || null;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const findBySectionId = async (sectionId) => {
  try {
    const result = await query(
      `SELECT lesson_id, section_id, title, description, video_url,
              video_duration, order_index, created_at
       FROM lessons
       WHERE section_id = $1 AND deleted_at IS NULL
       ORDER BY order_index ASC`,
      [sectionId]
    );

    return result.rows;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const update = async (lessonId, updateData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(updateData).forEach((key) => {
    if (updateData[key] !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(updateData[key]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(lessonId);

  try {
    const result = await query(
      `UPDATE lessons
       SET ${fields.join(', ')}
       WHERE lesson_id = $${paramIndex} AND deleted_at IS NULL
       RETURNING lesson_id, section_id, title, description, video_url,
                 video_duration, order_index, created_at`,
      values
    );

    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const softDelete = async (lessonId) => {
  try {
    const result = await query(
      `UPDATE lessons SET deleted_at = NOW() WHERE lesson_id = $1 AND deleted_at IS NULL`,
      [lessonId]
    );

    return result.rowCount > 0;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const count = async (sectionId) => {
  try {
    const result = await query(
      `SELECT COUNT(*) FROM lessons WHERE section_id = $1 AND deleted_at IS NULL`,
      [sectionId]
    );

    return parseInt(result.rows[0].count);
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

module.exports = {
  create,
  findById,
  findBySectionId,
  update,
  softDelete,
  count,
};
