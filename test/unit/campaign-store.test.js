const assert = require('assert');
const fs = require('fs');
const path = require('path');
const CampaignStore = require('../../src/storage/campaign-store');

module.exports.run = async function(runner) {
  const dataDir = path.join(__dirname, '..', 'data', 'campaigns_test');
  const userId = 12345;
  const filePath = path.join(dataDir, `${userId}.json`);

  const cleanUp = () => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(dataDir)) fs.rmSync(dataDir, { recursive: true, force: true });
  };

  cleanUp();
  const store = new CampaignStore(userId, dataDir);

  // Test 1: should initialize with empty state if no file
  const state = await store.load();
  await runner.assertEqual(JSON.stringify(state), JSON.stringify({ activeCampaign: null, history: [] }), 'should initialize with empty state if no file');

  // Test 2: should save and load state
  const initialState = { activeCampaign: 'cyberpunk', history: [{ role: 'system', content: 'test' }] };
  await store.save(initialState);
  const loaded = await store.load();
  await runner.assertEqual(JSON.stringify(loaded), JSON.stringify(initialState), 'should save and load state');

  cleanUp();
};