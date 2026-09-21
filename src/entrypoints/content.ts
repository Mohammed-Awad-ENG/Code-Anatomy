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
    let iframeTooltip: HTMLElement | null = null;
    
    let lastInspectedElement: HTMLElement | null = null;
    let forceStyleEl: HTMLStyleElement | null = null;
    let lastExtractedPseudoRules: { selector: string; cssText: string; pseudoClass: string; media?: string }[] = [];
    
    // Track iframe inspection state
    let activeIframeDoc: Document | null = null;

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
      } else if (msg.type === 'FORCE_STATE' && lastInspectedElement) {
        const stateName = msg.payload.state.replace(':', '');
        const attrName = `data-ca-force-${stateName}`;
        if (msg.payload.mode === 'once') {
          lastInspectedElement.setAttribute(attrName, 'true');
          setTimeout(() => {
            if (lastInspectedElement) lastInspectedElement.removeAttribute(attrName);
          }, 1000);
        } else if (msg.payload.mode === 'toggle') {
          if (lastInspectedElement.hasAttribute(attrName)) {
            lastInspectedElement.removeAttribute(attrName);
          } else {
            lastInspectedElement.setAttribute(attrName, 'true');
          }
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
      let target = e.target as HTMLElement;
      
      // Ignore extension UI elements
      if (target.id === 'code-anatomy-overlay' || target.id === 'code-anatomy-iframe-tooltip') return;
      if (target === fab) return;
      
      // Shadow DOM: if we're inside a shadow root, use the composed path to get the actual target
      if (e.composedPath && e.composedPath().length > 0) {
        const deepTarget = e.composedPath()[0] as HTMLElement;
        if (deepTarget && deepTarget !== target && deepTarget instanceof HTMLElement) {
          target = deepTarget;
        }
      }
      
      // Iframe awareness: show tooltip for iframes
      if (target.tagName === 'IFRAME') {
        const iframe = target as HTMLIFrameElement;
        showIframeTooltip(iframe);
        hoveredElement = target;
        updateOverlay(target);
        return;
      } else {
        hideIframeTooltip();
      }
      
      hoveredElement = target;
      updateOverlay(target);
    }

    async function onClick(e: MouseEvent) {
      if (!isActive || !hoveredElement) return;
      
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      const el = hoveredElement;
      
      // If clicking on a same-origin iframe, drill into it instead of inspecting the iframe element
      if (el.tagName === 'IFRAME') {
        const iframe = el as HTMLIFrameElement;
        try {
          const iframeDoc = iframe.contentDocument;
          if (iframeDoc) {
            hideIframeTooltip();
            attachIframeListeners(iframeDoc);
            return; // Stay in picker mode, now listening inside the iframe
          }
        } catch (e) {
          // Cross-origin — fall through and inspect the iframe element itself
        }
      }
      
      lastInspectedElement = el; // Save reference for forcing states
      deactivatePicker();
      
      // IMPORTANT: Send synchronous message to background script so it can open sidePanel 
      // within the user gesture context!
      browser.runtime.sendMessage({ type: 'OPEN_PANEL' }).catch(() => {});

      // Temporarily mark the element to bridge with main world
      const elementId = Math.random().toString(36).substring(2);
      el.setAttribute('data-code-anatomy-id', elementId);

      // Query events & JS references from the injected (MAIN world) script
      const jsResult = await new Promise<any>((resolve) => {
        const handler = (event: Event) => {
          const target = event.target as Element;
          if (target === el) {
            el.removeEventListener('code-anatomy-response-events', handler);
            const responseStr = el.getAttribute('data-code-anatomy-response');
            if (responseStr) {
               resolve(JSON.parse(responseStr));
               el.removeAttribute('data-code-anatomy-response');
            } else {
               resolve({ listeners: [], childListeners: [], domAccess: [], domManipulations: [] });
            }
          }
        };
        el.addEventListener('code-anatomy-response-events', handler);
        el.dispatchEvent(new CustomEvent('code-anatomy-query-events', { bubbles: true }));
        
        // Fallback timeout in case injected script didn't run
        setTimeout(() => {
          el.removeEventListener('code-anatomy-response-events', handler);
          resolve({ listeners: [], childListeners: [], domAccess: [], domManipulations: [] });
        }, 500);
      });

      // Cleanup temp attribute
      el.removeAttribute('data-code-anatomy-id');
      
      const data = extractElementData(el);
      
      browser.runtime.sendMessage({
        type: 'ELEMENT_SELECTED',
        payload: {
          ...data,
          listeners: jsResult.listeners,
          childListeners: jsResult.childListeners || [],
          domAccess: jsResult.domAccess || [],
          domManipulations: jsResult.domManipulations || []
        }
      });
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isActive && e.key === 'Escape') {
        deactivatePicker();
      }
    }
    
    function showIframeTooltip(iframe: HTMLIFrameElement) {
      let canAccess = false;
      try {
        canAccess = !!iframe.contentDocument;
      } catch (e) {}
      
      if (!iframeTooltip) {
        iframeTooltip = document.createElement('div');
        iframeTooltip.id = 'code-anatomy-iframe-tooltip';
        iframeTooltip.style.position = 'fixed';
        iframeTooltip.style.padding = '8px 12px';
        iframeTooltip.style.backgroundColor = '#1e1e1e';
        iframeTooltip.style.color = '#ccc';
        iframeTooltip.style.border = '1px solid #333';
        iframeTooltip.style.borderRadius = '6px';
        iframeTooltip.style.fontSize = '12px';
        iframeTooltip.style.fontFamily = 'monospace';
        iframeTooltip.style.zIndex = '2147483647';
        iframeTooltip.style.pointerEvents = 'none';
        iframeTooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
        document.documentElement.appendChild(iframeTooltip);
      }
      
      const rect = iframe.getBoundingClientRect();
      iframeTooltip.style.top = `${rect.top + 8}px`;
      iframeTooltip.style.left = `${rect.left + 8}px`;
      iframeTooltip.style.display = 'block';
      
      if (canAccess) {
        iframeTooltip.innerHTML = `<span style="color: #6EE7B7;">✓</span> Same-origin iframe — <strong>click to inspect inside</strong>`;
      } else {
        iframeTooltip.innerHTML = `<span style="color: #E06C75;">✗</span> Cross-origin iframe — cannot inspect`;
      }
    }
    
    function hideIframeTooltip() {
      if (iframeTooltip) {
        iframeTooltip.style.display = 'none';
      }
    }
    
    function attachIframeListeners(iframeDoc: Document) {
      activeIframeDoc = iframeDoc;
      iframeDoc.addEventListener('mouseover', onMouseOver, true);
      iframeDoc.addEventListener('click', onClick, true);
      iframeDoc.addEventListener('keydown', onKeyDown, true);
      iframeDoc.body.style.cursor = 'crosshair';
    }
    
    function detachIframeListeners() {
      if (activeIframeDoc) {
        try {
          activeIframeDoc.removeEventListener('mouseover', onMouseOver, true);
          activeIframeDoc.removeEventListener('click', onClick, true);
          activeIframeDoc.removeEventListener('keydown', onKeyDown, true);
          activeIframeDoc.body.style.cursor = '';
        } catch (e) {}
        activeIframeDoc = null;
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
      detachIframeListeners();
      hideIframeTooltip();
      
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
      const pseudoRules: { selector: string; cssText: string; pseudoClass: string; media?: string }[] = [];
      const interactionPseudos = [
        ':hover', ':focus', ':active', ':focus-within', ':focus-visible', ':target',
        ':visited', ':checked', ':disabled', ':enabled', ':read-only', ':read-write',
        ':valid', ':invalid', ':in-range', ':out-of-range', ':required', ':optional'
      ];

      function processRule(rule: CSSStyleRule, mediaText?: string) {
        // Safe split by comma, ignoring commas inside parentheses
        const selectors: string[] = [];
        let current = '';
        let depth = 0;
        for (let i = 0; i < rule.selectorText.length; i++) {
          const char = rule.selectorText[i];
          if (char === '(') depth++;
          else if (char === ')') depth--;
          else if (char === ',' && depth === 0) {
            selectors.push(current.trim());
            current = '';
            continue;
          }
          current += char;
        }
        if (current) selectors.push(current.trim());

        for (const selector of selectors) {
          let isPseudo = false;
          let detectedPseudos: string[] = [];
          let baseSelector = selector;

          // Strip all interaction pseudo-classes
          for (const pseudo of interactionPseudos) {
            if (baseSelector.includes(pseudo)) {
              isPseudo = true;
              detectedPseudos.push(pseudo);
              baseSelector = baseSelector.replace(new RegExp(pseudo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
            }
          }
          
          // Strip ALL pseudo-elements (both :: and legacy : variants)
          // This prevents DOMExceptions in matches()
          baseSelector = baseSelector
            .replace(/::[a-zA-Z0-9_-]+/g, '')
            .replace(/:(before|after|first-letter|first-line)\b/g, '')
            .replace(/:-webkit-[a-zA-Z0-9_-]+/g, '')
            .replace(/:-moz-[a-zA-Z0-9_-]+/g, '')
            .replace(/:-ms-[a-zA-Z0-9_-]+/g, '')
            .replace(/:-o-[a-zA-Z0-9_-]+/g, '');

          if (!baseSelector || baseSelector === '*') {
             if (!baseSelector) continue;
          }

          try {
            if (el.matches(baseSelector)) {
              if (isPseudo) {
                // Emit one pseudoRule per detected state so each state
                // can be independently toggled without invalid attribute names
                for (const pseudo of detectedPseudos) {
                  pseudoRules.push({
                    selector: selector,
                    cssText: rule.style.cssText,
                    pseudoClass: pseudo,
                    media: mediaText
                  });
                }
              } else {
                matchedRules.push({
                  selector: selector,
                  cssText: rule.style.cssText,
                  media: mediaText
                });
              }
            }
          } catch (e) {
            // Silently ignore if matches() fails on a complex unstripped selector
          }
        }
      }

      // Recursively walk CSS rules to handle @media, @supports, @layer, @container, etc.
      function walkRules(ruleList: CSSRuleList, inheritedMedia?: string) {
        for (const rule of ruleList) {
          if (rule instanceof CSSStyleRule) {
            processRule(rule, inheritedMedia);
          } else if (rule instanceof CSSMediaRule) {
            const mediaStr = inheritedMedia
              ? `${inheritedMedia} and ${rule.media.mediaText}`
              : rule.media.mediaText;
            walkRules(rule.cssRules, mediaStr);
          } else if ('cssRules' in rule && (rule as any).cssRules) {
            // Handles CSSSupportsRule, CSSLayerBlockRule, CSSContainerRule,
            // and any other CSSGroupingRule subclass
            walkRules((rule as any).cssRules, inheritedMedia);
          }
        }
      }

      function scanStyleSheets(root: Document | ShadowRoot) {
        try {
          for (const sheet of root.styleSheets) {
            try {
              if (!sheet.cssRules) continue;
              walkRules(sheet.cssRules);
            } catch (e) {
              // CORS error on cross-origin stylesheets
            }
          }
        } catch (e) {}
        
        // Also scan adoptedStyleSheets (used by shadow DOM and modern documents)
        if ('adoptedStyleSheets' in root) {
          try {
            for (const sheet of (root as any).adoptedStyleSheets) {
              try {
                if (!sheet.cssRules) continue;
                walkRules(sheet.cssRules);
              } catch (e) {}
            }
          } catch (e) {}
        }
      }
      
      // Scan the main document
      scanStyleSheets(document);
      
      // If the element lives inside a shadow root, also scan its shadow stylesheets
      const rootNode = el.getRootNode();
      if (rootNode instanceof ShadowRoot) {
        scanStyleSheets(rootNode);
      }

      // Generate force styles dynamically
      lastExtractedPseudoRules = pseudoRules;
      if (!forceStyleEl) {
        forceStyleEl = document.createElement('style');
        forceStyleEl.id = 'code-anatomy-force-styles';
        document.head.appendChild(forceStyleEl);
      }
      
      const uniqueId = el.dataset.caId || `ca-${Math.random().toString(36).substr(2, 9)}`;
      el.dataset.caId = uniqueId;
      
      let fullInjectedCSS = '';
      for (const rule of pseudoRules) {
        let pseudoElement = '';
        const peMatch = rule.selector.match(/::[a-zA-Z0-9_-]+/);
        if (peMatch) pseudoElement = peMatch[0];
        
        // pseudoClass is now always a single state like ":hover" (no spaces)
        const stateName = rule.pseudoClass.replace(/^:/, '');
        fullInjectedCSS += `[data-ca-force-${stateName}="true"][data-ca-id="${uniqueId}"]${pseudoElement} { ${rule.cssText} !important; }\n`;
      }
      forceStyleEl.textContent = fullInjectedCSS;

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
        pseudoRules,
        frameworkEvents
      };
    }
  },
});
