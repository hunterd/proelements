#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

/**
 * Build script for ProElements editor.js
 * Applies the loop builder fix and minifies the file
 */

class EditorBuilder {
  constructor() {
    this.sourceFile = path.join(__dirname, 'assets/js/editor.js');
    this.minifiedFile = path.join(__dirname, 'assets/js/editor.min.js');
    this.backupFile = path.join(__dirname, 'assets/js/editor.js.backup');
  }

  /**
   * Apply the createDocumentSaveHandles fix
   */
  applyFix(content) {
    console.log('🔧 Applying createDocumentSaveHandles fix...');
    
    const oldCode = `  createDocumentSaveHandles() {
    Object.entries(elementorFrontend.config.elements.data).forEach(_ref => {
      let [cid, element] = _ref;
      const elementData = elementor.getElementData(element);
      if (!elementData?.is_loop) {
        return;
      }
      const templateId = element.attributes.template_id;
      if (!templateId) {
        return;
      }
      const widgetSelector = \`.elementor-element[data-model-cid="\${cid}"]\`,
        editHandleSelector = \`[data-elementor-type="loop-item"].elementor-\${templateId}\`,
        editHandleElement = elementorFrontend.elements.$body.find(\`\${widgetSelector} \${editHandleSelector}\`).first()[0];
      if (editHandleElement) {
        (0, _documentHandle.default)({
          element: editHandleElement,
          id: 0,
          title: '& Back'
        }, _documentHandle.SAVE_CONTEXT, null, '.elementor-' + elementor.config.initial_document.id);
      }
    });
  }`;

    const newCode = `  createDocumentSaveHandles() {
    // Check if the required objects exist before accessing them
    if (!elementorFrontend?.config?.elements?.data) {
      return;
    }
    
    try {
      Object.entries(elementorFrontend.config.elements.data).forEach(_ref => {
        let [cid, element] = _ref;
        
        // Additional safety checks
        if (!element || !element.attributes) {
          return;
        }
        
        const elementData = elementor.getElementData(element);
        if (!elementData?.is_loop) {
          return;
        }
        const templateId = element.attributes.template_id;
        if (!templateId) {
          return;
        }
        const widgetSelector = \`.elementor-element[data-model-cid="\${cid}"]\`,
          editHandleSelector = \`[data-elementor-type="loop-item"].elementor-\${templateId}\`,
          editHandleElement = elementorFrontend.elements.$body.find(\`\${widgetSelector} \${editHandleSelector}\`).first()[0];
        if (editHandleElement) {
          (0, _documentHandle.default)({
            element: editHandleElement,
            id: 0,
            title: '& Back'
          }, _documentHandle.SAVE_CONTEXT, null, '.elementor-' + elementor.config.initial_document.id);
        }
      });
    } catch (error) {
      console.warn('Error in createDocumentSaveHandles:', error);
    }
  }`;

    if (content.includes(oldCode.trim())) {
      console.log('✅ Fix pattern found, applying changes...');
      return content.replace(oldCode.trim(), newCode.trim());
    } else {
      console.log('⚠️  Original code pattern not found, fix may already be applied');
      return content;
    }
  }

  /**
   * Create backup of original file
   */
  createBackup() {
    if (fs.existsSync(this.sourceFile) && !fs.existsSync(this.backupFile)) {
      console.log('📁 Creating backup...');
      fs.copyFileSync(this.sourceFile, this.backupFile);
      console.log(`✅ Backup created: ${this.backupFile}`);
    }
  }

  /**
   * Restore from backup
   */
  restoreBackup() {
    if (fs.existsSync(this.backupFile)) {
      console.log('🔄 Restoring from backup...');
      fs.copyFileSync(this.backupFile, this.sourceFile);
      console.log('✅ Restored from backup');
    } else {
      console.log('❌ No backup file found');
    }
  }

  /**
   * Read source file
   */
  readSource() {
    if (!fs.existsSync(this.sourceFile)) {
      throw new Error(`Source file not found: ${this.sourceFile}`);
    }
    return fs.readFileSync(this.sourceFile, 'utf8');
  }

  /**
   * Write source file
   */
  writeSource(content) {
    fs.writeFileSync(this.sourceFile, content, 'utf8');
    console.log(`✅ Updated: ${this.sourceFile}`);
  }

  /**
   * Minify and save
   */
  async minifyAndSave(content) {
    console.log('⚡ Minifying...');
    
    try {
      const result = await minify(content, {
        compress: {
          drop_console: false,
          drop_debugger: true,
          conditionals: true,
          evaluate: true,
          booleans: true,
          loops: true,
          unused: true,
          hoist_funs: false,
          keep_fargs: false,
          hoist_vars: false,
          if_return: true,
          join_vars: true,
          side_effects: true
        },
        mangle: {
          reserved: ['elementor', 'elementorModules', '$e', 'jQuery', '$', 'elementorFrontend']
        },
        format: {
          comments: false,
          beautify: false
        }
      });

      if (result.error) {
        throw result.error;
      }

      fs.writeFileSync(this.minifiedFile, result.code, 'utf8');
      console.log(`✅ Minified file created: ${this.minifiedFile}`);
      
      // Show size comparison
      const originalSize = content.length;
      const minifiedSize = result.code.length;
      const reduction = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
      
      console.log(`📊 Size: ${originalSize} → ${minifiedSize} bytes (-${reduction}%)`);
      
    } catch (error) {
      console.error('❌ Minification failed:', error);
      throw error;
    }
  }

  /**
   * Main build process
   */
  async build(options = {}) {
    console.log('🚀 Starting ProElements editor.js build process...\n');
    
    try {
      // Create backup if requested
      if (options.backup !== false) {
        this.createBackup();
      }

      // Read source
      let content = this.readSource();
      console.log(`📖 Source file loaded: ${this.sourceFile}`);

      // Apply fix if requested
      if (options.applyFix !== false) {
        content = this.applyFix(content);
        this.writeSource(content);
      }

      // Minify if requested
      if (options.minify !== false) {
        await this.minifyAndSave(content);
      }

      console.log('\n🎉 Build completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Build failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const builder = new EditorBuilder();
  
  const options = {
    backup: !args.includes('--no-backup'),
    applyFix: !args.includes('--no-fix'),
    minify: !args.includes('--no-minify')
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
ProElements Editor.js Builder

Usage: node build-editor.js [options]

Options:
  --no-backup    Skip creating backup
  --no-fix       Skip applying the createDocumentSaveHandles fix
  --no-minify    Skip minification step
  --restore      Restore from backup
  --help, -h     Show this help

Examples:
  node build-editor.js                    # Full build with backup, fix and minify
  node build-editor.js --no-backup        # Build without creating backup
  node build-editor.js --restore          # Restore from backup
`);
    process.exit(0);
  }

  if (args.includes('--restore')) {
    builder.restoreBackup();
    process.exit(0);
  }

  builder.build(options);
}

module.exports = EditorBuilder;
