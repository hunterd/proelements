#!/usr/bin/env node

const EditorBuilder = require('./build-editor.js');

/**
 * Quick development script to apply fixes and rebuild
 */

async function quickBuild() {
  console.log('🔧 ProElements Quick Build\n');
  
  const builder = new EditorBuilder();
  
  try {
    await builder.build({
      backup: true,
      applyFix: true,
      minify: true
    });
    
    console.log('\n✨ Ready to test your changes!');
    
  } catch (error) {
    console.error('\n❌ Quick build failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  quickBuild();
}

module.exports = quickBuild;
