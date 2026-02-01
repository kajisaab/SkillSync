const storageService = require('../../../src/services/storage.service');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Mock AWS S3 Client
jest.mock('@aws-sdk/client-s3');

describe('Storage Service Tests', () => {
  let mockS3Send;

  beforeEach(() => {
    jest.clearAllMocks();
    mockS3Send = jest.fn();
    S3Client.mockImplementation(() => ({
      send: mockS3Send
    }));
  });

  describe('uploadVideo', () => {
    it('should upload video successfully and return URL', async () => {
      const mockFile = {
        buffer: Buffer.from('fake video data'),
        originalname: 'test-video.mp4',
        mimetype: 'video/mp4',
        size: 1024000
      };

      mockS3Send.mockResolvedValue({
        $metadata: { httpStatusCode: 200 }
      });

      const result = await storageService.uploadVideo(mockFile);

      expect(result).toContain('.mp4');
      expect(result).toContain('videos/');
      expect(mockS3Send).toHaveBeenCalled();
    });

    it('should throw error if file is missing', async () => {
      await expect(
        storageService.uploadVideo(null)
      ).rejects.toThrow('No file provided');
    });

    it('should throw error if file type is invalid', async () => {
      const mockFile = {
        buffer: Buffer.from('fake data'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 1024
      };

      await expect(
        storageService.uploadVideo(mockFile)
      ).rejects.toThrow('Invalid file type');
    });

    it('should throw error if file size exceeds limit', async () => {
      const mockFile = {
        buffer: Buffer.from('fake video data'),
        originalname: 'large-video.mp4',
        mimetype: 'video/mp4',
        size: 600 * 1024 * 1024 // 600 MB (exceeds 500MB limit)
      };

      await expect(
        storageService.uploadVideo(mockFile)
      ).rejects.toThrow('File size exceeds limit');
    });

    it('should handle S3 upload failure', async () => {
      const mockFile = {
        buffer: Buffer.from('fake video data'),
        originalname: 'test-video.mp4',
        mimetype: 'video/mp4',
        size: 1024000
      };

      mockS3Send.mockRejectedValue(new Error('S3 upload failed'));

      await expect(
        storageService.uploadVideo(mockFile)
      ).rejects.toThrow('S3 upload failed');
    });
  });

  describe('uploadFile', () => {
    it('should upload document file successfully', async () => {
      const mockFile = {
        buffer: Buffer.from('fake pdf data'),
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024000
      };

      mockS3Send.mockResolvedValue({
        $metadata: { httpStatusCode: 200 }
      });

      const result = await storageService.uploadFile(mockFile);

      expect(result).toContain('.pdf');
      expect(result).toContain('resources/');
      expect(mockS3Send).toHaveBeenCalled();
    });

    it('should upload zip file successfully', async () => {
      const mockFile = {
        buffer: Buffer.from('fake zip data'),
        originalname: 'resources.zip',
        mimetype: 'application/zip',
        size: 1024000
      };

      mockS3Send.mockResolvedValue({
        $metadata: { httpStatusCode: 200 }
      });

      const result = await storageService.uploadFile(mockFile);

      expect(result).toContain('.zip');
      expect(result).toContain('resources/');
      expect(mockS3Send).toHaveBeenCalled();
    });

    it('should throw error for invalid file type', async () => {
      const mockFile = {
        buffer: Buffer.from('fake data'),
        originalname: 'script.js',
        mimetype: 'application/javascript',
        size: 1024
      };

      await expect(
        storageService.uploadFile(mockFile)
      ).rejects.toThrow('Invalid file type');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const fileUrl = 'https://r2.example.com/videos/video-123.mp4';

      mockS3Send.mockResolvedValue({
        $metadata: { httpStatusCode: 204 }
      });

      const result = await storageService.deleteFile(fileUrl);

      expect(result).toBe(true);
      expect(mockS3Send).toHaveBeenCalled();
    });

    it('should handle deletion failure gracefully', async () => {
      const fileUrl = 'https://r2.example.com/videos/video-123.mp4';

      mockS3Send.mockRejectedValue(new Error('Delete failed'));

      await expect(
        storageService.deleteFile(fileUrl)
      ).rejects.toThrow('Delete failed');
    });

    it('should throw error if URL is invalid', async () => {
      await expect(
        storageService.deleteFile(null)
      ).rejects.toThrow('Invalid file URL');
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL for private video access', async () => {
      const fileKey = 'videos/video-123.mp4';

      const result = await storageService.getSignedUrl(fileKey);

      expect(result).toContain('videos/video-123.mp4');
      expect(typeof result).toBe('string');
    });
  });
});
