/**
 * ProElements JavaScript Compatibility Fixes
 * Fixes import.meta and DataCloneError issues
 */

(function() {
    'use strict';

    // Ensure jQuery is available before proceeding
    function waitForJQuery(callback, maxRetries = 50) {
        let retryCount = 0;
        
        function checkJQuery() {
            if (typeof $ !== 'undefined' && typeof jQuery !== 'undefined') {
                callback();
                return;
            } else if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(checkJQuery, 100);
            } else {
                console.warn('ProElements: jQuery not found after maximum retries, proceeding anyway');
                callback();
                return;
            }
        }
        
        checkJQuery();
    }

    // Create a polyfill for import.meta - safe version
    if (typeof window.importMeta === 'undefined') {
        window.importMeta = {
            url: window.location.href,
            resolve: function(specifier) {
                try {
                    return new URL(specifier, window.location.href).href;
                } catch (e) {
                    return specifier;
                }
            },
            env: {
                MODE: window.location.hostname === 'localhost' ? 'development' : 'production',
                DEV: window.location.hostname === 'localhost',
                PROD: window.location.hostname !== 'localhost'
            }
        };
    }
    
    // Safe global import.meta polyfill - avoid read-only conflicts
    if (typeof globalThis !== 'undefined' && typeof globalThis.import === 'undefined') {
        try {
            globalThis.import = {
                meta: window.importMeta
            };
        } catch (e) {
            console.warn('ProElements: Could not set global import.meta, using fallback');
        }
    }
    
    // Window-level polyfill only if needed
    if (typeof window.import === 'undefined') {
        try {
            window.import = { 
                meta: window.importMeta 
            };
        } catch (e) {
            console.warn('ProElements: Could not set window.import');
        }
    }

    // Script evaluation interceptor for import.meta replacement
    const originalEval = window.eval;
    window.eval = function(code) {
        if (typeof code === 'string' && code.includes('import.meta')) {
            code = code.replace(/import\.meta/g, 'window.importMeta');
        }
        return originalEval.call(this, code);
    };

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
                    if (value instanceof File || value instanceof Blob) {
                        return '[Object ' + value.constructor.name + ']';
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

    // Fix for "Promised response from onMessage listener went out of scope"
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        try {
            const originalAddListener = chrome.runtime.onMessage.addListener;
            chrome.runtime.onMessage.addListener = function(callback) {
                const wrappedCallback = function(message, sender, sendResponse) {
                    try {
                        const result = callback(message, sender, sendResponse);
                        if (result instanceof Promise) {
                            result.catch(error => {
                                console.warn('ProElements: Caught promise error in onMessage listener:', error);
                            });
                            return true; // Keep the message channel open for async response
                        }
                        return result;
                    } catch (error) {
                        console.warn('ProElements: Caught error in onMessage listener:', error);
                        return false;
                    }
                };
                return originalAddListener.call(this, wrappedCallback);
            };
        } catch (e) {
            console.warn('ProElements: Could not override chrome extension messaging');
        }
    }

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

    // Fix for missing elementor elements - enhanced version
    function checkElementorElements() {
        // Wait for elementorFrontend to be fully loaded AND jQuery
        if (typeof elementorFrontend === 'undefined' || 
            !elementorFrontend.elements || 
            !elementorFrontend.elements.$body) {
            return; // Don't retry indefinitely, just wait for proper initialization
        }

        try {
            // Fix for "Can't attach preview to document" errors
            const originalFind = elementorFrontend.elements.$body.find;
            elementorFrontend.elements.$body.find = function(selector) {
                try {
                    // Ensure jQuery is available before proceeding
                    if (typeof $ === 'undefined' || typeof jQuery === 'undefined') {
                        console.warn('ProElements: jQuery not available for element find operation');
                        return jQuery ? jQuery([]) : [];
                    }

                    const result = originalFind.call(this, selector);
                    if (result.length === 0 && selector.includes('.elementor-')) {
                        console.warn('ProElements: Element not found, attempting to create:', selector);
                        
                        // Try to create missing elementor container
                        const matches = selector.match(/\.elementor-(\d+)/);
                        if (matches && matches[1]) {
                            const documentId = matches[1];
                            let container = document.querySelector(selector);
                            
                            if (!container) {
                                container = document.createElement('div');
                                container.className = `elementor elementor-${documentId}`;
                                container.dataset.elementorType = 'wp-page';
                                container.dataset.elementorId = documentId;
                                document.body.appendChild(container);
                                console.log(`ProElements: Created missing container for document ${documentId}`);
                            }
                            
                            return $(container);
                        }
                    }
                    return result;
                } catch (error) {
                    console.error('ProElements: Error in element find:', error);
                    // Return safe empty result based on what's available
                    if (typeof $ !== 'undefined') {
                        return $([]);
                    } else if (typeof jQuery !== 'undefined') {
                        return jQuery([]);
                    } else {
                        return [];
                    }
                }
            };
        } catch (error) {
            console.warn('ProElements: Could not override elementorFrontend find method:', error);
        }
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

    // Enhanced Elementor hooks system with controlled retry
    function addElementorHooks() {
        if (typeof elementorFrontend !== 'undefined' && 
            elementorFrontend.hooks && 
            typeof elementorFrontend.hooks.addAction === 'function') {
            try {
                elementorFrontend.hooks.addAction('frontend/element_ready/global', initializeFixes);
                console.log('ProElements: Successfully added Elementor hooks');
                return true;
            } catch (error) {
                console.warn('ProElements: Failed to add Elementor hooks:', error);
                return false;
            }
        }
        return false;
    }

    // Controlled retry mechanism for Elementor hooks
    function retryElementorHooks() {
        let retryCount = 0;
        const maxRetries = 30; // 3 seconds max
        
        function doRetry() {
            if (retryCount >= maxRetries) {
                console.warn('ProElements: Gave up waiting for elementorFrontend.hooks after 3 seconds');
                return;
            }
            
            if (!addElementorHooks()) {
                retryCount++;
                setTimeout(doRetry, 100);
            }
        }
        
        doRetry();
    }
    
    // Start trying to add hooks - wait for jQuery first
    waitForJQuery(function() {
        if (!addElementorHooks()) {
            retryElementorHooks();
        }
    });
    
    // Also listen for elementor events if jQuery is available
    if (typeof jQuery !== 'undefined') {
        jQuery(document).on('elementor/frontend/init', function() {
            console.log('ProElements: Elementor frontend initialized');
            addElementorHooks();
        });
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
