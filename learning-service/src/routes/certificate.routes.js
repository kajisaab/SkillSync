/**
 * Certificate Routes
 * API endpoints for certificate generation and verification
 */

const express = require('express');
const router = express.Router();

const certificateController = require('../controllers/certificate.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateBody, validateParams } = require('../middlewares/validation.middleware');
const { courseIdParamSchema, enrollmentIdParamSchema } = require('../validators/learning.validator');
const Joi = require('joi');

// Certificate generation schema
const generateCertificateSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
});

// Verification code param schema
const verificationCodeParamSchema = Joi.object({
  verificationCode: Joi.string().required(),
});

/**
 * GET /api/certificates
 * Get all certificates for user
 * Private access
 */
router.get('/', authenticate, certificateController.getUserCertificates);

/**
 * POST /api/certificates/generate
 * Generate certificate for a completed course
 * Private access
 */
router.post(
  '/generate',
  authenticate,
  validateBody(generateCertificateSchema),
  certificateController.generateCertificate
);

/**
 * GET /api/certificates/enrollment/:enrollmentId
 * Get certificate by enrollment ID
 * Private access
 */
router.get(
  '/enrollment/:enrollmentId',
  authenticate,
  validateParams(enrollmentIdParamSchema),
  certificateController.getCertificateByEnrollment
);

/**
 * GET /api/certificates/verify/:verificationCode
 * Verify certificate by verification code
 * Public access (no authentication required)
 */
router.get(
  '/verify/:verificationCode',
  validateParams(verificationCodeParamSchema),
  certificateController.verifyCertificate
);

module.exports = router;
