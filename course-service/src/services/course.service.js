/**
 * Course Service
 * Business logic for course management
 */

const courseRepository = require('../repositories/course.repository');
const sectionRepository = require('../repositories/section.repository');
const {
  cacheCourseDetail,
  getCachedCourseDetail,
  cacheCourseList,
  getCachedCourseList,
  invalidateCourseRelatedCaches,
} = require('../utils/cache.util');
const { formatPaginatedResponse, parsePaginationParams } = require('../utils/pagination.util');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/error.util');

const create = async (courseData, instructorId) => {
  const newCourse = await courseRepository.create({
    ...courseData,
    instructorId,
  });

  // Cache the new course
  await cacheCourseDetail(newCourse.course_id, newCourse);

  return {
    courseId: newCourse.course_id,
    instructorId: newCourse.instructor_id,
    title: newCourse.title,
    description: newCourse.description,
    category: newCourse.category,
    thumbnailUrl: newCourse.thumbnail_url,
    price: parseFloat(newCourse.price),
    isPublished: newCourse.is_published,
    createdAt: newCourse.created_at,
    updatedAt: newCourse.updated_at,
  };
};

const findById = async (courseId, useCache = true) => {
  if (useCache) {
    const cached = await getCachedCourseDetail(courseId);
    if (cached) return cached;
  }

  const course = await courseRepository.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  const result = {
    courseId: course.course_id,
    instructorId: course.instructor_id,
    title: course.title,
    description: course.description,
    category: course.category,
    thumbnailUrl: course.thumbnail_url,
    price: parseFloat(course.price),
    isPublished: course.is_published,
    createdAt: course.created_at,
    updatedAt: course.updated_at,
  };

  if (useCache) {
    await cacheCourseDetail(courseId, result);
  }

  return result;
};

const findAll = async (query) => {
  const { page, limit, offset } = parsePaginationParams(query);
  const filters = {
    category: query.category,
    isPublished: query.isPublished !== undefined ? query.isPublished === 'true' : undefined,
    search: query.search,
    instructorId: query.instructorId,
  };

  const cacheKey = { page, limit, ...filters };
  const cached = await getCachedCourseList(cacheKey);
  if (cached) return cached;

  const { courses, total } = await courseRepository.findAll(filters, limit, offset);

  const formattedCourses = courses.map((course) => ({
    courseId: course.course_id,
    instructorId: course.instructor_id,
    title: course.title,
    description: course.description,
    category: course.category,
    thumbnailUrl: course.thumbnail_url,
    price: parseFloat(course.price),
    isPublished: course.is_published,
    createdAt: course.created_at,
    updatedAt: course.updated_at,
  }));

  const result = formatPaginatedResponse(formattedCourses, total, page, limit);

  await cacheCourseList(cacheKey, result);

  return result;
};

const update = async (courseId, updateData, instructorId) => {
  const course = await courseRepository.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  if (course.instructor_id !== instructorId) {
    throw new ForbiddenError('You do not have permission to update this course');
  }

  const dbUpdateData = {};
  if (updateData.title) dbUpdateData.title = updateData.title;
  if (updateData.description) dbUpdateData.description = updateData.description;
  if (updateData.category) dbUpdateData.category = updateData.category;
  if (updateData.thumbnailUrl !== undefined) dbUpdateData.thumbnail_url = updateData.thumbnailUrl;
  if (updateData.price !== undefined) dbUpdateData.price = updateData.price;

  const updatedCourse = await courseRepository.update(courseId, dbUpdateData);

  await invalidateCourseRelatedCaches(courseId, instructorId);

  return {
    courseId: updatedCourse.course_id,
    instructorId: updatedCourse.instructor_id,
    title: updatedCourse.title,
    description: updatedCourse.description,
    category: updatedCourse.category,
    thumbnailUrl: updatedCourse.thumbnail_url,
    price: parseFloat(updatedCourse.price),
    isPublished: updatedCourse.is_published,
    updatedAt: updatedCourse.updated_at,
  };
};

const deleteCourse = async (courseId, instructorId) => {
  const course = await courseRepository.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  if (course.instructor_id !== instructorId) {
    throw new ForbiddenError('You do not have permission to delete this course');
  }

  await courseRepository.softDelete(courseId);
  await invalidateCourseRelatedCaches(courseId, instructorId);

  return { message: 'Course deleted successfully' };
};

const publish = async (courseId, instructorId) => {
  const course = await courseRepository.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  if (course.instructor_id !== instructorId) {
    throw new ForbiddenError('You do not have permission to publish this course');
  }

  // Validate course has sections and lessons
  const sections = await sectionRepository.findByCourseId(courseId);
  if (sections.length === 0) {
    throw new BadRequestError('Course must have at least one section before publishing');
  }

  await courseRepository.publish(courseId);
  await invalidateCourseRelatedCaches(courseId, instructorId);

  return { message: 'Course published successfully', isPublished: true };
};

const unpublish = async (courseId, instructorId) => {
  const course = await courseRepository.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  if (course.instructor_id !== instructorId) {
    throw new ForbiddenError('You do not have permission to unpublish this course');
  }

  await courseRepository.unpublish(courseId);
  await invalidateCourseRelatedCaches(courseId, instructorId);

  return { message: 'Course unpublished successfully', isPublished: false };
};

module.exports = {
  create,
  findById,
  findAll,
  update,
  deleteCourse,
  publish,
  unpublish,
};
