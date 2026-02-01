/**
 * Progress Service
 * Business logic for lesson progress tracking and completion calculation
 */

const progressRepository = require('../repositories/progress.repository');
const enrollmentRepository = require('../repositories/enrollment.repository');
const { courseServiceClient } = require('../config/http-client');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/error.util');

/**
 * Get total lesson count for a course from Course Service
 * @param {string} courseId - Course ID
 * @returns {Promise<number>} Total lesson count
 */
const getCourseLessonCount = async (courseId) => {
  try {
    // Get all sections for the course
    const sectionsResponse = await courseServiceClient.get(`/courses/${courseId}/sections`);
    const sections = sectionsResponse.data.data;

    // Get lesson count for each section
    let totalLessons = 0;
    for (const section of sections) {
      const lessonsResponse = await courseServiceClient.get(`/sections/${section.sectionId}/lessons`);
      const lessons = lessonsResponse.data.data;
      totalLessons += lessons.length;
    }

    return totalLessons;
  } catch (error) {
    console.error('Failed to get course lesson count:', error.message);
    return 0;
  }
};

/**
 * Calculate progress percentage for an enrollment
 * @param {string} enrollmentId - Enrollment ID
 * @param {string} courseId - Course ID
 * @returns {Promise<number>} Progress percentage (0-100)
 */
const calculateProgressPercentage = async (enrollmentId, courseId) => {
  const completedCount = await progressRepository.countCompletedByEnrollment(enrollmentId);
  const totalLessons = await getCourseLessonCount(courseId);

  if (totalLessons === 0) {
    return 0;
  }

  const percentage = Math.round((completedCount / totalLessons) * 100);
  return Math.min(percentage, 100);
};

/**
 * Update lesson progress (video position or completion)
 * @param {string} userId - User ID
 * @param {Object} progressData - Progress data
 * @returns {Promise<Object>} Updated progress
 */
const updateProgress = async (userId, progressData) => {
  const { courseId, lessonId, lastPosition, isCompleted } = progressData;

  // Verify user is enrolled in the course
  const enrollment = await enrollmentRepository.findByUserAndCourse(userId, courseId);
  if (!enrollment) {
    throw new ForbiddenError('User is not enrolled in this course');
  }

  // Verify lesson belongs to the course (via Course Service)
  try {
    await courseServiceClient.get(`/lessons/${lessonId}`);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new NotFoundError('Lesson not found');
    }
    throw new BadRequestError('Unable to verify lesson');
  }

  // Upsert progress
  const progress = await progressRepository.upsert({
    enrollmentId: enrollment.enrollment_id,
    lessonId,
    isCompleted: isCompleted || false,
    lastPosition: lastPosition || 0,
  });

  // Recalculate course progress percentage
  const progressPercentage = await calculateProgressPercentage(
    enrollment.enrollment_id,
    courseId
  );

  // Update enrollment progress
  await enrollmentRepository.updateProgress(enrollment.enrollment_id, progressPercentage);

  // If course is 100% complete, mark enrollment as completed
  if (progressPercentage === 100 && !enrollment.completed_at) {
    await enrollmentRepository.markAsCompleted(enrollment.enrollment_id);
  }

  return {
    progressId: progress.progress_id,
    enrollmentId: progress.enrollment_id,
    lessonId: progress.lesson_id,
    isCompleted: progress.is_completed,
    lastPosition: progress.last_position,
    completedAt: progress.completed_at,
    courseProgressPercentage: progressPercentage,
  };
};

/**
 * Get user's progress for a specific course
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Progress details
 */
const getCourseProgress = async (userId, courseId) => {
  // Verify enrollment
  const enrollment = await enrollmentRepository.findByUserAndCourse(userId, courseId);
  if (!enrollment) {
    throw new NotFoundError('Enrollment not found');
  }

  // Get all progress records for this enrollment
  const progressRecords = await progressRepository.findByEnrollmentId(enrollment.enrollment_id);

  // Get progress summary
  const summary = await progressRepository.getProgressSummary(enrollment.enrollment_id);

  // Get last accessed lesson
  const lastLesson = await progressRepository.getLastAccessedLesson(enrollment.enrollment_id);

  return {
    enrollmentId: enrollment.enrollment_id,
    courseId: enrollment.course_id,
    progressPercentage: enrollment.progress_percentage,
    completedLessons: parseInt(summary.completed_lessons, 10),
    totalLessonsStarted: parseInt(summary.total_lessons_started, 10),
    lastAccessedLesson: lastLesson
      ? {
          lessonId: lastLesson.lesson_id,
          lastPosition: lastLesson.last_position,
          isCompleted: lastLesson.is_completed,
        }
      : null,
    progressRecords: progressRecords.map((p) => ({
      progressId: p.progress_id,
      lessonId: p.lesson_id,
      isCompleted: p.is_completed,
      lastPosition: p.last_position,
      completedAt: p.completed_at,
      createdAt: p.created_at,
    })),
  };
};

/**
 * Get progress for a specific lesson
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<Object|null>} Lesson progress or null
 */
const getLessonProgress = async (userId, courseId, lessonId) => {
  // Verify enrollment
  const enrollment = await enrollmentRepository.findByUserAndCourse(userId, courseId);
  if (!enrollment) {
    throw new NotFoundError('Enrollment not found');
  }

  // Get progress for this specific lesson
  const progress = await progressRepository.findByEnrollmentAndLesson(
    enrollment.enrollment_id,
    lessonId
  );

  if (!progress) {
    return {
      lessonId,
      isCompleted: false,
      lastPosition: 0,
      hasProgress: false,
    };
  }

  return {
    progressId: progress.progress_id,
    lessonId: progress.lesson_id,
    isCompleted: progress.is_completed,
    lastPosition: progress.last_position,
    completedAt: progress.completed_at,
    hasProgress: true,
  };
};

/**
 * Mark lesson as completed
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<Object>} Updated progress
 */
const markLessonCompleted = async (userId, courseId, lessonId) => {
  return await updateProgress(userId, {
    courseId,
    lessonId,
    isCompleted: true,
    lastPosition: 0,
  });
};

/**
 * Update video playback position
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @param {string} lessonId - Lesson ID
 * @param {number} position - Video position in seconds
 * @returns {Promise<Object>} Updated progress
 */
const updateVideoPosition = async (userId, courseId, lessonId, position) => {
  if (position < 0) {
    throw new BadRequestError('Position must be a positive number');
  }

  return await updateProgress(userId, {
    courseId,
    lessonId,
    isCompleted: false,
    lastPosition: position,
  });
};

/**
 * Get user's overall learning statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Learning statistics
 */
const getUserStats = async (userId) => {
  const totalEnrollments = await enrollmentRepository.countByUserId(userId);

  // Get all enrollments
  const { enrollments } = await enrollmentRepository.findByUserId(userId, 1000, 0);

  // Count completed courses
  const completedCourses = enrollments.filter((e) => e.completed_at !== null).length;

  // Count in-progress courses
  const inProgressCourses = enrollments.filter(
    (e) => e.progress_percentage > 0 && e.completed_at === null
  ).length;

  // Calculate average progress
  const totalProgress = enrollments.reduce((sum, e) => sum + e.progress_percentage, 0);
  const averageProgress =
    totalEnrollments > 0 ? Math.round(totalProgress / totalEnrollments) : 0;

  return {
    totalEnrollments,
    completedCourses,
    inProgressCourses,
    averageProgress,
  };
};

module.exports = {
  updateProgress,
  getCourseProgress,
  getLessonProgress,
  markLessonCompleted,
  updateVideoPosition,
  getUserStats,
  calculateProgressPercentage, // Export for testing
};
