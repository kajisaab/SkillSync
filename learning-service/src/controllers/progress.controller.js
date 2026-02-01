/**
 * Progress Controller
 * Handles HTTP requests for lesson progress tracking
 */

const progressService = require('../services/progress.service');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * Update lesson progress
 * POST /api/progress/update
 * @access Private
 */
const updateProgress = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const progressData = req.body;

  const progress = await progressService.updateProgress(userId, progressData);

  res.status(200).json({
    success: true,
    data: progress,
  });
});

/**
 * Update video playback position
 * POST /api/progress/position
 * @access Private
 */
const updateVideoPosition = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { courseId, lessonId, position } = req.body;

  const progress = await progressService.updateVideoPosition(userId, courseId, lessonId, position);

  res.status(200).json({
    success: true,
    data: progress,
  });
});

/**
 * Mark lesson as completed
 * POST /api/progress/complete
 * @access Private
 */
const markLessonCompleted = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { courseId, lessonId } = req.body;

  const progress = await progressService.markLessonCompleted(userId, courseId, lessonId);

  res.status(200).json({
    success: true,
    data: progress,
  });
});

/**
 * Get course progress for user
 * GET /api/progress/course/:courseId
 * @access Private
 */
const getCourseProgress = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { courseId } = req.params;

  const progress = await progressService.getCourseProgress(userId, courseId);

  res.status(200).json({
    success: true,
    data: progress,
  });
});

/**
 * Get lesson progress for user
 * GET /api/progress/lesson/:courseId/:lessonId
 * @access Private
 */
const getLessonProgress = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { courseId, lessonId } = req.params;

  const progress = await progressService.getLessonProgress(userId, courseId, lessonId);

  res.status(200).json({
    success: true,
    data: progress,
  });
});

/**
 * Get user's learning statistics
 * GET /api/progress/stats
 * @access Private
 */
const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const stats = await progressService.getUserStats(userId);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

module.exports = {
  updateProgress,
  updateVideoPosition,
  markLessonCompleted,
  getCourseProgress,
  getLessonProgress,
  getUserStats,
};
