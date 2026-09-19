import { storage } from '@wxt-dev/storage';
import { browser } from 'wxt/browser';
import { renderHtmlPanel } from './components/html-panel';
import { renderCssPanel } from './components/css-panel';
import { renderEventsPanel } from './components/events-panel';
import { initAiPanel, resetAiPanel } from './components/ai-panel';
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
  // Update header
  const header = document.getElementById('selected-element-name');
  if (header) {
    header.innerHTML = `&lt;${data.tagName}&gt;${data.id ? `<span style="color: var(--syntax-attr)">#${data.id}</span>` : ''}`;
  }
  
  const attrs = document.getElementById('selected-element-attrs');
  if (attrs) {
    const classStr = data.classes.length > 0 ? `class="${data.classes.join(' ')}"` : '';
    attrs.textContent = classStr;
  }
  
  // Hide empty states in panels
  document.querySelectorAll('.empty-state').forEach(el => {
    // Only hide if we actually have panels (except AI which has its own logic)
    if (!el.parentElement?.closest('#ai-panel')) {
      el.classList.add('hidden');
    }
  });

  // Render panels
  renderHtmlPanel(data);
  renderCssPanel(data);
  renderEventsPanel(data, data.listeners || []);
  resetAiPanel(data);
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
