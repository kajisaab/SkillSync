/**
 * HTTP Client Configuration
 * Axios clients for inter-service communication
 * Implements Circuit Breaker and Retry patterns for resilience
 */

const axios = require('axios');
require('dotenv').config();
const { registry: circuitBreakerRegistry } = require('../utils/circuit-breaker');
const { retry, RetryableErrors } = require('../utils/retry');

// Circuit breakers for external services
const learningServiceBreaker = circuitBreakerRegistry.get('learning-service', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 15000,
  resetTimeout: 30000,
});

const courseServiceBreaker = circuitBreakerRegistry.get('course-service', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 10000,
  resetTimeout: 30000,
});

/**
 * Learning Service HTTP Client
 * Used to trigger enrollments after successful payments
 */
const learningServiceClient = axios.create({
  baseURL: process.env.LEARNING_SERVICE_URL || 'http://localhost:3003/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
learningServiceClient.interceptors.request.use(
  (config) => {
    console.log(`[Learning Service] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[Learning Service] Request error:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
learningServiceClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`[Learning Service] Error ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      console.error('[Learning Service] No response received:', error.message);
    } else {
      console.error('[Learning Service] Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Course Service HTTP Client
 * Used to fetch course details
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
 * Resilient HTTP call with Circuit Breaker and Retry
 * @param {Object} client - Axios client instance
 * @param {Object} circuitBreaker - Circuit breaker instance
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {Object} data - Request data (for POST/PUT/PATCH)
 * @param {Object} config - Additional axios config
 * @returns {Promise} Response
 */
const resilientCall = async (client, circuitBreaker, method, url, data = null, config = {}) => {
  const requestFn = async () => {
    if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
      return client[method.toLowerCase()](url, data, config);
    }
    return client[method.toLowerCase()](url, config);
  };

  return circuitBreaker.execute(async () => {
    return retry(requestFn, {
      maxRetries: 2,
      initialDelay: 500,
      retryableErrors: [...RetryableErrors.NETWORK, ...RetryableErrors.HTTP],
      onRetry: (error, attempt, delay) => {
        console.log(`[Resilient HTTP] Retry ${attempt} for ${method.toUpperCase()} ${url}, delay: ${delay}ms`);
      },
    });
  });
};

/**
 * Resilient Learning Service Client
 * Wraps axios methods with circuit breaker and retry
 */
const resilientLearningServiceClient = {
  get: (url, config = {}) => resilientCall(learningServiceClient, learningServiceBreaker, 'get', url, null, config),
  post: (url, data, config = {}) => resilientCall(learningServiceClient, learningServiceBreaker, 'post', url, data, config),
  put: (url, data, config = {}) => resilientCall(learningServiceClient, learningServiceBreaker, 'put', url, data, config),
  patch: (url, data, config = {}) => resilientCall(learningServiceClient, learningServiceBreaker, 'patch', url, data, config),
  delete: (url, config = {}) => resilientCall(learningServiceClient, learningServiceBreaker, 'delete', url, null, config),
};

/**
 * Resilient Course Service Client
 */
const resilientCourseServiceClient = {
  get: (url, config = {}) => resilientCall(courseServiceClient, courseServiceBreaker, 'get', url, null, config),
  post: (url, data, config = {}) => resilientCall(courseServiceClient, courseServiceBreaker, 'post', url, data, config),
  put: (url, data, config = {}) => resilientCall(courseServiceClient, courseServiceBreaker, 'put', url, data, config),
  patch: (url, data, config = {}) => resilientCall(courseServiceClient, courseServiceBreaker, 'patch', url, data, config),
  delete: (url, config = {}) => resilientCall(courseServiceClient, courseServiceBreaker, 'delete', url, null, config),
};

/**
 * Get circuit breaker status for health checks
 */
const getCircuitBreakerStatus = () => {
  return circuitBreakerRegistry.getAllStatus();
};

module.exports = {
  // Raw clients (for backward compatibility)
  learningServiceClient,
  courseServiceClient,
  // Resilient clients (recommended)
  resilientLearningServiceClient,
  resilientCourseServiceClient,
  // Circuit breaker utilities
  getCircuitBreakerStatus,
  circuitBreakerRegistry,
  // Circuit breaker instances (for direct use)
  learningServiceBreaker,
  courseServiceBreaker,
};
