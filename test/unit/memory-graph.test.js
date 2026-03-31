// Unit tests for MemoryGraph (src/ai/memory-graph.js)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const MemoryGraph = require('../../src/ai/memory-graph');

const TEST_PATH = path.join(__dirname, '../data/test-memory-graph.json');

describe('MemoryGraph', function() {
    afterEach(() => { if (fs.existsSync(TEST_PATH)) fs.unlinkSync(TEST_PATH); });

    it('should add and retrieve nodes', function() {
        const mg = new MemoryGraph(TEST_PATH);
        mg.addNode({ id: '1', text: 'Hello', sender: 'user', timestamp: 1 });
        assert.deepStrictEqual(mg.getNode('1').text, 'Hello');
    });

    it('should link nodes and get neighbors', function() {
        const mg = new MemoryGraph(TEST_PATH);
        mg.addNode({ id: '1', text: 'A', sender: 'user', timestamp: 1 });
        mg.addNode({ id: '2', text: 'B', sender: 'bot', timestamp: 2 });
        mg.linkNodes('1', '2', 'reply');
        const neighbors = mg.getNeighbors('1');
        assert.strictEqual(neighbors.length, 1);
        assert.strictEqual(neighbors[0].id, '2');
    });

    it('should persist and load graph', function() {
        let mg = new MemoryGraph(TEST_PATH);
        mg.addNode({ id: '1', text: 'Persist', sender: 'user', timestamp: 1 });
        mg.save();
        mg = new MemoryGraph(TEST_PATH);
        mg.load();
        assert.strictEqual(mg.getNode('1').text, 'Persist');
    });
});
