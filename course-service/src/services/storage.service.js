/**
 * Storage Service
 * S3/R2 operations for file and video uploads
 */

const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, bucketName } = require('../config/storage');
const { v4: uuidv4 } = require('uuid');
const { BadRequestError } = require('../utils/error.util');

/**
 * Generate presigned URL for file upload
 * @param {string} fileType - File MIME type
 * @param {string} folder - Folder in bucket (videos/resources/thumbnails)
 * @returns {Promise<Object>} Presigned URL and file key
 */
const generateUploadUrl = async (fileType, folder = 'videos') => {
  // Validate file type
  const allowedTypes = {
    videos: ['video/mp4', 'video/webm', 'video/ogg'],
    resources: ['application/pdf', 'application/zip', 'application/x-zip-compressed'],
    thumbnails: ['image/jpeg', 'image/png', 'image/webp'],
  };

  if (!allowedTypes[folder] || !allowedTypes[folder].includes(fileType)) {
    throw new BadRequestError(`File type ${fileType} not allowed for ${folder}`);
  }

  // Generate unique file key
  const fileExtension = fileType.split('/')[1];
  const fileKey = `${folder}/${uuidv4()}.${fileExtension}`;

  // Create presigned URL (valid for 15 minutes)
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    ContentType: fileType,
  });

  try {
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    return {
      uploadUrl,
      fileKey,
      fileUrl: `https://${bucketName}.r2.cloudflarestorage.com/${fileKey}`,
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    throw new Error('Failed to generate upload URL');
  }
};

/**
 * Generate presigned URL for file download
 * @param {string} fileKey - File key in bucket
 * @returns {Promise<string>} Presigned download URL
 */
const generateDownloadUrl = async (fileKey) => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
  });

  try {
    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return downloadUrl;
  } catch (error) {
    console.error('Error generating download URL:', error);
    throw new Error('Failed to generate download URL');
  }
};

/**
 * Delete file from storage
 * @param {string} fileKey - File key in bucket
 * @returns {Promise<boolean>} Success status
 */
const deleteFile = async (fileKey) => {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
  });

  try {
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Extract file key from full URL
 * @param {string} fileUrl - Full file URL
 * @returns {string} File key
 */
const extractFileKey = (fileUrl) => {
  if (!fileUrl) return null;

  // Extract key from R2 URL format
  const match = fileUrl.match(/\.r2\.cloudflarestorage\.com\/(.+)$/);
  return match ? match[1] : null;
};

module.exports = {
  generateUploadUrl,
  generateDownloadUrl,
  deleteFile,
  extractFileKey,
};
