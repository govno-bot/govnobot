// src/ai/openai.js
// Zero-dependency OpenAI client for Node.js (built-in modules only)
// Supports OpenAI Chat API (v1) via HTTPS

const https = require('https');
const { URL } = require('url');

class OpenAIClient {
  /**
   * @param {Object} opts
   * @param {string} [opts.apiKey] - OpenAI API key
   * @param {string} [opts.baseUrl] - Override base URL (default: 'https://api.openai.com')
   * @param {string} [opts.model] - Default model (e.g. 'gpt-3.5-turbo')
   */
  constructor(opts = {}) {
    this.apiKey = opts.apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = opts.baseUrl || 'https://api.openai.com';
    this.model = opts.model || 'gpt-3.5-turbo';
    this.name = 'openai';
  }

  /**
   * Send a chat completion request
   * @param {Array<{role: string, content: string}>} messages
   * @param {Object} [options]
   * @returns {Promise<string>} response
   */
  async chat(messages, options = {}) {
    const url = new URL('/v1/chat/completions', this.baseUrl);
    const body = JSON.stringify({
      model: options.model || this.model,
      messages,
      stream: false
    });
    const reqOpts = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${options.apiKey || this.apiKey}`
      }
    };
    return new Promise((resolve, reject) => {
      const req = https.request(reqOpts, res => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) {
              return resolve(json.choices[0].message.content);
            }
            reject(new Error(json.error?.message || 'No response from OpenAI'));
          } catch (e) {
            reject(new Error('Invalid JSON from OpenAI: ' + e.message));
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  /**
   * Adapter for FallbackChain
   */
  async call(prompt, options) {
    // Convert string prompt to messages format
    const messages = Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }];
    return this.chat(messages, options);
  }

  /**
   * List configured models for OpenAI
   * Since OpenAI API doesn't list plan-available models easily without auth,
   * we return the configured model if API key is present.
   * @returns {Promise<string[]>}
   */
  async listModels() {
    if (this.apiKey) {
      return [this.model];
    }
    return [];
  }
}

module.exports = OpenAIClient;
