// send-admin-report.js
// Utility to send a report to the admin via GovnoBot

const Config = require('./src/config');
const Logger = require('./src/utils/logger');
const TelegramAPIClient = require('./src/telegram/api-client');

async function sendReportToAdmin(reportText) {
  const config = new Config();
  const logger = new Logger(config.logging.level, config.logging.file);
  const client = new TelegramAPIClient(config.telegram.token);
  const adminChatId = config.telegram.adminChatId;

  if (!adminChatId || adminChatId === 0) {
    console.error('Admin chat ID is not set in config.');
    process.exit(1);
  }

  try {
    await client.sendMessage(adminChatId, reportText, { parse_mode: 'HTML' });
    logger.info('Report sent to admin.');
    console.log('✅ Report sent to admin.');
  } catch (err) {
    logger.error('Failed to send report to admin', err);
    console.error('❌ Failed to send report to admin:', err.message);
    process.exit(1);
  }
}

// Example usage: node send-admin-report.js "<report text>"
if (require.main === module) {
  const report = process.argv.slice(2).join(' ');
  if (!report) {
    console.error('Usage: node send-admin-report.js "<report text>"');
    process.exit(1);
  }
  sendReportToAdmin(report);
}
