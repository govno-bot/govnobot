// Unit tests for MemoryGraph (src/ai/memory-graph.js)
// Tests for user-scoped semantic memory with Q&A pair storage and retrieval
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const MemoryGraph = require('../../src/ai/memory-graph');

const TEST_DIR = path.join(__dirname, '../data/test-memory-graph');

describe('MemoryGraph', function() {
    beforeEach(() => {
        // Ensure test directory exists
        if (!fs.existsSync(TEST_DIR)) {
            fs.mkdirSync(TEST_DIR, { recursive: true });
        }
    });

    afterEach(() => {
        // Clean up test directory
        if (fs.existsSync(TEST_DIR)) {
            fs.readdirSync(TEST_DIR).forEach(file => {
                fs.unlinkSync(path.join(TEST_DIR, file));
            });
            fs.rmdirSync(TEST_DIR);
        }
    });

    describe('Classical Graph API', function() {
        it('should add and retrieve nodes', function() {
            const mg = new MemoryGraph(TEST_DIR);
            mg.addNode({ id: '1', text: 'Hello', sender: 'user', timestamp: 1 });
            assert.deepStrictEqual(mg.getNode('1').text, 'Hello');
        });

        it('should link nodes and get neighbors', function() {
            const mg = new MemoryGraph(TEST_DIR);
            mg.addNode({ id: '1', text: 'A', sender: 'user', timestamp: 1 });
            mg.addNode({ id: '2', text: 'B', sender: 'bot', timestamp: 2 });
            mg.linkNodes('1', '2', 'reply');
            const neighbors = mg.getNeighbors('1');
            assert.strictEqual(neighbors.length, 1);
            assert.strictEqual(neighbors[0].id, '2');
        });

        it('should persist and load graph', function() {
            let mg = new MemoryGraph(TEST_DIR);
            mg.addNode({ id: '1', text: 'Persist', sender: 'user', timestamp: 1 });
            mg.save();
            mg = new MemoryGraph(TEST_DIR);
            mg.load();
            assert.strictEqual(mg.getNode('1').text, 'Persist');
        });
    });

    describe('User-Scoped Q&A Pairs', function() {
        it('should add and retrieve Q&A pairs for a user', function() {
            const mg = new MemoryGraph(TEST_DIR);
            const chatId = '12345';
            const pair = mg.addQAPair(chatId, 'What is the meaning of life?', 'The meaning of life is 42.');
            
            assert(pair.id);
            assert.strictEqual(pair.question, 'What is the meaning of life?');
            assert.strictEqual(pair.answer, 'The meaning of life is 42.');
            assert(pair.timestamp);
        });

        it('should retrieve all Q&A pairs for a user', function() {
            const mg = new MemoryGraph(TEST_DIR);
            const chatId = '12345';
            mg.addQAPair(chatId, 'Q1', 'A1');
            mg.addQAPair(chatId, 'Q2', 'A2');
            
            const pairs = mg.getAllQAPairs(chatId);
            assert.strictEqual(pairs.length, 2);
            assert.strictEqual(pairs[0].question, 'Q1');
            assert.strictEqual(pairs[1].question, 'Q2');
        });

        it('should return empty array for non-existent user', function() {
            const mg = new MemoryGraph(TEST_DIR);
            const pairs = mg.getAllQAPairs('non-existent');
            assert.deepStrictEqual(pairs, []);
        });

        it('should retrieve similar Q&A pairs using semantic similarity', function() {
            const mg = new MemoryGraph(TEST_DIR);
            const chatId = '12345';
            
            mg.addQAPair(chatId, 'What is Python programming?', 'Python is a programming language.');
            mg.addQAPair(chatId, 'How do I learn Java?', 'Java is another programming language.');
            mg.addQAPair(chatId, 'What is 2+2?', 'The answer is 4.');
            
            // Query with a question similar to the first pair
            const similar = mg.retrieveSimilarQAPairs(chatId, 'Tell me about Python', 2);
            
            assert(similar.length > 0);
            assert(similar[0].question.includes('Python'));
        });

        it('should filter out low-similarity pairs', function() {
            const mg = new MemoryGraph(TEST_DIR);
            const chatId = '12345';
            
            mg.addQAPair(chatId, 'What is programming?', 'Programming is writing code.');
            mg.addQAPair(chatId, 'abc def ghi', 'Random text.');
            
            // Query with completely different words
            const similar = mg.retrieveSimilarQAPairs(chatId, 'xyz uvw rst');
            
            // Should filter out low-similarity pairs
            assert.strictEqual(similar.length, 0);
        });

        it('should respect the limit parameter in retrieveSimilarQAPairs', function() {
            const mg = new MemoryGraph(TEST_DIR);
            const chatId = '12345';
            
            for (let i = 0; i < 5; i++) {
                mg.addQAPair(chatId, `AI and machine learning question ${i}`, `Answer about AI ${i}`);
            }
            
            const similar = mg.retrieveSimilarQAPairs(chatId, 'Tell me about artificial intelligence', 2);
            
            assert(similar.length <= 2);
        });

        it('should clear all Q&A pairs for a user', function() {
            const mg = new MemoryGraph(TEST_DIR);
            const chatId = '12345';
            
            mg.addQAPair(chatId, 'Q1', 'A1');
            mg.addQAPair(chatId, 'Q2', 'A2');
            assert.strictEqual(mg.getAllQAPairs(chatId).length, 2);
            
            mg.clearQAPairs(chatId);
            assert.strictEqual(mg.getAllQAPairs(chatId).length, 0);
        });

        it('should persist and load per-user Q&A memory', function() {
            let mg = new MemoryGraph(TEST_DIR);
            const chatId = '12345';
            
            mg.addQAPair(chatId, 'Persistent Q', 'Persistent A');
            mg.save();
            
            // Load in a new instance
            mg = new MemoryGraph(TEST_DIR);
            mg.load();
            
            const pairs = mg.getAllQAPairs(chatId);
            assert.strictEqual(pairs.length, 1);
            assert.strictEqual(pairs[0].question, 'Persistent Q');
        });

        it('should isolate Q&A pairs between different users', function() {
            const mg = new MemoryGraph(TEST_DIR);
            
            mg.addQAPair('user1', 'Q1', 'A1');
            mg.addQAPair('user2', 'Q2', 'A2');
            
            const user1Pairs = mg.getAllQAPairs('user1');
            const user2Pairs = mg.getAllQAPairs('user2');
            
            assert.strictEqual(user1Pairs.length, 1);
            assert.strictEqual(user2Pairs.length, 1);
            assert.strictEqual(user1Pairs[0].question, 'Q1');
            assert.strictEqual(user2Pairs[0].question, 'Q2');
        });

        it('should store and retrieve context metadata with Q&A pairs', function() {
            const mg = new MemoryGraph(TEST_DIR);
            const chatId = '12345';
            const context = { model: 'gpt-3.5', source: 'ask_command' };
            
            const pair = mg.addQAPair(chatId, 'Test Q', 'Test A', context);
            
            assert.strictEqual(pair.context.model, 'gpt-3.5');
            assert.strictEqual(pair.context.source, 'ask_command');
        });
    });

    describe('Memory Statistics', function() {
        it('should report accurate stats', function() {
            const mg = new MemoryGraph(TEST_DIR);
            
            mg.addQAPair('user1', 'Q1', 'A1');
            mg.addQAPair('user1', 'Q2', 'A2');
            mg.addQAPair('user2', 'Q3', 'A3');
            mg.addNode({ id: 'n1', text: 'Node', sender: 'bot', timestamp: Date.now() });
            
            const stats = mg.getStats();
            
            assert.strictEqual(stats.totalQAPairs, 3);
            assert.strictEqual(stats.totalNodes, 1);
            assert.strictEqual(stats.usersWithMemory, 2);
            assert(stats.timestamp);
        });

        it('should handle empty stats gracefully', function() {
            const mg = new MemoryGraph(TEST_DIR);
            const stats = mg.getStats();
            
            assert.strictEqual(stats.totalQAPairs, 0);
            assert.strictEqual(stats.totalNodes, 0);
            assert.strictEqual(stats.usersWithMemory, 0);
        });
    });

    describe('Error Handling', function() {
        it('should throw error when adding Q&A pair without required fields', function() {
            const mg = new MemoryGraph(TEST_DIR);
            
            assert.throws(() => {
                mg.addQAPair(null, 'Q', 'A');
            }, /chatId.*required/);
        });

        it('should handle missing storage directory gracefully', function() {
            const mg = new MemoryGraph(TEST_DIR);
            
            // Should not throw
            mg.load();
            mg.save();
            
            assert(fs.existsSync(TEST_DIR));
        });

        it('should recover from corrupted user memory file', function() {
            const mg = new MemoryGraph(TEST_DIR);
            
            // Create a corrupted memory file
            const corruptPath = path.join(TEST_DIR, 'memory-user1.json');
            fs.writeFileSync(corruptPath, 'invalid json {{{');
            
            // Should load without throwing
            mg.load();
            
            // Should not have loaded the corrupted data
            const pairs = mg.getAllQAPairs('user1');
            assert.strictEqual(pairs.length, 0);
        });
    });
});

