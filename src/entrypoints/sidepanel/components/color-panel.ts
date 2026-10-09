import type { ElementData } from '../../../lib/messaging';

export function renderColorPanel(data: ElementData) {
  const container = document.getElementById('color-panel')?.querySelector('.panel-body');
  if (!container) return;

  if (!data.colorPalette || data.colorPalette.length === 0) {
    container.innerHTML = `<p class="empty-state">No colors detected.</p>`;
    return;
  }

  let html = `<div class="color-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px;">`;

  for (const color of data.colorPalette) {
    html += `
      <div class="color-swatch-card" style="background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer; transition: border-color 0.15s ease;" title="Click to copy" data-color="${color}">
        <div class="color-swatch-display" style="height: 48px; background-color: ${color}; width: 100%;"></div>
        <div style="padding: 8px; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${color}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-secondary);"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </div>
      </div>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;

  // Add click to copy functionality
  const cards = container.querySelectorAll('.color-swatch-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const color = card.getAttribute('data-color');
      if (color) {
        navigator.clipboard.writeText(color);
        const textSpan = card.querySelector('span');
        if (textSpan) {
          const origText = textSpan.textContent;
          textSpan.textContent = 'Copied!';
          textSpan.style.color = '#6EE7B7';
          setTimeout(() => {
            textSpan.textContent = origText;
            textSpan.style.color = 'var(--text-primary)';
          }, 1000);
        }
      }
    });
  });
}
