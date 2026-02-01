/**
 * Enrollment Controller
 * Handles HTTP requests for course enrollments
 */

const enrollmentService = require('../services/enrollment.service');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * Enroll in a course
 * POST /api/enrollments
 * @access Private (Students)
 */
const enrollInCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  const userId = req.user.userId;

  const enrollment = await enrollmentService.enroll(userId, courseId);

  res.status(201).json({
    success: true,
    data: enrollment,
  });
});

/**
 * Get user's enrollments
 * GET /api/enrollments
 * @access Private
 */
const getUserEnrollments = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const result = await enrollmentService.getUserEnrollments(userId, req.query);

  res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
});

/**
 * Get enrollment by ID
 * GET /api/enrollments/:enrollmentId
 * @access Private
 */
const getEnrollmentById = asyncHandler(async (req, res) => {
  const { enrollmentId } = req.params;
  const userId = req.user.userId;

  const enrollment = await enrollmentService.getEnrollmentById(enrollmentId, userId);

  res.status(200).json({
    success: true,
    data: enrollment,
  });
});

/**
 * Check enrollment status for a course
 * GET /api/enrollments/check/:courseId
 * @access Private
 */
const checkEnrollmentStatus = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.userId;

  const enrollment = await enrollmentService.checkEnrollment(userId, courseId);

  if (!enrollment) {
    return res.status(200).json({
      success: true,
      data: {
        isEnrolled: false,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: enrollment,
  });
});

module.exports = {
  enrollInCourse,
  getUserEnrollments,
  getEnrollmentById,
  checkEnrollmentStatus,
};
