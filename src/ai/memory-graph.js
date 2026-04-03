// Conversational Memory Graph with User-Scoped Q&A Storage
// Persistent semantic memory for multi-turn reasoning and context recall
// Zero-dependency, file-based implementation
// Location: src/ai/memory-graph.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class MemoryGraph {
    /**
     * @param {string} storagePath - Base path for storing per-user memory graphs
     */
    constructor(storagePath) {
        this.baseStoragePath = storagePath;
        this.nodes = {}; // { id: { id, text, sender, timestamp, meta, edges: [toId, ...] } }
        this.qaStore = {}; // { chatId: { pairs: [ { q, a, timestamp, context } ] } }
    }

    /**
     * Get the user-scoped storage path
     */
    _getUserStoragePath(chatId) {
        return path.join(this.baseStoragePath, `memory-${chatId}.json`);
    }

    /**
     * Simple word-based string similarity using Jaccard index
     * Returns a score between 0 and 1
     */
    _similarityScore(str1, str2) {
        if (!str1 || !str2) return 0;
        const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        if (words1.length === 0 || words2.length === 0) return 0;
        
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }

    /**
     * Add a Q&A pair to the user's memory (user-scoped)
     */
    addQAPair(chatId, question, answer, context = {}) {
        if (!chatId || !question || !answer) {
            throw new Error('chatId, question, and answer are required');
        }
        
        if (!this.qaStore[chatId]) {
            this.qaStore[chatId] = { pairs: [] };
        }

        const pair = {
            id: crypto.randomBytes(8).toString('hex'),
            question,
            answer,
            timestamp: Date.now(),
            context: context || {}
        };

        this.qaStore[chatId].pairs.push(pair);
        return pair;
    }

    /**
     * Retrieve Q&A pairs similar to a given query (user-scoped)
     * Returns up to `limit` most similar pairs
     */
    retrieveSimilarQAPairs(chatId, query, limit = 3) {
        if (!chatId || !query || !this.qaStore[chatId]) {
            return [];
        }

        const pairs = this.qaStore[chatId].pairs || [];
        const scored = pairs.map(pair => ({
            pair,
            score: this._similarityScore(query, pair.question)
        }));

        return scored
            .sort((a, b) => b.score - a.score)
            .filter(item => item.score > 0.2) // Only include pairs with >20% similarity
            .slice(0, limit)
            .map(item => item.pair);
    }

    /**
     * Get all Q&A pairs for a user (user-scoped)
     */
    getAllQAPairs(chatId) {
        if (!chatId) return [];
        return this.qaStore[chatId]?.pairs || [];
    }

    /**
     * Clear all Q&A pairs for a user (user-scoped)
     */
    clearQAPairs(chatId) {
        if (chatId && this.qaStore[chatId]) {
            this.qaStore[chatId].pairs = [];
        }
    }

    /**
     * Add a node to the memory graph (original API, non-scoped)
     */
    addNode({ id, text, sender, timestamp, meta }) {
        if (!id) throw new Error('Node id required');
        this.nodes[id] = { id, text, sender, timestamp, meta: meta || {}, edges: [] };
    }

    /**
     * Link two nodes in the graph (original API, non-scoped)
     */
    linkNodes(fromId, toId, label) {
        if (!this.nodes[fromId] || !this.nodes[toId]) throw new Error('Node(s) not found');
        this.nodes[fromId].edges.push({ to: toId, label: label || null });
    }

    /**
     * Get a single node from the graph
     */
    getNode(id) {
        return this.nodes[id] || null;
    }

    /**
     * Get neighboring nodes in the graph
     */
    getNeighbors(id) {
        const node = this.getNode(id);
        if (!node) return [];
        return node.edges.map(e => this.nodes[e.to]).filter(Boolean);
    }

    /**
     * Save all data (both graph nodes and per-user Q&A pairs) to disk
     */
    save() {
        try {
            // Ensure storage directory exists
            if (!fs.existsSync(this.baseStoragePath)) {
                fs.mkdirSync(this.baseStoragePath, { recursive: true });
            }

            // Save each user's Q&A memory separately
            for (const chatId in this.qaStore) {
                const userPath = this._getUserStoragePath(chatId);
                fs.writeFileSync(userPath, JSON.stringify(this.qaStore[chatId], null, 2), 'utf8');
            }

            // Also save global graph nodes (for compatibility)
            const graphPath = path.join(this.baseStoragePath, 'graph.json');
            fs.writeFileSync(graphPath, JSON.stringify(this.nodes, null, 2), 'utf8');
        } catch (err) {
            throw new Error(`Failed to save MemoryGraph: ${err.message}`);
        }
    }

    /**
     * Load all data from disk (both graph nodes and per-user Q&A pairs)
     */
    load() {
        try {
            // Ensure storage directory exists
            if (!fs.existsSync(this.baseStoragePath)) {
                fs.mkdirSync(this.baseStoragePath, { recursive: true });
            }

            // Load global graph
            const graphPath = path.join(this.baseStoragePath, 'graph.json');
            if (fs.existsSync(graphPath)) {
                this.nodes = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
            }

            // Load all per-user Q&A memories
            const files = fs.readdirSync(this.baseStoragePath);
            files.forEach(file => {
                if (file.startsWith('memory-') && file.endsWith('.json')) {
                    const filePath = path.join(this.baseStoragePath, file);
                    const chatId = file.replace('memory-', '').replace('.json', '');
                    try {
                        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        this.qaStore[chatId] = data;
                    } catch (err) {
                        console.warn(`Failed to load user memory for ${chatId}: ${err.message}`);
                    }
                }
            });
        } catch (err) {
            throw new Error(`Failed to load MemoryGraph: ${err.message}`);
        }
    }

    /**
     * Get memory statistics for monitoring and debugging
     */
    getStats() {
        const totalQAPairs = Object.values(this.qaStore).reduce((sum, user) => sum + (user.pairs?.length || 0), 0);
        const totalNodes = Object.keys(this.nodes).length;
        const usersWithMemory = Object.keys(this.qaStore).length;

        return {
            totalQAPairs,
            totalNodes,
            usersWithMemory,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = MemoryGraph;
