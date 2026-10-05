import type { ElementData } from '../../../lib/messaging';

export function renderA11yPanel(data: ElementData) {
  const container = document.getElementById('a11y-panel')?.querySelector('.panel-body');
  if (!container) return;

  if (!data.a11yData) {
    container.innerHTML = `<p class="empty-state">Accessibility data not available.</p>`;
    return;
  }

  const { role, ariaAttributes, alt, tabIndex, isFocusable, contrastRatio } = data.a11yData;
  let html = `<div style="display: flex; flex-direction: column; gap: 16px;">`;

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
