/**
 * Certificate Service
 * Basic certificate generation for completed courses
 */

const { v4: uuidv4 } = require('uuid');
const enrollmentRepository = require('../repositories/enrollment.repository');
const { courseServiceClient, authServiceClient } = require('../config/http-client');
const { NotFoundError, BadRequestError } = require('../utils/error.util');

/**
 * Generate certificate data for a completed course
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Certificate data
 */
const generateCertificate = async (userId, courseId) => {
  // Verify enrollment and completion
  const enrollment = await enrollmentRepository.findByUserAndCourse(userId, courseId);

  if (!enrollment) {
    throw new NotFoundError('Enrollment not found');
  }

  if (!enrollment.completed_at || enrollment.progress_percentage < 100) {
    throw new BadRequestError('Course must be completed to generate certificate');
  }

  // Fetch course details from Course Service
  let courseData;
  try {
    const response = await courseServiceClient.get(`/courses/${courseId}`);
    courseData = response.data.data;
  } catch (error) {
    console.error('Failed to fetch course details:', error.message);
    throw new BadRequestError('Unable to fetch course details');
  }

  // Fetch user details from Auth Service (optional - fallback to minimal data)
  let userData = {
    userId,
    fullName: 'Student',
  };

  try {
    const response = await authServiceClient.get(`/users/${userId}`);
    if (response.data && response.data.success) {
      const user = response.data.data;
      userData = {
        userId: user.userId,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Student',
        email: user.email,
      };
    }
  } catch (error) {
    console.warn('Failed to fetch user details:', error.message);
    // Continue with minimal user data
  }

  // Generate certificate ID
  const certificateId = uuidv4();

  // Generate verification code (simple implementation)
  const verificationCode = generateVerificationCode();

  // Create certificate data
  const certificate = {
    certificateId,
    verificationCode,
    student: userData,
    course: {
      courseId: courseData.courseId,
      title: courseData.title,
      category: courseData.category,
      instructorId: courseData.instructorId,
    },
    enrollment: {
      enrollmentId: enrollment.enrollment_id,
      enrolledAt: enrollment.enrolled_at,
      completedAt: enrollment.completed_at,
    },
    issuedAt: new Date().toISOString(),
    expiresAt: null, // Certificates don't expire
    status: 'active',
  };

  return certificate;
};

/**
 * Get certificate by enrollment
 * @param {string} userId - User ID
 * @param {string} enrollmentId - Enrollment ID
 * @returns {Promise<Object>} Certificate data
 */
const getCertificateByEnrollment = async (userId, enrollmentId) => {
  // Get enrollment
  const enrollment = await enrollmentRepository.findById(enrollmentId);

  if (!enrollment) {
    throw new NotFoundError('Enrollment not found');
  }

  // Verify user owns this enrollment
  if (enrollment.user_id !== userId) {
    throw new NotFoundError('Enrollment not found');
  }

  // Generate certificate using courseId
  return await generateCertificate(userId, enrollment.course_id);
};

/**
 * Verify certificate by verification code
 * @param {string} verificationCode - Certificate verification code
 * @returns {Promise<Object>} Verification result
 */
const verifyCertificate = async (verificationCode) => {
  // In a real implementation, this would look up the certificate in a database
  // For MVP, we're returning a basic validation response

  if (!verificationCode || verificationCode.length < 8) {
    throw new BadRequestError('Invalid verification code');
  }

  return {
    isValid: true,
    message: 'Certificate verification feature is currently in development',
    verificationCode,
  };
};

/**
 * Generate a verification code
 * @returns {string} Verification code
 */
const generateVerificationCode = () => {
  // Generate a 16-character alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) {
      code += '-';
    }
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
};

/**
 * Get all certificates for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of certificates
 */
const getUserCertificates = async (userId) => {
  // Get all completed enrollments
  const { enrollments } = await enrollmentRepository.findByUserId(userId, 1000, 0);

  const completedEnrollments = enrollments.filter((e) => e.completed_at !== null);

  // Generate certificate data for each completed enrollment
  const certificates = await Promise.all(
    completedEnrollments.map(async (enrollment) => {
      try {
        return await generateCertificate(userId, enrollment.course_id);
      } catch (error) {
        console.error(`Failed to generate certificate for ${enrollment.course_id}:`, error.message);
        return null;
      }
    })
  );

  // Filter out failed certificate generations
  return certificates.filter((cert) => cert !== null);
};

module.exports = {
  generateCertificate,
  getCertificateByEnrollment,
  verifyCertificate,
  getUserCertificates,
  generateVerificationCode, // Export for testing
};
