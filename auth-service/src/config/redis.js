/**
 * Redis Configuration
 * Cache and session management
 */

const redis = require("redis");

const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT) || 6379,
  },
  password: process.env.REDIS_PASSWORD,
  database: 0, // Auth service uses database 0
};

// Create Redis client
const redisClient = redis.createClient(redisConfig);

// Error handling
redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

redisClient.on("connect", () => {
  console.log("✓ Redis client connecting...");
});

redisClient.on("ready", () => {
  console.log("✓ Redis client ready");
});

redisClient.on("end", () => {
  console.log("Redis client disconnected");
});

/**
 * Connect to Redis
 * @returns {Promise<void>}
 */
const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log("✓ Redis connection successful");
  } catch (error) {
    console.error("✗ Redis connection failed:", error.message);
    throw error;
  }
};

/**
 * Set value in cache with TTL
 * @param {string} key - Cache key
 * @param {string} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<void>}
 */
const setCache = async (key, value, ttl = 300) => {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error("Redis SET error:", error.message);
    throw error;
  }
};

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>}
 */
const getCache = async (key) => {
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error("Redis GET error:", error.message);
    return null;
  }
};

/**
 * Delete key from cache
 * @param {string} key - Cache key
 * @returns {Promise<void>}
 */
const delCache = async (key) => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error("Redis DEL error:", error.message);
  }
};

/**
 * Delete keys by pattern
 * @param {string} pattern - Key pattern (e.g., 'auth:session:*')
 * @returns {Promise<void>}
 */
const delCachePattern = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error("Redis DEL pattern error:", error.message);
  }
};

/**
 * Check if key exists
 * @param {string} key - Cache key
 * @returns {Promise<boolean>}
 */
const exists = async (key) => {
  try {
    const result = await redisClient.exists(key);
    return result === 1;
  } catch (error) {
    console.error("Redis EXISTS error:", error.message);
    return false;
  }
};

/**
 * Close Redis connection
 * @returns {Promise<void>}
 */
const closeRedis = async () => {
  try {
    await redisClient.quit();
    console.log("Redis connection closed");
  } catch (error) {
    console.error("Error closing Redis connection:", error.message);
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
