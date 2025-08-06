/**
 * ProElements Editor Compatibility Fixes
 * Fixes specific issues in the Elementor editor context
 */

(function() {
    'use strict';

    // Ensure jQuery is available before proceeding
    function waitForJQuery(callback, maxRetries = 100) {
        let retryCount = 0;
        
        function checkJQuery() {
            if (typeof $ !== 'undefined' && typeof jQuery !== 'undefined') {
                callback();
            } else if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(checkJQuery, 50);
            } else {
                console.warn('ProElements: jQuery not found in editor after maximum retries, proceeding anyway');
                callback();
            }
        }
        
        checkJQuery();
    }

    // Wait for Elementor to be ready
    function waitForElementor(callback) {
        if (typeof elementor !== 'undefined' && elementor.isReady) {
            callback();
        } else if (typeof elementor !== 'undefined') {
            elementor.on('preview:loaded', callback);
        } else {
            setTimeout(() => waitForElementor(callback), 100);
        }
    }

    // Fix for editor document attachment issues - enhanced version
    function fixDocumentAttachment() {
        if (typeof elementor === 'undefined') {
            setTimeout(fixDocumentAttachment, 100);
            return;
        }

        // Fix for @elementor/editor-site-navigation Settings object not found
        if (elementor.config && !elementor.config.settings) {
            elementor.config.settings = {};
        }
        
        if (elementor.settings && !elementor.settings.page) {
            elementor.settings.page = new Backbone.Model({});
        }

        // Override preview attachment to handle missing elements
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
    }

    // Fix for loop builder preview issues
    function fixLoopBuilderPreview() {
        if (typeof elementor === 'undefined') return;

        // Check for loop builder elements
        const loopElements = document.querySelectorAll('[data-elementor-type="loop-item"]');
        loopElements.forEach(element => {
            if (!element.dataset.elementorId) {
                element.dataset.elementorId = Math.random().toString(36).substr(2, 9);
            }
        });
    }

    // Fix for webpack modules in editor context
    function fixWebpackModules() {
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
    }

    // Fix for import.meta in editor modules - enhanced version
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

        // Global import.meta assignment for modules
        if (typeof globalThis !== 'undefined') {
            try {
                Object.defineProperty(globalThis, 'import', {
                    value: {
                        meta: window.importMeta
                    },
                    writable: false,
                    configurable: true
                });
            } catch (e) {
                // Fallback if property is already defined
                if (globalThis.import && !globalThis.import.meta) {
                    globalThis.import.meta = window.importMeta;
                }
            }
        }

        // Override import calls with better error handling
        const originalImport = window.import;
        window.import = function(specifier) {
            try {
                if (originalImport && typeof originalImport === 'function') {
                    return originalImport(specifier);
                }
                console.warn('ProElements: Dynamic import not supported, attempting fallback for:', specifier);
                
                // Attempt to load as regular script
                return new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = specifier;
                    script.onload = () => resolve({});
                    script.onerror = () => reject(new Error(`Failed to load module: ${specifier}`));
                    document.head.appendChild(script);
                });
            } catch (error) {
                console.warn('ProElements: Import error:', error);
                return Promise.reject(error);
            }
        };
    }

    // Fix for editor iframe communication
    function fixEditorCommunication() {
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

    // Run fixes when DOM is ready - wait for jQuery first
    function startInitialization() {
        waitForJQuery(function() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initializeEditorFixes);
            } else {
                initializeEditorFixes();
            }
        });
    }

    // Start initialization
    startInitialization();

    // Also run when entering editor mode
    if (typeof elementorCommon !== 'undefined' && elementorCommon.elements && elementorCommon.elements.$window) {
        elementorCommon.elements.$window.on('elementor:init', function() {
            waitForJQuery(initializeEditorFixes);
        });
    } else {
        // Fallback - try to listen for elementorCommon later
        setTimeout(function() {
            if (typeof elementorCommon !== 'undefined' && elementorCommon.elements && elementorCommon.elements.$window) {
                elementorCommon.elements.$window.on('elementor:init', function() {
                    waitForJQuery(initializeEditorFixes);
                });
            }
        }, 1000);
    }

})();
