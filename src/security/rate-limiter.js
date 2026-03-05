/**
 * Rate Limiter
 * Per-user rate limiting with per-minute and per-hour windows
 */

class RateLimiter {
  constructor(requestsPerMinute = 10, requestsPerHour = 100, logger = null) {
    this.requestsPerMinute = requestsPerMinute;
    this.requestsPerHour = requestsPerHour;
    this.logger = logger || { debug: () => {}, info: () => {}, warn: () => {} };
    
    // Map: chatId -> { minute: [{timestamp}], hour: [{timestamp}] }
    this.limits = new Map();
    
    // Cleanup stale entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if a user is allowed to make a request
   * @param {number} chatId - User's chat ID
   * @returns {boolean} - True if request is allowed
   */
  isAllowed(chatId) {
    const now = Date.now();
    
    if (!this.limits.has(chatId)) {
      this.limits.set(chatId, {
        minute: [now],
        hour: [now],
      });
      return true;
    }
    
    const userLimits = this.limits.get(chatId);
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Clean up old entries
    userLimits.minute = userLimits.minute.filter(t => t > oneMinuteAgo);
    userLimits.hour = userLimits.hour.filter(t => t > oneHourAgo);
    
    // Check per-minute limit
    if (userLimits.minute.length >= this.requestsPerMinute) {
      this.logger.warn(`Rate limit (minute) exceeded for chat ${chatId}`);
      return false;
    }
    
    // Check per-hour limit
    if (userLimits.hour.length >= this.requestsPerHour) {
      this.logger.warn(`Rate limit (hour) exceeded for chat ${chatId}`);
      return false;
    }
    
    // Request allowed, add timestamp
    userLimits.minute.push(now);
    userLimits.hour.push(now);
    
    return true;
  }

  /**
   * Get the current status for a user
   * @param {number} chatId - User's chat ID
   * @returns {object} - Status with remaining quota and reset times
   */
  getStatus(chatId) {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    
    if (!this.limits.has(chatId)) {
      return {
        requestsThisMinute: 0,
        requestsThisHour: 0,
        remainingMinute: this.requestsPerMinute,
        remainingHour: this.requestsPerHour,
        minutesUntilReset: 1,
        hoursUntilReset: 1,
      };
    }
    
    const userLimits = this.limits.get(chatId);
    
    // Filter to current windows
    const minuteRequests = userLimits.minute.filter(t => t > oneMinuteAgo);
    const hourRequests = userLimits.hour.filter(t => t > oneHourAgo);
    
    // Calculate time until reset
    const oldestMinuteRequest = minuteRequests.length > 0 ? Math.min(...minuteRequests) : now;
    const oldestHourRequest = hourRequests.length > 0 ? Math.min(...hourRequests) : now;
    
    const minutesUntilReset = Math.ceil((oldestMinuteRequest + 60 * 1000 - now) / 1000 / 60);
    const hoursUntilReset = Math.ceil((oldestHourRequest + 60 * 60 * 1000 - now) / 1000 / 60 / 60);
    
    return {
      requestsThisMinute: minuteRequests.length,
      requestsThisHour: hourRequests.length,
      remainingMinute: Math.max(0, this.requestsPerMinute - minuteRequests.length),
      remainingHour: Math.max(0, this.requestsPerHour - hourRequests.length),
      minutesUntilReset: Math.max(0, minutesUntilReset),
      hoursUntilReset: Math.max(0, hoursUntilReset),
    };
  }

  /**
   * Reset rate limit for a user
   * @param {number} chatId - User's chat ID
   */
  reset(chatId) {
    this.limits.delete(chatId);
    this.logger.debug(`Rate limit reset for chat ${chatId}`);
  }

  /**
   * Reset all rate limits
   */
  resetAll() {
    this.limits.clear();
    this.logger.info('All rate limits reset');
  }

  /**
   * Cleanup stale entries (runs periodically)
   */
  cleanup() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    for (const [chatId, limits] of this.limits.entries()) {
      // If user hasn't made any requests in the last hour, remove entry
      const hasRecentRequests = limits.hour.some(t => t > oneHourAgo);
      
      if (!hasRecentRequests) {
        this.limits.delete(chatId);
      }
    }
    
    this.logger.debug(`Rate limiter cleanup: ${this.limits.size} users tracked`);
  }

  /**
   * Get all tracked users (for debugging)
   */
  getTrackedUsers() {
    const users = [];
    for (const [chatId, limits] of this.limits.entries()) {
      users.push({
        chatId,
        requestsMinute: limits.minute.length,
        requestsHour: limits.hour.length,
      });
    }
    return users;
  }
}

module.exports = RateLimiter;
