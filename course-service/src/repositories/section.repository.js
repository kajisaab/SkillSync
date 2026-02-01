/**
 * Section Repository
 * Database operations for sections table
 */

const { query } = require('../config/database');
const { handleDatabaseError } = require('../utils/error.util');

const create = async (sectionData) => {
  const { courseId, title, orderIndex } = sectionData;

  try {
    const result = await query(
      `INSERT INTO sections (course_id, title, order_index)
       VALUES ($1, $2, $3)
       RETURNING section_id, course_id, title, order_index, created_at`,
      [courseId, title, orderIndex]
    );

    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const findById = async (sectionId) => {
  try {
    const result = await query(
      `SELECT section_id, course_id, title, order_index, created_at
       FROM sections
       WHERE section_id = $1 AND deleted_at IS NULL`,
      [sectionId]
    );

    return result.rows[0] || null;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const findByCourseId = async (courseId) => {
  try {
    const result = await query(
      `SELECT section_id, course_id, title, order_index, created_at
       FROM sections
       WHERE course_id = $1 AND deleted_at IS NULL
       ORDER BY order_index ASC`,
      [courseId]
    );

    return result.rows;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const update = async (sectionId, updateData) => {
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

  values.push(sectionId);

  try {
    const result = await query(
      `UPDATE sections
       SET ${fields.join(', ')}
       WHERE section_id = $${paramIndex} AND deleted_at IS NULL
       RETURNING section_id, course_id, title, order_index, created_at`,
      values
    );

    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const softDelete = async (sectionId) => {
  try {
    const result = await query(
      `UPDATE sections SET deleted_at = NOW() WHERE section_id = $1 AND deleted_at IS NULL`,
      [sectionId]
    );

    return result.rowCount > 0;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const count = async (courseId) => {
  try {
    const result = await query(
      `SELECT COUNT(*) FROM sections WHERE course_id = $1 AND deleted_at IS NULL`,
      [courseId]
    );

    return parseInt(result.rows[0].count);
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

module.exports = {
  create,
  findById,
  findByCourseId,
  update,
  softDelete,
  count,
};
