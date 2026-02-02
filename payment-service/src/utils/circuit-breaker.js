/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures in distributed systems
 */

const CircuitState = {
  CLOSED: 'CLOSED',     // Normal operation, requests pass through
  OPEN: 'OPEN',         // Failure threshold reached, requests blocked
  HALF_OPEN: 'HALF_OPEN' // Testing if service recovered
};

class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 30000; // 30 seconds
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute

    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
  }

  /**
   * Check if circuit is open
   */
  isOpen() {
    if (this.state === CircuitState.OPEN) {
      // Check if reset timeout has elapsed
      if (Date.now() >= this.nextAttempt) {
        this.state = CircuitState.HALF_OPEN;
        console.log(`[CircuitBreaker:${this.name}] State changed to HALF_OPEN`);
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Record a successful call
   */
  recordSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.reset();
        console.log(`[CircuitBreaker:${this.name}] State changed to CLOSED (recovered)`);
      }
    } else {
      this.failureCount = 0;
    }
  }

  /**
   * Record a failed call
   */
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.trip();
      console.log(`[CircuitBreaker:${this.name}] State changed to OPEN (failed in half-open)`);
    } else if (this.failureCount >= this.failureThreshold) {
      this.trip();
      console.log(`[CircuitBreaker:${this.name}] State changed to OPEN (threshold reached)`);
    }
  }

  /**
   * Trip the circuit breaker
   */
  trip() {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.resetTimeout;
    this.successCount = 0;
  }

  /**
   * Reset the circuit breaker
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - Async function to execute
   * @returns {Promise} Result of the function
   */
  async execute(fn) {
    if (this.isOpen()) {
      const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
      error.code = 'CIRCUIT_OPEN';
      error.circuitBreaker = this.name;
      throw error;
    }

    try {
      const result = await this.withTimeout(fn);
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  async withTimeout(fn) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.timeout}ms`));
      }, this.timeout);

      try {
        const result = await fn();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.state === CircuitState.OPEN ? this.nextAttempt : null,
    };
  }
}

/**
 * Circuit Breaker Registry
 * Manages multiple circuit breakers for different services
 */
class CircuitBreakerRegistry {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Get or create a circuit breaker
   */
  get(name, options = {}) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({ name, ...options }));
    }
    return this.breakers.get(name);
  }

  /**
   * Get all circuit breakers status
   */
  getAllStatus() {
    const status = {};
    for (const [name, breaker] of this.breakers) {
      status[name] = breaker.getStatus();
    }
    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// Global registry
const registry = new CircuitBreakerRegistry();

module.exports = {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitState,
  registry,
};
