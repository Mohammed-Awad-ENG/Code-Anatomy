import type { ElementData } from '../../../lib/messaging';

export function renderTypographyPanel(data: ElementData) {
  const container = document.getElementById('typography-panel')?.querySelector('.panel-body');
  if (!container) return;

  if (!data.typographyData) {
    container.innerHTML = `<p class="empty-state">Typography data not available.</p>`;
    return;
  }

  const t = data.typographyData;
  
  let html = `<div style="display: flex; flex-direction: column; gap: 12px;">`;

  // Fallback for transparent text (e.g. gradient text setups)
  const isTransparent = t.color === 'rgba(0, 0, 0, 0)' || t.color === 'transparent';
  const previewColor = isTransparent ? 'var(--text-primary)' : t.color;

  // Preview Box
  html += `
    <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 6px; border: 1px solid var(--border); overflow-x: auto; white-space: nowrap;">
      <div style="
        font-family: ${t.fontFamily.replace(/"/g, '&quot;')};
        font-size: ${t.fontSize};
        font-weight: ${t.fontWeight};
        line-height: ${t.lineHeight};
        letter-spacing: ${t.letterSpacing};
        color: ${previewColor};
        -webkit-text-fill-color: ${previewColor};
        text-transform: ${t.textTransform};
        text-align: left;
        font-variation-settings: ${t.fontVariationSettings};
      ">
        Code Anatomy
      </div>
    </div>
  `;

  // Details Grid
  html += `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
  `;

  const rows = [
    { label: 'Font Family', value: t.fontFamily, colSpan: 2 },
    { label: 'Font Size', value: t.fontSize },
    { label: 'Font Weight', value: t.fontWeight },
    { label: 'Line Height', value: t.lineHeight },
    { label: 'Letter Spacing', value: t.letterSpacing },
    { label: 'Color', value: `<div style="display: flex; align-items: center; gap: 6px;"><span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${t.color}; border: 1px solid rgba(255,255,255,0.2);"></span> ${t.color}</div>`, isHtml: true },
    { label: 'Text Align', value: t.textAlign },
    { label: 'Text Transform', value: t.textTransform },
  ];

  for (const row of rows) {
    html += `
      <div style="background: var(--bg-tertiary); padding: 10px; border-radius: 6px; border: 1px solid var(--border); grid-column: span ${row.colSpan || 1};">
        <div style="color: var(--text-secondary); font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">${row.label}</div>
        <div style="font-family: var(--font-mono); font-size: 12px; color: var(--syntax-value); word-break: break-word;">
          ${row.isHtml ? row.value : `"${row.value}"`}
        </div>
      </div>
    `;
  }
  
  html += `</div>`;

  // Variable Fonts
  if (t.fontVariationSettings && t.fontVariationSettings !== 'normal') {
    html += `
      <div style="background: rgba(167, 139, 250, 0.1); padding: 10px; border-radius: 6px; border: 1px solid rgba(167, 139, 250, 0.3); margin-top: 4px;">
        <div style="color: #A78BFA; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Variable Font Axes</div>
        <div style="font-family: var(--font-mono); font-size: 12px; color: var(--text-primary);">
          ${t.fontVariationSettings}
        </div>
      </div>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;
}
