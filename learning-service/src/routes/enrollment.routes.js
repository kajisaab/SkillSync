/**
 * Enrollment Routes
 * API endpoints for course enrollments
 */

const express = require('express');
const router = express.Router();

const enrollmentController = require('../controllers/enrollment.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateBody, validateParams, validateQuery } = require('../middlewares/validation.middleware');
const {
  createEnrollmentSchema,
  enrollmentIdParamSchema,
  courseIdParamSchema,
  paginationQuerySchema,
} = require('../validators/learning.validator');

/**
 * POST /api/enrollments
 * Enroll in a course
 * Private access (requires authentication)
 */
router.post(
  '/',
  authenticate,
  validateBody(createEnrollmentSchema),
  enrollmentController.enrollInCourse
);

/**
 * GET /api/enrollments
 * Get user's enrollments with pagination
 * Private access
 */
router.get(
  '/',
  authenticate,
  validateQuery(paginationQuerySchema),
  enrollmentController.getUserEnrollments
);

/**
 * GET /api/enrollments/check/:courseId
 * Check enrollment status for a course
 * Private access
 */
router.get(
  '/check/:courseId',
  authenticate,
  validateParams(courseIdParamSchema),
  enrollmentController.checkEnrollmentStatus
);

/**
 * GET /api/enrollments/:enrollmentId
 * Get enrollment by ID
 * Private access
 */
router.get(
  '/:enrollmentId',
  authenticate,
  validateParams(enrollmentIdParamSchema),
  enrollmentController.getEnrollmentById
);

/**
 * POST /api/enrollments/internal
 * Internal enrollment endpoint for service-to-service calls
 * Called by Payment Service during Saga execution
 * No external authentication - uses internal service header validation
 */
router.post(
  '/internal',
  enrollmentController.internalEnroll
);

module.exports = router;
