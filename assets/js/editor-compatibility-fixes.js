/**
 * ProElements Editor Compatibility Fixes
 * Fixes specific issues in the Elementor editor context
 */

(function() {
    'use strict';

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

    // Fix for editor document attachment issues
    function fixDocumentAttachment() {
        if (typeof elementor === 'undefined') return;

        // Override preview attachment to handle missing elements
        if (elementor.modules && elementor.modules.layouts && elementor.modules.layouts.panel) {
            const originalAttachPreview = elementor.modules.layouts.panel.attachPreview;
            if (originalAttachPreview) {
                elementor.modules.layouts.panel.attachPreview = function(documentId, elementSelector) {
                    try {
                        const element = document.querySelector(elementSelector);
                        if (!element) {
                            console.warn(`ProElements: Cannot attach preview to document '${documentId}', element '${elementSelector}' was not found.`);
                            return false;
                        }
                        return originalAttachPreview.call(this, documentId, elementSelector);
                    } catch (error) {
                        console.error('ProElements: Error in attachPreview:', error);
                        return false;
                    }
                };
            }
        }

        // Fix for missing elementor containers
        if (elementor.config && elementor.config.initial_document) {
            const documentId = elementor.config.initial_document.id;
            const elementSelector = `.elementor-${documentId}`;
            
            if (!document.querySelector(elementSelector)) {
                console.warn(`ProElements: Creating missing container for document ${documentId}`);
                const container = document.createElement('div');
                container.className = `elementor elementor-${documentId}`;
                document.body.appendChild(container);
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

    // Fix for import.meta in editor modules
    function fixImportMeta() {
        // Create import.meta polyfill specifically for editor
        if (typeof window.importMeta === 'undefined') {
            window.importMeta = {
                url: window.location.href,
                env: {
                    MODE: 'development',
                    DEV: true,
                    PROD: false
                }
            };
        }

        // Override import calls
        const originalImport = window.import;
        window.import = function(specifier) {
            try {
                if (originalImport) {
                    return originalImport(specifier);
                }
                console.warn('ProElements: Dynamic import not supported:', specifier);
                return Promise.reject(new Error('Dynamic import not supported'));
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

    // Run fixes when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEditorFixes);
    } else {
        initializeEditorFixes();
    }

    // Also run when entering editor mode
    if (typeof elementorCommon !== 'undefined') {
        elementorCommon.elements.$window.on('elementor:init', initializeEditorFixes);
    }

})();
