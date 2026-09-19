import type { ElementData } from '../lib/messaging';
import { storage } from '@wxt-dev/storage';

export default defineContentScript({
  matches: ['<all_urls>'],
  // Inject into isolated world by default
  world: 'ISOLATED',
  
  main() {
    let isActive = false;
    let overlay: HTMLElement | null = null;
    let hoveredElement: HTMLElement | null = null;
    let lastRightClickedElement: HTMLElement | null = null;
    let fab: HTMLElement | null = null;

    // Listen for messages from background/sidebar
    browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'ACTIVATE_PICKER') {
        activatePicker();
        sendResponse({ success: true });
      } else if (msg.type === 'DEACTIVATE_PICKER') {
        deactivatePicker();
        sendResponse({ success: true });
      } else if (msg.type === 'INSPECT_CONTEXT_ELEMENT') {
        if (lastRightClickedElement) {
          hoveredElement = lastRightClickedElement;
          isActive = true;
          onClick(new MouseEvent('click') as any); // simulate click to open panel and inspect
        }
      }
    });

    // Track last right-clicked element for context menu
    document.addEventListener('contextmenu', (e) => {
      lastRightClickedElement = e.target as HTMLElement;
    }, true);

    // Initialize floating action button
    initFloatingButton();

    async function initFloatingButton() {
      // Check initial state
      const showFab = await storage.getItem<boolean>('local:showFloatingButton');
      if (showFab) createFloatingButton();

      // Listen for changes
      storage.watch<boolean>('local:showFloatingButton', (newValue) => {
        if (newValue) {
          if (!fab) createFloatingButton();
        } else {
          if (fab) {
            fab.remove();
            fab = null;
          }
        }
      });
    }

    function createFloatingButton() {
      if (fab) return;
      fab = document.createElement('button');
      fab.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="28" height="28">
  <rect width="128" height="128" rx="28" fill="#111111" />
  <rect x="24" y="20" width="80" height="88" rx="8" fill="none" stroke="#3B3B3B" stroke-width="4" />
  <line x1="64" y1="28" x2="64" y2="100" stroke="#7DD3FC" stroke-width="3" stroke-linecap="round" opacity="0.4" />
  <line x1="36" y1="36" x2="72" y2="36" stroke="#7DD3FC" stroke-width="5" stroke-linecap="round" />
  <line x1="36" y1="50" x2="92" y2="50" stroke="#A78BFA" stroke-width="5" stroke-linecap="round" />
  <line x1="36" y1="64" x2="60" y2="64" stroke="#F9A8D4" stroke-width="5" stroke-linecap="round" />
  <line x1="36" y1="78" x2="80" y2="78" stroke="#A78BFA" stroke-width="5" stroke-linecap="round" />
  <line x1="36" y1="92" x2="56" y2="92" stroke="#6EE7B7" stroke-width="5" stroke-linecap="round" />
  <polyline points="16,32 16,16 32,16" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.5" />
  <polyline points="96,16 112,16 112,32" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.5" />
  <polyline points="16,96 16,112 32,112" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.5" />
  <polyline points="96,112 112,112 112,96" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.5" />
</svg>`;
      fab.style.position = 'fixed';
      fab.style.bottom = '20px';
      fab.style.right = '20px';
      fab.style.width = '48px';
      fab.style.height = '48px';
      fab.style.borderRadius = '24px';
      fab.style.backgroundColor = '#121212';
      fab.style.color = '#6EC1E4';
      fab.style.border = '1px solid #333';
      fab.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      fab.style.zIndex = '2147483647'; // max z-index
      fab.style.cursor = 'pointer';
      fab.style.fontFamily = 'monospace';
      fab.style.fontSize = '16px';
      fab.style.fontWeight = 'bold';
      fab.style.display = 'flex';
      fab.style.alignItems = 'center';
      fab.style.justifyContent = 'center';
      fab.style.transition = 'all 0.2s ease';
      
      fab.addEventListener('mouseenter', () => {
        fab!.style.transform = 'scale(1.05)';
        fab!.style.backgroundColor = '#1a1a1a';
      });
      fab.addEventListener('mouseleave', () => {
        fab!.style.transform = 'scale(1)';
        fab!.style.backgroundColor = '#121212';
      });

      fab.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isActive) {
          deactivatePicker();
        } else {
          activatePicker();
        }
      });

      document.documentElement.appendChild(fab);
    }

    function createOverlay() {
      const div = document.createElement('div');
      div.id = 'code-anatomy-overlay';
      div.style.position = 'fixed';
      div.style.pointerEvents = 'none';
      div.style.zIndex = '2147483647';
      div.style.backgroundColor = 'rgba(110, 193, 228, 0.2)';
      div.style.border = '2px solid rgba(110, 193, 228, 0.8)';
      div.style.borderRadius = '4px';
      div.style.transition = 'all 0.1s ease-out';
      div.style.display = 'none';
      document.documentElement.appendChild(div);
      return div;
    }

    function updateOverlay(el: HTMLElement) {
      if (!overlay) return;
      const rect = el.getBoundingClientRect();
      overlay.style.top = `${rect.top}px`;
      overlay.style.left = `${rect.left}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.display = 'block';
    }

    function onMouseOver(e: MouseEvent) {
      if (!isActive) return;
      const target = e.target as HTMLElement;
      
      // Ignore extension overlay or shadow dom roots if not careful, but we just use target
      if (target.id === 'code-anatomy-overlay') return;
      
      hoveredElement = target;
      updateOverlay(target);
    }

    async function onClick(e: MouseEvent) {
      if (!isActive || !hoveredElement) return;
      
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      const el = hoveredElement;
      deactivatePicker();
      
      // IMPORTANT: Send synchronous message to background script so it can open sidePanel 
      // within the user gesture context!
      browser.runtime.sendMessage({ type: 'OPEN_PANEL' }).catch(() => {});

      // Temporarily mark the element to bridge with main world
      const elementId = Math.random().toString(36).substring(2);
      el.setAttribute('data-code-anatomy-id', elementId);

      // Query events
      const listeners = await new Promise<any[]>((resolve) => {
        const handler = (event: Event) => {
          const customEvent = event as CustomEvent;
          if (customEvent.detail.elementId === elementId) {
            document.removeEventListener('code-anatomy-response-events', handler);
            resolve(customEvent.detail.listeners);
          }
        };
        document.addEventListener('code-anatomy-response-events', handler);
        
        document.dispatchEvent(new CustomEvent('code-anatomy-query-events', {
          detail: { elementId }
        }));
        
        // Fallback timeout in case injected script didn't run
        setTimeout(() => {
          document.removeEventListener('code-anatomy-response-events', handler);
          resolve([]);
        }, 500);
      });

      // Cleanup temp attribute
      el.removeAttribute('data-code-anatomy-id');
      
      const data = extractElementData(el);
      
      browser.runtime.sendMessage({
        type: 'ELEMENT_SELECTED',
        payload: {
          ...data,
          listeners // Attach queried listeners to the payload
        }
      });
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isActive && e.key === 'Escape') {
        deactivatePicker();
      }
    }

    function activatePicker() {
      if (isActive) return;
      isActive = true;
      if (!overlay) overlay = createOverlay();
      
      document.addEventListener('mouseover', onMouseOver, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKeyDown, true);
      
      document.body.style.cursor = 'crosshair';
      if (fab) {
        fab.style.backgroundColor = '#6EC1E4';
        fab.style.color = '#121212';
      }
    }

    function deactivatePicker() {
      if (!isActive) return;
      isActive = false;
      
      document.removeEventListener('mouseover', onMouseOver, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      
      if (overlay) {
        overlay.style.display = 'none';
      }
      
      document.body.style.cursor = '';
      hoveredElement = null;
      if (fab) {
        fab.style.backgroundColor = '#121212';
        fab.style.color = '#6EC1E4';
      }
    }

    function extractElementData(el: HTMLElement): ElementData {
      // 1. Basic Info
      const tagName = el.tagName.toLowerCase();
      const id = el.id;
      const classes = Array.from(el.classList);
      
      // 2. Attributes
      const attributes: Record<string, string> = {};
      for (const attr of el.attributes) {
        attributes[attr.name] = attr.value;
      }
      
      // 3. HTML (truncated depth for sanity)
      // For now, full outerHTML, we'll format it in the sidebar
      let outerHTML = el.outerHTML;
      if (outerHTML.length > 5000) {
        outerHTML = outerHTML.substring(0, 5000) + '\n<!-- HTML truncated due to length -->';
      }

      // 4. Computed Styles (filtered)
      const computed = window.getComputedStyle(el);
      const computedStyles: Record<string, string> = {};
      const cssProps = [
        'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
        'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
        'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'gap',
        'grid-template-columns', 'grid-template-rows',
        'background-color', 'background-image', 'color',
        'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
        'border-top-width', 'border-top-style', 'border-top-color',
        'border-right-width', 'border-right-style', 'border-right-color',
        'border-bottom-width', 'border-bottom-style', 'border-bottom-color',
        'border-left-width', 'border-left-style', 'border-left-color',
        'border-radius', 'box-shadow', 'opacity', 'overflow', 'transform', 'transition'
      ];
      
      for (const prop of cssProps) {
        const val = computed.getPropertyValue(prop);
        if (val && val !== 'none' && val !== 'normal' && val !== '0px' && val !== 'rgba(0, 0, 0, 0)' && val !== 'auto' && val !== '') {
          computedStyles[prop] = val;
        }
      }

      // 5. Authored Rules
      const matchedRules: { selector: string; cssText: string; media?: string }[] = [];
      try {
        for (const sheet of document.styleSheets) {
          try {
            if (!sheet.cssRules) continue;
            for (const rule of sheet.cssRules) {
              if (rule instanceof CSSStyleRule) {
                try {
                  if (el.matches(rule.selectorText)) {
                    matchedRules.push({
                      selector: rule.selectorText,
                      cssText: rule.style.cssText
                    });
                  }
                } catch (e) {}
              } else if (rule instanceof CSSMediaRule) {
                // handle media queries
                for (const mediaSubRule of rule.cssRules) {
                  if (mediaSubRule instanceof CSSStyleRule) {
                    try {
                      if (el.matches(mediaSubRule.selectorText)) {
                        matchedRules.push({
                          selector: mediaSubRule.selectorText,
                          cssText: mediaSubRule.style.cssText,
                          media: rule.media.mediaText
                        });
                      }
                    } catch (e) {}
                  }
                }
              }
            }
          } catch (e) {
            // CORS error on cross-origin stylesheets
          }
        }
      } catch (e) {
        // Handle gracefully
      }

      // 6. Framework Events (React)
      const frameworkEvents: { event: string; handler: string }[] = [];
      // React attaches event listeners to DOM nodes under a key starting with __reactProps$
      const reactPropsKey = Object.keys(el).find(key => key.startsWith('__reactProps$'));
      if (reactPropsKey) {
        const props = (el as any)[reactPropsKey];
        if (props) {
          for (const key of Object.keys(props)) {
            // Look for event handlers e.g., onClick, onMouseEnter
            if (key.startsWith('on') && typeof props[key] === 'function') {
              frameworkEvents.push({
                event: key,
                handler: props[key].toString()
              });
            }
          }
        }
      }

      return {
        tagName,
        id,
        classes,
        attributes,
        outerHTML,
        inlineStyles: el.style.cssText,
        computedStyles,
        matchedRules,
        frameworkEvents
      };
    }
  },
});
