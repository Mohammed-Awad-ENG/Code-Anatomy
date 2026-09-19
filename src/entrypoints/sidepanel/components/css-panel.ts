import type { ElementData } from '../../../lib/messaging';
import { detectFrameworkClasses } from '../utils/framework-detector';
import { highlightCSS } from '../utils/syntax-highlight';

export function renderCssPanel(data: ElementData) {
  const container = document.getElementById('css-panel')?.querySelector('.panel-body');
  if (!container) return;

  let html = '';

  // 1. Framework Detected
  if (data.classes.length > 0) {
    html += `
      <h3 style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px;">Detected Classes</h3>
      <div id="framework-classes-list"></div>
      <hr style="border: 0; border-top: 1px solid var(--border); margin: 24px 0;" />
    `;
  }

  // 2. Computed Styles
  html += `
    <h3 style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px;">Computed Styles</h3>
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px; font-family: var(--font-mono); font-size: 12px;">
  `;

  for (const [prop, val] of Object.entries(data.computedStyles)) {
    html += `
      <div style="color: var(--syntax-prop); overflow: hidden; text-overflow: ellipsis;">${prop}</div>
      <div style="color: var(--syntax-value); overflow-wrap: break-word; word-break: break-all;">${val}</div>
    `;
  }
  html += `</div>`;

  // 3. Matched Rules
  if (data.matchedRules.length > 0) {
    html += `
      <hr style="border: 0; border-top: 1px solid var(--border); margin: 24px 0;" />
      <h3 style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px;">Matched CSS Rules</h3>
    `;
    data.matchedRules.forEach(rule => {
      const media = rule.media ? `<div style="font-size: 11px; color: var(--syntax-tag); margin-bottom: 4px;">@media ${rule.media}</div>` : '';
      html += `
        <div style="margin-bottom: 16px; background: var(--bg-secondary); border-radius: 4px; padding: 12px; border: 1px solid var(--border);">
          ${media}
          <div style="color: var(--syntax-attr); font-family: var(--font-mono); font-size: 12px; margin-bottom: 8px;">${rule.selector}</div>
          <div class="code-block">
            <pre style="margin: 0; padding: 8px; font-size: 11px; background: var(--bg-tertiary); border-radius: 4px; color: var(--text-primary);"><code>${highlightCSS(rule.cssText)}</code></pre>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = html;

  // Enhance framework classes list
  if (data.classes.length > 0) {
    const frameworkList = document.getElementById('framework-classes-list');
    if (frameworkList) {
      data.classes.forEach(cls => {
        const type = detectFrameworkClasses([cls]);
        if (type) {
          const escapedCls = cls.replace(/:/g, '\\\\:').replace(/\\[/g, '\\\\[').replace(/\\]/g, '\\\\]');
          const matchedRule = data.matchedRules.find(r => r.selector.includes(`.${escapedCls}`) || r.selector.includes(`.${cls}`));
          
          let styleDetails = type;
          let mediaText = '';
          
          if (matchedRule) {
             const match = matchedRule.cssText.match(/\\{([^}]+)\\}/);
             if (match) {
                const formattedCss = match[1]
                  .split(';')
                  .map(line => line.trim())
                  .filter(line => line.length > 0)
                  .join(';\\n  ') + ';';
                styleDetails = highlightCSS('  ' + formattedCss);
             }
             if (matchedRule.media) {
                mediaText = `<div style="font-size: 11px; color: var(--syntax-tag); margin-top: 4px;">@media ${matchedRule.media}</div>`;
             }
          } else {
             styleDetails = `<span style="color: var(--text-secondary)">${type}</span>`;
          }

          const clsDiv = document.createElement('div');
          clsDiv.style.marginBottom = '12px';
          clsDiv.style.paddingBottom = '12px';
          clsDiv.style.borderBottom = '1px solid var(--border)';
          clsDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="color: var(--syntax-attr); font-family: var(--font-mono); font-size: 13px;">.${cls}</span>
            </div>
            ${mediaText}
            <div class="code-block" style="margin-top: 8px;">
              <pre style="padding: 12px; background: var(--bg-secondary); border-radius: 4px; font-size: 12px; border: 1px solid var(--border);"><code>${styleDetails}</code></pre>
            </div>
          `;
          frameworkList.appendChild(clsDiv);
        }
      });
    }
  }
}
