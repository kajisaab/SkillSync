/**
 * Section Routes
 * Defines API endpoints for section management
 */

const express = require('express');
const router = express.Router();

const sectionController = require('../controllers/section.controller');
const { authenticate, requireInstructor, optionalAuth } = require('../middlewares/auth.middleware');
const { validateBody, validateParams } = require('../middlewares/validation.middleware');
const {
  createSectionSchema,
  updateSectionSchema,
} = require('../validators/course.validator');
const Joi = require('joi');

// UUID validation schemas for params
const courseIdParamSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
});

const sectionIdParamSchema = Joi.object({
  sectionId: Joi.string().uuid().required(),
});

/**
 * GET /api/courses/:courseId/sections
 * Get all sections for a course
 * Public access (with optional auth for instructor context)
 */
router.get(
  '/courses/:courseId/sections',
  optionalAuth,
  validateParams(courseIdParamSchema),
  sectionController.getSectionsByCourseId
);

/**
 * POST /api/courses/:courseId/sections
 * Create a new section for a course
 * Instructor only (must own the course)
 */
router.post(
  '/courses/:courseId/sections',
  authenticate,
  requireInstructor,
  validateParams(courseIdParamSchema),
  validateBody(createSectionSchema),
  sectionController.createSection
);

/**
 * PUT /api/sections/:sectionId
 * Update section
 * Instructor only (must own the course)
 */
router.put(
  '/sections/:sectionId',
  authenticate,
  requireInstructor,
  validateParams(sectionIdParamSchema),
  validateBody(updateSectionSchema),
  sectionController.updateSection
);

/**
 * DELETE /api/sections/:sectionId
 * Delete section (soft delete)
 * Instructor only (must own the course)
 */
router.delete(
  '/sections/:sectionId',
  authenticate,
  requireInstructor,
  validateParams(sectionIdParamSchema),
  sectionController.deleteSection
);

module.exports = router;
