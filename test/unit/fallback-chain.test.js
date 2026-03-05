// Unit tests for FallbackChain (src/ai/fallback-chain.js)
const assert = require('assert');
const FallbackChain = require('../../src/ai/fallback-chain');

function makeMockProvider(name, result, shouldThrow) {
  return {
    name,
    async call(input, opts) {
      if (shouldThrow) throw new Error(name + ' failed');
      return typeof result === 'function' ? result(input, opts) : result;
    }
  };
}

module.exports.run = async function(runner) {
  // returns result from first provider if successful
  let chain = new FallbackChain([
    makeMockProvider('A', 'ok'),
    makeMockProvider('B', 'should not be called')
  ]);
  let result = await chain.call('input');
  runner.assertEqual(result, 'ok', 'returns result from first provider if successful');

  // falls back to next provider on error
  chain = new FallbackChain([
    makeMockProvider('A', null, true),
    makeMockProvider('B', 'fallback')
  ]);
  result = await chain.call('input');
  runner.assertEqual(result, 'fallback', 'falls back to next provider on error');

  // tries all providers and throws if all fail
  chain = new FallbackChain([
    makeMockProvider('A', null, true),
    makeMockProvider('B', null, true)
  ]);
  await runner.assertThrows(() => chain.call('input'), Error, 'tries all providers and throws if all fail');

  // passes input and opts to providers
  let called = false;
  chain = new FallbackChain([
    {
      name: 'A',
      async call(input, opts) {
        called = true;
        runner.assertEqual(input, 'foo', 'input passed to provider');
        runner.assertDeepEqual(opts, {x: 1}, 'opts passed to provider');
        return 'bar';
      }
    }
  ]);
  result = await chain.call('foo', {x: 1});
  runner.assertEqual(result, 'bar', 'passes input and opts to providers');
  runner.assert(called, 'provider was called');

  // providerNames test
  chain = new FallbackChain([
    makeMockProvider('A', 'ok'),
    makeMockProvider('B', 'ok')
  ]);
  runner.assertDeepEqual(chain.providerNames, ['A', 'B'], 'providerNames exposes correct names');
};
