import type { ElementData } from '../../../lib/messaging';
import { detectFrameworkClasses } from '../utils/framework-detector';
import { highlightCSS } from '../utils/syntax-highlight';
import { browser } from 'wxt/browser';

export function renderCssPanel(data: ElementData) {
  const container = document.getElementById('css-panel')?.querySelector('.panel-body');
  if (!container) return;

  let html = '';

  // 0. Pseudo-Classes (Interactive)
  if (data.pseudoRules && data.pseudoRules.length > 0) {
    const rulesByState: Record<string, typeof data.pseudoRules> = {};
    for (const r of data.pseudoRules) {
      if (!rulesByState[r.pseudoClass]) rulesByState[r.pseudoClass] = [];
      rulesByState[r.pseudoClass].push(r);
    }
    
    html += `
      <h3 style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <span>Pseudo-Classes</span>
        <span style="font-size: 10px; color: var(--text-tertiary); font-weight: normal; background: var(--bg-tertiary); padding: 2px 6px; border-radius: 12px;">Interactive</span>
      </h3>
    `;
    
    for (const [state, rules] of Object.entries(rulesByState)) {
      html += `
        <div style="margin-bottom: 16px; background: var(--bg-secondary); border-radius: 4px; padding: 12px; border: 1px solid var(--border);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="color: var(--syntax-selector); font-family: var(--font-mono); font-size: 13px; font-weight: bold;">${state}</div>
            <div style="display: flex; gap: 8px;">
              <button class="ca-trigger-pseudo" data-state="${state}" data-mode="once" style="background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; transition: all 0.2s;">Trigger (1s)</button>
              <button class="ca-trigger-pseudo" data-state="${state}" data-mode="toggle" style="background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; transition: all 0.2s;">Force Toggle</button>
            </div>
          </div>
      `;
      
      rules.forEach(rule => {
        let mediaText = rule.media ? `<div style="font-size: 11px; color: var(--syntax-tag); margin-bottom: 4px;">@media ${rule.media}</div>` : '';
        
        let innerCss = rule.cssText.trim();
        let formattedCss = innerCss.split(';').map(line => line.trim()).filter(line => {
          if (line.length === 0) return false;
          const parts = line.split(':');
          return parts.length >= 2 && parts.slice(1).join(':').trim().length > 0;
        }).join(';\\n  ');
        
        if (formattedCss.length > 0) {
          formattedCss += ';';
          html += `
            ${mediaText}
            <div style="color: var(--syntax-selector); font-family: var(--font-mono); font-size: 11px; margin-bottom: 4px; margin-top: 8px;">${rule.selector}</div>
            <div class="code-block" style="margin-bottom: 8px;">
              <pre style="margin: 0; padding: 8px; font-size: 11px; background: var(--bg-tertiary); border-radius: 4px; color: var(--text-primary);"><code>${highlightCSS('  ' + formattedCss)}</code></pre>
            </div>
          `;
        }
      });
      html += `</div>`;
    }
    html += `<hr style="border: 0; border-top: 1px solid var(--border); margin: 24px 0;" />`;
  }

  // 1. Applied Styles (Matched Rules)
  if (data.matchedRules && data.matchedRules.length > 0) {
    html += `
      <h3 style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px;">Applied Styles</h3>
    `;
    
    data.matchedRules.forEach(rule => {
      let mediaText = '';
      if (rule.media) {
        mediaText = `<div style="font-size: 11px; color: var(--syntax-tag); margin-bottom: 4px;">@media ${rule.media}</div>`;
      }

      // Extract the inner CSS properties (it's already the inner style text)
      let innerCss = rule.cssText.trim();

      // Format properties cleanly
      let formattedCss = innerCss
        .split(';')
        .map(line => line.trim())
        .filter(line => {
          if (line.length === 0) return false;
          // Filter out properties with empty values (e.g. "--tw-pan-x:")
          const parts = line.split(':');
          if (parts.length >= 2) {
             const value = parts.slice(1).join(':').trim();
             return value.length > 0;
          }
          return true;
        })
        .join(';\n  ');
      
      if (formattedCss.length === 0) {
        return; // Skip this rule entirely if it has no meaningful properties
      }
      formattedCss += ';';

      // Check if selector contains framework classes to inject comment
      // Extract class names from selector e.g. ".gap-2:hover" -> ["gap-2", "hover"]
      const classNames = (rule.selector.match(/\.([a-zA-Z0-9_\\\-]+)/g) || [])
        .map(c => c.substring(1).replace(/\\/g, '')); // remove dot and escaping backslashes
      
      let comment = '';
      for (const cls of classNames) {
         const fwMatches = detectFrameworkClasses([cls]);
         if (fwMatches.length > 0) {
             comment = `/* ${fwMatches[0].description} (${fwMatches[0].framework}) */\n  `;
             break; // just use the first match
         }
      }

      const finalCssCode = highlightCSS('  ' + comment + formattedCss);

      html += `
        <div style="margin-bottom: 16px; background: var(--bg-secondary); border-radius: 4px; padding: 12px; border: 1px solid var(--border);">
          ${mediaText}
          <div style="color: var(--syntax-selector); font-family: var(--font-mono); font-size: 12px; margin-bottom: 8px;">${rule.selector}</div>
          <div class="code-block">
            <pre style="margin: 0; padding: 8px; font-size: 11px; background: var(--bg-tertiary); border-radius: 4px; color: var(--text-primary);"><code>${finalCssCode}</code></pre>
          </div>
        </div>
      `;
    });
    
    html += `<hr style="border: 0; border-top: 1px solid var(--border); margin: 24px 0;" />`;
  }

  // 2. Inline Styles
  if (data.inlineStyles) {
    const formattedInline = data.inlineStyles
      .split(';')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join(';\n  ') + ';';
      
    html += `
      <h3 style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px;">Inline Styles</h3>
      <div style="margin-bottom: 16px; background: var(--bg-secondary); border-radius: 4px; padding: 12px; border: 1px solid var(--border);">
        <div class="code-block">
          <pre style="margin: 0; padding: 8px; font-size: 11px; background: var(--bg-tertiary); border-radius: 4px; color: var(--text-primary);"><code>${highlightCSS('  ' + formattedInline)}</code></pre>
        </div>
      </div>
      <hr style="border: 0; border-top: 1px solid var(--border); margin: 24px 0;" />
    `;
  }

  // 3. Computed Styles
  html += `
    <h3 style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px;">Computed Styles</h3>
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px; font-family: var(--font-mono); font-size: 12px; padding: 12px; background: var(--bg-secondary); border-radius: 4px; border: 1px solid var(--border);">
  `;

  for (const [prop, val] of Object.entries(data.computedStyles)) {
    html += `
      <div style="color: var(--syntax-prop); overflow: hidden; text-overflow: ellipsis;">${prop}</div>
      <div style="color: var(--syntax-value); overflow-wrap: break-word; word-break: break-all;">${val}</div>
    `;
  }
  html += `</div>`;

  container.innerHTML = html;

  // Attach event listeners for pseudo-class triggers
  container.querySelectorAll('.ca-trigger-pseudo').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const state = target.dataset.state;
      const mode = target.dataset.mode;
      if (!state || !mode) return;

      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0 && tabs[0].id) {
        browser.tabs.sendMessage(tabs[0].id, {
          type: 'FORCE_STATE',
          payload: { state, mode }
        }).catch(() => {});
      }
    });
  });
}
