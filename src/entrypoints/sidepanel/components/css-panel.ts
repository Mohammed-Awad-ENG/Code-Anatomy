import type { ElementData } from '../../../lib/messaging';
import { detectFrameworkClasses } from '../utils/framework-detector';
import { highlightCSS } from '../utils/syntax-highlight';
import { browser } from 'wxt/browser';

export function renderCssPanel(data: ElementData) {
  const container = document.getElementById('css-panel')?.querySelector('.panel-body');
  if (!container) return;

  let html = '';

  // 0. Pseudo-Elements (::before, ::after, ::marker, ::placeholder, etc.)
  const pseudoColorMap: Record<string, string> = {
    before: '#F9A8D4',
    after: '#7DD3FC',
    marker: '#A78BFA',
    placeholder: '#FCD34D',
    selection: '#34D399',
    'first-letter': '#FB7185',
    'first-line': '#38BDF8',
    backdrop: '#C084FC'
  };

  const detectedPseudos = Object.entries(data.pseudoElements || {}).filter(([_, info]) => {
    if (!info) return false;
    return info.exists || info.matchedRules.length > 0 || Object.keys(info.computedStyles).length > 0;
  });

  if (detectedPseudos.length > 0) {
    html += `
      <h3 style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #F9A8D4; display: inline-block;"></span>
          Pseudo-Elements
        </span>
        <span style="font-size: 10px; color: var(--text-tertiary); font-weight: normal; background: var(--bg-tertiary); padding: 2px 8px; border-radius: 12px;">${detectedPseudos.length} detected</span>
      </h3>
    `;

    for (const [key, info] of detectedPseudos) {
      if (!info) continue;
      const pseudoName = key.startsWith(':') ? key : `::${key}`;
      const color = pseudoColorMap[key] || '#C084FC';

      html += `
        <div style="margin-bottom: 16px; background: var(--bg-secondary); border-radius: 6px; padding: 12px; border: 1px solid var(--border);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: ${color}; font-family: var(--font-mono); font-size: 13px; font-weight: bold; background: ${color}15; border: 1px solid ${color}40; padding: 2px 6px; border-radius: 4px;">${pseudoName}</span>
              ${info.content && info.content !== 'none' ? `<span style="font-family: var(--font-mono); font-size: 11px; color: var(--syntax-value); word-break: break-all;">content: ${info.content}</span>` : ''}
            </div>
            ${info.exists ? `<span style="font-size: 10px; color: #6EE7B7; background: rgba(110, 231, 183, 0.1); border: 1px solid rgba(110, 231, 183, 0.3); padding: 1px 6px; border-radius: 10px;">Active in DOM</span>` : `<span style="font-size: 10px; color: var(--text-tertiary); background: var(--bg-tertiary); border: 1px solid var(--border); padding: 1px 6px; border-radius: 10px;">Authored Rule</span>`}
          </div>
      `;

      // Full Computed Styles list
      const computedProps = Object.entries(info.computedStyles);
      if (computedProps.length > 0) {
        html += `
          <div style="font-size: 10px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 6px; font-weight: 600;">Computed Styles (${computedProps.length})</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 6px; margin-bottom: 12px; background: var(--bg-tertiary); padding: 8px 10px; border-radius: 4px; font-size: 11px; font-family: var(--font-mono); max-height: 180px; overflow-y: auto;">
            ${computedProps.map(([prop, val]) => `
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${prop}: ${val}">
                <span style="color: var(--text-secondary);">${prop}:</span> 
                <span style="color: var(--syntax-value); font-weight: 500;">${val}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      // Matched Rules targeting this pseudo-element
      if (info.matchedRules && info.matchedRules.length > 0) {
        html += `<div style="font-size: 10px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 6px; font-weight: 600;">Authored Rules</div>`;
        info.matchedRules.forEach(rule => {
          const mediaText = rule.media ? `<div style="font-size: 11px; color: var(--syntax-tag); margin-bottom: 4px;">@media ${rule.media}</div>` : '';
          const formattedCss = formatCssBlock(rule.cssText);
          if (formattedCss.length > 0) {
            html += `
              ${mediaText}
              <div style="color: var(--syntax-selector); font-family: var(--font-mono); font-size: 11px; margin-bottom: 4px; margin-top: 6px;">${rule.selector}</div>
              <div class="code-block" style="margin-bottom: 8px;">
                <pre style="margin: 0; padding: 8px; font-size: 11px; background: var(--bg-tertiary); border-radius: 4px; color: var(--text-primary); white-space: pre-wrap;"><code>${highlightCSS('  ' + formattedCss)}</code></pre>
              </div>
            `;
          }
        });
      }

      html += `</div>`;
    }

    html += `<hr style="border: 0; border-top: 1px solid var(--border); margin: 24px 0;" />`;
  }

  // 1. Pseudo-Classes
  if (data.pseudoRules && data.pseudoRules.length > 0) {
    const rulesByState: Record<string, typeof data.pseudoRules> = {};
    for (const r of data.pseudoRules) {
      // Don't duplicate static pseudo-elements already shown in the Pseudo-Elements section
      if (r.pseudoClass === '::before' || r.pseudoClass === '::after') continue;

      if (!rulesByState[r.pseudoClass]) {
        rulesByState[r.pseudoClass] = [];
      }
      rulesByState[r.pseudoClass]!.push(r);
    }

    const stateKeys = Object.keys(rulesByState);
    if (stateKeys.length > 0) {
      html += `
        <h3 style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
          <span style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #A78BFA; display: inline-block;"></span>
            Pseudo-Classes
          </span>
          <span style="font-size: 10px; color: var(--text-tertiary); font-weight: normal; background: var(--bg-tertiary); padding: 2px 8px; border-radius: 12px;">${stateKeys.length} state${stateKeys.length === 1 ? '' : 's'}</span>
        </h3>
      `;

      for (const [state, rules] of Object.entries(rulesByState)) {
        const isInteractiveState = [
          ':hover', ':focus', ':active', ':focus-within', ':focus-visible', ':target',
          ':visited', ':checked', ':disabled', ':read-only', ':read-write'
        ].includes(state);

        const isCurrentlyActive = rules.some(r => r.isMatching);

        html += `
          <div style="margin-bottom: 16px; background: var(--bg-secondary); border-radius: 6px; padding: 12px; border: 1px solid var(--border);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="color: var(--syntax-selector); font-family: var(--font-mono); font-size: 13px; font-weight: bold;">${state}</div>
                ${isCurrentlyActive ? `<span style="font-size: 10px; color: #6EE7B7; background: rgba(110, 231, 183, 0.1); border: 1px solid rgba(110, 231, 183, 0.3); padding: 1px 6px; border-radius: 10px;">matching</span>` : ''}
              </div>
              ${isInteractiveState ? `
                <div style="display: flex; gap: 6px;">
                  <button class="ca-trigger-pseudo" data-state="${state}" data-mode="once" style="background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer; transition: all 0.2s;">Trigger (1s)</button>
                  <button class="ca-trigger-pseudo" data-state="${state}" data-mode="toggle" style="background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer; transition: all 0.2s;">Force Toggle</button>
                </div>
              ` : ''}
            </div>
        `;

        rules.forEach(rule => {
          const mediaText = rule.media ? `<div style="font-size: 11px; color: var(--syntax-tag); margin-bottom: 4px;">@media ${rule.media}</div>` : '';
          const formattedCss = formatCssBlock(rule.cssText);

          if (formattedCss.length > 0) {
            html += `
              ${mediaText}
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; margin-top: 8px;">
                <span style="color: var(--syntax-selector); font-family: var(--font-mono); font-size: 11px;">${rule.selector}</span>
                ${rule.pseudoElement ? `<span style="font-size: 9px; color: #F9A8D4; background: rgba(249, 168, 212, 0.1); border: 1px solid rgba(249, 168, 212, 0.3); padding: 1px 4px; border-radius: 3px; font-family: var(--font-mono);">${rule.pseudoElement}</span>` : ''}
              </div>
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
  }

  // 2. Applied Styles (Matched Rules)
  if (data.matchedRules && data.matchedRules.length > 0) {
    html += `
      <h3 style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: #7DD3FC; display: inline-block;"></span>
        Applied Styles
      </h3>
    `;

    data.matchedRules.forEach(rule => {
      let mediaText = '';
      if (rule.media) {
        mediaText = `<div style="font-size: 11px; color: var(--syntax-tag); margin-bottom: 4px;">@media ${rule.media}</div>`;
      }

      const formattedCss = formatCssBlock(rule.cssText);
      if (formattedCss.length === 0) return;

      // Check if selector contains framework classes to inject comment
      const classNames = (rule.selector.match(/\.([a-zA-Z0-9_\\\-]+)/g) || [])
        .map(c => c.substring(1).replace(/\\/g, ''));
      
      let comment = '';
      for (const cls of classNames) {
        const fwMatches = detectFrameworkClasses([cls]);
        if (fwMatches.length > 0 && fwMatches[0]) {
          comment = `/* ${fwMatches[0].description} (${fwMatches[0].framework}) */\n  `;
          break;
        }
      }

      const finalCssCode = highlightCSS('  ' + comment + formattedCss);

      html += `
        <div style="margin-bottom: 16px; background: var(--bg-secondary); border-radius: 6px; padding: 12px; border: 1px solid var(--border);">
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

  // 3. Inline Styles
  if (data.inlineStyles) {
    const formattedInline = data.inlineStyles
      .split(';')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join(';\n  ') + ';';
      
    html += `
      <h3 style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: #FBBF24; display: inline-block;"></span>
        Inline Styles
      </h3>
      <div style="margin-bottom: 16px; background: var(--bg-secondary); border-radius: 6px; padding: 12px; border: 1px solid var(--border);">
        <div class="code-block">
          <pre style="margin: 0; padding: 8px; font-size: 11px; background: var(--bg-tertiary); border-radius: 4px; color: var(--text-primary);"><code>${highlightCSS('  ' + formattedInline)}</code></pre>
        </div>
      </div>
      <hr style="border: 0; border-top: 1px solid var(--border); margin: 24px 0;" />
    `;
  }

  // 4. Computed Styles
  html += `
    <h3 style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
      <span style="width: 8px; height: 8px; border-radius: 50%; background: #6EE7B7; display: inline-block;"></span>
      Computed Styles
    </h3>
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px; font-family: var(--font-mono); font-size: 12px; padding: 12px; background: var(--bg-secondary); border-radius: 6px; border: 1px solid var(--border);">
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
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        browser.tabs.sendMessage(activeTab.id, {
          type: 'FORCE_STATE',
          payload: { state, mode }
        }).catch(() => {});
      }
    });
  });
}

function formatCssBlock(cssText: string): string {
  const innerCss = cssText.trim();
  const formatted = innerCss
    .split(';')
    .map(line => line.trim())
    .filter(line => {
      if (line.length === 0) return false;
      const parts = line.split(':');
      if (parts.length >= 2) {
        const val = parts.slice(1).join(':').trim();
        return val.length > 0;
      }
      return true;
    })
    .join(';\n  ');

  return formatted.length > 0 ? formatted + ';' : '';
}
