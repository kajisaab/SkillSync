/**
 * Enrollment Service
 * Business logic for course enrollments
 */

const enrollmentRepository = require('../repositories/enrollment.repository');
const { courseServiceClient } = require('../config/http-client');
const { formatPaginatedResponse, parsePaginationParams } = require('../utils/pagination.util');
const {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ServiceUnavailableError,
} = require('../utils/error.util');

/**
 * Verify course exists and is published via Course Service
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Course data
 */
const verifyCourseExists = async (courseId) => {
  try {
    const response = await courseServiceClient.get(`/courses/${courseId}`);

    if (!response.data || !response.data.success) {
      throw new NotFoundError('Course not found');
    }

    const course = response.data.data;

    // Check if course is published
    if (!course.isPublished) {
      throw new BadRequestError('Cannot enroll in unpublished course');
    }

    return course;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new NotFoundError('Course not found');
    }

    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      throw error;
    }

    console.error('Course Service communication error:', error.message);
    throw new ServiceUnavailableError('Unable to verify course. Please try again later.');
  }
};

/**
 * Enroll a student in a course
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Enrollment details
 */
const enroll = async (userId, courseId) => {
  // Check if already enrolled
  const existingEnrollment = await enrollmentRepository.findByUserAndCourse(userId, courseId);
  if (existingEnrollment) {
    throw new ConflictError('User is already enrolled in this course');
  }

  // Verify course exists and is published
  const course = await verifyCourseExists(courseId);

  // Create enrollment
  const enrollment = await enrollmentRepository.create({ userId, courseId });

  return {
    enrollmentId: enrollment.enrollment_id,
    userId: enrollment.user_id,
    courseId: enrollment.course_id,
    courseTitle: course.title,
    progressPercentage: enrollment.progress_percentage,
    enrolledAt: enrollment.enrolled_at,
    lastAccessed: enrollment.last_accessed,
    completedAt: enrollment.completed_at,
  };
};

/**
 * Get user's enrollments with pagination
 * @param {string} userId - User ID
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>} Paginated enrollments
 */
const getUserEnrollments = async (userId, query) => {
  const { page, limit, offset } = parsePaginationParams(query);

  const { enrollments, total } = await enrollmentRepository.findByUserId(userId, limit, offset);

  // Enrich enrollments with course details
  const enrichedEnrollments = await Promise.all(
    enrollments.map(async (enrollment) => {
      try {
        const response = await courseServiceClient.get(`/courses/${enrollment.course_id}`);
        const course = response.data.data;

        return {
          enrollmentId: enrollment.enrollment_id,
          courseId: enrollment.course_id,
          courseTitle: course.title,
          courseDescription: course.description,
          courseCategory: course.category,
          courseThumbnailUrl: course.thumbnailUrl,
          instructorId: course.instructorId,
          progressPercentage: enrollment.progress_percentage,
          enrolledAt: enrollment.enrolled_at,
          lastAccessed: enrollment.last_accessed,
          completedAt: enrollment.completed_at,
        };
      } catch (error) {
        console.error(`Failed to fetch course ${enrollment.course_id}:`, error.message);
        // Return enrollment without course details if Course Service is unavailable
        return {
          enrollmentId: enrollment.enrollment_id,
          courseId: enrollment.course_id,
          courseTitle: 'Course details unavailable',
          progressPercentage: enrollment.progress_percentage,
          enrolledAt: enrollment.enrolled_at,
          lastAccessed: enrollment.last_accessed,
          completedAt: enrollment.completed_at,
        };
      }
    })
  );

  return formatPaginatedResponse(enrichedEnrollments, total, page, limit);
};

/**
 * Get enrollment by ID
 * @param {string} enrollmentId - Enrollment ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} Enrollment details
 */
const getEnrollmentById = async (enrollmentId, userId) => {
  const enrollment = await enrollmentRepository.findById(enrollmentId);

  if (!enrollment) {
    throw new NotFoundError('Enrollment not found');
  }

  // Verify user owns this enrollment
  if (enrollment.user_id !== userId) {
    throw new NotFoundError('Enrollment not found');
  }

  // Fetch course details
  try {
    const response = await courseServiceClient.get(`/courses/${enrollment.course_id}`);
    const course = response.data.data;

    return {
      enrollmentId: enrollment.enrollment_id,
      userId: enrollment.user_id,
      courseId: enrollment.course_id,
      courseTitle: course.title,
      courseDescription: course.description,
      courseCategory: course.category,
      courseThumbnailUrl: course.thumbnailUrl,
      instructorId: course.instructorId,
      progressPercentage: enrollment.progress_percentage,
      enrolledAt: enrollment.enrolled_at,
      lastAccessed: enrollment.last_accessed,
      completedAt: enrollment.completed_at,
    };
  } catch (error) {
    console.error('Failed to fetch course details:', error.message);
    // Return basic enrollment info if Course Service is unavailable
    return {
      enrollmentId: enrollment.enrollment_id,
      userId: enrollment.user_id,
      courseId: enrollment.course_id,
      progressPercentage: enrollment.progress_percentage,
      enrolledAt: enrollment.enrolled_at,
      lastAccessed: enrollment.last_accessed,
      completedAt: enrollment.completed_at,
    };
  }
};

/**
 * Check if user is enrolled in a course
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Object|null>} Enrollment or null
 */
const checkEnrollment = async (userId, courseId) => {
  const enrollment = await enrollmentRepository.findByUserAndCourse(userId, courseId);

  if (!enrollment) {
    return null;
  }

  return {
    enrollmentId: enrollment.enrollment_id,
    isEnrolled: true,
    progressPercentage: enrollment.progress_percentage,
    enrolledAt: enrollment.enrolled_at,
    completedAt: enrollment.completed_at,
  };
};

/**
 * Update last accessed timestamp for enrollment
 * @param {string} enrollmentId - Enrollment ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} Updated enrollment
 */
const updateLastAccessed = async (enrollmentId, userId) => {
  const enrollment = await enrollmentRepository.findById(enrollmentId);

  if (!enrollment) {
    throw new NotFoundError('Enrollment not found');
  }

  if (enrollment.user_id !== userId) {
    throw new NotFoundError('Enrollment not found');
  }

  const updated = await enrollmentRepository.updateLastAccessed(enrollmentId);

  return {
    enrollmentId: updated.enrollment_id,
    lastAccessed: updated.last_accessed,
  };
};

module.exports = {
  enroll,
  getUserEnrollments,
  getEnrollmentById,
  checkEnrollment,
  updateLastAccessed,
  verifyCourseExists, // Export for testing
};
