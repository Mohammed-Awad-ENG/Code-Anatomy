import type { ElementData } from '../../../lib/messaging';
import { detectFrameworkClasses } from '../utils/framework-detector';
import { highlightCSS } from '../utils/syntax-highlight';

export function renderCssPanel(data: ElementData) {
  const container = document.getElementById('css-panel')?.querySelector('.panel-body');
  if (!container) return;

  let html = '';

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
        .filter(line => line.length > 0)
        .join(';\n  ');
      
      if (formattedCss.length > 0) {
        formattedCss += ';';
      }

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
          <div style="color: var(--syntax-attr); font-family: var(--font-mono); font-size: 12px; margin-bottom: 8px;">${rule.selector}</div>
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
}
