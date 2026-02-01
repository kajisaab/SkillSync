/**
 * S3/R2 Storage Configuration
 * Cloudflare R2 configuration using AWS S3 SDK
 */

const { S3Client } = require('@aws-sdk/client-s3');

// Cloudflare R2 Configuration
const s3Config = {
  region: 'auto', // R2 uses 'auto' for region
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  // Force path style for R2 compatibility
  forcePathStyle: true,
};

// Create S3 client
const s3Client = new S3Client(s3Config);

// Bucket name from environment
const bucketName = process.env.R2_BUCKET_NAME || 'skillsync-media';

/**
 * Test S3/R2 connection
 * @returns {Promise<boolean>}
 */
const testStorageConnection = async () => {
  try {
    const { ListBucketsCommand } = require('@aws-sdk/client-s3');
    const command = new ListBucketsCommand({});
    await s3Client.send(command);
    console.log('✓ Storage (R2) connection successful');
    return true;
  } catch (error) {
    console.error('✗ Storage (R2) connection failed:', error.message);
    return false;
  }
};

module.exports = {
  s3Client,
  bucketName,
  testStorageConnection,
};
