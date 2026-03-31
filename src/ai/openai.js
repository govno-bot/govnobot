// src/ai/openai.js
// Zero-dependency OpenAI client for Node.js (built-in modules only)
// Supports OpenAI Chat API (v1) via HTTPS

const https = require('https');
const { URL } = require('url');
const metrics = require('./metrics');

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
   * Send a chat completion request (full response)
   * @param {Array<{role: string, content: string}>} messages
   * @param {Object} [options]
   * @returns {Promise<string>} response
   */
  async chat(messages, options = {}) {
    return this.chatStream(messages, options);
  }

  /**
   * Stream chat completion tokens (calls onToken for each partial)
   * @param {Array<{role: string, content: string}>} messages
   * @param {Object} [options]
   * @param {function(string):void} [options.onToken] - Called for each token/partial
   * @param {function():boolean} [options.isAborted] - Should return true if user aborted
   * @returns {Promise<string>} Full response
   */
  async chatStream(messages, options = {}) {
    const startTs = Date.now();
    const url = new URL('/v1/chat/completions', this.baseUrl);
    const stream = options.stream !== false;
    const body = JSON.stringify({
      model: options.model || this.model,
      messages,
      stream
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
      let full = '';
      let done = false;
      const req = https.request(reqOpts, res => {
        res.setEncoding('utf8');
        if (!stream) {
          // Non-streaming fallback
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              const latencyMs = Date.now() - startTs;
              const usage = json.usage || {};
              const totalTokens = Number(usage.total_tokens || 0);
              const estimatedCost = 0;
              if (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) {
                try { metrics.record(this.name, { latencyMs, error: false, cost: estimatedCost, model: options.model || this.model }); } catch (e) {}
                return resolve(json.choices[0].message.content);
              }
              try { metrics.record(this.name, { latencyMs, error: true, cost: 0, model: options.model || this.model }); } catch (e) {}
              reject(new Error(json.error?.message || 'No response from OpenAI'));
            } catch (e) {
              const latencyMs = Date.now() - startTs;
              try { metrics.record(this.name, { latencyMs, error: true, cost: 0, model: options.model || this.model }); } catch (er) {}
              reject(new Error('Invalid JSON from OpenAI: ' + e.message));
            }
          });
          return;
        }
        // Streaming mode
        let buffer = '';
        res.on('data', chunk => {
          if (done) return;
          buffer += chunk;
          // OpenAI streams as lines: data: {...}\n, ending with [DONE]
          let idx;
          while ((idx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line) continue;
            if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              if (data === '[DONE]') {
                done = true;
                return resolve(full);
              }
              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta?.content;
                if (typeof delta === 'string') {
                  full += delta;
                  if (typeof options.onToken === 'function') options.onToken(delta);
                }
              } catch (e) {}
            }
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
   * Adapter for FallbackChain
   * Supports streaming if options.onToken is provided.
   */
  async call(prompt, options) {
    const messages = Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }];
    if (options && typeof options.onToken === 'function') {
      return this.chatStream(messages, options);
    }
    return this.chat(messages, options);
  }

  /**
   * List configured models for OpenAI
   * Since OpenAI API doesn't list plan-available models easily without auth,
   * we return the configured model if API key is present.
   * @returns {Promise<string[]>}
   */
  async listModels() {
    // Return a simple array of model ids (strings). Higher-level code will
    // normalize provider/source metadata.
    return [this.model];
  }

  /**
   * Generate an image using DALL-E
   * @param {string} prompt - The image prompt
   * @param {Object} [options] - Additional options
   * @returns {Promise<string>} Image URL
   */
  async generateImage(prompt, options = {}) {
    const url = new URL('/v1/images/generations', this.baseUrl);
    const body = JSON.stringify({
      model: options.model || 'dall-e-3',
      prompt,
      n: 1,
      size: options.size || '1024x1024'
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
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const json = JSON.parse(data);
              if (json.data && json.data.length > 0 && json.data[0].url) {
                resolve(json.data[0].url);
              } else {
                reject(new Error('Invalid response structure from OpenAI: ' + data));
              }
            } catch (err) {
              reject(new Error('Failed to parse OpenAI response: ' + err.message));
            }
          } else {
            reject(new Error(`OpenAI API Error (${res.statusCode}): ${data}`));
          }
        });
      });

      req.on('error', err => reject(err));
      req.write(body);
      req.end();
    });
  }

  /**
   * Transcribe audio using Whisper model
   * @param {Buffer} audioBuffer - The audio file content
   * @param {string} filename - Filename with extension (e.g., 'audio.ogg')
   * @param {Object} [options]
   * @returns {Promise<string>} transcribed text
   */
  async transcribeAudio(audioBuffer, filename, options = {}) {
    const url = new URL('/v1/audio/transcriptions', this.baseUrl);
    const boundary = `--------------------------${require('crypto').randomBytes(16).toString('hex')}`;
    
    // Construct multipart form data body
    const parts = [];
    
    // File part
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`));
    parts.push(audioBuffer);
    
    // Model part
    parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`));
    
    // Closing boundary
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    
    const body = Buffer.concat(parts);

    const reqOpts = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        'Authorization': `Bearer ${options.apiKey || this.apiKey}`
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(reqOpts, res => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400 || parsed.error) {
              const errMsg = parsed.error ? parsed.error.message : data;
              reject(new Error(`OpenAI API Error: ${res.statusCode} - ${errMsg}`));
            } else {
              resolve(parsed.text || '');
            }
          } catch (err) {
            reject(new Error(`Failed to parse OpenAI response: ${err.message}`));
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  // Note: no additional listAvailableModels helper - use listModels()
}

module.exports = OpenAIClient;
