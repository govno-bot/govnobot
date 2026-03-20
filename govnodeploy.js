#!/usr/bin/env node
/*
  govnodeploy.js
  Minimal Node.js replacement for govnodeploy.ps1

  Usage:
    node govnodeploy.js help
    node govnodeploy.js update --version 1.2.3
    node govnodeploy.js update -v 1.2.3
    node govnodeploy.js list
    node govnodeploy.js show

  What it does:
    - Creates versioned copies of `govnobot.ps1` and `govnobot.js` named with the provided version
      (e.g. `govnobot-1.2.3.ps1` and `govnobot-1.2.3.js`).
    - Rewrites embedded version markers in the generated files.
    - Commits the new files to git with a sensible message.

  No external dependencies. Suitable for manual runs or integration into CI.
*/

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

function usage() {
  console.log('govnodeploy.js - minimal Node.js deploy helper');
  console.log('Usage:');
  console.log('  node govnodeploy.js help');
  console.log('  node govnodeploy.js update --version 1.2.3');
  console.log('  node govnodeploy.js list');
  console.log('  node govnodeploy.js show');
}

function readPackageVersion(projectRoot) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    return pkg.version;
  } catch (e) {
    return null;
  }
}

function replaceAll(content, replacements) {
  let out = content;
  replacements.forEach(([re, val]) => {
    out = out.replace(re, val);
  });
  return out;
}

function writeVersionedFile(srcPath, destPath, replacements) {
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Source file not found: ${srcPath}`);
  }
  const content = fs.readFileSync(srcPath, 'utf8');
  const newContent = replaceAll(content, replacements);
  fs.writeFileSync(destPath, newContent, 'utf8');
  console.log(`Created: ${destPath}`);
}

function gitCommitFiles(files, message) {
  try {
    child_process.execFileSync('git', ['add', '--'].concat(files), { stdio: 'ignore' });
    child_process.execFileSync('git', ['commit', '-m', message], { stdio: 'inherit' });
    console.log('Committed:', message);
  } catch (err) {
    console.warn('Git commit failed (is git available or are there staged changes?):', err.message);
  }
}

async function cmdUpdate(version) {
  const projectRoot = process.cwd();
  if (!version) version = readPackageVersion(projectRoot);
  if (!version) {
    console.error('No version provided and package.json missing or invalid.');
    process.exit(1);
  }

  // Normalize version string
  version = String(version).trim();

  // Prepare files to version
  const filesToProcess = [];

  // govnobot.ps1 -> govnobot-<version>.ps1
  const ps1Src = path.join(projectRoot, 'govnobot.ps1');
  const ps1Dest = path.join(projectRoot, `govnobot-${version}.ps1`);
  if (fs.existsSync(ps1Src)) {
    filesToProcess.push(ps1Dest);
    // Replacements: top '# Version: ...' and $script:Version = "..."
    const ps1Replacements = [
      [/^# Version: .*$/m, `# Version: ${version}`],
      [/^\$script:Version\s*=\s*\".*\"/m, `$script:Version = "${version}"`]
    ];
    writeVersionedFile(ps1Src, ps1Dest, ps1Replacements);
  } else {
    console.warn('govnobot.ps1 not found, skipping PowerShell script generation.');
  }

  // govnobot.js -> govnobot-<version>.js (update header and version property if present)
  const jsSrc = path.join(projectRoot, 'govnobot.js');
  const jsDest = path.join(projectRoot, `govnobot-${version}.js`);
  if (fs.existsSync(jsSrc)) {
    filesToProcess.push(jsDest);
    const jsReplacements = [
      [/^\s*\*\s*Version:\s*.*$/m, ` * Version: ${version} (Node.js)`],
      [/version:\s*'[^']*'/m, `version: '${version}'`]
    ];
    writeVersionedFile(jsSrc, jsDest, jsReplacements);
  } else {
    console.warn('govnobot.js not found, skipping Node script generation.');
  }

  if (filesToProcess.length === 0) {
    console.error('No files were processed. Nothing to do.');
    process.exit(1);
  }

  // Commit the generated files
  gitCommitFiles(filesToProcess, `chore(deploy): create versioned scripts for v${version}`);
}

function cmdList() {
  const projectRoot = process.cwd();
  const files = fs.readdirSync(projectRoot);
  const matches = files.filter(f => /^govnobot-\d+\.\d+\.\d/.test(f));
  if (matches.length === 0) {
    console.log('No versioned govnobot files found.');
    return;
  }
  matches.sort();
  matches.forEach(m => console.log(m));
}

function cmdShow() {
  const projectRoot = process.cwd();
  const pkgVersion = readPackageVersion(projectRoot) || '(no package.json)';
  console.log('package.json version:', pkgVersion);
  const ps1 = path.join(projectRoot, 'govnobot.ps1');
  if (fs.existsSync(ps1)) {
    const content = fs.readFileSync(ps1, 'utf8');
    const m = content.match(/^# Version: (.*)$/m);
    if (m) console.log('govnobot.ps1 header version:', m[1]);
  }
  const js = path.join(projectRoot, 'govnobot.js');
  if (fs.existsSync(js)) {
    const content = fs.readFileSync(js, 'utf8');
    const m = content.match(/\*\s*Version:\s*(.*)$/m);
    if (m) console.log('govnobot.js header version:', m[1]);
  }
}

// --- CLI parsing ---
const argv = process.argv.slice(2);
if (argv.length === 0) {
  usage();
  process.exit(0);
}

const cmd = argv[0];
if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
  usage();
  process.exit(0);
}

if (cmd === 'update') {
  // parse --version or -v
  let version = null;
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--version' || a === '-v' || a === '-Version') {
      version = argv[i+1];
      i++;
    } else if (a.startsWith('--version=')) {
      version = a.split('=')[1];
    }
  }
  cmdUpdate(version).catch(err => { console.error(err); process.exit(1); });
} else if (cmd === 'list') {
  cmdList();
} else if (cmd === 'show') {
  cmdShow();
} else {
  usage();
  process.exit(1);
}
