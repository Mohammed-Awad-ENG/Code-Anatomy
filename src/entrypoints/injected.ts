
export default defineContentScript({
  matches: ['<all_urls>'],
  world: 'MAIN',
  runAt: 'document_start',
  
  main() {
    // 1. Setup our weak map to hold event listeners
    // We attach it to window so we can inspect it easily if needed,
    // and to ensure there's only one map per page even if the script runs multiple times.
    if ((window as any).__CODE_ANATOMY_LISTENERS__) return;
    
    const listenerMap = new WeakMap<EventTarget, any[]>();
    (window as any).__CODE_ANATOMY_LISTENERS__ = listenerMap;

    const originalAdd = EventTarget.prototype.addEventListener;
    const originalRemove = EventTarget.prototype.removeEventListener;

    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (!listenerMap.has(this)) {
        listenerMap.set(this, []);
      }
      
      const listeners = listenerMap.get(this)!;
      // Store metadata about the listener
      listeners.push({
        type,
        listener,
        useCapture: typeof options === 'object' ? !!options.capture : !!options,
        passive: typeof options === 'object' ? !!options.passive : false,
        once: typeof options === 'object' ? !!options.once : false,
        functionName: (listener as any).name || 'anonymous',
        sourcePreview: getSourcePreview(listener)
      });

      return originalAdd.call(this, type, listener, options);
    };

    EventTarget.prototype.removeEventListener = function(type, listener, options) {
      const listeners = listenerMap.get(this);
      if (listeners) {
        const useCapture = typeof options === 'object' ? !!options.capture : !!options;
        const index = listeners.findIndex(l => 
          l.type === type && 
          l.listener === listener && 
          l.useCapture === useCapture
        );
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }

      return originalRemove.call(this, type, listener, options);
    };

    function getSourcePreview(listener: any): string {
      try {
        let source = typeof listener === 'function' ? listener.toString() : 
                     (listener.handleEvent ? listener.handleEvent.toString() : 'Unknown');
        // Truncate for preview
        if (source.length > 200) {
          source = source.substring(0, 200) + '...';
        }
        return source;
      } catch (e) {
        return 'Source unavailable (CSP or restricted)';
      }
    }

    // 2. Setup the bridge to communicate with the isolated content script
    // We listen for a custom event from the isolated world
    document.addEventListener('code-anatomy-query-events', (e: Event) => {
      const customEvent = e as CustomEvent;
      const { elementId, targetElement } = customEvent.detail;
      
      // We pass the actual element in detail if possible, otherwise we rely on some identifier.
      // Since CustomEvent can't pass complex objects across worlds easily, 
      // the isolated script might just add a temporary data-attribute to identify it.
      
      let el = document.querySelector(`[data-code-anatomy-id="${elementId}"]`);
      if (!el) return;

      const listeners = listenerMap.get(el) || [];
      
      // We can't send the actual functions back, so we serialize the metadata
      const serialized = listeners.map(l => ({
        type: l.type,
        useCapture: l.useCapture,
        passive: l.passive,
        once: l.once,
        functionName: l.functionName,
        sourcePreview: l.sourcePreview
      }));

      document.dispatchEvent(new CustomEvent('code-anatomy-response-events', {
        detail: {
          elementId,
          listeners: serialized
        }
      }));
    });
  }
});
