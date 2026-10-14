import type { ElementData, ColorInfo } from '../../../lib/messaging';

export function renderColorPanel(data: ElementData) {
  const container = document.getElementById('color-panel')?.querySelector('.panel-body');
  if (!container) return;

  // Use rich colors if available, or fall back to colorPalette
  let colors: ColorInfo[] = [];
  if (data.colors && data.colors.length > 0) {
    colors = data.colors;
  } else if (data.colorPalette && data.colorPalette.length > 0) {
    colors = data.colorPalette.map(hex => ({
      hex,
      rgb: hex,
      alpha: 1,
      roles: ['Color']
    }));
  }

  if (colors.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary); font-size: 13px; padding: 24px 0; font-style: italic;">
        No colors detected on this element.
      </div>
    `;
    return;
  }

  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
      <span style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Extracted Palette</span>
      <span style="font-size: 11px; color: var(--text-tertiary); background: var(--bg-tertiary); border: 1px solid var(--border); padding: 2px 8px; border-radius: 12px; font-family: var(--font-mono);">${colors.length} color${colors.length === 1 ? '' : 's'}</span>
    </div>
    <div class="color-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;">
  `;

  for (let i = 0; i < colors.length; i++) {
    const c = colors[i]!;
    const cardId = `color-card-${i}`;

    html += `
      <div id="${cardId}" class="color-swatch-card" style="background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer; transition: all 0.2s ease; position: relative;" title="Click card to copy HEX" data-hex="${c.hex}" data-rgb="${c.rgb}">
        
        <!-- Swatch Display with checkered underlay for alpha transparency -->
        <div style="height: 52px; width: 100%; position: relative; background: #1a1a1a; background-image: linear-gradient(45deg, #262626 25%, transparent 25%), linear-gradient(-45deg, #262626 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #262626 75%), linear-gradient(-45deg, transparent 75%, #262626 75%); background-size: 12px 12px; background-position: 0 0, 0 6px, 6px -6px, -6px 0px; border-bottom: 1px solid var(--border);">
          <div style="position: absolute; inset: 0; background-color: ${c.rgb};"></div>
          
          <!-- Copy Toast Overlay -->
          <div class="copy-overlay" style="position: absolute; inset: 0; background: rgba(18, 18, 18, 0.85); display: none; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: #6EE7B7; backdrop-filter: blur(2px);">
            Copied!
          </div>
        </div>

        <!-- Info Area -->
        <div style="padding: 10px; display: flex; flex-direction: column; gap: 4px;">
          <!-- HEX Value -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span class="color-hex-val" style="font-family: var(--font-mono); font-size: 12px; font-weight: bold; color: var(--text-primary); letter-spacing: 0.3px;">${c.hex}</span>
            <button class="copy-hex-btn icon-btn" title="Copy HEX" style="padding: 2px 4px; border-radius: 4px; color: var(--text-secondary); background: transparent; border: none; cursor: pointer;">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>

          <!-- RGB Value -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span class="color-rgb-val" style="font-family: var(--font-mono); font-size: 10px; color: var(--text-secondary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 105px;" title="${c.rgb}">${c.rgb}</span>
            <button class="copy-rgb-btn icon-btn" title="Copy RGB" style="padding: 2px 4px; border-radius: 4px; color: var(--text-secondary); background: transparent; border: none; cursor: pointer;">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>

          <!-- Role Badges -->
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
            ${c.roles.map(role => {
              let badgeBg = 'var(--bg-primary)';
              let badgeColor = 'var(--text-secondary)';
              let borderColor = 'var(--border)';
              if (role.includes('::before') || role.includes('::after')) {
                badgeBg = 'rgba(249, 168, 212, 0.12)';
                badgeColor = '#F9A8D4';
                borderColor = 'rgba(249, 168, 212, 0.35)';
              } else if (role.includes('Background') || role.includes('Gradient')) {
                badgeBg = 'rgba(110, 193, 228, 0.12)';
                badgeColor = '#7DD3FC';
                borderColor = 'rgba(110, 193, 228, 0.35)';
              } else if (role.includes('Text')) {
                badgeBg = 'rgba(167, 139, 250, 0.12)';
                badgeColor = '#A78BFA';
                borderColor = 'rgba(167, 139, 250, 0.35)';
              } else if (role.includes('Border')) {
                badgeBg = 'rgba(251, 191, 36, 0.12)';
                badgeColor = '#FBBF24';
                borderColor = 'rgba(251, 191, 36, 0.35)';
              } else if (role.includes('SVG') || role.includes('Fill') || role.includes('Stroke')) {
                badgeBg = 'rgba(110, 231, 183, 0.12)';
                badgeColor = '#6EE7B7';
                borderColor = 'rgba(110, 231, 183, 0.35)';
              }
              return `<span style="font-size: 9px; padding: 1px 5px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${borderColor}; white-space: nowrap;">${role}</span>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;

  // Add click to copy functionality
  const cards = container.querySelectorAll('.color-swatch-card');
  cards.forEach(card => {
    const hex = card.getAttribute('data-hex');
    const rgb = card.getAttribute('data-rgb');
    const overlay = card.querySelector('.copy-overlay') as HTMLElement | null;

    const showCopied = (text: string) => {
      if (overlay) {
        overlay.textContent = text;
        overlay.style.display = 'flex';
        setTimeout(() => {
          overlay.style.display = 'none';
        }, 900);
      }
    };

    // Click whole card -> copy HEX
    card.addEventListener('click', (e) => {
      // If clicked the specific RGB button, don't trigger HEX copy
      if ((e.target as HTMLElement).closest('.copy-rgb-btn') || (e.target as HTMLElement).closest('.color-rgb-val')) {
        return;
      }
      if (hex) {
        navigator.clipboard.writeText(hex);
        showCopied('Copied HEX!');
      }
    });

    // Copy RGB specifically
    const rgbBtn = card.querySelector('.copy-rgb-btn');
    const rgbVal = card.querySelector('.color-rgb-val');
    const copyRgbHandler = (e: Event) => {
      e.stopPropagation();
      if (rgb) {
        navigator.clipboard.writeText(rgb);
        showCopied('Copied RGB!');
      }
    };
    rgbBtn?.addEventListener('click', copyRgbHandler);
    rgbVal?.addEventListener('click', copyRgbHandler);

    // Copy HEX button
    const hexBtn = card.querySelector('.copy-hex-btn');
    hexBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (hex) {
        navigator.clipboard.writeText(hex);
        showCopied('Copied HEX!');
      }
    });

    // Hover effect
    card.addEventListener('mouseenter', () => {
      (card as HTMLElement).style.borderColor = 'var(--syntax-selector)';
      (card as HTMLElement).style.transform = 'translateY(-1px)';
    });
    card.addEventListener('mouseleave', () => {
      (card as HTMLElement).style.borderColor = 'var(--border)';
      (card as HTMLElement).style.transform = 'none';
    });
  });
}
