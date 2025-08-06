#!/usr/bin/env node

/**
 * ProElements Compatibility Test Script
 * Tests if the compatibility fixes are working correctly
 */

const fs = require('fs');
const path = require('path');

class CompatibilityTester {
  constructor() {
    this.baseDir = __dirname;
    this.passed = 0;
    this.failed = 0;
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m'  // Yellow
    };
    const reset = '\x1b[0m';
    console.log(`${colors[type]}${message}${reset}`);
  }

  test(description, testFn) {
    try {
      const result = testFn();
      if (result) {
        this.log(`✅ ${description}`, 'success');
        this.passed++;
      } else {
        this.log(`❌ ${description}`, 'error');
        this.failed++;
      }
    } catch (error) {
      this.log(`❌ ${description} - Error: ${error.message}`, 'error');
      this.failed++;
    }
  }

  testFileExists(filePath, description) {
    this.test(description, () => {
      return fs.existsSync(path.join(this.baseDir, filePath));
    });
  }

  testFileContent(filePath, searchText, description) {
    this.test(description, () => {
      const fullPath = path.join(this.baseDir, filePath);
      if (!fs.existsSync(fullPath)) return false;
      const content = fs.readFileSync(fullPath, 'utf8');
      return content.includes(searchText);
    });
  }

  testMinifiedVersion(basePath, description) {
    const jsPath = `${basePath}.js`;
    const minPath = `${basePath}.min.js`;
    
    this.test(description, () => {
      const jsExists = fs.existsSync(path.join(this.baseDir, jsPath));
      const minExists = fs.existsSync(path.join(this.baseDir, minPath));
      
      if (!jsExists || !minExists) return false;
      
      const jsSize = fs.statSync(path.join(this.baseDir, jsPath)).size;
      const minSize = fs.statSync(path.join(this.baseDir, minPath)).size;
      
      return minSize < jsSize;
    });
  }

  runTests() {
    this.log('🧪 ProElements Compatibility Fixes Test Suite\n', 'info');

    // Test core compatibility files
    this.testFileExists('assets/js/compatibility-fixes.js', 
      'Frontend compatibility fixes script exists');
    
    this.testFileExists('assets/js/compatibility-fixes.min.js', 
      'Frontend compatibility fixes minified version exists');
    
    this.testFileExists('assets/js/editor-compatibility-fixes.js', 
      'Editor compatibility fixes script exists');
    
    this.testFileExists('assets/js/editor-compatibility-fixes.min.js', 
      'Editor compatibility fixes minified version exists');
    
    this.testFileExists('assets/css/compatibility-fixes.css', 
      'Compatibility fixes CSS exists');
    
    this.testFileExists('assets/css/compatibility-fixes.min.css', 
      'Compatibility fixes CSS minified version exists');

    // Test minification worked
    this.testMinifiedVersion('assets/js/compatibility-fixes', 
      'Frontend JS minification successful');
    
    this.testMinifiedVersion('assets/js/editor-compatibility-fixes', 
      'Editor JS minification successful');

    // Test PHP modifications
    this.testFileContent('plugin.php', 'add_module_type_to_scripts', 
      'PHP method add_module_type_to_scripts exists');
    
    this.testFileContent('plugin.php', 'pro-elements-compatibility-fixes', 
      'Compatibility fixes scripts registered in PHP');

    // Test specific fix content
    this.testFileContent('assets/js/compatibility-fixes.js', 'import.meta', 
      'import.meta polyfill present in frontend fixes');
    
    this.testFileContent('assets/js/compatibility-fixes.js', 'DataCloneError', 
      'DataCloneError fixes present in frontend fixes');
    
    this.testFileContent('assets/js/editor-compatibility-fixes.js', 'attachPreview', 
      'Editor preview fixes present');
    
    this.testFileContent('assets/css/compatibility-fixes.css', 'elementor-element', 
      'Elementor element styles present in CSS');

    // Test documentation
    this.testFileExists('COMPATIBILITY-FIXES.md', 
      'Documentation file exists');

    // Summary
    this.log('\n📊 Test Results:', 'info');
    this.log(`   Passed: ${this.passed}`, 'success');
    this.log(`   Failed: ${this.failed}`, this.failed > 0 ? 'error' : 'success');
    
    if (this.failed === 0) {
      this.log('\n🎉 All compatibility fixes are properly installed!', 'success');
      this.log('\nNext steps:', 'info');
      this.log('1. Test on a WordPress site with Elementor', 'info');
      this.log('2. Check browser console for error reduction', 'info');
      this.log('3. Verify ProElements compatibility messages appear', 'info');
    } else {
      this.log(`\n⚠️  ${this.failed} test(s) failed. Please review the issues above.`, 'warning');
    }

    return this.failed === 0;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new CompatibilityTester();
  const success = tester.runTests();
  process.exit(success ? 0 : 1);
}

module.exports = CompatibilityTester;
