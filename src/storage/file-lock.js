/**
 * File Locking
 * Simple file-based locking mechanism for concurrent access control
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_LOCK_TIMEOUT = 5000; // 5 seconds
const DEFAULT_RETRY_INTERVAL = 100; // 100ms

/**
 * Acquire a file lock and execute a callback
 * @param {string} filePath - Path to the file to lock
 * @param {function} callback - Async function to execute while locked
 * @param {object} options - Lock options
 * @returns {Promise<any>} - Result from callback
 */
async function withFileLock(filePath, callback, options = {}) {
  const lockTimeout = options.lockTimeout || DEFAULT_LOCK_TIMEOUT;
  const retryInterval = options.retryInterval || DEFAULT_RETRY_INTERVAL;
  const lockPath = filePath + '.lock';
  
  const startTime = Date.now();
  
  // Wait for lock to be available or timeout
  while (fs.existsSync(lockPath)) {
    const lockAge = Date.now() - fs.statSync(lockPath).mtimeMs;
    
    if (lockAge > lockTimeout) {
      // Lock is stale, force unlock
      try {
        fs.unlinkSync(lockPath);
      } catch (error) {
        // Another process might have removed it
      }
      break;
    }
    
    if (Date.now() - startTime > lockTimeout) {
      throw new Error(`Lock timeout for ${filePath}`);
    }
    
    await sleep(retryInterval);
  }
  
  // Acquire lock
  try {
    fs.writeFileSync(lockPath, process.pid.toString(), 'utf8');
  } catch (error) {
    throw new Error(`Failed to acquire lock for ${filePath}: ${error.message}`);
  }
  
  try {
    // Execute callback with lock held
    return await callback();
  } finally {
    // Release lock
    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
}

/**
 * Read a file with locking
 * @param {string} filePath - Path to the file
 * @param {string} encoding - File encoding
 * @returns {Promise<string>} - File contents
 */
async function readFileLocked(filePath, encoding = 'utf8') {
  return withFileLock(filePath, () => {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, encoding, (error, data) => {
        if (error) reject(error);
        else resolve(data);
      });
    });
  });
}

/**
 * Write a file with locking
 * @param {string} filePath - Path to the file
 * @param {string} content - Content to write
 * @param {string} encoding - File encoding
 * @returns {Promise<void>}
 */
async function writeFileLocked(filePath, content, encoding = 'utf8') {
  // Ensure directory exists
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  return withFileLock(filePath, () => {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, content, encoding, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });
}

/**
 * Append to a file with locking
 * @param {string} filePath - Path to the file
 * @param {string} content - Content to append
 * @param {string} encoding - File encoding
 * @returns {Promise<void>}
 */
async function appendFileLocked(filePath, content, encoding = 'utf8') {
  // Ensure directory exists
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  return withFileLock(filePath, () => {
    return new Promise((resolve, reject) => {
      fs.appendFile(filePath, content, encoding, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });
}

/**
 * Check if a file exists (no lock needed)
 * @param {string} filePath - Path to the file
 * @returns {boolean}
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Delete a file with locking
 * @param {string} filePath - Path to the file
 * @returns {Promise<void>}
 */
async function deleteFileLocked(filePath) {
  return withFileLock(filePath, () => {
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (error) => {
        if (error && error.code !== 'ENOENT') {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  });
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  withFileLock,
  readFileLocked,
  writeFileLocked,
  appendFileLocked,
  fileExists,
  deleteFileLocked,
};
