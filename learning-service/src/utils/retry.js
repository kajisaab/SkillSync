/**
 * Retry with Exponential Backoff
 * Handles transient failures with intelligent retry logic
 */

/**
 * Default retry options
 */
const defaultOptions = {
  maxRetries: 3,
  initialDelay: 1000,      // 1 second
  maxDelay: 30000,         // 30 seconds
  backoffMultiplier: 2,
  jitter: true,            // Add randomness to prevent thundering herd
  retryableErrors: null,   // Array of error codes/types to retry, null = all
  onRetry: null,           // Callback function(error, attempt, delay)
};

/**
 * Calculate delay with exponential backoff
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {Object} options - Retry options
 * @returns {number} Delay in milliseconds
 */
const calculateDelay = (attempt, options) => {
  let delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt);
  delay = Math.min(delay, options.maxDelay);

  // Add jitter (±25% randomness)
  if (options.jitter) {
    const jitterRange = delay * 0.25;
    delay = delay + (Math.random() * jitterRange * 2) - jitterRange;
  }

  return Math.floor(delay);
};

/**
 * Check if error is retryable
 * @param {Error} error - The error to check
 * @param {Object} options - Retry options
 * @returns {boolean}
 */
const isRetryable = (error, options) => {
  // If no specific errors defined, retry all
  if (!options.retryableErrors) {
    // Don't retry client errors (4xx)
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      return false;
    }
    return true;
  }

  // Check error code
  if (error.code && options.retryableErrors.includes(error.code)) {
    return true;
  }

  // Check error name/type
  if (error.name && options.retryableErrors.includes(error.name)) {
    return true;
  }

  // Check HTTP status
  if (error.response && options.retryableErrors.includes(error.response.status)) {
    return true;
  }

  return false;
};

/**
 * Sleep for specified duration
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of the function
 */
const retry = async (fn, options = {}) => {
  const opts = { ...defaultOptions, ...options };
  let lastError;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= opts.maxRetries) {
        break;
      }

      if (!isRetryable(error, opts)) {
        break;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, opts);

      // Call onRetry callback if provided
      if (opts.onRetry) {
        opts.onRetry(error, attempt + 1, delay);
      }

      console.log(`[Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed, retrying in ${delay}ms:`, error.message);

      await sleep(delay);
    }
  }

  // All retries exhausted
  lastError.retriesExhausted = true;
  lastError.totalAttempts = opts.maxRetries + 1;
  throw lastError;
};

/**
 * Create a retryable wrapper for a function
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Retry options
 * @returns {Function} Wrapped function
 */
const withRetry = (fn, options = {}) => {
  return (...args) => retry(() => fn(...args), options);
};

/**
 * Retry with circuit breaker integration
 * @param {Function} fn - Async function to execute
 * @param {Object} circuitBreaker - Circuit breaker instance
 * @param {Object} retryOptions - Retry options
 * @returns {Promise} Result of the function
 */
const retryWithCircuitBreaker = async (fn, circuitBreaker, retryOptions = {}) => {
  const opts = { ...defaultOptions, ...retryOptions };

  return retry(async () => {
    return circuitBreaker.execute(fn);
  }, {
    ...opts,
    retryableErrors: [...(opts.retryableErrors || []), 'CIRCUIT_OPEN'],
  });
};

/**
 * Common retryable error codes
 */
const RetryableErrors = {
  NETWORK: ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
  HTTP: [500, 502, 503, 504],
  CIRCUIT: ['CIRCUIT_OPEN'],
};

module.exports = {
  retry,
  withRetry,
  retryWithCircuitBreaker,
  calculateDelay,
  isRetryable,
  RetryableErrors,
  defaultOptions,
};
