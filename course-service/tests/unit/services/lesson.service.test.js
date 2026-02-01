const lessonService = require('../../../src/services/lesson.service');
const lessonRepository = require('../../../src/repositories/lesson.repository');
const storageService = require('../../../src/services/storage.service');

// Mock the dependencies
jest.mock('../../../src/repositories/lesson.repository');
jest.mock('../../../src/services/storage.service');

describe('Lesson Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLesson', () => {
    it('should create a lesson successfully', async () => {
      const mockLesson = {
        lesson_id: 'lesson-123',
        section_id: 'section-123',
        title: 'Introduction to JavaScript',
        description: 'Learn JavaScript basics',
        video_url: 'https://r2.example.com/video.mp4',
        video_duration: 600,
        order_index: 1,
        created_at: new Date()
      };

      lessonRepository.create.mockResolvedValue(mockLesson);

      const result = await lessonService.createLesson({
        section_id: 'section-123',
        title: 'Introduction to JavaScript',
        description: 'Learn JavaScript basics',
        video_url: 'https://r2.example.com/video.mp4',
        video_duration: 600,
        order_index: 1
      });

      expect(result).toEqual(mockLesson);
      expect(lessonRepository.create).toHaveBeenCalled();
    });

    it('should throw error if section_id is missing', async () => {
      await expect(
        lessonService.createLesson({
          title: 'Introduction to JavaScript',
          video_url: 'https://r2.example.com/video.mp4'
        })
      ).rejects.toThrow();
    });

    it('should throw error if title is missing', async () => {
      await expect(
        lessonService.createLesson({
          section_id: 'section-123',
          video_url: 'https://r2.example.com/video.mp4'
        })
      ).rejects.toThrow();
    });
  });

  describe('getLessonsBySectionId', () => {
    it('should return all lessons for a section', async () => {
      const mockLessons = [
        {
          lesson_id: 'lesson-1',
          section_id: 'section-123',
          title: 'Lesson 1',
          order_index: 1
        },
        {
          lesson_id: 'lesson-2',
          section_id: 'section-123',
          title: 'Lesson 2',
          order_index: 2
        }
      ];

      lessonRepository.findBySectionId.mockResolvedValue(mockLessons);

      const result = await lessonService.getLessonsBySectionId('section-123');

      expect(result).toEqual(mockLessons);
      expect(result).toHaveLength(2);
      expect(lessonRepository.findBySectionId).toHaveBeenCalledWith('section-123');
    });

    it('should return empty array if no lessons found', async () => {
      lessonRepository.findBySectionId.mockResolvedValue([]);

      const result = await lessonService.getLessonsBySectionId('section-123');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getLessonById', () => {
    it('should return lesson by id', async () => {
      const mockLesson = {
        lesson_id: 'lesson-123',
        section_id: 'section-123',
        title: 'Introduction to JavaScript',
        video_url: 'https://r2.example.com/video.mp4'
      };

      lessonRepository.findById.mockResolvedValue(mockLesson);

      const result = await lessonService.getLessonById('lesson-123');

      expect(result).toEqual(mockLesson);
      expect(lessonRepository.findById).toHaveBeenCalledWith('lesson-123');
    });

    it('should throw error if lesson not found', async () => {
      lessonRepository.findById.mockResolvedValue(null);

      await expect(
        lessonService.getLessonById('non-existent-id')
      ).rejects.toThrow('Lesson not found');
    });
  });

  describe('updateLesson', () => {
    it('should update lesson successfully', async () => {
      const mockLesson = {
        lesson_id: 'lesson-123',
        section_id: 'section-123',
        title: 'Updated Title',
        description: 'Updated description'
      };

      lessonRepository.update.mockResolvedValue(mockLesson);

      const result = await lessonService.updateLesson('lesson-123', {
        title: 'Updated Title',
        description: 'Updated description'
      });

      expect(result).toEqual(mockLesson);
      expect(lessonRepository.update).toHaveBeenCalledWith('lesson-123', {
        title: 'Updated Title',
        description: 'Updated description'
      });
    });

    it('should throw error if lesson not found', async () => {
      lessonRepository.update.mockResolvedValue(null);

      await expect(
        lessonService.updateLesson('non-existent-id', {
          title: 'Updated Title'
        })
      ).rejects.toThrow('Lesson not found');
    });
  });

  describe('deleteLesson', () => {
    it('should delete lesson and associated video successfully', async () => {
      const mockLesson = {
        lesson_id: 'lesson-123',
        video_url: 'https://r2.example.com/videos/video.mp4'
      };

      lessonRepository.findById.mockResolvedValue(mockLesson);
      storageService.deleteFile.mockResolvedValue(true);
      lessonRepository.delete.mockResolvedValue(true);

      const result = await lessonService.deleteLesson('lesson-123');

      expect(result).toBe(true);
      expect(lessonRepository.findById).toHaveBeenCalledWith('lesson-123');
      expect(storageService.deleteFile).toHaveBeenCalled();
      expect(lessonRepository.delete).toHaveBeenCalledWith('lesson-123');
    });

    it('should throw error if lesson not found', async () => {
      lessonRepository.findById.mockResolvedValue(null);

      await expect(
        lessonService.deleteLesson('non-existent-id')
      ).rejects.toThrow('Lesson not found');
    });
  });

  describe('uploadVideo', () => {
    it('should upload video and return URL', async () => {
      const mockFile = {
        buffer: Buffer.from('fake video data'),
        originalname: 'video.mp4',
        mimetype: 'video/mp4'
      };

      const mockVideoUrl = 'https://r2.example.com/videos/video-123.mp4';
      storageService.uploadVideo.mockResolvedValue(mockVideoUrl);

      const result = await lessonService.uploadVideo(mockFile);

      expect(result).toBe(mockVideoUrl);
      expect(storageService.uploadVideo).toHaveBeenCalledWith(mockFile);
    });

    it('should throw error if file is missing', async () => {
      await expect(
        lessonService.uploadVideo(null)
      ).rejects.toThrow();
    });

    it('should throw error if upload fails', async () => {
      const mockFile = {
        buffer: Buffer.from('fake video data'),
        originalname: 'video.mp4',
        mimetype: 'video/mp4'
      };

      storageService.uploadVideo.mockRejectedValue(new Error('Upload failed'));

      await expect(
        lessonService.uploadVideo(mockFile)
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('reorderLessons', () => {
    it('should reorder lessons successfully', async () => {
      const newOrder = [
        { lesson_id: 'lesson-2', order_index: 1 },
        { lesson_id: 'lesson-1', order_index: 2 }
      ];

      lessonRepository.updateOrderBulk.mockResolvedValue(true);

      const result = await lessonService.reorderLessons('section-123', newOrder);

      expect(result).toBe(true);
      expect(lessonRepository.updateOrderBulk).toHaveBeenCalledWith('section-123', newOrder);
    });
  });
});
