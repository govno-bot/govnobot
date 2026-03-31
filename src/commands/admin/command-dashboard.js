// src/commands/admin/command-dashboard.js
// Admin-only dashboard command: aggregates usage, error, model, and user activity stats
// Zero dependencies, uses built-in modules only
const fs = require('fs');
const path = require('path');
const metricsPath = path.resolve(__dirname, '../../../data/metrics.json');
const logsPath = path.resolve(__dirname, '../../../govnobot_logs/govnobot.log');
const historyDir = path.resolve(__dirname, '../../../data/history');

async function dashboardCommand(ctx) {
  // Only allow admin
  if (!ctx.isAdmin) {
    return ctx.reply('⛔️ Admins only.');
  }
  let usage = {}, errors = {}, model = {}, users = {};
  // Usage: total messages, commands, active users
  try {
    const files = fs.readdirSync(historyDir);
    users.total = files.length;
    let totalMessages = 0;
    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(historyDir, file), 'utf8'));
      totalMessages += Array.isArray(data) ? data.length : 0;
    }
    usage.totalMessages = totalMessages;
    usage.activeUsers = users.total;
  } catch (e) {
    usage = { error: 'Failed to read user history.' };
  }
  // Errors: count recent errors in log
  try {
    if (fs.existsSync(logsPath)) {
      const log = fs.readFileSync(logsPath, 'utf8');
      const lines = log.split('\n').slice(-500); // last 500 lines
      const errorLines = lines.filter(l => l.includes('error') || l.includes('Error:'));
      errors.recent = errorLines.slice(-5);
      errors.count = errorLines.length;
    } else {
      errors = { info: 'No log file.' };
    }
  } catch (e) {
    errors = { error: 'Failed to read logs.' };
  }
  // Model stats: from metrics.json
  try {
    if (fs.existsSync(metricsPath)) {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      model = metrics;
    } else {
      model = { info: 'No metrics file.' };
    }
  } catch (e) {
    model = { error: 'Failed to read metrics.' };
  }
  // Compose dashboard
  let msg = '📊 <b>GovnoBot Admin Dashboard</b>\n\n';
  msg += `👥 <b>Active users:</b> ${usage.activeUsers ?? '?'}\n`;
  msg += `💬 <b>Total messages:</b> ${usage.totalMessages ?? '?'}\n`;
  msg += `⚠️ <b>Error count (last 500 lines):</b> ${errors.count ?? '?'}\n`;
  if (errors.recent && errors.recent.length) {
    msg += '<b>Recent errors:</b>\n' + errors.recent.map(e => '- ' + e).join('\n') + '\n';
  }
  if (model && typeof model === 'object') {
    msg += '\n<b>Model Stats:</b>\n';
    for (const [k, v] of Object.entries(model)) {
      msg += `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}\n`;
    }
  }
  msg += '\n<i>Last updated: ' + new Date().toLocaleString() + '</i>';
  return ctx.reply(msg, { parse_mode: 'HTML' });
}

module.exports = { name: 'dashboard', handler: dashboardCommand };