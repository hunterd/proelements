# ProElements JavaScript Compatibility Fixes

This document explains the fixes applied to resolve JavaScript errors in ProElements.

## Fixed Errors

### 1. `Uncaught SyntaxError: import.meta may only appear in a module`

**Issue:** Scripts use `import.meta` without being defined as ES6 modules.

**Solution:**
- Safe polyfill for `import.meta` in `compatibility-fixes.js` that avoids read-only property conflicts
- Multiple controlled fallback approaches without forcing property assignment
- Function `add_module_type_to_scripts()` to add `type="module"` to necessary scripts
- Scripts loaded with correct dependencies and proper error handling

### 2. `DataCloneError: URL object could not be cloned`

**Issue:** Attempt to clone non-clonable URL objects in `postMessage`.

**Solution:**
- Override `window.postMessage` to convert URL objects to strings
- Override `Worker.postMessage` with the same logic
- Enhanced error handling with fallback
- Chrome extension message listener protection

### 3. `Can't attach preview to document`

**Issue:** Missing Elementor elements during preview attachment.

**Solution:**
- Enhanced verification of element existence before attachment
- Automatically create missing containers with proper attributes
- Fixed both editor and preview attachment methods
- Warning logs for debugging with improved retry logic

### 4. Flash of Unstyled Content (FOUC)

**Issue:** Content displayed before styles are fully loaded.

**Solution:**
- Enhanced CSS `compatibility-fixes.css` with opacity-based transitions
- Smooth transition when content is ready
- `.elementor-loaded` classes to control visibility
- Kit loading state management

### 5. External script errors (stats.wp.com)

**Issue:** External scripts fail to load.

**Solution:**
- Override `document.createElement` to add error handling
- Enhanced CSS to hide problematic iframes and tracking elements
- Warning logs for missed scripts

### 6. `Promised response from onMessage listener went out of scope`

**Issue:** Chrome extension message listeners not properly handling async responses.

**Solution:**
- Override `chrome.runtime.onMessage.addListener` to wrap callbacks
- Promise error catching and proper response channel management
- Automatic retry for failed message handling

### 7. `@elementor/editor-site-navigation - Settings object not found`

**Issue:** Missing configuration objects in Elementor editor.

**Solution:**
- Automatic creation of missing `elementor.config.settings` object
- Initialize missing `elementor.settings.page` with Backbone model
- Enhanced editor initialization safety checks

### 8. `elementorFrontend.hooks is undefined`

**Issue:** Attempting to use hooks before elementorFrontend is fully loaded.

**Solution:**
- Controlled retry mechanism with maximum 30 attempts (3 seconds) for hooks
- Maximum 50 attempts (5 seconds) for jQuery availability checks
- Multiple event listeners for different Elementor initialization events
- Graceful fallback when hooks are unavailable to prevent infinite loops

### 9. `$ is not a function` (jQuery not loaded)

**Issue:** jQuery not available when Elementor code attempts to use it.

**Solution:**
- Added controlled jQuery availability checks before using `$` (max 50 retries)
- Controlled waiting mechanism with timeout for jQuery loading
- Enhanced error handling with fallback for missing jQuery
- Protection of all jQuery-dependent operations with controlled wait functions

## Added Files

### JavaScript Scripts

1. **`assets/js/compatibility-fixes.js`** - General fixes
   - Polyfills for `import.meta`
   - Fixes for `DataCloneError`
   - Handling missing elements
   - Minified version: `compatibility-fixes.min.js`

2. **`assets/js/editor-compatibility-fixes.js`** - Editor-specific fixes
   - Fixes for document attachment
   - Loop builder corrections
   - Webpack module handling
   - Improved iframe communication
   - Minified version: `editor-compatibility-fixes.min.js`

### CSS Styles

3. **`assets/css/compatibility-fixes.css`** - Style fixes
   - FOUC prevention
   - Styles for missing elements
   - Responsive corrections
   - Minified version: `compatibility-fixes.min.css`

## Plugin Modifications

### `plugin.php`

Added new methods:

```php
public function add_module_type_to_scripts($tag, $handle, $src)
```
- Adds `type="module"` to ES6 scripts
- Detects scripts with hash patterns
- Handles scripts with `import.meta`

### Registered Scripts

New WordPress scripts:
- `pro-elements-compatibility-fixes` (frontend)
- `pro-elements-editor-compatibility-fixes` (editor)
- `pro-elements-compatibility-fixes` (CSS)

### Loading Order

1. **Compatibility fixes** (highest priority)
2. **Webpack runtime** 
3. **Elementor scripts**
4. **Pro Elements handlers**

## Usage

Fixes are automatically applied when:
- The plugin is activated
- Pages use Elementor
- The Elementor editor is open

No configuration required - everything works automatically.

## Debugging

To enable detailed logs, open the developer console:

```javascript
// ProElements messages will appear with this prefix
console.log('ProElements: ...')
```

## Compatibility

- ✅ WordPress 5.0+
- ✅ Elementor 3.28+
- ✅ PHP 7.4+
- ✅ Modern browsers
- ✅ Debug mode enabled/disabled

## Performance

- Minified scripts in production
- Conditional loading (only when necessary)
- Lightweight polyfills
- Minimal performance impact

## Tests

To test the fixes:

1. **Reload a page with Elementor**
2. **Open the developer console (F12)**
3. **Check for the absence of the following errors:**
   - ✅ `Uncaught SyntaxError: Cannot use 'import.meta' outside a module`
   - ✅ `DataCloneError: URL object could not be cloned`
   - ✅ `Can't attach preview to document`
   - ✅ `elementorFrontend.hooks is undefined`
   - ✅ `@elementor/editor-site-navigation - Settings object not found`
   - ✅ `Promised response from onMessage listener went out of scope`
   - ✅ `$ is not a function` (jQuery not loaded errors)

4. **Confirm the presence of the following success messages:**
   - "ProElements: Compatibility fixes applied"
   - "ProElements: Successfully added Elementor hooks"
   - "ProElements: Editor compatibility fixes applied" (in editor mode)

5. **Check in the Network tab that the compatibility files are loaded:**
   - `compatibility-fixes.min.js` (frontend)
   - `editor-compatibility-fixes.min.js` (editor)
   - `compatibility-fixes.min.css` (styles)

### Manual Fixes Testing

```javascript
// In the developer console, test:

// Test 1: import.meta polyfill
console.log('import.meta polyfill:', window.importMeta);

// Test 2: postMessage with URL (should not fail)
window.postMessage({url: new URL(location.href)}, '*');

// Test 3: elementorFrontend hooks (if available)
if (typeof elementorFrontend !== 'undefined') {
    console.log('elementorFrontend.hooks:', elementorFrontend.hooks);
}

// Test 4: jQuery availability check
if (typeof $ !== 'undefined' && typeof jQuery !== 'undefined') {
    console.log('jQuery ($) is available:', $().jquery);
} else {
    console.warn('jQuery is not available');
}
```

### Expected Debug Messages

If everything works correctly, you should see:

```javascript
ProElements: Compatibility fixes applied
ProElements: Successfully added Elementor hooks
ProElements: Editor compatibility fixes applied (in editor mode)
```

If issues are detected and fixed:

```javascript
ProElements: Element not found, attempting to create: .elementor-346
ProElements: Created missing container for document 346
ProElements: Fixed DataCloneError in postMessage: [error details]
ProElements: Failed to load script: https://stats.wp.com/s-202532.js
```

### Troubleshooting

If errors persist:

1. **Check that the compatibility files are loaded** in the Network tab
2. **Check the plugin version** (should be 3.30.0+)
3. **Clear your site and browser cache**
4. **Check the console** for ProElements messages
5. **Temporarily disable other plugins** to identify conflicts

### Online Test

You can use the included test file: `/wp-content/plugins/proelements/test-compatibility.html`

### New Improvements (Version 3.30.0+)

- ✅ **Reinforced `import.meta` fix** with safer approach to avoid read-only property conflicts
- ✅ **Chrome extension error handling** with listener protection
- ✅ **Automatic creation of missing Elementor config objects**
- ✅ **Controlled retry system** for elementorFrontend hooks (limited to 30 retries max)
- ✅ **Enhanced jQuery availability protection** with controlled waiting (limited to 50 retries max)
- ✅ **Improved FOUC prevention** with opacity transitions
- ✅ **Extended protection against problematic external scripts**
- ✅ **Script interception** for automatic module conversion
- ✅ **Improved ES6 script detection** requiring module type
- ✅ **Comprehensive error handling** for missing dependencies
- ✅ **Fixed infinite retry loops** that were causing performance issues
- ✅ **Safer polyfill implementation** avoiding "Cannot assign to read only property" errors
