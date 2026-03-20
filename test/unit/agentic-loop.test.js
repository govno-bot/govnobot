const fs = require('fs');
const path = require('path');
const AgenticLoop = require('../../src/ai/agentic-loop');

async function run(runner) {
    const tempNotepadFile = path.join(__dirname, 'temp_notepad.json');

    // Mocks
    const debugMessages = [];
    const mockLogger = {
        info: () => {}, warn: () => {}, error: () => {}, debug: (msg) => { debugMessages.push(msg); }
    };

    const mockTelegramApiClient = {
        sendMessage: async () => {}
    };

    const mockFallbackChain = {
        call: async () => '{"thoughts": "test thoughts", "goals": ["goal 1"], "planned_actions": [], "query_environment": false, "message_to_admin": null}'
    };

    const mockNotepadStore = {
        data: {},
        load: async function() { return this.data; },
        update: async function(d) { this.data = { ...this.data, ...d }; }
    };

    let reminders = [];
    const mockReminderStore = {
        add: async (r) => { reminders.push(r); return r; }
    };

    let loop = new AgenticLoop({
        logger: mockLogger, telegramApiClient: mockTelegramApiClient,
        adminChatId: '12345', fallbackChain: mockFallbackChain, historyStore: {}, notepadStore: mockNotepadStore, reminderStore: mockReminderStore
    });

    try {
        runner.assert(loop.isRunning === false, 'starts with isRunning false');
        loop.start();
        runner.assert(loop.isRunning === true, 'sets isRunning to true when start() called');
        loop.stop();
        runner.assert(loop.isRunning === false, 'sets isRunning to false when stop() called');

        // Enable profiling and verify it logs memory/cpu stats.
        loop.enableProfiling();

        await loop.executeIteration();
        runner.assert(debugMessages.some(m => m.includes('AgenticLoop profiling')), 'profiling logs memory/cpu stats');
        const notepad = await mockNotepadStore.load();
        runner.assert(notepad.thoughts === 'test thoughts', 'executeIteration parses thoughts correctly');
        runner.assert(notepad.goals && notepad.goals[0] === 'goal 1', 'executeIteration parses goals correctly');

        // Test scheduling a reminder
        const mockFallbackChainRemind = {
            call: async () => '{"thoughts": "need to schedule", "goals": [], "planned_actions": [], "query_environment": false, "message_to_admin": null, "schedule_reminder": {"delay_minutes": 5, "message": "task break down"}}'
        };
        loop.fallbackChain = mockFallbackChainRemind;
        await loop.executeIteration();
        runner.assert(reminders.length === 1, 'schedules reminder correctly');
        runner.assert(reminders[0].message === 'Agent Task Reminder: task break down', 'scheduled reminder message matches');
    } finally {
        loop.stop();
    }
}

module.exports = { run };
