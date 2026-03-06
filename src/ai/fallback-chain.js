// FallbackChain: tries a list of providers in order, falling back on error
// Zero dependencies, Node.js only
class FallbackChain {
  constructor(providers) {
    if (!Array.isArray(providers) || providers.length === 0) {
      throw new Error('FallbackChain requires a non-empty array of providers');
    }
    this.providers = providers;
    this.providerNames = providers.map(p => p.name || 'unnamed');
  }

  async call(input, opts) {
    const errors = [];
    for (const provider of this.providers) {
      try {
        return await provider.call(input, opts);
      } catch (err) {
        errors.push(`${provider.name || 'unnamed'}: ${err.message}`);
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
