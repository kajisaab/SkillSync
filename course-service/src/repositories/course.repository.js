/**
 * Course Repository
 * Database operations for courses table
 */

const { query } = require('../config/database');
const { handleDatabaseError } = require('../utils/error.util');

const create = async (courseData) => {
  const { instructorId, title, description, category, thumbnailUrl, price } = courseData;

  try {
    const result = await query(
      `INSERT INTO courses (instructor_id, title, description, category, thumbnail_url, price)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING course_id, instructor_id, title, description, category,
                 thumbnail_url, price, is_published, created_at, updated_at`,
      [instructorId, title, description, category, thumbnailUrl || null, price]
    );

    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const findById = async (courseId) => {
  try {
    const result = await query(
      `SELECT course_id, instructor_id, title, description, category,
              thumbnail_url, price, is_published, created_at, updated_at
       FROM courses
       WHERE course_id = $1 AND deleted_at IS NULL`,
      [courseId]
    );

    return result.rows[0] || null;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const findAll = async (filters, limit, offset) => {
  const { category, isPublished, search, instructorId } = filters;
  const conditions = ['deleted_at IS NULL'];
  const values = [];
  let paramIndex = 1;

  if (category) {
    conditions.push(`category = $${paramIndex}`);
    values.push(category);
    paramIndex++;
  }

  if (isPublished !== undefined) {
    conditions.push(`is_published = $${paramIndex}`);
    values.push(isPublished);
    paramIndex++;
  }

  if (instructorId) {
    conditions.push(`instructor_id = $${paramIndex}`);
    values.push(instructorId);
    paramIndex++;
  }

  if (search) {
    conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');
  values.push(limit, offset);

  try {
    const result = await query(
      `SELECT course_id, instructor_id, title, description, category,
              thumbnail_url, price, is_published, created_at, updated_at
       FROM courses
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      values
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM courses WHERE ${whereClause}`,
      values.slice(0, -2)
    );

    return {
      courses: result.rows,
      total: parseInt(countResult.rows[0].count),
    };
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const update = async (courseId, updateData) => {
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

  values.push(courseId);

  try {
    const result = await query(
      `UPDATE courses
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE course_id = $${paramIndex} AND deleted_at IS NULL
       RETURNING course_id, instructor_id, title, description, category,
                 thumbnail_url, price, is_published, created_at, updated_at`,
      values
    );

    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const softDelete = async (courseId) => {
  try {
    const result = await query(
      `UPDATE courses SET deleted_at = NOW() WHERE course_id = $1 AND deleted_at IS NULL`,
      [courseId]
    );

    return result.rowCount > 0;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const publish = async (courseId) => {
  try {
    const result = await query(
      `UPDATE courses SET is_published = true, updated_at = NOW()
       WHERE course_id = $1 AND deleted_at IS NULL
       RETURNING course_id, is_published`,
      [courseId]
    );

    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const unpublish = async (courseId) => {
  try {
    const result = await query(
      `UPDATE courses SET is_published = false, updated_at = NOW()
       WHERE course_id = $1 AND deleted_at IS NULL
       RETURNING course_id, is_published`,
      [courseId]
    );

    return result.rows[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

const count = async (filters = {}) => {
  const { instructorId, isPublished } = filters;
  const conditions = ['deleted_at IS NULL'];
  const values = [];
  let paramIndex = 1;

  if (instructorId) {
    conditions.push(`instructor_id = $${paramIndex}`);
    values.push(instructorId);
    paramIndex++;
  }

  if (isPublished !== undefined) {
    conditions.push(`is_published = $${paramIndex}`);
    values.push(isPublished);
  }

  try {
    const result = await query(
      `SELECT COUNT(*) FROM courses WHERE ${conditions.join(' AND ')}`,
      values
    );

    return parseInt(result.rows[0].count);
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

module.exports = {
  create,
  findById,
  findAll,
  update,
  softDelete,
  publish,
  unpublish,
  count,
};
