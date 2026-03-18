const path = require('path');
const fs = require('fs');
const NotepadStore = require('../../src/storage/notepad-store');

async function run(runner) {
  const testDir = path.join(__dirname, '..', 'data', 'notepad-test');
  let store;

  const setup = () => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
    store = new NotepadStore(testDir);
  };

  const teardown = () => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  };

  // Test 1: should load default data if file does not exist
  {
    setup();
    const data = await store.load();
    runner.assert(data.thoughts === "", 'Thoughts should be empty');
    runner.assert(Array.isArray(data.goals) && data.goals.length === 0, 'Goals should be empty array');
    runner.assert(Array.isArray(data.planned_actions) && data.planned_actions.length === 0, 'Planned actions should be empty array');
    teardown();
  }

  // Test 2: should save and load data correctly
  {
    setup();
    await store.save({ thoughts: 'I should help users', goals: ['Goal 1'] });
    const data = await store.load();
    runner.assert(data.thoughts === 'I should help users', 'Thoughts should match saved');
    runner.assert(data.goals.length === 1 && data.goals[0] === 'Goal 1', 'Goals should match saved');
    teardown();
  }

  // Test 3: should merge partial updates correctly
  {
    setup();
    await store.save({ thoughts: 'Initial', goals: ['G1'], planned_actions: ['A1'] });
    await store.update({ thoughts: 'Updated' });
    const data = await store.load();
    runner.assert(data.thoughts === 'Updated', 'Thoughts should be updated');
    runner.assert(data.goals[0] === 'G1', 'Goals should remain same');
    runner.assert(data.planned_actions[0] === 'A1', 'Planned actions should remain same');
    teardown();
  }

  // Test 4: should clear notepad correctly
  {
    setup();
    await store.save({ thoughts: 'Something' });
    let data = await store.load();
    runner.assert(data.thoughts === 'Something', 'Should load something before clear');
    await store.clear();
    data = await store.load();
    runner.assert(data.thoughts === '', 'Thoughts should be empty after clear');
    teardown();
  }
}

module.exports = { run };
