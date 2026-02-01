/**
 * Certificate Controller
 * Handles HTTP requests for certificate generation and verification
 */

const certificateService = require('../services/certificate.service');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * Generate certificate for a completed course
 * POST /api/certificates/generate
 * @access Private
 */
const generateCertificate = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { courseId } = req.body;

  const certificate = await certificateService.generateCertificate(userId, courseId);

  res.status(200).json({
    success: true,
    data: certificate,
  });
});

/**
 * Get certificate by enrollment
 * GET /api/certificates/enrollment/:enrollmentId
 * @access Private
 */
const getCertificateByEnrollment = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { enrollmentId } = req.params;

  const certificate = await certificateService.getCertificateByEnrollment(userId, enrollmentId);

  res.status(200).json({
    success: true,
    data: certificate,
  });
});

/**
 * Get all certificates for user
 * GET /api/certificates
 * @access Private
 */
const getUserCertificates = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const certificates = await certificateService.getUserCertificates(userId);

  res.status(200).json({
    success: true,
    data: certificates,
  });
});

/**
 * Verify certificate by verification code
 * GET /api/certificates/verify/:verificationCode
 * @access Public
 */
const verifyCertificate = asyncHandler(async (req, res) => {
  const { verificationCode } = req.params;

  const result = await certificateService.verifyCertificate(verificationCode);

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  generateCertificate,
  getCertificateByEnrollment,
  getUserCertificates,
  verifyCertificate,
};
