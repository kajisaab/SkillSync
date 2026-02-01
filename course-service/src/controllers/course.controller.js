/**
 * Course Controller
 * Handles HTTP requests for course management
 */

const courseService = require('../services/course.service');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * Create a new course
 * POST /api/courses
 * @access Private (Instructor only)
 */
const createCourse = asyncHandler(async (req, res) => {
  const courseData = req.body;
  const instructorId = req.user.userId;

  const course = await courseService.create(courseData, instructorId);

  res.status(201).json({
    success: true,
    data: course,
  });
});

/**
 * Get all courses with filtering and pagination
 * GET /api/courses
 * @access Public
 */
const getCourses = asyncHandler(async (req, res) => {
  const result = await courseService.findAll(req.query);

  res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
});

/**
 * Get course by ID
 * GET /api/courses/:courseId
 * @access Public
 */
const getCourseById = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await courseService.findById(courseId);

  res.status(200).json({
    success: true,
    data: course,
  });
});

/**
 * Update course
 * PUT /api/courses/:courseId
 * @access Private (Instructor only - must own the course)
 */
const updateCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const updateData = req.body;
  const instructorId = req.user.userId;

  const course = await courseService.update(courseId, updateData, instructorId);

  res.status(200).json({
    success: true,
    data: course,
  });
});

/**
 * Delete course (soft delete)
 * DELETE /api/courses/:courseId
 * @access Private (Instructor only - must own the course)
 */
const deleteCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const instructorId = req.user.userId;

  const result = await courseService.deleteCourse(courseId, instructorId);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Publish course
 * POST /api/courses/:courseId/publish
 * @access Private (Instructor only - must own the course)
 */
const publishCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const instructorId = req.user.userId;

  const result = await courseService.publish(courseId, instructorId);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Unpublish course
 * POST /api/courses/:courseId/unpublish
 * @access Private (Instructor only - must own the course)
 */
const unpublishCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const instructorId = req.user.userId;

  const result = await courseService.unpublish(courseId, instructorId);

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  publishCourse,
  unpublishCourse,
};
