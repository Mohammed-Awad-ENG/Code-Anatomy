import { storage } from '@wxt-dev/storage';
import { browser } from 'wxt/browser';
import { renderHtmlPanel } from './components/html-panel';
import { renderCssPanel } from './components/css-panel';
import { renderEventsPanel } from './components/events-panel';
import { initAiPanel, resetAiPanel } from './components/ai-panel';
import { renderTypographyPanel } from './components/typography-panel';
import { renderA11yPanel } from './components/a11y-panel';
import { renderAnimationPanel } from './components/animation-panel';
import { renderColorPanel } from './components/color-panel';
import type { ElementData } from '../../lib/messaging';

document.addEventListener('DOMContentLoaded', async () => {
  initSettingsModal();
  initAiPanel();
  
  // Listen for elements selected from content script
  browser.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'ELEMENT_SELECTED') {
      handleElementSelected(msg.payload);
    }
  });

  // Check if we missed a selection while the panel was closed
  browser.runtime.sendMessage({ type: 'GET_LAST_SELECTED' }).then((res) => {
    if (res && res.payload) {
      handleElementSelected(res.payload);
    }
  }).catch(() => {});
});

function handleElementSelected(data: ElementData) {
  // Update header with tag name, ID, and pseudo-element indicators
  const header = document.getElementById('selected-element-name');
  if (header) {
    let pseudoBadges = '';
    if (data.pseudoElements) {
      const colors: Record<string, string> = { before: '#F9A8D4', after: '#7DD3FC', marker: '#A78BFA', placeholder: '#FCD34D' };
      for (const [key, pe] of Object.entries(data.pseudoElements)) {
        if (!pe) continue;
        const hasSpecificRule = pe.matchedRules.some(r => !r.selector.trim().startsWith('*') && !r.selector.trim().startsWith('::'));
        if (pe.exists || hasSpecificRule) {
          const pseudoName = key.startsWith(':') ? key : `::${key}`;
          const color = colors[key] || '#C084FC';
          pseudoBadges += `<span style="font-size: 10px; color: ${color}; background: ${color}15; border: 1px solid ${color}40; padding: 1px 6px; border-radius: 4px; margin-left: 6px; font-weight: normal; vertical-align: middle; font-family: var(--font-mono); font-style: normal;">${pseudoName}</span>`;
        }
      }
    }
    header.innerHTML = `&lt;${data.tagName}&gt;${data.id ? `<span style="color: var(--syntax-attr)">#${data.id}</span>` : ''}${pseudoBadges}`;
  }
  
  const attrs = document.getElementById('selected-element-attrs');
  if (attrs) {
    const classStr = data.classes.length > 0 ? `class="${data.classes.join(' ')}"` : '';
    attrs.textContent = classStr;
  }
  
  // Hide initial placeholder empty states in panels
  document.querySelectorAll('.panel-body > .empty-state').forEach(el => {
    if (!el.parentElement?.closest('#ai-panel')) {
      el.classList.add('hidden');
    }
  });

  // Render panels
  renderHtmlPanel(data);
  renderCssPanel(data);
  renderEventsPanel(data, data.listeners || []);
  resetAiPanel(data);
  renderTypographyPanel(data);
  renderA11yPanel(data);
  renderAnimationPanel(data);
  renderColorPanel(data);
}



function initSettingsModal() {
  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('settings-btn');
  const closeBtn = document.getElementById('close-settings-btn');
  const saveBtn = document.getElementById('save-settings-btn');
  const apiKeyInput = document.getElementById('gemini-api-key') as HTMLInputElement;
  const fabToggle = document.getElementById('show-fab-toggle') as HTMLInputElement;

  // Load existing settings
  storage.getItem<string>('local:geminiApiKey').then(key => {
    if (key && apiKeyInput) apiKeyInput.value = key;
  });
  
  storage.getItem<boolean>('local:showFloatingButton').then(show => {
    if (show !== null && fabToggle) fabToggle.checked = show;
  });

  openBtn?.addEventListener('click', () => modal?.classList.remove('hidden'));
  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

  saveBtn?.addEventListener('click', async () => {
    if (apiKeyInput) {
      await storage.setItem('local:geminiApiKey', apiKeyInput.value.trim());
    }
    if (fabToggle) {
      await storage.setItem('local:showFloatingButton', fabToggle.checked);
    }
    modal?.classList.add('hidden');
  });

  // Close on backdrop click
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
}
