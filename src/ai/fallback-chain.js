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
          if (Array.isArray(providerModels)) {
            providerModels.forEach(m => models.add(m));
          }
        } catch (err) {
          // Ignore errors during model discovery, just skip
        }
      }
    }
    
    return Array.from(models);
  }
}

module.exports = FallbackChain;
