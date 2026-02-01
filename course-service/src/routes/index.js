/**
 * Main Routes Index
 * Combines all route modules
 */

const express = require('express');
const router = express.Router();

const courseRoutes = require('./course.routes');
const sectionRoutes = require('./section.routes');
const lessonRoutes = require('./lesson.routes');
const storageRoutes = require('./storage.routes');

// Mount routes
router.use('/courses', courseRoutes);
router.use('/', sectionRoutes); // Section routes include /courses/:id/sections and /sections/:id
router.use('/', lessonRoutes); // Lesson routes include /sections/:id/lessons and /lessons/:id
router.use('/storage', storageRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'course-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
