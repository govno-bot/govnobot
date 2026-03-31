// test/unit/command-dashboard.test.js
// Unit tests for the admin dashboard command
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const dashboard = require('../../src/commands/admin/command-dashboard');

describe('dashboardCommand', function() {
  it('should reject non-admin users', async function() {
    const ctx = { isAdmin: false, reply: (msg) => { ctx._msg = msg; } };
    await dashboard.handler(ctx);
    assert(ctx._msg.includes('Admins only'));
  });

  it('should return a dashboard summary for admin', async function() {
    // Setup fake data
    const testHistoryDir = path.join(__dirname, '../../data/history');
    if (!fs.existsSync(testHistoryDir)) fs.mkdirSync(testHistoryDir, { recursive: true });
    fs.writeFileSync(path.join(testHistoryDir, '1.json'), JSON.stringify([1,2,3]));
    fs.writeFileSync(path.join(testHistoryDir, '2.json'), JSON.stringify([1,2]));
    const testMetrics = { provider: { calls: 5, errors: 1 } };
    fs.writeFileSync(path.join(__dirname, '../../data/metrics.json'), JSON.stringify(testMetrics));
    const testLogPath = path.join(__dirname, '../../govnobot_logs/govnobot.log');
    if (!fs.existsSync(path.dirname(testLogPath))) fs.mkdirSync(path.dirname(testLogPath), { recursive: true });
    fs.writeFileSync(testLogPath, 'error: test\nerror: test2\n');
    let sentMsg = '';
    const ctx = { isAdmin: true, reply: (msg) => { sentMsg = msg; } };
    await dashboard.handler(ctx);
    assert(sentMsg.includes('GovnoBot Admin Dashboard'));
    assert(sentMsg.includes('Active users: 2'));
    assert(sentMsg.includes('Total messages: 5'));
    assert(sentMsg.includes('Error count'));
    assert(sentMsg.includes('Model Stats'));
  });
});
