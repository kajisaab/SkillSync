/**
 * Lesson Routes
 * Defines API endpoints for lesson and resource management
 */

const express = require('express');
const router = express.Router();

const lessonController = require('../controllers/lesson.controller');
const { authenticate, requireInstructor } = require('../middlewares/auth.middleware');
const { validateBody, validateParams } = require('../middlewares/validation.middleware');
const {
  createLessonSchema,
  updateLessonSchema,
  addResourceSchema,
} = require('../validators/course.validator');
const Joi = require('joi');

// UUID validation schemas for params
const sectionIdParamSchema = Joi.object({
  sectionId: Joi.string().uuid().required(),
});

const lessonIdParamSchema = Joi.object({
  lessonId: Joi.string().uuid().required(),
});

const resourceIdParamSchema = Joi.object({
  resourceId: Joi.string().uuid().required(),
});

/**
 * GET /api/sections/:sectionId/lessons
 * Get all lessons for a section
 * Public access
 */
router.get(
  '/sections/:sectionId/lessons',
  validateParams(sectionIdParamSchema),
  lessonController.getLessonsBySectionId
);

/**
 * POST /api/sections/:sectionId/lessons
 * Create a new lesson for a section
 * Instructor only (must own the course)
 */
router.post(
  '/sections/:sectionId/lessons',
  authenticate,
  requireInstructor,
  validateParams(sectionIdParamSchema),
  validateBody(createLessonSchema),
  lessonController.createLesson
);

/**
 * GET /api/lessons/:lessonId
 * Get lesson by ID with resources
 * Public access
 */
router.get(
  '/lessons/:lessonId',
  validateParams(lessonIdParamSchema),
  lessonController.getLessonById
);

/**
 * PUT /api/lessons/:lessonId
 * Update lesson
 * Instructor only (must own the course)
 */
router.put(
  '/lessons/:lessonId',
  authenticate,
  requireInstructor,
  validateParams(lessonIdParamSchema),
  validateBody(updateLessonSchema),
  lessonController.updateLesson
);

/**
 * DELETE /api/lessons/:lessonId
 * Delete lesson (soft delete)
 * Instructor only (must own the course)
 */
router.delete(
  '/lessons/:lessonId',
  authenticate,
  requireInstructor,
  validateParams(lessonIdParamSchema),
  lessonController.deleteLesson
);

/**
 * POST /api/lessons/:lessonId/resources
 * Add resource to a lesson
 * Instructor only (must own the course)
 */
router.post(
  '/lessons/:lessonId/resources',
  authenticate,
  requireInstructor,
  validateParams(lessonIdParamSchema),
  validateBody(addResourceSchema),
  lessonController.addResource
);

/**
 * DELETE /api/resources/:resourceId
 * Delete resource
 * Instructor only (must own the course)
 */
router.delete(
  '/resources/:resourceId',
  authenticate,
  requireInstructor,
  validateParams(resourceIdParamSchema),
  lessonController.deleteResource
);

module.exports = router;
