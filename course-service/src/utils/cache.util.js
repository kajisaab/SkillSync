/**
 * Cache Utility
 * Cache management and invalidation strategies
 */

const { setCache, getCache, delCache, delCachePattern } = require('../config/redis');

// Cache TTL settings (in seconds)
const CACHE_TTL = {
  COURSE_DETAIL: parseInt(process.env.COURSE_CACHE_TTL) || 300, // 5 minutes
  COURSE_LIST: parseInt(process.env.COURSE_LIST_CACHE_TTL) || 60, // 1 minute
  SECTION_LIST: 300,
  LESSON_LIST: 300,
};

// Cache key prefixes
const CACHE_PREFIX = {
  COURSE: 'course:detail',
  COURSE_LIST: 'course:list',
  COURSE_SECTIONS: 'course:sections',
  SECTION_LESSONS: 'section:lessons',
  INSTRUCTOR_COURSES: 'instructor:courses',
};

/**
 * Generate cache key for course details
 * @param {string} courseId - Course ID
 * @returns {string} Cache key
 */
const getCourseDetailKey = (courseId) => {
  return `${CACHE_PREFIX.COURSE}:${courseId}`;
};

/**
 * Generate cache key for course list
 * @param {Object} filters - Filter parameters
 * @returns {string} Cache key
 */
const getCourseListKey = (filters) => {
  const { page, limit, category, isPublished, search } = filters;
  return `${CACHE_PREFIX.COURSE_LIST}:page:${page}:limit:${limit}:cat:${category || 'all'}:pub:${isPublished !== undefined ? isPublished : 'all'}:search:${search || 'none'}`;
};

/**
 * Generate cache key for instructor courses
 * @param {string} instructorId - Instructor ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {string} Cache key
 */
const getInstructorCoursesKey = (instructorId, page, limit) => {
  return `${CACHE_PREFIX.INSTRUCTOR_COURSES}:${instructorId}:page:${page}:limit:${limit}`;
};

/**
 * Generate cache key for course sections
 * @param {string} courseId - Course ID
 * @returns {string} Cache key
 */
const getCourseSectionsKey = (courseId) => {
  return `${CACHE_PREFIX.COURSE_SECTIONS}:${courseId}`;
};

/**
 * Generate cache key for section lessons
 * @param {string} sectionId - Section ID
 * @returns {string} Cache key
 */
const getSectionLessonsKey = (sectionId) => {
  return `${CACHE_PREFIX.SECTION_LESSONS}:${sectionId}`;
};

/**
 * Cache course details
 * @param {string} courseId - Course ID
 * @param {Object} courseData - Course data to cache
 * @returns {Promise<void>}
 */
const cacheCourseDetail = async (courseId, courseData) => {
  const key = getCourseDetailKey(courseId);
  await setCache(key, courseData, CACHE_TTL.COURSE_DETAIL);
};

/**
 * Get cached course details
 * @param {string} courseId - Course ID
 * @returns {Promise<Object|null>} Cached course data or null
 */
const getCachedCourseDetail = async (courseId) => {
  const key = getCourseDetailKey(courseId);
  return await getCache(key);
};

/**
 * Cache course list
 * @param {Object} filters - Filter parameters
 * @param {Object} data - Course list data
 * @returns {Promise<void>}
 */
const cacheCourseList = async (filters, data) => {
  const key = getCourseListKey(filters);
  await setCache(key, data, CACHE_TTL.COURSE_LIST);
};

/**
 * Get cached course list
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object|null>} Cached course list or null
 */
const getCachedCourseList = async (filters) => {
  const key = getCourseListKey(filters);
  return await getCache(key);
};

/**
 * Invalidate course detail cache
 * @param {string} courseId - Course ID
 * @returns {Promise<void>}
 */
const invalidateCourseDetail = async (courseId) => {
  const key = getCourseDetailKey(courseId);
  await delCache(key);
};

/**
 * Invalidate all course list caches
 * @returns {Promise<void>}
 */
const invalidateAllCourseLists = async () => {
  await delCachePattern(`${CACHE_PREFIX.COURSE_LIST}:*`);
};

/**
 * Invalidate instructor courses cache
 * @param {string} instructorId - Instructor ID
 * @returns {Promise<void>}
 */
const invalidateInstructorCourses = async (instructorId) => {
  await delCachePattern(`${CACHE_PREFIX.INSTRUCTOR_COURSES}:${instructorId}:*`);
};

/**
 * Invalidate course sections cache
 * @param {string} courseId - Course ID
 * @returns {Promise<void>}
 */
const invalidateCourseSections = async (courseId) => {
  const key = getCourseSectionsKey(courseId);
  await delCache(key);
};

/**
 * Invalidate section lessons cache
 * @param {string} sectionId - Section ID
 * @returns {Promise<void>}
 */
const invalidateSectionLessons = async (sectionId) => {
  const key = getSectionLessonsKey(sectionId);
  await delCache(key);
};

/**
 * Invalidate all caches related to a course
 * Called when course is updated/deleted
 * @param {string} courseId - Course ID
 * @param {string} instructorId - Instructor ID
 * @returns {Promise<void>}
 */
const invalidateCourseRelatedCaches = async (courseId, instructorId) => {
  await Promise.all([
    invalidateCourseDetail(courseId),
    invalidateAllCourseLists(),
    invalidateInstructorCourses(instructorId),
    invalidateCourseSections(courseId),
  ]);
};

module.exports = {
  CACHE_TTL,
  getCourseDetailKey,
  getCourseListKey,
  getInstructorCoursesKey,
  getCourseSectionsKey,
  getSectionLessonsKey,
  cacheCourseDetail,
  getCachedCourseDetail,
  cacheCourseList,
  getCachedCourseList,
  invalidateCourseDetail,
  invalidateAllCourseLists,
  invalidateInstructorCourses,
  invalidateCourseSections,
  invalidateSectionLessons,
  invalidateCourseRelatedCaches,
};
