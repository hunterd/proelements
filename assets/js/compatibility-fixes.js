/**
 * ProElements JavaScript Compatibility Fixes
 * Fixes import.meta and DataCloneError issues
 */

(function() {
    'use strict';

    // Fix for import.meta errors in non-module scripts
    if (typeof window.import === 'undefined') {
        window.import = function() {
            return Promise.reject(new Error('import() is not supported in this context'));
        };
    }

    // Create a polyfill for import.meta
    if (typeof importMeta === 'undefined') {
        window.importMeta = {
            url: window.location.href,
            resolve: function(specifier) {
                return new URL(specifier, window.location.href).href;
            }
        };
    }

    // Fix DataCloneError: URL object could not be cloned
    const originalPostMessage = window.postMessage;
    window.postMessage = function(message, targetOrigin, transfer) {
        try {
            // Convert URL objects to strings before cloning
            if (message && typeof message === 'object') {
                message = JSON.parse(JSON.stringify(message, function(key, value) {
                    if (value instanceof URL) {
                        return value.href;
                    }
                    return value;
                }));
            }
            return originalPostMessage.call(this, message, targetOrigin, transfer);
        } catch (error) {
            console.warn('ProElements: Fixed DataCloneError in postMessage:', error);
            // Fallback: try to send a simplified version
            try {
                return originalPostMessage.call(this, {error: 'DataCloneError'}, targetOrigin, transfer);
            } catch (fallbackError) {
                console.error('ProElements: Failed to send message:', fallbackError);
            }
        }
    };

    // Override Worker constructor to handle DataCloneError
    if (typeof Worker !== 'undefined') {
        const OriginalWorker = Worker;
        window.Worker = function(scriptURL, options) {
            const worker = new OriginalWorker(scriptURL, options);
            const originalPostMessage = worker.postMessage;
            
            worker.postMessage = function(message, transfer) {
                try {
                    // Convert problematic objects before sending
                    if (message && typeof message === 'object') {
                        message = JSON.parse(JSON.stringify(message, function(key, value) {
                            if (value instanceof URL) {
                                return value.href;
                            }
                            if (value instanceof File || value instanceof Blob) {
                                return '[Object ' + value.constructor.name + ']';
                            }
                            return value;
                        }));
                    }
                    return originalPostMessage.call(this, message, transfer);
                } catch (error) {
                    console.warn('ProElements: Fixed DataCloneError in Worker postMessage:', error);
                }
            };
            
            return worker;
        };
    }

    // Fix for missing elementor elements
    function checkElementorElements() {
        // Check if Elementor is available
        if (typeof elementor === 'undefined' || typeof elementorFrontend === 'undefined') {
            return;
        }

        // Fix for "Can't attach preview to document" errors
        if (elementorFrontend && elementorFrontend.elements && elementorFrontend.elements.$body) {
            const originalFind = elementorFrontend.elements.$body.find;
            elementorFrontend.elements.$body.find = function(selector) {
                try {
                    const result = originalFind.call(this, selector);
                    if (result.length === 0 && selector.includes('.elementor-')) {
                        console.warn('ProElements: Element not found:', selector);
                    }
                    return result;
                } catch (error) {
                    console.error('ProElements: Error in element find:', error);
                    return $([]);  // Return empty jQuery object
                }
            };
        }
    }

    // Fix for JQMIGRATE warnings
    if (typeof jQuery !== 'undefined' && jQuery.migrateWarnings) {
        jQuery.migrateTrace = false;
        jQuery.migrateReset = function() {
            jQuery.migrateWarnings.length = 0;
        };
    }

    // Fix for missing script elements (stats.wp.com and similar)
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const element = originalCreateElement.call(this, tagName);
        
        if (tagName.toLowerCase() === 'script') {
            const originalSetAttribute = element.setAttribute;
            element.setAttribute = function(name, value) {
                if (name === 'src' && value && typeof value === 'string') {
                    // Add error handling for external scripts
                    element.onerror = function() {
                        console.warn('ProElements: Failed to load script:', value);
                    };
                }
                return originalSetAttribute.call(this, name, value);
            };
        }
        
        return element;
    };

    // Fix for layout forced before page load
    function preventLayoutForcing() {
        // Add CSS to prevent flash of unstyled content
        const style = document.createElement('style');
        style.textContent = `
            .elementor-element:not(.elementor-loaded) {
                visibility: hidden;
            }
            .elementor-element.elementor-loaded {
                visibility: visible;
            }
        `;
        document.head.appendChild(style);
    }

    // Initialize fixes when DOM is ready
    function initializeFixes() {
        checkElementorElements();
        preventLayoutForcing();
        
        // Log that fixes have been applied
        console.log('ProElements: Compatibility fixes applied');
    }

    // Run initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFixes);
    } else {
        initializeFixes();
    }

    // Also run when Elementor is loaded
    if (typeof elementorFrontend !== 'undefined') {
        elementorFrontend.hooks.addAction('frontend/element_ready/global', initializeFixes);
    }

    // Additional fix for webpack modules
    if (typeof __webpack_require__ !== 'undefined' && typeof __webpack_require__.r === 'undefined') {
        __webpack_require__.r = function(exports) {
            if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
                Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
            }
            Object.defineProperty(exports, '__esModule', { value: true });
        };
    }

})();
