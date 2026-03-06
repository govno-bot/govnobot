const crypto = require('crypto');

// Simple time parsing function. E.g., 10s, 5m, 1h, 1d
function parseTime(timeStr) {
    const match = timeStr.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return null;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

async function handleRemind({ chatId, args, reminderStore, telegramApiClient, logger }) {
    if (args.length < 2) {
        return telegramApiClient.sendMessage(chatId, 'Usage: /remind <time> <message>\nExample: /remind 10m Check on the cat');
    }

    const timeStr = args[0];
    const reminderMessage = args.slice(1).join(' ');

    const timeMs = parseTime(timeStr);
    if (timeMs === null) {
        return telegramApiClient.sendMessage(chatId, 'Invalid time format. Use s, m, h, d (e.g., 30s, 10m, 2h, 1d).');
    }

    const remindAt = Date.now() + timeMs;
    const reminder = {
        id: crypto.randomBytes(16).toString('hex'),
        chatId,
        message: reminderMessage,
        remindAt,
    };

    try {
        await reminderStore.add(reminder);
        const remindDate = new Date(remindAt);
        logger.info(`Set reminder for chat ${chatId} at ${remindDate.toISOString()}`);
        return telegramApiClient.sendMessage(chatId, `✅ Reminder set for ${remindDate.toLocaleString()}.`);
    } catch (error) {
        logger.error(`Failed to set reminder for chat ${chatId}:`, error);
        return telegramApiClient.sendMessage(chatId, '❌ Could not set reminder. Please try again later.');
    }
}

module.exports = {
    name: 'remind',
    description: 'Sets a reminder. Usage: /remind <time> <message> (e.g., /remind 1h check oven)',
    handler: handleRemind,
};
