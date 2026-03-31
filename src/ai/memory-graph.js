// Conversational Memory Graph Prototype
// Zero-dependency, file-based, minimal API
// Location: src/ai/memory-graph.js

const fs = require('fs');
const path = require('path');

class MemoryGraph {
    constructor(storagePath) {
        this.storagePath = storagePath;
        this.nodes = {}; // { id: { id, text, sender, timestamp, meta, edges: [toId, ...] } }
    }

    addNode({ id, text, sender, timestamp, meta }) {
        if (!id) throw new Error('Node id required');
        this.nodes[id] = { id, text, sender, timestamp, meta: meta || {}, edges: [] };
    }

    linkNodes(fromId, toId, label) {
        if (!this.nodes[fromId] || !this.nodes[toId]) throw new Error('Node(s) not found');
        this.nodes[fromId].edges.push({ to: toId, label: label || null });
    }

    getNode(id) {
        return this.nodes[id] || null;
    }

    getNeighbors(id) {
        const node = this.getNode(id);
        if (!node) return [];
        return node.edges.map(e => this.nodes[e.to]).filter(Boolean);
    }

    save() {
        fs.writeFileSync(this.storagePath, JSON.stringify(this.nodes, null, 2), 'utf8');
    }

    load() {
        if (fs.existsSync(this.storagePath)) {
            this.nodes = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
        }
    }
}

module.exports = MemoryGraph;
