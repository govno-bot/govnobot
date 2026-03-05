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
    let lastErr;
    for (const provider of this.providers) {
      try {
        return await provider.call(input, opts);
      } catch (err) {
        lastErr = err;
      }
    }
    throw new Error('All providers failed: ' + (lastErr && lastErr.message));
  }
}

module.exports = FallbackChain;
