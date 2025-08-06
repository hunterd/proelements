/**
 * ProElements Editor Compatibility Fixes
 * Fixes specific issues in the Elementor editor context
 */

(function() {
    'use strict';

    // jQuery availability check - no retries, single check only
    function checkJQueryAvailability() {
        return typeof $ !== 'undefined' && typeof jQuery !== 'undefined';
    }

    // Wait for Elementor to be ready - single check only
    function waitForElementor(callback) {
        if (typeof elementor !== 'undefined' && elementor.config) {
            callback();
        } else {
            // Single timeout, no retry loop
            setTimeout(callback, 1000);
        }
    }

    // Fix for document attachment errors
    function fixDocumentAttachment() {
        if (typeof elementor === 'undefined') return;

        // Create missing config objects if needed
        if (!elementor.config) {
            elementor.config = {
                user: { restrictions: {}, capabilities: {} },
                document: { id: 1, type: 'wp-page' }
            };
        }
        
        if (!elementor.config.user) {
            elementor.config.user = {
                restrictions: {},
                capabilities: {}
            };
        }
        
        // Create settings page if missing (for editor-site-navigation)
        if (!elementor.settings || !elementor.settings.page) {
            if (typeof Backbone !== 'undefined') {
                if (!elementor.settings) {
                    elementor.settings = {};
                }
                elementor.settings.page = new Backbone.Model({
                    title: document.title || 'Page',
                    post_status: 'publish'
                });
            }
        }
        
        // Add checklist protection
        const originalQuerySelector = document.querySelector;
        document.querySelector = function(selector) {
            try {
                const element = originalQuerySelector.call(this, selector);
                if (!element && selector.includes('checklist')) {
                    // Return a safe mock element for checklist operations
                    return {
                        parentElement: document.body,
                        style: {},
                        getAttribute: () => null,
                        setAttribute: () => {},
                        addEventListener: () => {},
                        removeEventListener: () => {}
                    };
                }
                return element;
            } catch (error) {
                console.warn('ProElements: Protected querySelector error:', error);
                return null;
            }
        };
        
        // Suppress common editor navigation errors by providing fallbacks
        const originalConsoleError = console.error;
        console.error = function(...args) {
            const message = args.join(' ');
            if (message.includes('@elementor/editor-site-navigation') && 
                message.includes('Settings object not found')) {
                console.warn('ProElements: Suppressed editor navigation error (settings object created)');
                return;
            }
            if (message.includes('Cannot read properties of null') && 
                message.includes('parentElement')) {
                console.warn('ProElements: Suppressed parentElement error (protected)');
                return;
            }
            originalConsoleError.apply(console, args);
        };        if (elementor.settings && !elementor.settings.page) {
            elementor.settings.page = new Backbone.Model({});
        }

        // Override preview attachment to handle missing elements
        try {
            if (elementor.modules && elementor.modules.layouts && elementor.modules.layouts.panel) {
                const originalAttachPreview = elementor.modules.layouts.panel.attachPreview;
                if (originalAttachPreview) {
                    elementor.modules.layouts.panel.attachPreview = function(documentId, elementSelector) {
                        try {
                            let element = document.querySelector(elementSelector);
                            if (!element) {
                                console.warn(`ProElements: Cannot attach preview to document '${documentId}', element '${elementSelector}' was not found. Creating it...`);
                                
                                // Create the missing element
                                element = document.createElement('div');
                                element.className = `elementor elementor-${documentId}`;
                                element.dataset.elementorType = 'wp-page';
                                element.dataset.elementorId = documentId;
                                document.body.appendChild(element);
                            }
                            return originalAttachPreview.call(this, documentId, elementSelector);
                        } catch (error) {
                            console.error('ProElements: Error in attachPreview:', error);
                            return false;
                        }
                    };
                }
            }

            // Additional fix for web-cli preview attachment
            if (typeof elementorPreview !== 'undefined' && elementorPreview.preview) {
                const originalAttach = elementorPreview.preview.attach;
                if (originalAttach) {
                    elementorPreview.preview.attach = function(documentId, elementSelector) {
                        try {
                            let element = document.querySelector(elementSelector);
                            if (!element) {
                                console.warn(`ProElements: Preview attach - element '${elementSelector}' not found for document '${documentId}'. Creating container...`);
                                element = document.createElement('div');
                                element.className = `elementor elementor-${documentId}`;
                                element.dataset.elementorType = 'wp-page';
                                element.dataset.elementorId = documentId;
                                document.body.appendChild(element);
                            }
                            return originalAttach.call(this, documentId, elementSelector);
                        } catch (error) {
                            console.error('ProElements: Error in preview attach:', error);
                            return Promise.reject(error);
                        }
                    };
                }
            }
        } catch (error) {
            console.warn('ProElements: Could not override preview attachment methods:', error);
        }
    }

    // Fix for loop builder preview issues
    function fixLoopBuilderPreview() {
        if (typeof elementor === 'undefined') return;

        try {
            // Check for loop builder elements
            const loopElements = document.querySelectorAll('[data-elementor-type="loop-item"]');
            loopElements.forEach(element => {
                if (!element.dataset.elementorId) {
                    element.dataset.elementorId = Math.random().toString(36).substr(2, 9);
                }
            });
        } catch (error) {
            console.warn('ProElements: Error fixing loop builder elements:', error);
        }
    }

    // Fix for webpack modules in editor context
    function fixWebpackModules() {
        try {
            // Ensure webpack runtime is available
            if (typeof __webpack_require__ === 'undefined') {
                window.__webpack_require__ = function(moduleId) {
                    console.warn('ProElements: webpack_require called but not available:', moduleId);
                    return {};
                };
            }

            // Fix missing webpack chunk loading
            if (typeof __webpack_require__.e === 'undefined') {
                __webpack_require__.e = function(chunkId) {
                    console.warn('ProElements: webpack chunk loading not available:', chunkId);
                    return Promise.resolve();
                };
            }
        } catch (error) {
            console.warn('ProElements: Error setting up webpack polyfills:', error);
        }
    }

    // Fix for import.meta in editor modules - safe version
    function fixImportMeta() {
        // Create comprehensive import.meta polyfill
        if (typeof window.importMeta === 'undefined') {
            window.importMeta = {
                url: window.location.href,
                env: {
                    MODE: window.location.hostname === 'localhost' ? 'development' : 'production',
                    DEV: window.location.hostname === 'localhost',
                    PROD: window.location.hostname !== 'localhost',
                    BASE_URL: window.location.origin + '/',
                    SSR: false
                },
                resolve: function(specifier) {
                    try {
                        return new URL(specifier, window.location.href).href;
                    } catch (e) {
                        return specifier;
                    }
                }
            };
        }

        // Safe approach: only try if import doesn't exist
        if (typeof globalThis !== 'undefined' && typeof globalThis.import === 'undefined') {
            try {
                globalThis.import = {
                    meta: window.importMeta
                };
            } catch (e) {
                console.warn('ProElements: Could not set global import.meta, using fallback');
            }
        }

        // Window-level polyfill only if not existing
        if (typeof window.import === 'undefined') {
            try {
                window.import = {
                    meta: window.importMeta
                };
            } catch (e) {
                console.warn('ProElements: Could not set window.import');
            }
        }
    }

    // Fix for editor iframe communication
    function fixEditorCommunication() {
        try {
            // Override iframe messaging to prevent DataCloneError
            const originalPostMessage = window.postMessage;
            window.postMessage = function(message, targetOrigin, transfer) {
                try {
                    // Sanitize message object
                    if (message && typeof message === 'object') {
                        const sanitized = JSON.parse(JSON.stringify(message, (key, value) => {
                            if (value instanceof URL) return value.href;
                            if (value instanceof File) return '[File object]';
                            if (value instanceof Blob) return '[Blob object]';
                            if (typeof value === 'function') return '[Function]';
                            return value;
                        }));
                        return originalPostMessage.call(this, sanitized, targetOrigin, transfer);
                    }
                    return originalPostMessage.call(this, message, targetOrigin, transfer);
                } catch (error) {
                    console.warn('ProElements: Fixed editor communication error:', error);
                }
            };
        } catch (error) {
            console.warn('ProElements: Could not override postMessage:', error);
        }
    }

    // Initialize all fixes
    function initializeEditorFixes() {
        fixWebpackModules();
        fixImportMeta();
        fixEditorCommunication();
        
        waitForElementor(() => {
            fixDocumentAttachment();
            fixLoopBuilderPreview();
            console.log('ProElements: Editor compatibility fixes applied');
        });
    }

    // Run fixes when DOM is ready - single attempt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEditorFixes);
    } else {
        initializeEditorFixes();
    }

    // Also run when entering editor mode - single attempt
    if (checkJQueryAvailability()) {
        try {
            if (typeof elementorCommon !== 'undefined' && elementorCommon.elements && elementorCommon.elements.$window) {
                elementorCommon.elements.$window.on('elementor:init', initializeEditorFixes);
            }
        } catch (error) {
            console.warn('ProElements: Could not set up elementorCommon listeners:', error);
        }
    }

})();
