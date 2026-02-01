/**
 * Course Routes
 * Defines API endpoints for course management
 */

const express = require('express');
const router = express.Router();

const courseController = require('../controllers/course.controller');
const { authenticate, requireInstructor, optionalAuth } = require('../middlewares/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middlewares/validation.middleware');
const {
  createCourseSchema,
  updateCourseSchema,
  getCourseListSchema,
} = require('../validators/course.validator');
const Joi = require('joi');

// UUID validation schema for params
const uuidParamSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
});

/**
 * GET /api/courses
 * Get all courses with filtering and pagination
 * Public access
 */
router.get(
  '/',
  validateQuery(getCourseListSchema),
  courseController.getCourses
);

/**
 * POST /api/courses
 * Create a new course
 * Instructor only
 */
router.post(
  '/',
  authenticate,
  requireInstructor,
  validateBody(createCourseSchema),
  courseController.createCourse
);

/**
 * GET /api/courses/:courseId
 * Get course by ID
 * Public access
 */
router.get(
  '/:courseId',
  validateParams(uuidParamSchema),
  courseController.getCourseById
);

/**
 * PUT /api/courses/:courseId
 * Update course
 * Instructor only (must own the course)
 */
router.put(
  '/:courseId',
  authenticate,
  requireInstructor,
  validateParams(uuidParamSchema),
  validateBody(updateCourseSchema),
  courseController.updateCourse
);

/**
 * DELETE /api/courses/:courseId
 * Delete course (soft delete)
 * Instructor only (must own the course)
 */
router.delete(
  '/:courseId',
  authenticate,
  requireInstructor,
  validateParams(uuidParamSchema),
  courseController.deleteCourse
);

/**
 * POST /api/courses/:courseId/publish
 * Publish course
 * Instructor only (must own the course)
 */
router.post(
  '/:courseId/publish',
  authenticate,
  requireInstructor,
  validateParams(uuidParamSchema),
  courseController.publishCourse
);

/**
 * POST /api/courses/:courseId/unpublish
 * Unpublish course
 * Instructor only (must own the course)
 */
router.post(
  '/:courseId/unpublish',
  authenticate,
  requireInstructor,
  validateParams(uuidParamSchema),
  courseController.unpublishCourse
);

module.exports = router;
