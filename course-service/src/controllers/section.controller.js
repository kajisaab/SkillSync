/**
 * Section Controller
 * Handles HTTP requests for section management
 */

const sectionService = require('../services/section.service');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * Create a new section for a course
 * POST /api/courses/:courseId/sections
 * @access Private (Instructor only - must own the course)
 */
const createSection = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const sectionData = req.body;
  const instructorId = req.user.userId;

  const section = await sectionService.create(courseId, sectionData, instructorId);

  res.status(201).json({
    success: true,
    data: section,
  });
});

/**
 * Get all sections for a course
 * GET /api/courses/:courseId/sections
 * @access Public
 */
const getSectionsByCourseId = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const instructorId = req.user ? req.user.userId : null;

  const sections = await sectionService.findByCourseId(courseId, instructorId);

  res.status(200).json({
    success: true,
    data: sections,
  });
});

/**
 * Update section
 * PUT /api/sections/:sectionId
 * @access Private (Instructor only - must own the course)
 */
const updateSection = asyncHandler(async (req, res) => {
  const { sectionId } = req.params;
  const updateData = req.body;
  const instructorId = req.user.userId;

  const section = await sectionService.update(sectionId, updateData, instructorId);

  res.status(200).json({
    success: true,
    data: section,
  });
});

/**
 * Delete section (soft delete)
 * DELETE /api/sections/:sectionId
 * @access Private (Instructor only - must own the course)
 */
const deleteSection = asyncHandler(async (req, res) => {
  const { sectionId } = req.params;
  const instructorId = req.user.userId;

  const result = await sectionService.deleteSection(sectionId, instructorId);

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  createSection,
  getSectionsByCourseId,
  updateSection,
  deleteSection,
};
