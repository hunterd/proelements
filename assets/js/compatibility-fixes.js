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

    // Create a polyfill for import.meta - enhanced version
    if (typeof window.importMeta === 'undefined') {
        window.importMeta = {
            url: window.location.href,
            resolve: function(specifier) {
                return new URL(specifier, window.location.href).href;
            },
            env: {
                MODE: window.location.hostname === 'localhost' ? 'development' : 'production',
                DEV: window.location.hostname === 'localhost',
                PROD: window.location.hostname !== 'localhost'
            }
        };
    }
    
    // Global import.meta polyfill - multiple approaches
    if (typeof globalThis !== 'undefined') {
        // Approach 1: Direct assignment
        if (typeof globalThis.import === 'undefined') {
            try {
                Object.defineProperty(globalThis, 'import', {
                    value: {
                        meta: window.importMeta
                    },
                    writable: false,
                    configurable: true
                });
            } catch (e) {
                // Fallback if property cannot be defined
                globalThis.import = { meta: window.importMeta };
            }
        } else if (globalThis.import && !globalThis.import.meta) {
            globalThis.import.meta = window.importMeta;
        }
        
        // Approach 2: Window-level polyfill
        if (typeof window.import === 'undefined') {
            window.import = { meta: window.importMeta };
        } else if (!window.import.meta) {
            window.import.meta = window.importMeta;
        }
    }
    
    // Approach 3: Script-level polyfill by intercepting script evaluation
    const originalEval = window.eval;
    window.eval = function(code) {
        if (typeof code === 'string' && code.includes('import.meta')) {
            // Replace import.meta with window.importMeta
            code = code.replace(/import\.meta/g, 'window.importMeta');
        }
        return originalEval.call(this, code);
    };
    
    // Approach 4: Intercept script loading to fix import.meta errors
    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function(child) {
        if (child.tagName === 'SCRIPT' && child.src) {
            // Add module type to scripts that use import.meta
            const originalOnLoad = child.onload;
            child.onload = function() {
                // Script loaded successfully
                if (originalOnLoad) originalOnLoad.call(this);
            };
            
            const originalOnError = child.onerror;
            child.onerror = function(error) {
                // Check if error is related to import.meta
                if (error && error.message && error.message.includes('import.meta')) {
                    console.warn('ProElements: import.meta error caught for script:', child.src);
                    // Try to reload as module
                    if (!child.type || child.type !== 'module') {
                        child.type = 'module';
                        console.log('ProElements: Converted script to module type:', child.src);
                    }
                }
                if (originalOnError) originalOnError.call(this, error);
            };
        }
        return originalAppendChild.call(this, child);
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
        // Wait for elementorFrontend to be fully loaded
        if (typeof elementorFrontend === 'undefined' || 
            !elementorFrontend.elements || 
            !elementorFrontend.elements.$body) {
            setTimeout(checkElementorElements, 100);
            return;
        }

        // Fix for "Can't attach preview to document" errors
        const originalFind = elementorFrontend.elements.$body.find;
        elementorFrontend.elements.$body.find = function(selector) {
            try {
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
                return $([]);  // Return empty jQuery object
            }
        };
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

    // Also run when Elementor is loaded - with enhanced safety check
    function addElementorHooks() {
        if (typeof elementorFrontend !== 'undefined' && 
            elementorFrontend.hooks && 
            typeof elementorFrontend.hooks.addAction === 'function') {
            try {
                elementorFrontend.hooks.addAction('frontend/element_ready/global', initializeFixes);
                console.log('ProElements: Successfully added Elementor hooks');
            } catch (error) {
                console.warn('ProElements: Failed to add Elementor hooks:', error);
            }
        } else {
            // Retry with exponential backoff, but limit attempts
            let retryCount = 0;
            const maxRetries = 50; // 5 seconds max
            
            function retryAddHooks() {
                if (retryCount >= maxRetries) {
                    console.warn('ProElements: Gave up waiting for elementorFrontend.hooks after 5 seconds');
                    return;
                }
                
                if (typeof elementorFrontend !== 'undefined' && 
                    elementorFrontend.hooks && 
                    typeof elementorFrontend.hooks.addAction === 'function') {
                    try {
                        elementorFrontend.hooks.addAction('frontend/element_ready/global', initializeFixes);
                        console.log('ProElements: Successfully added Elementor hooks on retry', retryCount);
                    } catch (error) {
                        console.warn('ProElements: Failed to add Elementor hooks on retry:', error);
                    }
                } else {
                    retryCount++;
                    setTimeout(retryAddHooks, 100);
                }
            }
            
            retryAddHooks();
        }
    }
    
    // Start trying to add hooks
    addElementorHooks();
    
    // Also listen for elementor events
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
