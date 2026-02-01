/**
 * Course Validation Schemas
 * Input validation using Joi
 */

const Joi = require('joi');

const createCourseSchema = Joi.object({
  title: Joi.string().min(3).max(255).required().trim(),
  description: Joi.string().min(10).required().trim(),
  category: Joi.string().required().trim(),
  thumbnailUrl: Joi.string().uri().optional().allow(null, ''),
  price: Joi.number().min(0).required(),
});

const updateCourseSchema = Joi.object({
  title: Joi.string().min(3).max(255).optional().trim(),
  description: Joi.string().min(10).optional().trim(),
  category: Joi.string().optional().trim(),
  thumbnailUrl: Joi.string().uri().optional().allow(null, ''),
  price: Joi.number().min(0).optional(),
}).min(1);

const getCourseListSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  category: Joi.string().optional(),
  isPublished: Joi.string().valid('true', 'false').optional(),
  search: Joi.string().optional(),
  instructorId: Joi.string().uuid().optional(),
});

const createSectionSchema = Joi.object({
  title: Joi.string().min(1).max(255).required().trim(),
  orderIndex: Joi.number().integer().min(0).optional(),
});

const updateSectionSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional().trim(),
  orderIndex: Joi.number().integer().min(0).optional(),
}).min(1);

const createLessonSchema = Joi.object({
  title: Joi.string().min(1).max(255).required().trim(),
  description: Joi.string().optional().allow(null, '').trim(),
  videoUrl: Joi.string().uri().optional().allow(null, ''),
  videoDuration: Joi.number().integer().min(0).optional().allow(null),
  orderIndex: Joi.number().integer().min(0).optional(),
});

const updateLessonSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional().trim(),
  description: Joi.string().optional().allow(null, '').trim(),
  videoUrl: Joi.string().uri().optional().allow(null, ''),
  videoDuration: Joi.number().integer().min(0).optional().allow(null),
  orderIndex: Joi.number().integer().min(0).optional(),
}).min(1);

const addResourceSchema = Joi.object({
  title: Joi.string().min(1).max(255).required().trim(),
  fileUrl: Joi.string().uri().required(),
  fileType: Joi.string().required(),
});

const uploadRequestSchema = Joi.object({
  fileType: Joi.string().required(),
  folder: Joi.string().valid('videos', 'resources', 'thumbnails').required(),
});

module.exports = {
  createCourseSchema,
  updateCourseSchema,
  getCourseListSchema,
  createSectionSchema,
  updateSectionSchema,
  createLessonSchema,
  updateLessonSchema,
  addResourceSchema,
  uploadRequestSchema,
};
