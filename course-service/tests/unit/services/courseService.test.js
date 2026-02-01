const courseRepository = require('../../../src/repositories/courseRepository');
const cacheService = require('../../../src/services/cacheService');
const {
  createCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
  publishCourse
} = require('../../../src/services/courseService');

jest.mock('../../../src/repositories/courseRepository');
jest.mock('../../../src/services/cacheService');

describe('Course Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    it('should create a course successfully', async () => {
      const courseData = {
        instructor_id: 'instructor-123',
        title: 'Test Course',
        description: 'Test Description',
        category: 'Programming',
        price: 4999,
      };

      const mockCourse = {
        course_id: 'course-123',
        ...courseData,
        is_published: false,
        created_at: new Date(),
      };

      courseRepository.create.mockResolvedValue(mockCourse);

      const result = await createCourse(courseData);

      expect(result).toEqual(mockCourse);
      expect(courseRepository.create).toHaveBeenCalledWith(courseData);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        instructor_id: 'instructor-123',
        title: '', // Empty title
      };

      await expect(createCourse(invalidData)).rejects.toThrow();
    });
  });

  describe('getCourseById', () => {
    it('should return cached course if available', async () => {
      const courseId = 'course-123';
      const mockCourse = {
        course_id: courseId,
        title: 'Cached Course',
      };

      cacheService.getCachedCourse.mockResolvedValue(mockCourse);

      const result = await getCourseById(courseId);

      expect(result).toEqual(mockCourse);
      expect(cacheService.getCachedCourse).toHaveBeenCalledWith(courseId);
      expect(courseRepository.findById).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      const courseId = 'course-123';
      const mockCourse = {
        course_id: courseId,
        title: 'Database Course',
      };

      cacheService.getCachedCourse.mockResolvedValue(null);
      courseRepository.findById.mockResolvedValue(mockCourse);

      const result = await getCourseById(courseId);

      expect(result).toEqual(mockCourse);
      expect(courseRepository.findById).toHaveBeenCalledWith(courseId);
      expect(cacheService.setCachedCourse).toHaveBeenCalledWith(courseId, mockCourse);
    });

    it('should throw error if course not found', async () => {
      const courseId = 'nonexistent-course';

      cacheService.getCachedCourse.mockResolvedValue(null);
      courseRepository.findById.mockResolvedValue(null);

      await expect(getCourseById(courseId)).rejects.toThrow('Course not found');
    });
  });

  describe('updateCourse', () => {
    it('should update course and invalidate cache', async () => {
      const courseId = 'course-123';
      const updateData = {
        title: 'Updated Title',
        price: 5999,
      };
      const mockUpdatedCourse = {
        course_id: courseId,
        ...updateData,
      };

      courseRepository.update.mockResolvedValue(mockUpdatedCourse);

      const result = await updateCourse(courseId, updateData);

      expect(result).toEqual(mockUpdatedCourse);
      expect(courseRepository.update).toHaveBeenCalledWith(courseId, updateData);
      expect(cacheService.invalidateCourseCache).toHaveBeenCalledWith(courseId);
    });
  });

  describe('publishCourse', () => {
    it('should publish course with valid content', async () => {
      const courseId = 'course-123';
      const mockCourse = {
        course_id: courseId,
        title: 'Course Title',
        sections: [
          {
            section_id: 'section-1',
            lessons: [
              { lesson_id: 'lesson-1', video_url: 'https://example.com/video1.mp4' }
            ]
          }
        ]
      };

      courseRepository.findById.mockResolvedValue(mockCourse);
      courseRepository.publish.mockResolvedValue({ ...mockCourse, is_published: true });

      const result = await publishCourse(courseId);

      expect(result.is_published).toBe(true);
      expect(courseRepository.publish).toHaveBeenCalledWith(courseId);
    });

    it('should not publish course without content', async () => {
      const courseId = 'course-123';
      const mockCourse = {
        course_id: courseId,
        title: 'Course Title',
        sections: []
      };

      courseRepository.findById.mockResolvedValue(mockCourse);

      await expect(publishCourse(courseId)).rejects.toThrow('Cannot publish course without content');
    });
  });

  describe('deleteCourse', () => {
    it('should delete course and clear cache', async () => {
      const courseId = 'course-123';

      courseRepository.delete.mockResolvedValue(true);

      await deleteCourse(courseId);

      expect(courseRepository.delete).toHaveBeenCalledWith(courseId);
      expect(cacheService.invalidateCourseCache).toHaveBeenCalledWith(courseId);
    });
  });
});
