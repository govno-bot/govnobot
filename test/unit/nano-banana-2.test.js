const assert = require('assert');
const NanoBanana2Client = require('../../src/ai/nano-banana-2');
const FallbackChain = require('../../src/ai/fallback-chain');

async function runTests() {
  console.log('LOADING NanoBanana2 CLIENT TEST');

  const client = new NanoBanana2Client();
  assert.strictEqual(client.name, 'nano-banana-2');

  console.log('  Running: listModels returns provider model');
  const models = await client.listModels();
  assert.deepStrictEqual(models, ['nano-banana-2']);

  console.log('  Running: generateImage returns expected placeholder URL');
  const imageUrl = await client.generateImage('dream landscape');
  assert(imageUrl.includes('via.placeholder.com'), 'imageUrl should be placeholder URL');
  assert(imageUrl.includes('dream%20landscape'), 'imageUrl should include encoded prompt');

  console.log('  Running: call throws for text generation');
  await assert.rejects(async () => {
    await client.call('text');
  }, /image generation only/i);

  console.log('  Running: FallbackChain generateImage uses NanoBanana2');
  const chain = new FallbackChain([client]);
  const chainResult = await chain.generateImage('a fantasy castle');
  assert(chainResult.includes('via.placeholder.com')); 

  console.log('  ✓ test/unit/nano-banana-2.test.js\n');
}

module.exports = { run: runTests };
