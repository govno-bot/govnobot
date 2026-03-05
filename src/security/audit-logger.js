const fs = require('fs');
const path = require('path');
const cryptoUtils = require('./crypto-utils');

/**
 * Audit Logger
 * Logs actions with cryptographic signature for tamper-evidence.
 */
class AuditLogger {
  /**
   * @param {string} filePath - Path to the audit log file
   * @param {string} secretKey - Secret key for HMAC signing
   */
  constructor(filePath, secretKey) {
    if (!secretKey) {
      throw new Error('Secret key is required for AuditLogger');
    }
    this.filePath = filePath;
    this.secretKey = secretKey;
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Log an action
   * @param {object} user - User object { id, username }
   * @param {string} action - Action name
   * @param {object} details - Action details
   */
  log(user, action, details) {
    const timestamp = new Date().toISOString();
    
    // Create the entry object with specific field order
    const entry = {
      timestamp,
      user,
      action,
      details
    };
    
    // Serialize for signing
    const payload = JSON.stringify(entry);
    
    // Sign the payload
    const signature = cryptoUtils.hmacSha256(this.secretKey, payload).toString('hex');
    
    // Create final record with signature
    const record = {
      ...entry,
      signature
    };
    
    // Append to file
    fs.appendFileSync(this.filePath, JSON.stringify(record) + '\n', 'utf8');
  }

  /**
   * Verify an audit log entry
   * @param {object} entry - Parsed log entry
   * @returns {boolean} - True if signature is valid
   */
  verifyEntry(entry) {
    if (!entry || !entry.signature) return false;
    
    const signature = entry.signature;
    
    // Reconstruct entry in correct order for verification
    const checkEntry = {
      timestamp: entry.timestamp,
      user: entry.user,
      action: entry.action,
      details: entry.details
    };
    
    const payload = JSON.stringify(checkEntry);
    const expectedSignature = cryptoUtils.hmacSha256(this.secretKey, payload).toString('hex');
    
    return signature === expectedSignature;
  }
}

module.exports = AuditLogger;
