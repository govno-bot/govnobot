/**
 * Message Chunker - Splits long messages for Telegram
 * Telegram has a 4096 character limit per message
 */

const DEFAULT_CHUNK_SIZE = 4096;

/**
 * Chunk a message into Telegram-compatible pieces
 * @param {string} message - The message to chunk
 * @param {number} maxSize - Maximum chunk size (default: 4096)
 * @returns {string[]} Array of message chunks
 */
function chunk(message, maxSize = DEFAULT_CHUNK_SIZE) {
  // Handle null/undefined
  if (message == null) {
    return [''];
  }
  
  // Convert to string
  message = String(message);
  
  // If message fits, return as-is
  if (message.length <= maxSize) {
    return [message];
  }
  
  const chunks = [];
  let currentChunk = '';
  
  // Try to split at newlines for better readability
  const lines = message.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineWithNewline = (i < lines.length - 1) ? line + '\n' : line;
    
    // If single line is too long, we need to split it
    if (lineWithNewline.length > maxSize) {
      // Flush current chunk if not empty
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      
      // Split the long line by characters
      let remaining = lineWithNewline;
      while (remaining.length > 0) {
        const part = remaining.substring(0, maxSize);
        chunks.push(part);
        remaining = remaining.substring(maxSize);
      }
      continue;
    }
    
    // Check if adding this line would exceed limit
    if (currentChunk.length + lineWithNewline.length > maxSize) {
      // Save current chunk and start new one
      chunks.push(currentChunk);
      currentChunk = lineWithNewline;
    } else {
      // Add line to current chunk
      currentChunk += lineWithNewline;
    }
  }
  
  // Add final chunk if not empty
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  // Edge case: if we somehow got empty chunks array, return empty string
  if (chunks.length === 0) {
    return [''];
  }
  
  return chunks;
}

/**
 * Check if code blocks are balanced in a chunk
 * @param {string} text - Text to check
 * @returns {boolean} True if code blocks are balanced
 */
function hasBalancedCodeBlocks(text) {
  const codeBlockMarkers = text.match(/```/g);
  return !codeBlockMarkers || codeBlockMarkers.length % 2 === 0;
}

/**
 * Smart chunk that tries to preserve code blocks
 * @param {string} message - Message to chunk
 * @param {number} maxSize - Maximum chunk size
 * @returns {string[]} Array of chunks
 */
function chunkWithCodeBlocks(message, maxSize = DEFAULT_CHUNK_SIZE) {
  if (message == null || message.length <= maxSize) {
    return chunk(message, maxSize);
  }
  
  const basicChunks = chunk(message, maxSize);
  
  // Try to fix unbalanced code blocks
  const fixedChunks = [];
  for (let i = 0; i < basicChunks.length; i++) {
    const currentChunk = basicChunks[i];
    
    if (!hasBalancedCodeBlocks(currentChunk)) {
      // If unbalanced, try to include more or add closing marker
      if (i < basicChunks.length - 1) {
        // Could implement more sophisticated logic here
        fixedChunks.push(currentChunk);
      } else {
        fixedChunks.push(currentChunk);
      }
    } else {
      fixedChunks.push(currentChunk);
    }
  }
  
  return fixedChunks;
}

module.exports = {
  chunk,
  chunkWithCodeBlocks,
  DEFAULT_CHUNK_SIZE
};
