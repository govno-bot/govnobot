/**
 * Test: Message Chunker (TDD - Test First)
 * Tests for chunking long messages into Telegram-compatible sizes
 */

async function run(runner) {
  console.log('\n📦 Testing Message Chunker');
  
  // Import the chunker module (doesn't exist yet - TDD!)
  let chunker;
  try {
    chunker = require('../../src/utils/chunker');
  } catch (error) {
    runner.assert(false, 'Chunker module should exist at src/utils/chunker.js');
    return;
  }
  
  // Test 1: Short message (no chunking needed)
  {
    const message = 'Hello, world!';
    const chunks = chunker.chunk(message);
    runner.assert(Array.isArray(chunks), 'chunk() returns an array');
    runner.assertEqual(chunks.length, 1, 'Short message has 1 chunk');
    runner.assertEqual(chunks[0], message, 'Chunk content matches input');
  }
  
  // Test 2: Message exactly at limit (4096 chars)
  {
    const message = 'A'.repeat(4096);
    const chunks = chunker.chunk(message);
    runner.assertEqual(chunks.length, 1, 'Message at limit has 1 chunk');
    runner.assertEqual(chunks[0].length, 4096, 'Chunk is exactly 4096 chars');
  }
  
  // Test 3: Message just over limit
  {
    const message = 'A'.repeat(4097);
    const chunks = chunker.chunk(message);
    runner.assertEqual(chunks.length, 2, 'Message over limit is split into 2 chunks');
    runner.assert(chunks[0].length <= 4096, 'First chunk is <= 4096 chars');
    runner.assert(chunks[1].length <= 4096, 'Second chunk is <= 4096 chars');
  }
  
  // Test 4: Very long message (8000 chars)
  {
    const message = 'B'.repeat(8000);
    const chunks = chunker.chunk(message);
    runner.assertEqual(chunks.length, 2, 'Long message splits into 2 chunks');
    
    // Verify no characters lost
    const reassembled = chunks.join('');
    runner.assertEqual(reassembled.length, message.length, 'No characters lost');
    runner.assertEqual(reassembled, message, 'Content matches after reassembly');
  }
  
  // Test 5: Message with newlines (prefer splitting at newlines)
  {
    const message = 'Line 1\n' + 'X'.repeat(4090) + '\nLine 2';
    const chunks = chunker.chunk(message);
    runner.assert(chunks.length >= 2, 'Message with newlines is chunked');
    
    // Verify all content preserved
    const reassembled = chunks.join('');
    runner.assertEqual(reassembled.length, message.length, 'All content preserved');
  }
  
  // Test 6: Empty message
  {
    const chunks = chunker.chunk('');
    runner.assertEqual(chunks.length, 1, 'Empty message returns 1 chunk');
    runner.assertEqual(chunks[0], '', 'Chunk is empty string');
  }
  
  // Test 7: Null/undefined handling
  {
    runner.assert(Array.isArray(chunker.chunk(null)), 'Handles null gracefully');
    runner.assert(Array.isArray(chunker.chunk(undefined)), 'Handles undefined gracefully');
  }
  
  // Test 8: Custom chunk size
  {
    const message = 'A'.repeat(200);
    const chunks = chunker.chunk(message, 100);
    runner.assertEqual(chunks.length, 2, 'Custom chunk size respected');
    runner.assert(chunks[0].length <= 100, 'First chunk <= custom size');
  }
  
  // Test 9: Code block preservation (don't split inside ```)
  {
    const message = '```\n' + 'X'.repeat(4100) + '\n```';
    const chunks = chunker.chunk(message);
    
    // Should keep code blocks together if possible
    runner.assert(chunks.length > 0, 'Code blocks are handled');
    
    // Verify backticks are preserved
    const reassembled = chunks.join('');
    runner.assert(reassembled.includes('```'), 'Code block markers preserved');
  }
  
  // Test 10: Unicode/emoji handling
  {
    const message = '😀'.repeat(2000);
    const chunks = chunker.chunk(message);
    
    const reassembled = chunks.join('');
    runner.assertEqual(reassembled, message, 'Unicode chars preserved correctly');
  }
}

module.exports = { run };
