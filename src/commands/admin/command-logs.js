const fs = require('fs');

async function handleLogs({ chatId, args, telegramApiClient, logger }) {
    if (!logger.filePath) {
        return telegramApiClient.sendMessage(chatId, '❌ Logs file is not configured or available.');
    }

    try {
        let linesCount = 50; // default to 50 lines
        if (args.length > 0) {
            const parsed = parseInt(args[0], 10);
            if (!isNaN(parsed) && parsed > 0 && parsed <= 200) {
                linesCount = parsed;
            }
        }

        if (!fs.existsSync(logger.filePath)) {
            return telegramApiClient.sendMessage(chatId, '❌ Log file does not exist.');
        }

        const logData = fs.readFileSync(logger.filePath, 'utf8');
        const lines = logData.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length === 0) {
            return telegramApiClient.sendMessage(chatId, '📄 Logs are empty.');
        }

        let logsToSend = lines.slice(-linesCount).join('\n');
        
        // Escape HTML for Telegram
        logsToSend = logsToSend
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        // Ensure we don't exceed Telegram's message length limit
        const MAX_LENGTH = 3800; // Leave some space for formatting
        if (logsToSend.length > MAX_LENGTH) {
            logsToSend = "... [truncated] ...\n" + logsToSend.slice(-(MAX_LENGTH));
        }

        return telegramApiClient.sendMessage(chatId, `<b>Recent Logs:</b>\n<pre><code>${logsToSend}</code></pre>`, { parse_mode: 'HTML' });
    } catch (error) {
        logger.error(`Failed to read logs:`, error);
        return telegramApiClient.sendMessage(chatId, '❌ Failed to read logs.');
    }
}

module.exports = {
    name: 'logs',
    description: 'Fetch recent log entries. Usage: /logs [number]',
    handler: handleLogs,
};