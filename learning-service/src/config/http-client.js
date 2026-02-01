/**
 * HTTP Client Configuration
 * Axios clients for inter-service communication
 */

const axios = require('axios');
require('dotenv').config();

/**
 * Course Service HTTP Client
 */
const courseServiceClient = axios.create({
  baseURL: process.env.COURSE_SERVICE_URL || 'http://localhost:3002/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
courseServiceClient.interceptors.request.use(
  (config) => {
    console.log(`[Course Service] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[Course Service] Request error:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
courseServiceClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`[Course Service] Error ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      console.error('[Course Service] No response received:', error.message);
    } else {
      console.error('[Course Service] Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Auth Service HTTP Client (for future use)
 */
const authServiceClient = axios.create({
  baseURL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

module.exports = {
  courseServiceClient,
  authServiceClient,
};
