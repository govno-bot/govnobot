// MacroStore: Persistent per-user/per-group macro storage for GovnoBot
// Zero dependencies, atomic file operations, file locking, modeled after SettingsStore

const fs = require('fs');
const path = require('path');
const { acquireLock, releaseLock } = require('./file-lock');

const MACRO_DIR = path.join(__dirname, '../../data/macros');

function getMacroFile(id, type = 'user') {
  // type: 'user' or 'group'
  return path.join(MACRO_DIR, `${type}-${id}.json`);
}

async function loadMacros(id, type = 'user') {
  const file = getMacroFile(id, type);
  try {
    const data = await fs.promises.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    if (e.code === 'ENOENT') return {};
    throw e;
  }
}

async function saveMacros(id, macros, type = 'user') {
  const file = getMacroFile(id, type);
  const tmp = file + '.tmp';
  await fs.promises.writeFile(tmp, JSON.stringify(macros, null, 2), 'utf8');
  await fs.promises.rename(tmp, file);
}

async function addMacro(id, name, expansion, type = 'user') {
  const lock = await acquireLock(getMacroFile(id, type));
  try {
    const macros = await loadMacros(id, type);
    macros[name] = expansion;
    await saveMacros(id, macros, type);
  } finally {
    await releaseLock(lock);
  }
}

async function deleteMacro(id, name, type = 'user') {
  const lock = await acquireLock(getMacroFile(id, type));
  try {
    const macros = await loadMacros(id, type);
    delete macros[name];
    await saveMacros(id, macros, type);
  } finally {
    await releaseLock(lock);
  }
}

async function listMacros(id, type = 'user') {
  return Object.entries(await loadMacros(id, type));
}

async function getMacro(id, name, type = 'user') {
  const macros = await loadMacros(id, type);
  return macros[name] || null;
}

module.exports = {
  loadMacros,
  saveMacros,
  addMacro,
  deleteMacro,
  listMacros,
  getMacro,
  getMacroFile,
};
