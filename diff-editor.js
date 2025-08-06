#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Utility to show differences between original and fixed files
 */

function showDiff() {
  const sourceFile = path.join(__dirname, 'assets/js/editor.js');
  const backupFile = path.join(__dirname, 'assets/js/editor.js.backup');
  
  if (!fs.existsSync(backupFile)) {
    console.log('❌ No backup file found. Run npm run build first.');
    return;
  }
  
  if (!fs.existsSync(sourceFile)) {
    console.log('❌ Source file not found.');
    return;
  }
  
  const original = fs.readFileSync(backupFile, 'utf8');
  const modified = fs.readFileSync(sourceFile, 'utf8');
  
  if (original === modified) {
    console.log('✅ No differences found between original and current file.');
    return;
  }
  
  console.log('🔍 Differences found:\n');
  
  // Simple diff - find the createDocumentSaveHandles method
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  
  let diffFound = false;
  
  for (let i = 0; i < Math.max(originalLines.length, modifiedLines.length); i++) {
    const origLine = originalLines[i] || '';
    const modLine = modifiedLines[i] || '';
    
    if (origLine !== modLine) {
      if (!diffFound) {
        console.log(`📍 Line ${i + 1}:`);
        diffFound = true;
      }
      
      if (origLine) {
        console.log(`- ${origLine}`);
      }
      if (modLine) {
        console.log(`+ ${modLine}`);
      }
      console.log('');
    }
  }
  
  if (!diffFound) {
    console.log('✅ Files are identical.');
  }
}

function showStats() {
  const sourceFile = path.join(__dirname, 'assets/js/editor.js');
  const minifiedFile = path.join(__dirname, 'assets/js/editor.min.js');
  const backupFile = path.join(__dirname, 'assets/js/editor.js.backup');
  
  console.log('📊 ProElements Editor.js Statistics\n');
  
  if (fs.existsSync(backupFile)) {
    const backupSize = fs.statSync(backupFile).size;
    console.log(`📁 Original (backup): ${backupSize.toLocaleString()} bytes`);
  }
  
  if (fs.existsSync(sourceFile)) {
    const sourceSize = fs.statSync(sourceFile).size;
    console.log(`📝 Current source: ${sourceSize.toLocaleString()} bytes`);
  }
  
  if (fs.existsSync(minifiedFile)) {
    const minSize = fs.statSync(minifiedFile).size;
    const sourceSize = fs.statSync(sourceFile).size;
    const reduction = ((sourceSize - minSize) / sourceSize * 100).toFixed(1);
    console.log(`⚡ Minified: ${minSize.toLocaleString()} bytes (-${reduction}%)`);
  }
  
  console.log('');
}

function showHelp() {
  console.log(`
ProElements Editor.js Diff Tool

Usage: node diff-editor.js [command]

Commands:
  diff      Show differences between original and current file
  stats     Show file size statistics
  help      Show this help

Examples:
  node diff-editor.js diff
  node diff-editor.js stats
`);
}

if (require.main === module) {
  const command = process.argv[2] || 'stats';
  
  switch (command) {
    case 'diff':
      showDiff();
      break;
    case 'stats':
      showStats();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      showHelp();
  }
}

module.exports = { showDiff, showStats };
