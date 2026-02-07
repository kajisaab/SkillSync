/**
 * Storage Routes
 * Defines API endpoints for file storage operations
 */

const express = require('express');
const router = express.Router();

const storageController = require('../controllers/storage.controller');
const { authenticate, requireInstructor } = require('../middlewares/auth.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { uploadRequestSchema } = require('../validators/course.validator');
const Joi = require('joi');

// Download URL request schema
const downloadRequestSchema = Joi.object({
  fileKey: Joi.string().required(),
});

/**
 * POST /api/storage/upload-url
 * Generate presigned URL for file upload
 * Instructor only
 */
router.post(
  '/upload-url',
  authenticate,
  requireInstructor,
  validateBody(uploadRequestSchema),
  storageController.generateUploadUrl
);

/**
 * POST /api/storage/download-url
 * Generate presigned URL for file download
 * Any authenticated user (students need to watch videos)
 */
router.post(
  '/download-url',
  authenticate,
  validateBody(downloadRequestSchema),
  storageController.generateDownloadUrl
);

module.exports = router;
