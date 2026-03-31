// src/ai/ollama.js
// Zero-dependency Ollama client for local LLM inference
// Only Node.js built-in modules allowed

const http = require('http');
const https = require('https');
const { URL } = require('url');
const metrics = require('./metrics');

class OllamaClient {
  /**
   * @param {Object} opts
   * @param {string} [opts.baseUrl] - e.g. 'http://localhost:11434'
   * @param {string} [opts.model] - e.g. 'deepseek-r1:8b'
   */
  constructor(opts = {}) {
    this.baseUrl = opts.baseUrl || 'http://localhost:11434';
    this.model = opts.model || 'deepseek-r1:8b';
    this.name = 'ollama';
  }

  /**
   * Send a prompt to Ollama and get a response (streaming supported)
   * @param {string} prompt
   * @param {Object} [options]
   * @param {function(string):void} [options.onToken] - Called for each token/partial
   * @param {function():boolean} [options.isAborted] - Should return true if user aborted
   * @returns {Promise<string>} response
   */
  async generate(prompt, options = {}) {
    return this.generateStream(prompt, options);
  }

  /**
   * Stream Ollama response tokens (calls onToken for each partial)
   * @param {string} prompt
   * @param {Object} [options]
   * @param {function(string):void} [options.onToken] - Called for each token/partial
   * @param {function():boolean} [options.isAborted] - Should return true if user aborted
   * @returns {Promise<string>} Full response
   */
  async generateStream(prompt, options = {}) {
    const startTs = Date.now();
    const url = new URL('/api/generate', this.baseUrl);
    const stream = options.stream !== false;
    const body = JSON.stringify({
      model: options.model || this.model,
      prompt,
      stream
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
      let full = '';
      let done = false;
      const req = (isHttps ? https : http).request(reqOpts, res => {
        res.setEncoding('utf8');
        if (!stream) {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            const latencyMs = Date.now() - startTs;
            try {
              const json = JSON.parse(data);
              if (json.response) {
                try { metrics.record(this.name, { latencyMs, error: false, cost: 0, model: options.model || this.model }); } catch (e) {}
                return resolve(json.response);
              }
              try { metrics.record(this.name, { latencyMs, error: true, cost: 0, model: options.model || this.model }); } catch (e) {}
              reject(new Error(json.error || 'No response from Ollama'));
            } catch (e) {
              try { metrics.record(this.name, { latencyMs, error: true, cost: 0, model: options.model || this.model }); } catch (er) {}
              reject(new Error('Invalid JSON from Ollama: ' + e.message));
            }
          });
          return;
        }
        // Streaming mode: Ollama streams JSON lines, each with a partial response
        let buffer = '';
        res.on('data', chunk => {
          if (done) return;
          buffer += chunk;
          let idx;
          while ((idx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line) continue;
            try {
              const json = JSON.parse(line);
              if (json.done) {
                done = true;
                return resolve(full);
              }
              if (typeof json.response === 'string') {
                full += json.response;
                if (typeof options.onToken === 'function') options.onToken(json.response);
              }
            } catch (e) {}
            if (typeof options.isAborted === 'function' && options.isAborted()) {
              done = true;
              return resolve(full);
            }
          }
        });
        res.on('end', () => {
          if (!done) resolve(full);
        });
      });
      req.on('error', err => {
        const latencyMs = Date.now() - startTs;
        try { metrics.record(this.name, { latencyMs, error: true, cost: 0, model: options.model || this.model }); } catch (e) {}
        reject(err);
      });
      req.write(body);
      req.end();
    });
  }

  /**
   * List available models from Ollama
   * @returns {Promise<string[]>} List of model names
   */
  async listModels() {
    return new Promise((resolve, reject) => {
      const url = new URL('/api/tags', this.baseUrl);
      const isHttps = url.protocol === 'https:';
      
      const req = (isHttps ? https : http).get(url.toString(), (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              // If API fails, return empty list instead of throwing (graceful degradation)
              return resolve([]);
            }
            const json = JSON.parse(data);
            if (json.models && Array.isArray(json.models)) {
              const models = json.models.map(m => m.name);
              resolve(models);
            } else {
              resolve([]);
            }
          } catch (error) {
            resolve([]); // Return empty on parse error
          }
        });
      });
      
      req.on('error', () => resolve([])); // Return empty on network error
      req.end();
    });
  }

  /**
   * Adapter for FallbackChain
   * Supports streaming if options.onToken is provided.
   */
  async call(prompt, options) {
    let promptString = prompt;
    if (Array.isArray(prompt)) {
      promptString = prompt.map(m => {
        if (m.role === 'system') return `System: ${m.content}`;
        if (m.role === 'user') return `User: ${m.content}`;
        if (m.role === 'assistant') return `Assistant: ${m.content}`;
        return m.content;
      }).join('\n\n');
    }
    if (options && typeof options.onToken === 'function') {
      return this.generateStream(promptString, options);
    }
    return this.generate(promptString, options);
  }
}

module.exports = OllamaClient;
