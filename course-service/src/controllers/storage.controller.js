/**
 * Storage Controller
 * Handles file upload presigned URL generation
 */

const storageService = require('../services/storage.service');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * Generate presigned URL for file upload
 * POST /api/storage/upload-url
 * @access Private (Instructor only)
 */
const generateUploadUrl = asyncHandler(async (req, res) => {
  const { fileType, folder } = req.body;

  const result = await storageService.generateUploadUrl(fileType, folder);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Generate presigned URL for file download
 * POST /api/storage/download-url
 * @access Private (Instructor only)
 */
const generateDownloadUrl = asyncHandler(async (req, res) => {
  const { fileKey } = req.body;

  const downloadUrl = await storageService.generateDownloadUrl(fileKey);

  res.status(200).json({
    success: true,
    data: {
      downloadUrl,
    },
  });
});

module.exports = {
  generateUploadUrl,
  generateDownloadUrl,
};
