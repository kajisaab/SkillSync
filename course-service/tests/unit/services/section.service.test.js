const sectionService = require('../../../src/services/section.service');
const sectionRepository = require('../../../src/repositories/section.repository');

// Mock the repository
jest.mock('../../../src/repositories/section.repository');

describe('Section Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSection', () => {
    it('should create a section successfully', async () => {
      const mockSection = {
        section_id: 'section-123',
        course_id: 'course-123',
        title: 'Introduction',
        order_index: 1,
        created_at: new Date()
      };

      sectionRepository.create.mockResolvedValue(mockSection);

      const result = await sectionService.createSection({
        course_id: 'course-123',
        title: 'Introduction',
        order_index: 1
      });

      expect(result).toEqual(mockSection);
      expect(sectionRepository.create).toHaveBeenCalledWith({
        course_id: 'course-123',
        title: 'Introduction',
        order_index: 1
      });
    });

    it('should throw error if course_id is missing', async () => {
      await expect(
        sectionService.createSection({
          title: 'Introduction',
          order_index: 1
        })
      ).rejects.toThrow();
    });

    it('should throw error if title is missing', async () => {
      await expect(
        sectionService.createSection({
          course_id: 'course-123',
          order_index: 1
        })
      ).rejects.toThrow();
    });
  });

  describe('getSectionsByCourseId', () => {
    it('should return all sections for a course', async () => {
      const mockSections = [
        {
          section_id: 'section-1',
          course_id: 'course-123',
          title: 'Introduction',
          order_index: 1
        },
        {
          section_id: 'section-2',
          course_id: 'course-123',
          title: 'Advanced Topics',
          order_index: 2
        }
      ];

      sectionRepository.findByCourseId.mockResolvedValue(mockSections);

      const result = await sectionService.getSectionsByCourseId('course-123');

      expect(result).toEqual(mockSections);
      expect(result).toHaveLength(2);
      expect(sectionRepository.findByCourseId).toHaveBeenCalledWith('course-123');
    });

    it('should return empty array if no sections found', async () => {
      sectionRepository.findByCourseId.mockResolvedValue([]);

      const result = await sectionService.getSectionsByCourseId('course-123');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('updateSection', () => {
    it('should update section successfully', async () => {
      const mockSection = {
        section_id: 'section-123',
        course_id: 'course-123',
        title: 'Updated Title',
        order_index: 1
      };

      sectionRepository.update.mockResolvedValue(mockSection);

      const result = await sectionService.updateSection('section-123', {
        title: 'Updated Title'
      });

      expect(result).toEqual(mockSection);
      expect(sectionRepository.update).toHaveBeenCalledWith('section-123', {
        title: 'Updated Title'
      });
    });

    it('should throw error if section not found', async () => {
      sectionRepository.update.mockResolvedValue(null);

      await expect(
        sectionService.updateSection('non-existent-id', {
          title: 'Updated Title'
        })
      ).rejects.toThrow('Section not found');
    });
  });

  describe('deleteSection', () => {
    it('should delete section successfully', async () => {
      sectionRepository.delete.mockResolvedValue(true);

      const result = await sectionService.deleteSection('section-123');

      expect(result).toBe(true);
      expect(sectionRepository.delete).toHaveBeenCalledWith('section-123');
    });

    it('should throw error if section not found', async () => {
      sectionRepository.delete.mockResolvedValue(false);

      await expect(
        sectionService.deleteSection('non-existent-id')
      ).rejects.toThrow('Section not found');
    });
  });

  describe('reorderSections', () => {
    it('should reorder sections successfully', async () => {
      const newOrder = [
        { section_id: 'section-2', order_index: 1 },
        { section_id: 'section-1', order_index: 2 }
      ];

      sectionRepository.updateOrderBulk.mockResolvedValue(true);

      const result = await sectionService.reorderSections('course-123', newOrder);

      expect(result).toBe(true);
      expect(sectionRepository.updateOrderBulk).toHaveBeenCalledWith('course-123', newOrder);
    });
  });
});
