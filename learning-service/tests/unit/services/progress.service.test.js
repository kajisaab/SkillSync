const progressService = require('../../../src/services/progress.service');
const progressRepository = require('../../../src/repositories/progress.repository');
const enrollmentService = require('../../../src/services/enrollment.service');
const axios = require('axios');

// Mock dependencies
jest.mock('../../../src/repositories/progress.repository');
jest.mock('../../../src/services/enrollment.service');
jest.mock('axios');

describe('Progress Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateLessonProgress', () => {
    it('should update lesson progress successfully', async () => {
      const mockProgress = {
        progress_id: 'progress-123',
        enrollment_id: 'enrollment-123',
        lesson_id: 'lesson-123',
        is_completed: true,
        last_position: 0,
        completed_at: new Date()
      };

      const mockEnrollment = {
        enrollment_id: 'enrollment-123',
        user_id: 'user-123',
        course_id: 'course-123'
      };

      const mockLessons = {
        total: 10,
        completed: 5
      };

      progressRepository.findByEnrollmentAndLesson.mockResolvedValue(null);
      progressRepository.create.mockResolvedValue(mockProgress);
      enrollmentService.getEnrollmentById.mockResolvedValue(mockEnrollment);
      progressRepository.getCompletedLessonsCount.mockResolvedValue(mockLessons);
      enrollmentService.updateProgress.mockResolvedValue({});

      const result = await progressService.updateLessonProgress({
        enrollment_id: 'enrollment-123',
        lesson_id: 'lesson-123',
        is_completed: true,
        last_position: 0
      });

      expect(result).toHaveProperty('progress_id');
      expect(result.is_completed).toBe(true);
      expect(progressRepository.create).toHaveBeenCalled();
    });

    it('should update existing progress record', async () => {
      const existingProgress = {
        progress_id: 'progress-123',
        enrollment_id: 'enrollment-123',
        lesson_id: 'lesson-123',
        is_completed: false,
        last_position: 300
      };

      const updatedProgress = {
        ...existingProgress,
        is_completed: true,
        last_position: 0,
        completed_at: new Date()
      };

      progressRepository.findByEnrollmentAndLesson.mockResolvedValue(existingProgress);
      progressRepository.update.mockResolvedValue(updatedProgress);

      const result = await progressService.updateLessonProgress({
        enrollment_id: 'enrollment-123',
        lesson_id: 'lesson-123',
        is_completed: true,
        last_position: 0
      });

      expect(result.is_completed).toBe(true);
      expect(progressRepository.update).toHaveBeenCalled();
    });

    it('should update video position without marking complete', async () => {
      const mockProgress = {
        progress_id: 'progress-123',
        enrollment_id: 'enrollment-123',
        lesson_id: 'lesson-123',
        is_completed: false,
        last_position: 450
      };

      progressRepository.findByEnrollmentAndLesson.mockResolvedValue(null);
      progressRepository.create.mockResolvedValue(mockProgress);

      const result = await progressService.updateLessonProgress({
        enrollment_id: 'enrollment-123',
        lesson_id: 'lesson-123',
        is_completed: false,
        last_position: 450
      });

      expect(result.is_completed).toBe(false);
      expect(result.last_position).toBe(450);
    });

    it('should throw error if enrollment_id is missing', async () => {
      await expect(
        progressService.updateLessonProgress({
          lesson_id: 'lesson-123',
          is_completed: true
        })
      ).rejects.toThrow();
    });

    it('should throw error if lesson_id is missing', async () => {
      await expect(
        progressService.updateLessonProgress({
          enrollment_id: 'enrollment-123',
          is_completed: true
        })
      ).rejects.toThrow();
    });
  });

  describe('getProgressByEnrollment', () => {
    it('should return all progress records for an enrollment', async () => {
      const mockProgress = [
        {
          progress_id: 'progress-1',
          enrollment_id: 'enrollment-123',
          lesson_id: 'lesson-1',
          is_completed: true
        },
        {
          progress_id: 'progress-2',
          enrollment_id: 'enrollment-123',
          lesson_id: 'lesson-2',
          is_completed: false,
          last_position: 300
        }
      ];

      progressRepository.findByEnrollmentId.mockResolvedValue(mockProgress);

      const result = await progressService.getProgressByEnrollment('enrollment-123');

      expect(result).toHaveLength(2);
      expect(result[0].is_completed).toBe(true);
      expect(result[1].last_position).toBe(300);
      expect(progressRepository.findByEnrollmentId).toHaveBeenCalledWith('enrollment-123');
    });

    it('should return empty array if no progress found', async () => {
      progressRepository.findByEnrollmentId.mockResolvedValue([]);

      const result = await progressService.getProgressByEnrollment('enrollment-123');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getLessonProgress', () => {
    it('should return progress for specific lesson', async () => {
      const mockProgress = {
        progress_id: 'progress-123',
        enrollment_id: 'enrollment-123',
        lesson_id: 'lesson-123',
        is_completed: false,
        last_position: 450
      };

      progressRepository.findByEnrollmentAndLesson.mockResolvedValue(mockProgress);

      const result = await progressService.getLessonProgress('enrollment-123', 'lesson-123');

      expect(result).toEqual(mockProgress);
      expect(result.last_position).toBe(450);
    });

    it('should return null if no progress found', async () => {
      progressRepository.findByEnrollmentAndLesson.mockResolvedValue(null);

      const result = await progressService.getLessonProgress('enrollment-123', 'lesson-123');

      expect(result).toBeNull();
    });
  });

  describe('getCompletionStats', () => {
    it('should calculate completion statistics', async () => {
      const mockCourse = {
        course_id: 'course-123',
        sections: [
          {
            section_id: 'section-1',
            lessons: ['lesson-1', 'lesson-2', 'lesson-3']
          },
          {
            section_id: 'section-2',
            lessons: ['lesson-4', 'lesson-5']
          }
        ]
      };

      const mockProgress = [
        { lesson_id: 'lesson-1', is_completed: true },
        { lesson_id: 'lesson-2', is_completed: true },
        { lesson_id: 'lesson-3', is_completed: false }
      ];

      axios.get.mockResolvedValue({ data: mockCourse });
      progressRepository.findByEnrollmentId.mockResolvedValue(mockProgress);

      const result = await progressService.getCompletionStats('enrollment-123', 'course-123');

      expect(result).toHaveProperty('total_lessons');
      expect(result).toHaveProperty('completed_lessons');
      expect(result).toHaveProperty('progress_percentage');
      expect(result.completed_lessons).toBe(2);
    });
  });

  describe('markLessonComplete', () => {
    it('should mark lesson as complete', async () => {
      const mockProgress = {
        progress_id: 'progress-123',
        enrollment_id: 'enrollment-123',
        lesson_id: 'lesson-123',
        is_completed: true,
        completed_at: new Date()
      };

      progressRepository.findByEnrollmentAndLesson.mockResolvedValue(null);
      progressRepository.create.mockResolvedValue(mockProgress);
      enrollmentService.getEnrollmentById.mockResolvedValue({});
      progressRepository.getCompletedLessonsCount.mockResolvedValue({ total: 10, completed: 5 });
      enrollmentService.updateProgress.mockResolvedValue({});

      const result = await progressService.markLessonComplete('enrollment-123', 'lesson-123');

      expect(result.is_completed).toBe(true);
      expect(result).toHaveProperty('completed_at');
    });
  });

  describe('getLastWatchedLesson', () => {
    it('should return last accessed lesson', async () => {
      const mockProgress = [
        {
          lesson_id: 'lesson-1',
          is_completed: true,
          updated_at: new Date('2025-01-01')
        },
        {
          lesson_id: 'lesson-2',
          is_completed: false,
          last_position: 450,
          updated_at: new Date('2025-01-15')
        }
      ];

      progressRepository.findByEnrollmentId.mockResolvedValue(mockProgress);

      const result = await progressService.getLastWatchedLesson('enrollment-123');

      expect(result.lesson_id).toBe('lesson-2');
      expect(result.last_position).toBe(450);
    });

    it('should return null if no progress exists', async () => {
      progressRepository.findByEnrollmentId.mockResolvedValue([]);

      const result = await progressService.getLastWatchedLesson('enrollment-123');

      expect(result).toBeNull();
    });
  });

  describe('resetProgress', () => {
    it('should reset all progress for an enrollment', async () => {
      progressRepository.deleteByEnrollmentId.mockResolvedValue(true);
      enrollmentService.updateProgress.mockResolvedValue({});

      const result = await progressService.resetProgress('enrollment-123');

      expect(result).toBe(true);
      expect(progressRepository.deleteByEnrollmentId).toHaveBeenCalledWith('enrollment-123');
      expect(enrollmentService.updateProgress).toHaveBeenCalledWith('enrollment-123', 0);
    });
  });

  describe('calculateEnrollmentProgress', () => {
    it('should recalculate overall enrollment progress', async () => {
      const mockEnrollment = {
        enrollment_id: 'enrollment-123',
        course_id: 'course-123'
      };

      const mockStats = {
        total: 10,
        completed: 7
      };

      enrollmentService.getEnrollmentById.mockResolvedValue(mockEnrollment);
      progressRepository.getCompletedLessonsCount.mockResolvedValue(mockStats);
      enrollmentService.updateProgress.mockResolvedValue({});

      await progressService.calculateEnrollmentProgress('enrollment-123');

      expect(enrollmentService.updateProgress).toHaveBeenCalledWith('enrollment-123', 70);
    });
  });
});
