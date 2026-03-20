// FallbackChain: tries a list of providers in order, falling back on error
// Zero dependencies, Node.js only
const metrics = require('./metrics');

class FallbackChain {
  /**
   * @param {Array} providers - Ordered list of provider objects
   * @param {Object} [options]
   * @param {number} [options.healthTTL] - ms to keep a provider marked unhealthy before retrying
   * @param {number} [options.probeTimeout] - ms timeout for health probes
   */
  constructor(providers, options = {}) {
    if (!Array.isArray(providers) || providers.length === 0) {
      throw new Error('FallbackChain requires a non-empty array of providers');
    }
    this.providers = providers;
    this.providerNames = providers.map(p => p.name || 'unnamed');
    this.healthTTL = typeof options.healthTTL === 'number' ? options.healthTTL : 60 * 1000; // 60s
    this.probeTimeout = typeof options.probeTimeout === 'number' ? options.probeTimeout : 2000; // 2s
    // health map: providerName -> { healthy: boolean, ts: number }
    this._health = new Map();
  }

  async call(input, opts) {
    const errors = [];
    const now = Date.now();

    // Try providers in order, skipping those that are recently marked unhealthy
    for (const provider of this.providers) {
      const pname = provider.name || 'unnamed';
      const health = this._health.get(pname);
      if (health && health.healthy === false && (now - health.ts) < this.healthTTL) {
        // Skip recently-unhealthy provider
        continue;
      }

      try {
        const res = await provider.call(input, opts);
        try {
          metrics.emit('provider_selected', { provider: pname, ts: Date.now(), model: (opts && opts.model) || provider.model || null });
        } catch (e) {}
        // mark healthy
        this._health.set(pname, { healthy: true, ts: Date.now() });
        return res;
      } catch (err) {
        // mark unhealthy
        this._health.set(pname, { healthy: false, ts: Date.now() });
        errors.push(`${pname}: ${err.message}`);
      }
    }

    // If everything was skipped (all marked unhealthy), probe all providers once and retry
    const anyHealthy = await this._probeAllOnce();
    if (anyHealthy) {
      // Retry once using refreshed health info
      for (const provider of this.providers) {
        const pname = provider.name || 'unnamed';
        const health = this._health.get(pname);
        if (health && health.healthy === false && (Date.now() - health.ts) < this.healthTTL) continue;
        try {
          const res = await provider.call(input, opts);
          this._health.set(pname, { healthy: true, ts: Date.now() });
          return res;
        } catch (err) {
          this._health.set(pname, { healthy: false, ts: Date.now() });
          errors.push(`${pname}: ${err.message}`);
        }
      }
    }

    throw new Error('All providers failed: ' + errors.join(' | '));
  }

  /**
   * Get available models from all providers
   * @returns {Promise<string[]>} List of unique model names
   */
  async listModels() {
    const models = new Set();
    for (const provider of this.providers) {
      if (typeof provider.listModels === 'function') {
        try {
          const providerModels = await provider.listModels();
          providerModels.forEach(m => models.add(m));
        } catch (err) {
          // Ignore failing provider
        }
      } else if (provider.model) {
        models.add(provider.model);
      }
    }
    return Array.from(models);
  }

  /**
   * Get available models from all providers with metadata
   * @returns {Promise<Array<{id: string, provider: string, source: string}>>}
   */
  async listModelsDetailed() {
    const result = [];
    for (const provider of this.providers) {
      const pname = provider.name || 'unnamed';
      const source = pname === 'ollama' ? 'local' : 'remote';

      if (typeof provider.listModels === 'function') {
        try {
          const providerModels = await provider.listModels();
          // Normalize entries: strings -> { id }
          for (const m of providerModels) {
            if (!m) continue;
            if (typeof m === 'string') {
              result.push({ id: m, provider: pname, source });
            } else if (typeof m === 'object' && (m.id || m.name)) {
              result.push({ id: m.id || m.name, provider: m.provider || pname, source: m.source || source });
            }
          }
        } catch (err) {
          // Ignore failing provider
        }
      } else if (provider.model) {
        result.push({ id: provider.model, provider: pname, source });
      }
    }

    // Deduplicate by id keeping first seen
    const seen = new Set();
    const deduped = [];
    for (const item of result) {
      const key = String(item.id).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    return deduped;
  }

  /**
   * Generate an image using the fallback chain
   * @param {string} prompt 
   * @param {Object} [options]
   * @returns {Promise<string>} Image URL
   */
  async generateImage(prompt, options = {}) {
    let lastError = null;
    const errorDetails = [];

    for (const provider of this.providers) {
      if (typeof provider.generateImage !== 'function') {
        continue;
      }
      try {
        return await provider.generateImage(prompt, options);
      } catch (err) {
        errorDetails.push({ provider: provider.name, error: err.message });
        lastError = err;
      }
    }
    
    if (errorDetails.length === 0) {
      throw new Error(`No AI providers support image generation`);
    }

    // Format composite error message
    const errorMsg = errorDetails.map(d => `${d.provider}: ${d.error}`).join(' | ');
    throw new Error(`All image generation providers failed: ${errorMsg}`);
  }

  /**
   * Transcribe audio using the first capable provider
   * @param {Buffer} audioBuffer - Audio file content
   * @param {string} filename - Filename with extension
   * @param {Object} [opts] - Additional options
   * @returns {Promise<string>} transcribed text
   */
  async transcribeAudio(audioBuffer, filename, opts) {
    const errors = [];
    for (const provider of this.providers) {
      if (typeof provider.transcribeAudio === 'function') {
        try {
          return await provider.transcribeAudio(audioBuffer, filename, opts);
        } catch (err) {
          errors.push(`${provider.name || 'unnamed'}: ${err.message}`);
        }
      }
    }
    if (errors.length > 0) {
      throw new Error('All capable voice transcription providers failed: ' + errors.join(' | '));
    }
    throw new Error('No AI provider configured for voice transcription');
  }
}

module.exports = FallbackChain;
