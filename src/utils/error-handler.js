/**
 * Error Handler
 * Centralized error logging and user-friendly messaging
 */

/**
 * Redact sensitive data from an object
 * @param {object} obj - Object to redact
 * @returns {object} - Redacted object
 */
function redactSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }
  
  const safeObj = {};
  const sensitivePatterns = [/password/i, /token/i, /secret/i, /authorization/i, /api[-_]?key/i];
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Check if key matches sensitive patterns
      const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));
      
      if (isSensitive) {
        safeObj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        // Recursive redaction
        safeObj[key] = redactSensitiveData(obj[key]);
      } else {
        safeObj[key] = obj[key];
      }
    }
  }
  
  return safeObj;
}

function handleError(error, options = {}) {
  const {
    logger = null,
    userMessage: defaultUserMessage = 'An unexpected error occurred. Please try again.',
    context = {},
    logMessage = 'Unhandled error',
  } = options;

  // Determine user message
  let finalUserMessage = defaultUserMessage;
  
  // If error is explicitly marked as safe for users, use its message
  if (error && error.isUserSafe) {
    finalUserMessage = error.message;
  }

  // Prepare safe context for logging
  const safeContext = redactSensitiveData(context);
  
  const payload = {
    name: error?.name || 'Error',
    message: error?.message || String(error),
    stack: error?.stack,
    context: safeContext,
  };

  if (logger && typeof logger.error === 'function') {
    logger.error(logMessage, payload);
  }

  return finalUserMessage;
}

module.exports = {
  handleError,
  redactSensitiveData,
};
