/**
 * Progress Routes
 * API endpoints for lesson progress tracking
 */

const express = require('express');
const router = express.Router();

const progressController = require('../controllers/progress.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateBody, validateParams } = require('../middlewares/validation.middleware');
const {
  updateProgressSchema,
  updateVideoPositionSchema,
  markLessonCompletedSchema,
  courseIdParamSchema,
} = require('../validators/learning.validator');
const Joi = require('joi');

// Custom param schemas for progress routes
const courseLessonParamSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  lessonId: Joi.string().uuid().required(),
});

/**
 * POST /api/progress/update
 * Update lesson progress (general)
 * Private access
 */
router.post(
  '/update',
  authenticate,
  validateBody(updateProgressSchema),
  progressController.updateProgress
);

/**
 * POST /api/progress/position
 * Update video playback position
 * Private access
 */
router.post(
  '/position',
  authenticate,
  validateBody(updateVideoPositionSchema),
  progressController.updateVideoPosition
);

/**
 * POST /api/progress/complete
 * Mark lesson as completed
 * Private access
 */
router.post(
  '/complete',
  authenticate,
  validateBody(markLessonCompletedSchema),
  progressController.markLessonCompleted
);

/**
 * GET /api/progress/stats
 * Get user's learning statistics
 * Private access
 */
router.get('/stats', authenticate, progressController.getUserStats);

/**
 * GET /api/progress/course/:courseId
 * Get course progress for user
 * Private access
 */
router.get(
  '/course/:courseId',
  authenticate,
  validateParams(courseIdParamSchema),
  progressController.getCourseProgress
);

/**
 * GET /api/progress/lesson/:courseId/:lessonId
 * Get lesson progress for user
 * Private access
 */
router.get(
  '/lesson/:courseId/:lessonId',
  authenticate,
  validateParams(courseLessonParamSchema),
  progressController.getLessonProgress
);

module.exports = router;
