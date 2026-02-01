/**
 * Section Service
 * Business logic for section management
 */

const sectionRepository = require('../repositories/section.repository');
const courseRepository = require('../repositories/course.repository');
const { invalidateCourseSections } = require('../utils/cache.util');
const { NotFoundError, ForbiddenError } = require('../utils/error.util');

const create = async (courseId, sectionData, instructorId) => {
  const course = await courseRepository.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  if (course.instructor_id !== instructorId) {
    throw new ForbiddenError('You do not have permission to add sections to this course');
  }

  const sectionCount = await sectionRepository.count(courseId);
  const newSection = await sectionRepository.create({
    courseId,
    title: sectionData.title,
    orderIndex: sectionData.orderIndex !== undefined ? sectionData.orderIndex : sectionCount,
  });

  await invalidateCourseSections(courseId);

  return {
    sectionId: newSection.section_id,
    courseId: newSection.course_id,
    title: newSection.title,
    orderIndex: newSection.order_index,
    createdAt: newSection.created_at,
  };
};

const findByCourseId = async (courseId, instructorId = null) => {
  const course = await courseRepository.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  const sections = await sectionRepository.findByCourseId(courseId);

  return sections.map((section) => ({
    sectionId: section.section_id,
    courseId: section.course_id,
    title: section.title,
    orderIndex: section.order_index,
    createdAt: section.created_at,
  }));
};

const update = async (sectionId, updateData, instructorId) => {
  const section = await sectionRepository.findById(sectionId);
  if (!section) {
    throw new NotFoundError('Section not found');
  }

  const course = await courseRepository.findById(section.course_id);
  if (course.instructor_id !== instructorId) {
    throw new ForbiddenError('You do not have permission to update this section');
  }

  const dbUpdateData = {};
  if (updateData.title) dbUpdateData.title = updateData.title;
  if (updateData.orderIndex !== undefined) dbUpdateData.order_index = updateData.orderIndex;

  const updatedSection = await sectionRepository.update(sectionId, dbUpdateData);

  await invalidateCourseSections(section.course_id);

  return {
    sectionId: updatedSection.section_id,
    courseId: updatedSection.course_id,
    title: updatedSection.title,
    orderIndex: updatedSection.order_index,
    createdAt: updatedSection.created_at,
  };
};

const deleteSection = async (sectionId, instructorId) => {
  const section = await sectionRepository.findById(sectionId);
  if (!section) {
    throw new NotFoundError('Section not found');
  }

  const course = await courseRepository.findById(section.course_id);
  if (course.instructor_id !== instructorId) {
    throw new ForbiddenError('You do not have permission to delete this section');
  }

  await sectionRepository.softDelete(sectionId);
  await invalidateCourseSections(section.course_id);

  return { message: 'Section deleted successfully' };
};

module.exports = {
  create,
  findByCourseId,
  update,
  deleteSection,
};
