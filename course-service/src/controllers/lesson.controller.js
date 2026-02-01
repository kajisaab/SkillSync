/**
 * Lesson Controller
 * Handles HTTP requests for lesson and resource management
 */

const lessonService = require('../services/lesson.service');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * Create a new lesson for a section
 * POST /api/sections/:sectionId/lessons
 * @access Private (Instructor only - must own the course)
 */
const createLesson = asyncHandler(async (req, res) => {
  const { sectionId } = req.params;
  const lessonData = req.body;
  const instructorId = req.user.userId;

  const lesson = await lessonService.create(sectionId, lessonData, instructorId);

  res.status(201).json({
    success: true,
    data: lesson,
  });
});

/**
 * Get all lessons for a section
 * GET /api/sections/:sectionId/lessons
 * @access Public
 */
const getLessonsBySectionId = asyncHandler(async (req, res) => {
  const { sectionId } = req.params;

  const lessons = await lessonService.findBySectionId(sectionId);

  res.status(200).json({
    success: true,
    data: lessons,
  });
});

/**
 * Get lesson by ID with resources
 * GET /api/lessons/:lessonId
 * @access Public
 */
const getLessonById = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;

  const lesson = await lessonService.findById(lessonId);

  res.status(200).json({
    success: true,
    data: lesson,
  });
});

/**
 * Update lesson
 * PUT /api/lessons/:lessonId
 * @access Private (Instructor only - must own the course)
 */
const updateLesson = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const updateData = req.body;
  const instructorId = req.user.userId;

  const lesson = await lessonService.update(lessonId, updateData, instructorId);

  res.status(200).json({
    success: true,
    data: lesson,
  });
});

/**
 * Delete lesson (soft delete)
 * DELETE /api/lessons/:lessonId
 * @access Private (Instructor only - must own the course)
 */
const deleteLesson = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const instructorId = req.user.userId;

  const result = await lessonService.deleteLesson(lessonId, instructorId);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Add resource to a lesson
 * POST /api/lessons/:lessonId/resources
 * @access Private (Instructor only - must own the course)
 */
const addResource = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const resourceData = req.body;
  const instructorId = req.user.userId;

  const resource = await lessonService.addResource(lessonId, resourceData, instructorId);

  res.status(201).json({
    success: true,
    data: resource,
  });
});

/**
 * Delete resource
 * DELETE /api/resources/:resourceId
 * @access Private (Instructor only - must own the course)
 */
const deleteResource = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const instructorId = req.user.userId;

  const result = await lessonService.deleteResource(resourceId, instructorId);

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  createLesson,
  getLessonsBySectionId,
  getLessonById,
  updateLesson,
  deleteLesson,
  addResource,
  deleteResource,
};
