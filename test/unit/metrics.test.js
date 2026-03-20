// test/unit/metrics.test.js
const metrics = require('../../src/ai/metrics');

module.exports.run = async function(runner) {
  await runner.test('records a successful metric sample', async () => {
    const before = metrics.getSnapshot();
    metrics.record('test-provider', { latencyMs: 123, error: false, cost: 0.5, model: 'm1' });
    const after = metrics.getSnapshot();
    runner.assert(after.providers['test-provider'], 'Provider entry should exist');
    const p = after.providers['test-provider'];
    runner.assert(p.calls >= 1, 'Calls should be >= 1');
    runner.assert(p.totalLatencyMs >= 123, 'Total latency should have increased');
  });

  await runner.test('records errors', async () => {
    metrics.record('test-provider', { latencyMs: 10, error: true, cost: 0, model: 'm1' });
    const snap = metrics.getSnapshot();
    const p = snap.providers['test-provider'];
    runner.assert(p.errors >= 1, 'Errors should be >= 1');
  });
};
 
