/**
 * Learning Service Validation Schemas
 * Input validation using Joi
 */

const Joi = require('joi');

/**
 * Enrollment creation schema
 */
const createEnrollmentSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
});

/**
 * Progress update schema
 */
const updateProgressSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  lessonId: Joi.string().uuid().required(),
  lastPosition: Joi.number().integer().min(0).optional(),
  isCompleted: Joi.boolean().optional(),
}).min(1);

/**
 * Video position update schema
 */
const updateVideoPositionSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  lessonId: Joi.string().uuid().required(),
  position: Joi.number().integer().min(0).required(),
});

/**
 * Mark lesson completed schema
 */
const markLessonCompletedSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  lessonId: Joi.string().uuid().required(),
});

/**
 * Get progress query schema
 */
const getProgressQuerySchema = Joi.object({
  courseId: Joi.string().uuid().optional(),
  lessonId: Joi.string().uuid().optional(),
});

/**
 * Pagination query schema
 */
const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

/**
 * UUID param schema
 */
const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

/**
 * Course ID param schema
 */
const courseIdParamSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
});

/**
 * Enrollment ID param schema
 */
const enrollmentIdParamSchema = Joi.object({
  enrollmentId: Joi.string().uuid().required(),
});

module.exports = {
  createEnrollmentSchema,
  updateProgressSchema,
  updateVideoPositionSchema,
  markLessonCompletedSchema,
  getProgressQuerySchema,
  paginationQuerySchema,
  uuidParamSchema,
  courseIdParamSchema,
  enrollmentIdParamSchema,
};
