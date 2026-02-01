const enrollmentService = require('../../../src/services/enrollment.service');
const enrollmentRepository = require('../../../src/repositories/enrollment.repository');
const axios = require('axios');

// Mock dependencies
jest.mock('../../../src/repositories/enrollment.repository');
jest.mock('axios');

describe('Enrollment Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEnrollment', () => {
    it('should create enrollment successfully', async () => {
      const mockEnrollment = {
        enrollment_id: 'enrollment-123',
        user_id: 'user-123',
        course_id: 'course-123',
        enrolled_at: new Date(),
        progress_percentage: 0,
        last_accessed: null,
        completed_at: null
      };

      const mockCourse = {
        course_id: 'course-123',
        title: 'Test Course',
        is_published: true
      };

      axios.get.mockResolvedValue({ data: mockCourse });
      enrollmentRepository.findByUserAndCourse.mockResolvedValue(null);
      enrollmentRepository.create.mockResolvedValue(mockEnrollment);

      const result = await enrollmentService.createEnrollment({
        user_id: 'user-123',
        course_id: 'course-123'
      });

      expect(result).toEqual(mockEnrollment);
      expect(enrollmentRepository.create).toHaveBeenCalled();
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('course-123')
      );
    });

    it('should throw error if user already enrolled', async () => {
      const existingEnrollment = {
        enrollment_id: 'enrollment-123',
        user_id: 'user-123',
        course_id: 'course-123'
      };

      enrollmentRepository.findByUserAndCourse.mockResolvedValue(existingEnrollment);

      await expect(
        enrollmentService.createEnrollment({
          user_id: 'user-123',
          course_id: 'course-123'
        })
      ).rejects.toThrow('Already enrolled');
    });

    it('should throw error if course not found', async () => {
      axios.get.mockRejectedValue({ response: { status: 404 } });

      await expect(
        enrollmentService.createEnrollment({
          user_id: 'user-123',
          course_id: 'non-existent-course'
        })
      ).rejects.toThrow('Course not found');
    });

    it('should throw error if course not published', async () => {
      const mockCourse = {
        course_id: 'course-123',
        title: 'Test Course',
        is_published: false
      };

      axios.get.mockResolvedValue({ data: mockCourse });
      enrollmentRepository.findByUserAndCourse.mockResolvedValue(null);

      await expect(
        enrollmentService.createEnrollment({
          user_id: 'user-123',
          course_id: 'course-123'
        })
      ).rejects.toThrow('Course is not published');
    });

    it('should throw error if user_id is missing', async () => {
      await expect(
        enrollmentService.createEnrollment({
          course_id: 'course-123'
        })
      ).rejects.toThrow();
    });

    it('should throw error if course_id is missing', async () => {
      await expect(
        enrollmentService.createEnrollment({
          user_id: 'user-123'
        })
      ).rejects.toThrow();
    });
  });

  describe('getEnrollmentsByUserId', () => {
    it('should return all enrollments for a user', async () => {
      const mockEnrollments = [
        {
          enrollment_id: 'enrollment-1',
          user_id: 'user-123',
          course_id: 'course-1',
          progress_percentage: 50
        },
        {
          enrollment_id: 'enrollment-2',
          user_id: 'user-123',
          course_id: 'course-2',
          progress_percentage: 25
        }
      ];

      const mockCourses = [
        { course_id: 'course-1', title: 'Course 1' },
        { course_id: 'course-2', title: 'Course 2' }
      ];

      enrollmentRepository.findByUserId.mockResolvedValue(mockEnrollments);
      axios.get.mockResolvedValueOnce({ data: mockCourses[0] });
      axios.get.mockResolvedValueOnce({ data: mockCourses[1] });

      const result = await enrollmentService.getEnrollmentsByUserId('user-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('course_details');
      expect(enrollmentRepository.findByUserId).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array if no enrollments found', async () => {
      enrollmentRepository.findByUserId.mockResolvedValue([]);

      const result = await enrollmentService.getEnrollmentsByUserId('user-123');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getEnrollmentById', () => {
    it('should return enrollment by id', async () => {
      const mockEnrollment = {
        enrollment_id: 'enrollment-123',
        user_id: 'user-123',
        course_id: 'course-123',
        progress_percentage: 75
      };

      const mockCourse = {
        course_id: 'course-123',
        title: 'Test Course'
      };

      enrollmentRepository.findById.mockResolvedValue(mockEnrollment);
      axios.get.mockResolvedValue({ data: mockCourse });

      const result = await enrollmentService.getEnrollmentById('enrollment-123');

      expect(result).toHaveProperty('enrollment_id', 'enrollment-123');
      expect(result).toHaveProperty('course_details');
      expect(enrollmentRepository.findById).toHaveBeenCalledWith('enrollment-123');
    });

    it('should throw error if enrollment not found', async () => {
      enrollmentRepository.findById.mockResolvedValue(null);

      await expect(
        enrollmentService.getEnrollmentById('non-existent-id')
      ).rejects.toThrow('Enrollment not found');
    });
  });

  describe('updateLastAccessed', () => {
    it('should update last accessed timestamp', async () => {
      const mockEnrollment = {
        enrollment_id: 'enrollment-123',
        user_id: 'user-123',
        course_id: 'course-123',
        last_accessed: new Date()
      };

      enrollmentRepository.updateLastAccessed.mockResolvedValue(mockEnrollment);

      const result = await enrollmentService.updateLastAccessed('enrollment-123');

      expect(result).toEqual(mockEnrollment);
      expect(enrollmentRepository.updateLastAccessed).toHaveBeenCalledWith('enrollment-123');
    });
  });

  describe('calculateProgress', () => {
    it('should calculate progress percentage correctly', async () => {
      const totalLessons = 10;
      const completedLessons = 7;
      const expectedProgress = 70;

      const result = enrollmentService.calculateProgress(completedLessons, totalLessons);

      expect(result).toBe(expectedProgress);
    });

    it('should return 0 if no lessons completed', async () => {
      const result = enrollmentService.calculateProgress(0, 10);

      expect(result).toBe(0);
    });

    it('should return 100 if all lessons completed', async () => {
      const result = enrollmentService.calculateProgress(10, 10);

      expect(result).toBe(100);
    });

    it('should handle edge case of 0 total lessons', async () => {
      const result = enrollmentService.calculateProgress(0, 0);

      expect(result).toBe(0);
    });
  });

  describe('updateProgress', () => {
    it('should update enrollment progress', async () => {
      const mockEnrollment = {
        enrollment_id: 'enrollment-123',
        user_id: 'user-123',
        course_id: 'course-123',
        progress_percentage: 85
      };

      enrollmentRepository.updateProgress.mockResolvedValue(mockEnrollment);

      const result = await enrollmentService.updateProgress('enrollment-123', 85);

      expect(result.progress_percentage).toBe(85);
      expect(enrollmentRepository.updateProgress).toHaveBeenCalledWith('enrollment-123', 85);
    });

    it('should mark course as completed if progress is 100', async () => {
      const mockEnrollment = {
        enrollment_id: 'enrollment-123',
        user_id: 'user-123',
        course_id: 'course-123',
        progress_percentage: 100,
        completed_at: new Date()
      };

      enrollmentRepository.updateProgress.mockResolvedValue(mockEnrollment);

      const result = await enrollmentService.updateProgress('enrollment-123', 100);

      expect(result.progress_percentage).toBe(100);
      expect(result.completed_at).toBeTruthy();
    });
  });

  describe('checkEnrollmentAccess', () => {
    it('should return true if user is enrolled', async () => {
      const mockEnrollment = {
        enrollment_id: 'enrollment-123',
        user_id: 'user-123',
        course_id: 'course-123'
      };

      enrollmentRepository.findByUserAndCourse.mockResolvedValue(mockEnrollment);

      const result = await enrollmentService.checkEnrollmentAccess('user-123', 'course-123');

      expect(result).toBe(true);
    });

    it('should return false if user is not enrolled', async () => {
      enrollmentRepository.findByUserAndCourse.mockResolvedValue(null);

      const result = await enrollmentService.checkEnrollmentAccess('user-123', 'course-123');

      expect(result).toBe(false);
    });
  });
});
