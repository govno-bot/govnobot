// src/security/crypto-utils.js
// Zero-dependency cryptography utilities for Node.js (no external packages)
// Provides: randomBytes, sha256, hmacSha256, base64 encode/decode, timingSafeEqual

const crypto = require('crypto');

module.exports = {
  /**
   * Generate cryptographically secure random bytes.
   * @param {number} size - Number of bytes
   * @returns {Buffer}
   */
  randomBytes(size) {
    if (typeof size !== 'number' || size <= 0) throw new Error('Invalid size');
    return crypto.randomBytes(size);
  },

  /**
   * Compute SHA-256 hash of input (Buffer or string).
   * @param {Buffer|string} data
   * @returns {Buffer}
   */
  sha256(data) {
    return crypto.createHash('sha256').update(data).digest();
  },

  /**
   * Compute HMAC-SHA256 of input with key.
   * @param {Buffer|string} key
   * @param {Buffer|string} data
   * @returns {Buffer}
   */
  hmacSha256(key, data) {
    return crypto.createHmac('sha256', key).update(data).digest();
  },

  /**
   * Base64 encode a Buffer or string.
   * @param {Buffer|string} data
   * @returns {string}
   */
  base64Encode(data) {
    if (Buffer.isBuffer(data)) return data.toString('base64');
    return Buffer.from(data, 'utf8').toString('base64');
  },

  /**
   * Base64 decode to Buffer.
   * @param {string} b64
   * @returns {Buffer}
   */
  base64Decode(b64) {
    return Buffer.from(b64, 'base64');
  },

  /**
   * Timing-safe buffer comparison.
   * @param {Buffer} a
   * @param {Buffer} b
   * @returns {boolean}
   */
  timingSafeEqual(a, b) {
    if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) throw new Error('Arguments must be Buffers');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
};
