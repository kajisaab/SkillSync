/**
 * Redis Configuration
 * Cache management for Course Service
 */

const redis = require('redis');

const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
  },
  password: process.env.REDIS_PASSWORD,
  database: 1, // Course service uses database 1
};

const redisClient = redis.createClient(redisConfig);

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✓ Redis client connecting...');
});

redisClient.on('ready', () => {
  console.log('✓ Redis client ready');
});

redisClient.on('end', () => {
  console.log('Redis client disconnected');
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('✓ Redis connection successful');
  } catch (error) {
    console.error('✗ Redis connection failed:', error.message);
    throw error;
  }
};

const setCache = async (key, value, ttl = 300) => {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Redis SET error:', error.message);
  }
};

const getCache = async (key) => {
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis GET error:', error.message);
    return null;
  }
};

const delCache = async (key) => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('Redis DEL error:', error.message);
  }
};

const delCachePattern = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Redis DEL pattern error:', error.message);
  }
};

const exists = async (key) => {
  try {
    const result = await redisClient.exists(key);
    return result === 1;
  } catch (error) {
    console.error('Redis EXISTS error:', error.message);
    return false;
  }
};

const closeRedis = async () => {
  try {
    await redisClient.quit();
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis connection:', error.message);
  }
};

module.exports = {
  redisClient,
  connectRedis,
  setCache,
  getCache,
  delCache,
  delCachePattern,
  exists,
  closeRedis,
};
