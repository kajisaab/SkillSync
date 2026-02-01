/**
 * Main Routes Index
 * Combines all route modules
 */

const express = require('express');
const router = express.Router();

const enrollmentRoutes = require('./enrollment.routes');
const progressRoutes = require('./progress.routes');
const certificateRoutes = require('./certificate.routes');

// Mount routes
router.use('/enrollments', enrollmentRoutes);
router.use('/progress', progressRoutes);
router.use('/certificates', certificateRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'learning-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
