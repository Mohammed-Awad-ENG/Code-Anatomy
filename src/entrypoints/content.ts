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

    function getDeepTarget(e: MouseEvent): HTMLElement | null {
      // 1. Try composedPath first
      if (typeof e.composedPath === 'function') {
        const path = e.composedPath();
        for (const item of path) {
          if (item instanceof HTMLElement && item.id !== 'code-anatomy-overlay' && item.id !== 'code-anatomy-iframe-tooltip' && item !== fab) {
            return item;
          }
        }
      }

      // 2. Try recursive shadowRoot drilling at point
      let el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      while (el && el.shadowRoot) {
        const deep = el.shadowRoot.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        if (!deep || deep === el) break;
        el = deep;
      }
      if (el && el.id !== 'code-anatomy-overlay' && el.id !== 'code-anatomy-iframe-tooltip' && el !== fab) {
        return el;
      }

      return (e.target as HTMLElement) || null;
    }

    function onMouseOver(e: MouseEvent) {
      if (!isActive) return;
      const target = getDeepTarget(e);
      if (!target) return;
      
      // Ignore extension UI elements
      if (target.id === 'code-anatomy-overlay' || target.id === 'code-anatomy-iframe-tooltip') return;
      if (target === fab) return;
      
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
      if (!isActive) return;
      
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      const el = getDeepTarget(e) || hoveredElement;
      if (!el) return;
      
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
      
      // 3. HTML Serialization (with Shadow DOM and ::before / ::after support)
      function serializeElementWithPseudosAndShadow(targetEl: HTMLElement): {
        displayHTML: string;
        sandboxHTML: string;
        shadowStyles: string[];
      } {
        const shadowStyles: string[] = [];

        const checkPseudos = (node: HTMLElement) => {
          let hasBefore = false;
          let hasAfter = false;
          if (node === targetEl && typeof pseudoElements !== 'undefined') {
            hasBefore = Boolean(pseudoElements.before?.exists);
            hasAfter = Boolean(pseudoElements.after?.exists);
          } else {
            try {
              const bComp = window.getComputedStyle(node, '::before');
              const bContent = bComp.getPropertyValue('content');
              hasBefore = Boolean(bContent && bContent !== 'none' && bContent !== 'normal' && bContent.trim() !== '');

              const aComp = window.getComputedStyle(node, '::after');
              const aContent = aComp.getPropertyValue('content');
              hasAfter = Boolean(aContent && aContent !== 'none' && aContent !== 'normal' && aContent.trim() !== '');
            } catch (e) {}
          }
          return { hasBefore, hasAfter };
        };

        const serializeNode = (node: HTMLElement): { display: string; sandbox: string } => {
          const shadow = node.shadowRoot;
          const { hasBefore, hasAfter } = checkPseudos(node);
          const tag = node.tagName.toLowerCase();

          // Build attributes string (excluding internal data attributes)
          const attrs: string[] = [];
          for (const attr of Array.from(node.attributes)) {
            if (!attr.name.startsWith('data-ca-') && !attr.name.startsWith('data-code-anatomy-')) {
              attrs.push(`${attr.name}="${attr.value.replace(/"/g, '&quot;')}"`);
            }
          }
          const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
          const openTag = `<${tag}${attrStr}>`;
          const closeTag = `</${tag}>`;

          // Void HTML elements
          if (['img', 'input', 'br', 'hr', 'meta', 'link'].includes(tag)) {
            return { display: `<${tag}${attrStr} />`, sandbox: `<${tag}${attrStr} />` };
          }

          let displayKids = '';
          let sandboxKids = '';

          // If node has shadowRoot (open)
          if (shadow) {
            // Extract <style> contents from shadow DOM
            const styles = shadow.querySelectorAll('style');
            styles.forEach(s => {
              if (s.textContent && s.textContent.trim()) {
                shadowStyles.push(s.textContent.trim());
              }
            });

            displayKids += `\n  <!-- #shadow-root (open) -->`;
            for (const child of Array.from(shadow.children)) {
              if (child instanceof HTMLElement) {
                if (child.tagName !== 'STYLE') {
                  const res = serializeNode(child);
                  displayKids += '\n  ' + res.display.split('\n').join('\n  ');
                  sandboxKids += '\n  ' + res.sandbox.split('\n').join('\n  ');
                } else {
                  const styleEl = child as HTMLStyleElement;
                  displayKids += `\n  <style>/* ${styleEl.sheet?.cssRules.length || 0} shadow rules */</style>`;
                }
              }
            }
          } else {
            // Normal element: inject ::before marker if active in DOM
            if (hasBefore) {
              displayKids += '\n  ::before';
            }

            for (const child of Array.from(node.childNodes)) {
              if (child.nodeType === Node.ELEMENT_NODE && child instanceof HTMLElement) {
                const res = serializeNode(child);
                displayKids += '\n  ' + res.display.split('\n').join('\n  ');
                sandboxKids += '\n  ' + res.sandbox.split('\n').join('\n  ');
              } else if (child.nodeType === Node.TEXT_NODE) {
                const text = child.textContent?.trim();
                if (text) {
                  displayKids += '\n  ' + text;
                  sandboxKids += '\n  ' + text;
                }
              }
            }

            // Inject ::after marker if active in DOM
            if (hasAfter) {
              displayKids += '\n  ::after';
            }
          }

          if (displayKids) displayKids += '\n';
          if (sandboxKids) sandboxKids += '\n';

          return {
            display: `${openTag}${displayKids}${closeTag}`,
            sandbox: `${openTag}${sandboxKids}${closeTag}`
          };
        };

        const { display, sandbox } = serializeNode(targetEl);
        return { displayHTML: display, sandboxHTML: sandbox, shadowStyles };
      }

      let outerHTML = '';
      let sandboxHTML = '';
      let shadowStyles: string[] = [];

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

      // 5. Authored Rules & Pseudo Elements/Classes Detection
      const matchedRules: { selector: string; cssText: string; media?: string }[] = [];
      const pseudoRules: { selector: string; cssText: string; pseudoClass: string; media?: string; pseudoElement?: string; isMatching?: boolean }[] = [];
      const descendantRules: { selector: string; cssText: string; media?: string }[] = [];

      function extractPseudoElementInfo(targetEl: HTMLElement, pseudoName: string) {
        const rules: { selector: string; cssText: string; media?: string }[] = [];
        try {
          const comp = window.getComputedStyle(targetEl, pseudoName);
          const content = comp.getPropertyValue('content');
          const cleanName = pseudoName.replace(/^:+/, '').toLowerCase();
          const hasContent = Boolean(content && content !== 'none' && content !== 'normal' && content.trim() !== '');
          
          let exists = false;
          if (cleanName === 'before' || cleanName === 'after') {
            exists = hasContent;
          } else if (cleanName === 'marker') {
            const display = window.getComputedStyle(targetEl).display;
            exists = display === 'list-item' || hasContent;
          } else if (cleanName.includes('placeholder')) {
            exists = (targetEl.tagName === 'INPUT' || targetEl.tagName === 'TEXTAREA') && Boolean((targetEl as HTMLInputElement).placeholder);
          } else {
            exists = hasContent;
          }

          const compStyles: Record<string, string> = {};
          const keyProps = [
            'content', 'display', 'position', 'top', 'right', 'bottom', 'left', 'inset', 'z-index',
            'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height', 'box-sizing',
            'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
            'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
            'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
            'color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration',
            'border-top-width', 'border-top-style', 'border-top-color',
            'border-right-width', 'border-right-style', 'border-right-color',
            'border-bottom-width', 'border-bottom-style', 'border-bottom-color',
            'border-left-width', 'border-left-style', 'border-left-color',
            'border-radius', 'outline', 'box-shadow', 'opacity', 'visibility',
            'transform', 'transform-origin', 'transition', 'animation',
            'cursor', 'pointer-events', 'overflow', 'filter', 'backdrop-filter',
            'flex-direction', 'justify-content', 'align-items', 'gap'
          ];
          for (const prop of keyProps) {
            const val = comp.getPropertyValue(prop);
            if (val && val !== 'none' && val !== 'normal' && val !== 'auto' && val !== 'rgba(0, 0, 0, 0)' && val !== '0px' && val !== 'matrix(1, 0, 0, 1, 0, 0)') {
              compStyles[prop] = val;
            }
          }

          return {
            exists,
            content: hasContent ? (content || '""') : 'none',
            computedStyles: compStyles,
            matchedRules: rules
          };
        } catch (e) {
          return {
            exists: false,
            content: 'none',
            computedStyles: {},
            matchedRules: rules
          };
        }
      }

      // Initialize pseudo-elements information
      const pseudoElements: Record<string, ReturnType<typeof extractPseudoElementInfo>> = {
        before: extractPseudoElementInfo(el, '::before'),
        after: extractPseudoElementInfo(el, '::after'),
        marker: extractPseudoElementInfo(el, '::marker'),
        placeholder: extractPseudoElementInfo(el, '::placeholder')
      };

      // Known interaction & state pseudo-classes
      const interactionPseudos = [
        ':hover', ':focus', ':active', ':focus-within', ':focus-visible', ':target',
        ':visited', ':link', ':any-link',
        ':checked', ':disabled', ':enabled', ':read-only', ':read-write',
        ':placeholder-shown', ':default', ':indeterminate', ':required', ':optional',
        ':valid', ':invalid', ':in-range', ':out-of-range', ':autofill', ':-webkit-autofill'
      ];

      // Structural pseudo-classes
      const structuralPseudos = [
        ':first-child', ':last-child', ':only-child',
        ':first-of-type', ':last-of-type', ':only-of-type',
        ':empty', ':root'
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
          let detectedPseudoElement: string | undefined;
          const detectedPseudos: string[] = [];
          let baseSelector = selector;

          // 1. Detect and normalize pseudo-elements (both :: and legacy single-colon :)
          const peMatch = baseSelector.match(/(?:::|:)(before|after|first-letter|first-line|placeholder|marker|selection|backdrop|file-selector-button)\b/i);
          if (peMatch && peMatch[1]) {
            detectedPseudoElement = `::${peMatch[1].toLowerCase()}`;
          } else {
            const vendorPe = baseSelector.match(/(::-webkit-[a-zA-Z0-9_-]+|::-moz-[a-zA-Z0-9_-]+)/i);
            if (vendorPe && vendorPe[1]) {
              detectedPseudoElement = vendorPe[1];
            }
          }

          // 2. Detect interaction/state pseudo-classes
          for (const pseudo of interactionPseudos) {
            if (baseSelector.includes(pseudo)) {
              detectedPseudos.push(pseudo);
              baseSelector = baseSelector.replace(new RegExp(pseudo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
            }
          }

          // 3. Detect structural pseudo-classes
          for (const pseudo of structuralPseudos) {
            if (baseSelector.includes(pseudo)) {
              detectedPseudos.push(pseudo);
              baseSelector = baseSelector.replace(new RegExp(pseudo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
            }
          }

          // 4. Detect functional pseudo-classes like :nth-child(...), :not(...)
          const functionalMatches = baseSelector.match(/:(nth-child|nth-last-child|nth-of-type|nth-last-of-type|not|is|where|has)\([^)]+\)/gi);
          if (functionalMatches) {
            for (const fnPseudo of functionalMatches) {
              detectedPseudos.push(fnPseudo);
              baseSelector = baseSelector.replace(fnPseudo, '');
            }
          }

          // 5. Strip all pseudo-elements to form baseSelector for matches()
          baseSelector = baseSelector
            .replace(/::[a-zA-Z0-9_-]+/g, '')
            .replace(/:(before|after|first-letter|first-line)\b/gi, '')
            .replace(/:-webkit-[a-zA-Z0-9_-]+/g, '')
            .replace(/:-moz-[a-zA-Z0-9_-]+/g, '')
            .replace(/:-ms-[a-zA-Z0-9_-]+/g, '')
            .replace(/:-o-[a-zA-Z0-9_-]+/g, '')
            .trim();

          if (!baseSelector || baseSelector === '*') {
            if (!baseSelector) continue;
          }

          try {
            const matchesSelf = el.matches(baseSelector);
            const matchesDescendant = el.querySelector(baseSelector) !== null;

            if (matchesSelf || matchesDescendant) {
              const cleanCssText = rule.style.cssText;
              if (!cleanCssText) continue;

              if (matchesSelf) {
                // If it targets a pseudo-element
                if (detectedPseudoElement) {
                  const peKey = detectedPseudoElement.replace(/^:+/, '').toLowerCase();
                  if (!pseudoElements[peKey]) {
                    pseudoElements[peKey] = extractPseudoElementInfo(el, detectedPseudoElement);
                  }
                  const pe = pseudoElements[peKey];
                  if (pe) {
                    // Check if authored rule specifies content
                    const contentMatch = cleanCssText.match(/(?:^|;)\s*content\s*:\s*([^;]+)/i);
                    if (contentMatch && contentMatch[1]) {
                      const authoredContent = contentMatch[1].trim();
                      if (authoredContent !== 'none' && authoredContent !== 'normal') {
                        pe.exists = true;
                        if (pe.content === 'none') {
                          pe.content = authoredContent;
                        }
                        pe.computedStyles['content'] = authoredContent;
                      }
                    }

                    // Capture authored declarations into pe.computedStyles if not set
                    cleanCssText.split(';').forEach(decl => {
                      const colonIdx = decl.indexOf(':');
                      if (colonIdx > 0) {
                        const prop = decl.substring(0, colonIdx).trim();
                        const val = decl.substring(colonIdx + 1).trim();
                        if (prop && val && !pe.computedStyles[prop]) {
                          pe.computedStyles[prop] = val;
                        }
                      }
                    });

                    pe.matchedRules.push({
                      selector,
                      cssText: cleanCssText,
                      media: mediaText
                    });
                  }

                  // If it also has interaction/state pseudo-classes (e.g. .btn:hover::before)
                  if (detectedPseudos.length > 0) {
                    for (const pseudo of detectedPseudos) {
                      pseudoRules.push({
                        selector,
                        cssText: cleanCssText,
                        pseudoClass: pseudo,
                        pseudoElement: detectedPseudoElement,
                        media: mediaText
                      });
                    }
                  } else {
                    // Static pseudo-element rule (e.g. .btn::before or .btn:before)
                    pseudoRules.push({
                      selector,
                      cssText: cleanCssText,
                      pseudoClass: detectedPseudoElement,
                      pseudoElement: detectedPseudoElement,
                      media: mediaText,
                      isMatching: true
                    });
                  }
                } else if (detectedPseudos.length > 0) {
                  // Element with pseudo-classes (e.g. :hover, :focus, :first-child)
                  for (const pseudo of detectedPseudos) {
                    let isMatching = false;
                    try {
                      isMatching = el.matches(selector);
                    } catch (e) {}

                    pseudoRules.push({
                      selector,
                      cssText: cleanCssText,
                      pseudoClass: pseudo,
                      media: mediaText,
                      isMatching
                    });
                  }
                } else {
                  // Standard authored matched rule
                  matchedRules.push({
                    selector,
                    cssText: cleanCssText,
                    media: mediaText
                  });
                }
              }

              if (matchesDescendant) {
                descendantRules.push({
                  selector,
                  cssText: cleanCssText,
                  media: mediaText
                });
              }
            }
          } catch (e) {
            // Ignore complex unstripped selectors that fail in matches()
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
      
      // If the element lives inside a shadow root, scan its stylesheets and <style> tags
      const rootNode = el.getRootNode();
      if (rootNode instanceof ShadowRoot) {
        scanStyleSheets(rootNode);
        rootNode.querySelectorAll('style').forEach(st => {
          if (st.sheet) {
            try { walkRules(st.sheet.cssRules); } catch (e) {}
          }
        });
      }

      // If the element itself is a shadow host, scan its shadow stylesheets and <style> tags
      if (el.shadowRoot) {
        scanStyleSheets(el.shadowRoot);
        el.shadowRoot.querySelectorAll('style').forEach(st => {
          if (st.sheet) {
            try { walkRules(st.sheet.cssRules); } catch (e) {}
          }
        });
      }

      // Clean up pseudo-elements: prune empty non-standard ones that have no rules and do not exist
      for (const [k, pe] of Object.entries(pseudoElements)) {
        if (!pe) continue;
        if (k !== 'before' && k !== 'after' && !pe.exists && pe.matchedRules.length === 0) {
          delete pseudoElements[k];
        }
      }

      // Serialize element HTML and Shadow DOM with confirmed pseudo-element states
      const serialized = serializeElementWithPseudosAndShadow(el);
      outerHTML = serialized.displayHTML;
      sandboxHTML = serialized.sandboxHTML;
      shadowStyles = serialized.shadowStyles;
      if (outerHTML.length > 8000) {
        outerHTML = outerHTML.substring(0, 8000) + '\n<!-- HTML truncated due to length -->';
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
        const stateName = rule.pseudoClass.replace(/^:+/, '');
        // Do not inject static pseudo-elements as force states
        if (stateName === 'before' || stateName === 'after' || stateName === 'marker' || stateName === 'placeholder') {
          continue;
        }

        let pseudoElement = rule.pseudoElement || '';
        if (!pseudoElement) {
          const peMatch = rule.selector.match(/(?:::|:)(before|after|first-letter|first-line|placeholder|marker|selection|backdrop)\b/i);
          if (peMatch && peMatch[1]) {
            pseudoElement = `::${peMatch[1].toLowerCase()}`;
          }
        }
        
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

      // 7. A11y Data
      const ariaAttributes: Record<string, string> = {};
      for (const attr of el.attributes) {
        if (attr.name.startsWith('aria-')) {
          ariaAttributes[attr.name] = attr.value;
        }
      }
      
      // Calculate contrast ratio naively
      let contrastRatio: number | null = null;
      try {
        const getLum = (r: number, g: number, b: number) => {
          const a = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          const a0 = a[0] ?? 0;
          const a1 = a[1] ?? 0;
          const a2 = a[2] ?? 0;
          return a0 * 0.2126 + a1 * 0.7152 + a2 * 0.0722;
        };
        
        let bgNode: HTMLElement | null = el;
        let bgRgba = [255, 255, 255, 1]; // default white
        while (bgNode) {
          const bg = window.getComputedStyle(bgNode).backgroundColor;
          const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          if (match && match[1] && match[2] && match[3]) {
            const alpha = match[4] ? parseFloat(match[4]) : 1;
            bgRgba = [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10), alpha];
            if (alpha === 1) break;
          }
          bgNode = bgNode.parentElement;
        }
        
        const fg = computed.color;
        const fgMatch = fg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (fgMatch && fgMatch[1] && fgMatch[2] && fgMatch[3]) {
          const lum1 = getLum(bgRgba[0] ?? 255, bgRgba[1] ?? 255, bgRgba[2] ?? 255);
          const lum2 = getLum(parseInt(fgMatch[1], 10), parseInt(fgMatch[2], 10), parseInt(fgMatch[3], 10));
          const brightest = Math.max(lum1, lum2);
          const darkest = Math.min(lum1, lum2);
          contrastRatio = (brightest + 0.05) / (darkest + 0.05);
        }
      } catch (e) {}

      const warnings: string[] = [];
      if (tagName === 'img' && !el.hasAttribute('alt')) {
        warnings.push("Missing 'alt' attribute on image");
      }
      if (tagName === 'input' && el.getAttribute('type') !== 'hidden') {
        const hasAriaLabel = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
        const hasTitle = el.hasAttribute('title');
        const root = el.getRootNode() as Document | ShadowRoot;
        const hasLabel = el.id && root.querySelector && root.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (!hasAriaLabel && !hasTitle && !hasLabel) {
          warnings.push("Input field is missing an accessible name (label, aria-label, or title)");
        }
      }
      if (tagName === 'a' && !el.textContent?.trim() && !el.hasAttribute('aria-label')) {
         warnings.push("Empty link without an aria-label");
      }
      if (tagName === 'button' && !el.textContent?.trim() && !el.hasAttribute('aria-label')) {
         warnings.push("Empty button without an aria-label");
      }

      const a11yData = {
        role: el.getAttribute('role'),
        ariaAttributes,
        alt: el.getAttribute('alt'),
        tabIndex: el.tabIndex,
        isFocusable: el.tabIndex >= 0,
        contrastRatio,
        warnings
      };

      // 8. Typography Data
      const typographyData = {
        fontFamily: computed.getPropertyValue('font-family'),
        fontSize: computed.getPropertyValue('font-size'),
        fontWeight: computed.getPropertyValue('font-weight'),
        lineHeight: computed.getPropertyValue('line-height'),
        letterSpacing: computed.getPropertyValue('letter-spacing'),
        color: computed.getPropertyValue('color'),
        textAlign: computed.getPropertyValue('text-align'),
        textTransform: computed.getPropertyValue('text-transform'),
        fontVariationSettings: computed.getPropertyValue('font-variation-settings')
      };

      // 9. Animation Data
      let activeAnimations: any[] = [];
      try {
        if (typeof el.getAnimations === 'function') {
          activeAnimations = el.getAnimations().map(anim => {
            let type = 'web-animation';
            if (anim.constructor.name === 'CSSAnimation') type = 'css-animation';
            else if (anim.constructor.name === 'CSSTransition') type = 'css-transition';
            
            const effect = anim.effect;
            const timing = effect ? effect.getTiming() : null;
            
            return {
              name: (anim as any).animationName || (anim as any).transitionProperty || anim.id || 'unnamed',
              duration: typeof timing?.duration === 'number' ? timing.duration : 0,
              delay: typeof timing?.delay === 'number' ? timing.delay : 0,
              playState: anim.playState,
              currentTime: anim.currentTime,
              type
            };
          });
        }
      } catch (e) {}

      const animationData = {
        hasAnimations: activeAnimations.length > 0 || computed.animationName !== 'none' || computed.transitionProperty !== 'all',
        activeAnimations,
        cssProperties: {
          animation: computed.animation,
          transition: computed.transition
        }
      };

      // 10. Comprehensive Color Palette Extraction (with Roles, HEX, and RGB)
      interface ColorAccumulator {
        hex: string;
        rgb: string;
        alpha: number;
        roles: Set<string>;
      }
      const colorMap = new Map<string, ColorAccumulator>();

      function parseColor(rawColor: string): { hex: string; rgb: string; alpha: number } | null {
        if (!rawColor) return null;
        const s = rawColor.trim();
        if (s === 'transparent' || s === 'rgba(0, 0, 0, 0)' || s === 'none') return null;

        // rgb(r, g, b) or rgba(r, g, b, a)
        const rgbMatch = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
        if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
          const r = Math.round(parseFloat(rgbMatch[1]));
          const g = Math.round(parseFloat(rgbMatch[2]));
          const b = Math.round(parseFloat(rgbMatch[3]));
          const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
          if (a <= 0.001) return null;

          const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0').toUpperCase();
          const hex = a >= 0.999 ? `#${toHex(r)}${toHex(g)}${toHex(b)}` : `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(Math.round(a * 255))}`;
          const rgb = a >= 0.999 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${parseFloat(a.toFixed(2))})`;
          return { hex, rgb, alpha: a };
        }

        // #rgb, #rgba, #rrggbb, #rrggbbaa
        const hexMatch = s.match(/^#([0-9a-f]{3,8})$/i);
        if (hexMatch && hexMatch[1]) {
          const h = hexMatch[1];
          let r = 0, g = 0, b = 0, a = 1;
          if (h.length === 3 || h.length === 4) {
            r = parseInt((h[0] || '0') + (h[0] || '0'), 16);
            g = parseInt((h[1] || '0') + (h[1] || '0'), 16);
            b = parseInt((h[2] || '0') + (h[2] || '0'), 16);
            a = h.length === 4 ? parseInt((h[3] || '0') + (h[3] || '0'), 16) / 255 : 1;
          } else if (h.length === 6 || h.length === 8) {
            r = parseInt(h.substring(0, 2), 16);
            g = parseInt(h.substring(2, 4), 16);
            b = parseInt(h.substring(4, 6), 16);
            a = h.length === 8 ? parseInt(h.substring(6, 8), 16) / 255 : 1;
          }
          if (a <= 0.001) return null;
          const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0').toUpperCase();
          const hex = a >= 0.999 ? `#${toHex(r)}${toHex(g)}${toHex(b)}` : `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(Math.round(a * 255))}`;
          const rgb = a >= 0.999 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${parseFloat(a.toFixed(2))})`;
          return { hex, rgb, alpha: a };
        }

        return null;
      }

      function addColor(rawColor: string, role: string) {
        const parsed = parseColor(rawColor);
        if (!parsed) return;
        const key = parsed.hex.toLowerCase();
        if (!colorMap.has(key)) {
          colorMap.set(key, {
            hex: parsed.hex,
            rgb: parsed.rgb,
            alpha: parsed.alpha,
            roles: new Set([role])
          });
        } else {
          colorMap.get(key)!.roles.add(role);
        }
      }

      function extractElementColors(target: HTMLElement | SVGElement, isRoot: boolean) {
        try {
          const style = window.getComputedStyle(target);

          // 1. Text color
          const textColor = style.getPropertyValue('color');
          if (textColor) {
            addColor(textColor, isRoot ? 'Text' : 'Child Text');
          }

          // 2. Background color
          const bgColor = style.getPropertyValue('background-color');
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            addColor(bgColor, isRoot ? 'Background' : 'Child Background');
          }

          // 3. Gradients inside background-image
          const bgImg = style.getPropertyValue('background-image');
          if (bgImg && bgImg !== 'none') {
            const gradientColors = bgImg.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi);
            if (gradientColors) {
              gradientColors.forEach(c => addColor(c, isRoot ? 'Gradient' : 'Child Gradient'));
            }
          }

          // 4. Border colors (only if border has non-zero width and border-style is not none)
          const sides = ['top', 'right', 'bottom', 'left'] as const;
          for (const side of sides) {
            const bWidth = parseFloat(style.getPropertyValue(`border-${side}-width`)) || 0;
            const bStyle = style.getPropertyValue(`border-${side}-style`);
            if (bWidth > 0 && bStyle !== 'none' && bStyle !== 'hidden') {
              const bColor = style.getPropertyValue(`border-${side}-color`);
              if (bColor) {
                addColor(bColor, isRoot ? 'Border' : 'Child Border');
              }
            }
          }

          // 5. Outline
          const outlineWidth = parseFloat(style.getPropertyValue('outline-width')) || 0;
          const outlineStyle = style.getPropertyValue('outline-style');
          if (outlineWidth > 0 && outlineStyle !== 'none' && outlineStyle !== 'hidden') {
            const oColor = style.getPropertyValue('outline-color');
            if (oColor) addColor(oColor, 'Outline');
          }

          // 6. Box shadow
          const shadow = style.getPropertyValue('box-shadow');
          if (shadow && shadow !== 'none') {
            const shadowColors = shadow.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi);
            if (shadowColors) {
              shadowColors.forEach(c => addColor(c, isRoot ? 'Shadow' : 'Child Shadow'));
            }
          }

          // 7. SVG Fill & Stroke
          if (target instanceof SVGElement || target.tagName.toLowerCase() === 'svg') {
            const fill = style.getPropertyValue('fill');
            if (fill && fill !== 'none' && fill !== 'transparent') {
              addColor(fill, 'SVG Fill');
            }
            const stroke = style.getPropertyValue('stroke');
            if (stroke && stroke !== 'none' && stroke !== 'transparent') {
              addColor(stroke, 'SVG Stroke');
            }
          }
        } catch (e) {}
      }

      function extractPseudoColors(target: HTMLElement, pseudo: string, roleBadge: string) {
        try {
          const comp = window.getComputedStyle(target, pseudo);
          const content = comp.getPropertyValue('content');
          if (!content || content === 'none' || content === 'normal') {
            return;
          }

          const color = comp.getPropertyValue('color');
          if (color) addColor(color, `${roleBadge}`);

          const bg = comp.getPropertyValue('background-color');
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            addColor(bg, `${roleBadge} (Bg)`);
          }

          const bgImg = comp.getPropertyValue('background-image');
          if (bgImg && bgImg !== 'none') {
            const gradientColors = bgImg.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi);
            if (gradientColors) {
              gradientColors.forEach(c => addColor(c, `${roleBadge} (Gradient)`));
            }
          }

          const bWidth = parseFloat(comp.getPropertyValue('border-top-width')) || 0;
          const bStyle = comp.getPropertyValue('border-top-style');
          if (bWidth > 0 && bStyle !== 'none' && bStyle !== 'hidden') {
            const bColor = comp.getPropertyValue('border-top-color');
            if (bColor) addColor(bColor, `${roleBadge} (Border)`);
          }

          const shadow = comp.getPropertyValue('box-shadow');
          if (shadow && shadow !== 'none') {
            const shadowColors = shadow.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi);
            if (shadowColors) {
              shadowColors.forEach(c => addColor(c, `${roleBadge} (Shadow)`));
            }
          }
        } catch (e) {}
      }

      // Extract from root element
      extractElementColors(el, true);

      // Extract from all detected pseudo-elements on the element
      for (const [key, pe] of Object.entries(pseudoElements)) {
        if (pe && (pe.exists || pe.matchedRules.length > 0)) {
          const pseudoName = key.startsWith(':') ? key : `::${key}`;
          extractPseudoColors(el, pseudoName, pseudoName);
        }
      }

      // Extract from child elements (limiting to first 50 to maintain high performance)
      try {
        const children = Array.from(el.querySelectorAll('*')).slice(0, 50);
        for (const child of children) {
          if (child instanceof HTMLElement || child instanceof SVGElement) {
            extractElementColors(child, false);
            // Also check ::before / ::after on children if relevant
            if (child instanceof HTMLElement) {
              extractPseudoColors(child, '::before', 'Child ::before');
              extractPseudoColors(child, '::after', 'Child ::after');
            }
          }
        }
      } catch (e) {}

      const colors = Array.from(colorMap.values()).map(item => ({
        hex: item.hex,
        rgb: item.rgb,
        alpha: item.alpha,
        roles: Array.from(item.roles)
      }));

      const colorPalette = colors.map(c => c.hex);

      return {
        tagName,
        id,
        classes,
        attributes,
        outerHTML,
        sandboxHTML,
        shadowStyles,
        inlineStyles: el.style.cssText,
        computedStyles,
        matchedRules,
        pseudoRules,
        descendantRules,
        pseudoElements,
        frameworkEvents,
        a11yData,
        typographyData,
        animationData,
        colors,
        colorPalette
      };
    }
  },
});
