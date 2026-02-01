const certificateService = require('../../../src/services/certificate.service');
const enrollmentService = require('../../../src/services/enrollment.service');
const axios = require('axios');

// Mock dependencies
jest.mock('../../../src/services/enrollment.service');
jest.mock('axios');

describe('Certificate Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCertificate', () => {
    it('should generate certificate for completed course', async () => {
      const mockEnrollment = {
        enrollment_id: 'enrollment-123',
        user_id: 'user-123',
        course_id: 'course-123',
        progress_percentage: 100,
        completed_at: new Date()
      };

      const mockUser = {
        user_id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      };

      const mockCourse = {
        course_id: 'course-123',
        title: 'Advanced JavaScript',
        instructor_id: 'instructor-123'
      };

      enrollmentService.getEnrollmentById.mockResolvedValue(mockEnrollment);
      axios.get.mockResolvedValueOnce({ data: mockUser }); // Auth service call
      axios.get.mockResolvedValueOnce({ data: mockCourse }); // Course service call

      const result = await certificateService.generateCertificate('enrollment-123');

      expect(result).toHaveProperty('certificate_id');
      expect(result).toHaveProperty('student_name', 'John Doe');
      expect(result).toHaveProperty('course_title', 'Advanced JavaScript');
      expect(result).toHaveProperty('completion_date');
      expect(result).toHaveProperty('certificate_url');
    });

    it('should throw error if course not completed', async () => {
      const mockEnrollment = {
        enrollment_id: 'enrollment-123',
        user_id: 'user-123',
        course_id: 'course-123',
        progress_percentage: 75,
        completed_at: null
      };

      enrollmentService.getEnrollmentById.mockResolvedValue(mockEnrollment);

      await expect(
        certificateService.generateCertificate('enrollment-123')
      ).rejects.toThrow('Course not completed');
    });

    it('should throw error if enrollment not found', async () => {
      enrollmentService.getEnrollmentById.mockRejectedValue(new Error('Enrollment not found'));

      await expect(
        certificateService.generateCertificate('non-existent-id')
      ).rejects.toThrow('Enrollment not found');
    });
  });

  describe('getCertificate', () => {
    it('should retrieve existing certificate', async () => {
      const mockCertificate = {
        certificate_id: 'cert-123',
        enrollment_id: 'enrollment-123',
        student_name: 'John Doe',
        course_title: 'Advanced JavaScript',
        completion_date: new Date('2025-01-15'),
        certificate_url: 'https://example.com/certificates/cert-123.pdf'
      };

      const mockEnrollment = {
        enrollment_id: 'enrollment-123',
        user_id: 'user-123',
        course_id: 'course-123',
        progress_percentage: 100,
        completed_at: new Date()
      };

      enrollmentService.getEnrollmentById.mockResolvedValue(mockEnrollment);

      const result = await certificateService.getCertificate('enrollment-123');

      expect(result).toHaveProperty('certificate_id');
      expect(result).toHaveProperty('certificate_url');
    });
  });

  describe('verifyCertificate', () => {
    it('should verify valid certificate', async () => {
      const mockCertificate = {
        certificate_id: 'cert-123',
        enrollment_id: 'enrollment-123',
        student_name: 'John Doe',
        course_title: 'Advanced JavaScript',
        completion_date: new Date('2025-01-15'),
        is_valid: true
      };

      const result = await certificateService.verifyCertificate('cert-123');

      expect(result).toHaveProperty('is_valid', true);
      expect(result).toHaveProperty('certificate_id', 'cert-123');
    });

    it('should return invalid for non-existent certificate', async () => {
      const result = await certificateService.verifyCertificate('non-existent-cert');

      expect(result).toHaveProperty('is_valid', false);
    });
  });

  describe('formatCertificateData', () => {
    it('should format certificate data correctly', () => {
      const enrollment = {
        enrollment_id: 'enrollment-123',
        user_id: 'user-123',
        course_id: 'course-123',
        completed_at: new Date('2025-01-15')
      };

      const user = {
        first_name: 'John',
        last_name: 'Doe'
      };

      const course = {
        title: 'Advanced JavaScript',
        instructor_id: 'instructor-123'
      };

      const result = certificateService.formatCertificateData(enrollment, user, course);

      expect(result).toHaveProperty('student_name', 'John Doe');
      expect(result).toHaveProperty('course_title', 'Advanced JavaScript');
      expect(result).toHaveProperty('completion_date');
    });
  });

  describe('generateCertificateURL', () => {
    it('should generate unique certificate URL', () => {
      const certificateId = 'cert-123';

      const result = certificateService.generateCertificateURL(certificateId);

      expect(result).toContain('certificates');
      expect(result).toContain(certificateId);
      expect(result).toMatch(/^https?:\/\//);
    });
  });

  describe('getCertificatesByUser', () => {
    it('should return all certificates for a user', async () => {
      const mockEnrollments = [
        {
          enrollment_id: 'enrollment-1',
          user_id: 'user-123',
          course_id: 'course-1',
          progress_percentage: 100,
          completed_at: new Date()
        },
        {
          enrollment_id: 'enrollment-2',
          user_id: 'user-123',
          course_id: 'course-2',
          progress_percentage: 100,
          completed_at: new Date()
        }
      ];

      const mockUser = {
        user_id: 'user-123',
        first_name: 'John',
        last_name: 'Doe'
      };

      const mockCourses = [
        { course_id: 'course-1', title: 'Course 1' },
        { course_id: 'course-2', title: 'Course 2' }
      ];

      // Mock enrollment service to return completed enrollments
      enrollmentService.getEnrollmentsByUserId = jest.fn().mockResolvedValue(
        mockEnrollments.filter(e => e.progress_percentage === 100)
      );

      axios.get.mockResolvedValueOnce({ data: mockUser });
      axios.get.mockResolvedValueOnce({ data: mockCourses[0] });
      axios.get.mockResolvedValueOnce({ data: mockCourses[1] });

      const result = await certificateService.getCertificatesByUser('user-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('certificate_id');
      expect(result[1]).toHaveProperty('certificate_id');
    });

    it('should return empty array if no completed courses', async () => {
      enrollmentService.getEnrollmentsByUserId = jest.fn().mockResolvedValue([]);

      const result = await certificateService.getCertificatesByUser('user-123');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('revokeCertificate', () => {
    it('should revoke certificate successfully', async () => {
      const mockCertificate = {
        certificate_id: 'cert-123',
        is_valid: false,
        revoked_at: new Date(),
        revoked_reason: 'Course content changed'
      };

      const result = await certificateService.revokeCertificate('cert-123', 'Course content changed');

      expect(result).toHaveProperty('is_valid', false);
      expect(result).toHaveProperty('revoked_reason');
    });
  });
});
