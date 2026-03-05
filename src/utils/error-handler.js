/**
 * Error Handler
 * Centralized error logging and user-friendly messaging
 */

function handleError(error, options = {}) {
  const {
    logger = null,
    userMessage = 'An unexpected error occurred. Please try again.',
    context = {},
    logMessage = 'Unhandled error',
  } = options;

  const payload = {
    name: error?.name || 'Error',
    message: error?.message || String(error),
    stack: error?.stack,
    context,
  };

  if (logger && typeof logger.error === 'function') {
    logger.error(logMessage, payload);
  }

  return userMessage;
}

module.exports = {
  handleError,
};
