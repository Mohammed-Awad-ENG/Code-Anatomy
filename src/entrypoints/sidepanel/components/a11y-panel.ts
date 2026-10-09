import type { ElementData } from '../../../lib/messaging';

export function renderA11yPanel(data: ElementData) {
  const container = document.getElementById('a11y-panel')?.querySelector('.panel-body');
  if (!container) return;

  if (!data.a11yData) {
    container.innerHTML = `<p class="empty-state">Accessibility data not available.</p>`;
    return;
  }

  const { role, ariaAttributes, alt, tabIndex, isFocusable, contrastRatio, warnings } = data.a11yData;
  let html = `<div style="display: flex; flex-direction: column; gap: 16px;">`;

  // Warnings
  if (warnings && warnings.length > 0) {
    html += `
      <div style="background: rgba(224, 108, 117, 0.1); padding: 12px; border-radius: 6px; border: 1px solid #E06C75; border-left: 4px solid #E06C75;">
        <span style="color: #E06C75; font-size: 12px; font-weight: bold; text-transform: uppercase; display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          Accessibility Warnings
        </span>
        <ul style="margin: 0; padding-left: 20px; color: var(--text-primary); font-size: 13px; display: flex; flex-direction: column; gap: 4px;">
          ${warnings.map(w => `<li>${w}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Role & Focus
  html += `
    <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 6px; border: 1px solid var(--border);">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div>
          <span style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase;">Role</span>
          <div style="font-family: var(--font-mono); color: var(--syntax-attr); margin-top: 4px;">
            ${role ? `"${role}"` : '<span style="color: var(--text-secondary); font-style: italic;">implicit</span>'}
          </div>
        </div>
        <div>
          <span style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase;">Focusable</span>
          <div style="font-family: var(--font-mono); color: ${isFocusable ? '#6EE7B7' : 'var(--text-secondary)'}; margin-top: 4px;">
            ${isFocusable ? `Yes (tabIndex: ${tabIndex})` : 'No'}
          </div>
        </div>
      </div>
    </div>
  `;

  // Contrast Ratio
  if (contrastRatio !== null) {
    let contrastColor = '#E06C75'; // fail
    let contrastText = 'Fails WCAG AA (Target: 4.5:1)';
    if (contrastRatio >= 7) {
      contrastColor = '#6EE7B7'; // pass AAA
      contrastText = 'Passes WCAG AAA';
    } else if (contrastRatio >= 4.5) {
      contrastColor = '#E5C07B'; // pass AA
      contrastText = 'Passes WCAG AA';
    }
    
    html += `
      <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 6px; border: 1px solid var(--border);">
        <span style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase;">Contrast Ratio</span>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
          <div style="font-family: var(--font-mono); font-size: 16px; font-weight: bold; color: ${contrastColor};">
            ${contrastRatio.toFixed(2)}:1
          </div>
          <div style="font-size: 11px; color: var(--text-secondary); border: 1px solid var(--border); padding: 2px 6px; border-radius: 10px;">
            ${contrastText}
          </div>
        </div>
      </div>
    `;
  }

  // Alt Text (if applicable)
  if (data.tagName === 'img' || data.tagName === 'area') {
    html += `
      <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 6px; border: 1px solid var(--border);">
        <span style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase;">Alt Text</span>
        <div style="font-family: var(--font-mono); color: var(--syntax-value); margin-top: 4px; word-break: break-word;">
          ${alt !== null ? `"${alt}"` : '<span style="color: #E06C75;">Missing (Violation)</span>'}
        </div>
      </div>
    `;
  }

  // ARIA Attributes
  const ariaKeys = Object.keys(ariaAttributes);
  if (ariaKeys.length > 0) {
    html += `
      <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 6px; border: 1px solid var(--border);">
        <span style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; margin-bottom: 8px; display: block;">ARIA Attributes</span>
        <div style="display: flex; flex-direction: column; gap: 6px;">
    `;
    
    for (const key of ariaKeys) {
      html += `
        <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 12px;">
          <span style="color: var(--syntax-attr);">${key}</span>
          <span style="color: var(--syntax-value);">"${ariaAttributes[key]}"</span>
        </div>
      `;
    }
    
    html += `</div></div>`;
  } else {
     html += `
      <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 6px; border: 1px solid var(--border); text-align: center; color: var(--text-secondary); font-size: 12px; font-style: italic;">
        No ARIA attributes found.
      </div>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;
}
