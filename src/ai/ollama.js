// src/ai/ollama.js
// Zero-dependency Ollama client for local LLM inference
// Only Node.js built-in modules allowed

const http = require('http');
const https = require('https');
const { URL } = require('url');

class OllamaClient {
  /**
   * @param {Object} opts
   * @param {string} [opts.baseUrl] - e.g. 'http://localhost:11434'
   * @param {string} [opts.model] - e.g. 'llama2'
   */
  constructor(opts = {}) {
    this.baseUrl = opts.baseUrl || 'http://localhost:11434';
    this.model = opts.model || 'llama2';
  }

  /**
   * Send a prompt to Ollama and get a response
   * @param {string} prompt
   * @param {Object} [options]
   * @returns {Promise<string>} response
   */
  async generate(prompt, options = {}) {
    const url = new URL('/api/generate', this.baseUrl);
    const body = JSON.stringify({
      model: options.model || this.model,
      prompt,
      stream: false
    });
    const isHttps = url.protocol === 'https:';
    const reqOpts = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    return new Promise((resolve, reject) => {
      const req = (isHttps ? https : http).request(reqOpts, res => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.response) return resolve(json.response);
            reject(new Error(json.error || 'No response from Ollama'));
          } catch (e) {
            reject(new Error('Invalid JSON from Ollama: ' + e.message));
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

module.exports = OllamaClient;
