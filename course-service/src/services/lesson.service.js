/**
 * Lesson Service
 * Business logic for lesson management
 */

const lessonRepository = require('../repositories/lesson.repository');
const sectionRepository = require('../repositories/section.repository');
const resourceRepository = require('../repositories/resource.repository');
const courseRepository = require('../repositories/course.repository');
const { invalidateSectionLessons } = require('../utils/cache.util');
const { NotFoundError, ForbiddenError } = require('../utils/error.util');

const create = async (sectionId, lessonData, instructorId) => {
  const section = await sectionRepository.findById(sectionId);
  if (!section) {
    throw new NotFoundError('Section not found');
  }

  const course = await courseRepository.findById(section.course_id);
  if (course.instructor_id !== instructorId) {
    throw new ForbiddenError('You do not have permission to add lessons to this section');
  }

  const lessonCount = await lessonRepository.count(sectionId);
  const newLesson = await lessonRepository.create({
    sectionId,
    title: lessonData.title,
    description: lessonData.description,
    videoUrl: lessonData.videoUrl,
    videoDuration: lessonData.videoDuration,
    orderIndex: lessonData.orderIndex !== undefined ? lessonData.orderIndex : lessonCount,
  });

  await invalidateSectionLessons(sectionId);

  return {
    lessonId: newLesson.lesson_id,
    sectionId: newLesson.section_id,
    title: newLesson.title,
    description: newLesson.description,
    videoUrl: newLesson.video_url,
    videoDuration: newLesson.video_duration,
    orderIndex: newLesson.order_index,
    createdAt: newLesson.created_at,
  };
};

const findBySectionId = async (sectionId) => {
  const section = await sectionRepository.findById(sectionId);
  if (!section) {
    throw new NotFoundError('Section not found');
  }

  const lessons = await lessonRepository.findBySectionId(sectionId);

  return lessons.map((lesson) => ({
    lessonId: lesson.lesson_id,
    sectionId: lesson.section_id,
    title: lesson.title,
    description: lesson.description,
    videoUrl: lesson.video_url,
    videoDuration: lesson.video_duration,
    orderIndex: lesson.order_index,
    createdAt: lesson.created_at,
  }));
};

const findById = async (lessonId) => {
  const lesson = await lessonRepository.findById(lessonId);
  if (!lesson) {
    throw new NotFoundError('Lesson not found');
  }

  const resources = await resourceRepository.findByLessonId(lessonId);

  return {
    lessonId: lesson.lesson_id,
    sectionId: lesson.section_id,
    title: lesson.title,
    description: lesson.description,
    videoUrl: lesson.video_url,
    videoDuration: lesson.video_duration,
    orderIndex: lesson.order_index,
    createdAt: lesson.created_at,
    resources: resources.map((r) => ({
      resourceId: r.resource_id,
      title: r.title,
      fileUrl: r.file_url,
      fileType: r.file_type,
      createdAt: r.created_at,
    })),
  };
};

const update = async (lessonId, updateData, instructorId) => {
  const lesson = await lessonRepository.findById(lessonId);
  if (!lesson) {
    throw new NotFoundError('Lesson not found');
  }

  const section = await sectionRepository.findById(lesson.section_id);
  const course = await courseRepository.findById(section.course_id);

  if (course.instructor_id !== instructorId) {
    throw new ForbiddenError('You do not have permission to update this lesson');
  }

  const dbUpdateData = {};
  if (updateData.title) dbUpdateData.title = updateData.title;
  if (updateData.description !== undefined) dbUpdateData.description = updateData.description;
  if (updateData.videoUrl !== undefined) dbUpdateData.video_url = updateData.videoUrl;
  if (updateData.videoDuration !== undefined) dbUpdateData.video_duration = updateData.videoDuration;
  if (updateData.orderIndex !== undefined) dbUpdateData.order_index = updateData.orderIndex;

  const updatedLesson = await lessonRepository.update(lessonId, dbUpdateData);

  await invalidateSectionLessons(lesson.section_id);

  return {
    lessonId: updatedLesson.lesson_id,
    sectionId: updatedLesson.section_id,
    title: updatedLesson.title,
    description: updatedLesson.description,
    videoUrl: updatedLesson.video_url,
    videoDuration: updatedLesson.video_duration,
    orderIndex: updatedLesson.order_index,
    createdAt: updatedLesson.created_at,
  };
};

const deleteLesson = async (lessonId, instructorId) => {
  const lesson = await lessonRepository.findById(lessonId);
  if (!lesson) {
    throw new NotFoundError('Lesson not found');
  }

  const section = await sectionRepository.findById(lesson.section_id);
  const course = await courseRepository.findById(section.course_id);

  if (course.instructor_id !== instructorId) {
    throw new ForbiddenError('You do not have permission to delete this lesson');
  }

  await lessonRepository.softDelete(lessonId);
  await invalidateSectionLessons(lesson.section_id);

  return { message: 'Lesson deleted successfully' };
};

const addResource = async (lessonId, resourceData, instructorId) => {
  const lesson = await lessonRepository.findById(lessonId);
  if (!lesson) {
    throw new NotFoundError('Lesson not found');
  }

  const section = await sectionRepository.findById(lesson.section_id);
  const course = await courseRepository.findById(section.course_id);

  if (course.instructor_id !== instructorId) {
    throw new ForbiddenError('You do not have permission to add resources to this lesson');
  }

  const newResource = await resourceRepository.create({
    lessonId,
    title: resourceData.title,
    fileUrl: resourceData.fileUrl,
    fileType: resourceData.fileType,
  });

  return {
    resourceId: newResource.resource_id,
    lessonId: newResource.lesson_id,
    title: newResource.title,
    fileUrl: newResource.file_url,
    fileType: newResource.file_type,
    createdAt: newResource.created_at,
  };
};

const deleteResource = async (resourceId, instructorId) => {
  const resource = await resourceRepository.findById(resourceId);
  if (!resource) {
    throw new NotFoundError('Resource not found');
  }

  const lesson = await lessonRepository.findById(resource.lesson_id);
  const section = await sectionRepository.findById(lesson.section_id);
  const course = await courseRepository.findById(section.course_id);

  if (course.instructor_id !== instructorId) {
    throw new ForbiddenError('You do not have permission to delete this resource');
  }

  await resourceRepository.deleteResource(resourceId);

  return { message: 'Resource deleted successfully' };
};

module.exports = {
  create,
  findBySectionId,
  findById,
  update,
  deleteLesson,
  addResource,
  deleteResource,
};
