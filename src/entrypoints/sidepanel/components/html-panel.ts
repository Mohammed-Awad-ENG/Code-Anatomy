import type { ElementData } from '../../../lib/messaging';
import { highlightHTML } from '../utils/syntax-highlight';

export function renderHtmlPanel(data: ElementData) {
  const container = document.getElementById('html-panel')?.querySelector('.panel-body');
  if (!container) return;

  // Pretty print HTML by adding basic indentation based on tags
  // Since outerHTML might be messy, we do a basic format
  let formattedHtml = data.outerHTML;
  try {
    // Basic formatting (not robust but okay for quick views)
    formattedHtml = formatHTML(data.outerHTML);
  } catch (e) {
    // fallback
  }

  const highlighted = highlightHTML(formattedHtml);

  container.innerHTML = `
    <div class="code-block" style="background: var(--bg-primary); padding: 12px; border-radius: 4px; border: 1px solid var(--border); overflow-x: auto; font-family: var(--font-mono); font-size: 13px; line-height: 1.5; white-space: pre;">${highlighted}</div>
    <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
      <button id="copy-html-btn" class="btn-secondary">Copy HTML</button>
    </div>
  `;

  document.getElementById('copy-html-btn')?.addEventListener('click', (e) => {
    navigator.clipboard.writeText(formattedHtml);
    const btn = e.target as HTMLButtonElement;
    btn.textContent = 'Copied ✓';
    setTimeout(() => { btn.textContent = 'Copy HTML'; }, 2000);
  });
}

function formatHTML(html: string): string {
  let formatted = '';
  let indent = '';
  const tab = '  ';
  
  html.split(/>\s*</).forEach(function(element) {
    if (element.match(/^\/\w/)) {
      indent = indent.substring(tab.length);
    }
    formatted += indent + '<' + element + '>\r\n';
    if (element.match(/^<?\w[^>]*[^\/]$/) && !element.startsWith("input") && !element.startsWith("img") && !element.startsWith("br") && !element.startsWith("hr") && !element.startsWith("meta") && !element.startsWith("link")) { 
      indent += tab;              
    }
  });
  
  return formatted.substring(1, formatted.length - 3);
}
