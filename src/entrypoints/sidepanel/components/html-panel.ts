import type { ElementData } from '../../../lib/messaging';
import { highlightHTML } from '../utils/syntax-highlight';

export function renderHtmlPanel(data: ElementData) {
  const container = document.getElementById('html-panel')?.querySelector('.panel-body');
  if (!container) return;

  // Pretty print HTML by adding basic indentation based on tags
  let formattedHtml = data.outerHTML;
  try {
    formattedHtml = formatHTML(data.outerHTML);
  } catch (e) {
    // fallback
  }

  const highlighted = highlightHTML(formattedHtml);

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <div style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); font-weight: 600; letter-spacing: 0.5px;">HTML Structure</div>
      <button id="copy-html-btn" class="btn-secondary" style="padding: 3px 10px; font-size: 11px;">Copy HTML</button>
    </div>
    <div class="code-block" style="background: var(--bg-primary); padding: 12px; border-radius: 4px; border: 1px solid var(--border); overflow-x: auto; font-family: var(--font-mono); font-size: 13px; line-height: 1.5; white-space: pre;">${highlighted}</div>
  `;

  document.getElementById('copy-html-btn')?.addEventListener('click', (e) => {
    // Copy clean HTML (sandboxHTML or outerHTML stripped of visual pseudo tokens)
    const cleanToCopy = data.sandboxHTML || formattedHtml.replace(/\s*::(before|after|marker|placeholder)\b/g, '');
    navigator.clipboard.writeText(cleanToCopy);
    const btn = e.target as HTMLButtonElement;
    btn.textContent = 'Copied ✓';
    setTimeout(() => { btn.textContent = 'Copy HTML'; }, 2000);
  });

  // Setup CodePen Export
  const codepenForm = document.getElementById('codepen-form') as HTMLFormElement;
  const codepenDataInput = document.getElementById('codepen-data') as HTMLInputElement;
  
  if (codepenForm && codepenDataInput) {
    let cssText = '';
    const baseSel = `${data.tagName.toLowerCase()}${data.id ? '#' + data.id : ''}${data.classes.length > 0 ? '.' + data.classes[0] : ''}`;
    
    // 1. Add all matched rules
    data.matchedRules.forEach(rule => {
      const ruleBlock = `${rule.selector} { ${rule.cssText} }`;
      if (rule.media) {
        cssText += `@media ${rule.media} { ${ruleBlock} }\n`;
      } else {
        cssText += `${ruleBlock}\n`;
      }
    });

    // 2. Add all pseudo rules (pseudo-classes)
    data.pseudoRules.forEach(rule => {
      const ruleBlock = `${rule.selector} { ${rule.cssText} }`;
      if (!cssText.includes(ruleBlock)) {
        if (rule.media) {
          cssText += `@media ${rule.media} { ${ruleBlock} }\n`;
        } else {
          cssText += `${ruleBlock}\n`;
        }
      }
    });

    // 3. Add pseudo-element rules and synthesize missing active pseudo rules
    if (data.pseudoElements) {
      for (const [key, pe] of Object.entries(data.pseudoElements)) {
        if (!pe) continue;
        const pseudoName = key.startsWith(':') ? key : `::${key}`;

        // Add authored rules
        if (pe.matchedRules && pe.matchedRules.length > 0) {
          pe.matchedRules.forEach(rule => {
            const ruleBlock = `${rule.selector} { ${rule.cssText} }`;
            if (!cssText.includes(ruleBlock)) {
              if (rule.media) {
                cssText += `@media ${rule.media} { ${ruleBlock} }\n`;
              } else {
                cssText += `${ruleBlock}\n`;
              }
            }
          });
        }

        // If pseudo-element is active in DOM, verify that specific styles for this element exist in cssText.
        // If not present, synthesize the rule so CodePen renders it completely!
        const hasSpecificAuthoredRule = cssText.includes(`${baseSel}${pseudoName}`) || cssText.includes(`${baseSel}:${key}`);
        if (pe.exists && !hasSpecificAuthoredRule) {
          const props = Object.entries(pe.computedStyles)
            .map(([prop, val]) => `  ${prop}: ${val};`)
            .join('\n');
          if (props) {
            cssText += `\n/* Active ${pseudoName} Styles */\n${baseSel}${pseudoName} {\n${props}\n}\n`;
          }
        }
      }
    }

    // 4. Add descendant rules
    if (data.descendantRules) {
      data.descendantRules.forEach(rule => {
        const ruleBlock = `${rule.selector} { ${rule.cssText} }`;
        if (!cssText.includes(ruleBlock)) {
          if (rule.media) {
            cssText += `@media ${rule.media} { ${ruleBlock} }\n`;
          } else {
            cssText += `${ruleBlock}\n`;
          }
        }
      });
    }

    // 5. Add Shadow Root styles (<style> tags from shadow DOM)
    if (data.shadowStyles && data.shadowStyles.length > 0) {
      data.shadowStyles.forEach(st => {
        const clean = st.trim();
        if (clean && !cssText.includes(clean)) {
          cssText += `\n/* Shadow Root Styles */\n${clean}\n`;
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
        const lines = (l.sourcePreview || '').split('\n');
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
        const safeTarget = (l.targetLabel || '').replace(/"/g, '\\"');
        jsText += `// Target: ${l.targetLabel}\n`;
        jsText += `rootElement?.querySelector("${safeTarget}")?.addEventListener('${l.type}', function(event) {\n`;
        jsText += `  /* Original Source (${l.functionName}):\n`;
        const lines = (l.sourcePreview || '').split('\n');
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

    // HTML to send to CodePen (uses sandboxHTML if available to unpack shadow DOM)
    const htmlToSend = data.sandboxHTML || formattedHtml.replace(/\s*::(before|after|marker|placeholder)\b/g, '');

    const penData = {
      title: "Code Anatomy Export",
      description: "Exported from Code Anatomy browser extension",
      html: htmlToSend,
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
