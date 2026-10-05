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

  // Setup CodePen Export
  const codepenForm = document.getElementById('codepen-form') as HTMLFormElement;
  const codepenDataInput = document.getElementById('codepen-data') as HTMLInputElement;
  
  if (codepenForm && codepenDataInput) {
    let cssText = '';
    
    // Add all matched rules
    data.matchedRules.forEach(rule => {
      const ruleBlock = `${rule.selector} { ${rule.cssText} }`;
      if (rule.media) {
        cssText += `@media ${rule.media} { ${ruleBlock} }\n`;
      } else {
        cssText += `${ruleBlock}\n`;
      }
    });

    // Add all pseudo rules
    data.pseudoRules.forEach(rule => {
      const ruleBlock = `${rule.selector} { ${rule.cssText} }`;
      if (rule.media) {
        cssText += `@media ${rule.media} { ${ruleBlock} }\n`;
      } else {
        cssText += `${ruleBlock}\n`;
      }
    });

    // Add descendant rules
    if (data.descendantRules) {
      data.descendantRules.forEach(rule => {
        const ruleBlock = `${rule.selector} { ${rule.cssText} }`;
        if (rule.media) {
          cssText += `@media ${rule.media} { ${ruleBlock} }\n`;
        } else {
          cssText += `${ruleBlock}\n`;
        }
      });
    }

    let jsText = '';
    const anyData = data as any;
    let hasJs = false;

    if (anyData.listeners && anyData.listeners.length > 0) {
      hasJs = true;
      jsText += `const rootElement = document.body.firstElementChild;\n\n`;
      anyData.listeners.forEach((l: any) => {
        jsText += `rootElement?.addEventListener('${l.type}', function(event) {\n`;
        jsText += `  /* Original Source (${l.functionName}):\n`;
        const lines = (l.sourcePreview || '').split('\\n');
        lines.forEach((line: string) => {
          jsText += `     ${line}\n`;
        });
        jsText += `  */\n`;
        jsText += `});\n\n`;
      });
    }

    if (anyData.childListeners && anyData.childListeners.length > 0) {
      hasJs = true;
      if (!anyData.listeners || anyData.listeners.length === 0) {
        jsText += `const rootElement = document.body.firstElementChild;\n\n`;
      }
      anyData.childListeners.forEach((l: any) => {
        // Safe query selector string
        const safeTarget = (l.targetLabel || '').replace(/"/g, '\\\\\"');
        jsText += `// Target: ${l.targetLabel}\n`;
        jsText += `rootElement?.querySelector("${safeTarget}")?.addEventListener('${l.type}', function(event) {\n`;
        jsText += `  /* Original Source (${l.functionName}):\n`;
        const lines = (l.sourcePreview || '').split('\\n');
        lines.forEach((line: string) => {
          jsText += `     ${line}\n`;
        });
        jsText += `  */\n`;
        jsText += `});\n\n`;
      });
    }

    if (hasJs) {
      jsText = `// Note: This JavaScript scaffold was exported from Code Anatomy.\n` +
               `// The original function bodies are provided as comments since they\n` +
               `// might rely on external scope or frameworks (React/Vue/etc).\n\n` + jsText;
    }

    const penData = {
      title: "Code Anatomy Export",
      description: "Exported from Code Anatomy browser extension",
      html: formattedHtml,
      css: cssText,
      js: jsText
    };

    codepenDataInput.value = JSON.stringify(penData);
    codepenForm.style.display = 'block';
  }
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
