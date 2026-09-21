export function highlightHTML(html: string): string {
  // Simple regex-based syntax highlighter for HTML
  let highlighted = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Use placeholders to prevent subsequent regexes from matching our injected HTML
  // Tags
  highlighted = highlighted.replace(/(&lt;\/?)([a-zA-Z0-9\-]+)/g, '$1%%TAG%%$2%%END%%');
  
  // Attributes (e.g. class="...")
  highlighted = highlighted.replace(/([a-zA-Z0-9\-]+)(=)(&quot;.*?&quot;|&#39;.*?&#39;)/g, '%%ATTR%%$1%%END%%$2%%VAL%%$3%%END%%');
  // Attributes without quotes
  highlighted = highlighted.replace(/([a-zA-Z0-9\-]+)(=)(?!&quot;|&#39;)([^ \/&<>\n\r]+)/g, '%%ATTR%%$1%%END%%$2%%VAL%%$3%%END%%');

  // Replace placeholders with actual spans
  highlighted = highlighted
    .replace(/%%TAG%%/g, '<span class="syntax-tag">')
    .replace(/%%ATTR%%/g, '<span class="syntax-attr">')
    .replace(/%%VAL%%/g, '<span class="syntax-value">')
    .replace(/%%END%%/g, '</span>');

  return highlighted;
}

export function highlightCSS(css: string): string {
  // Very basic CSS highlighting for inline styles / rules
  let highlighted = css
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Property and Value (e.g. padding: 0px;)
  highlighted = highlighted.replace(/([a-zA-Z0-9\-]+)(\s*:\s*)([^;]+)(;?)/g, '<span class="syntax-prop">$1</span>$2<span class="syntax-value">$3</span>$4');
  
  // Comments (e.g. /* Utility class */)
  highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color: var(--syntax-comment)">$1</span>');
  
  return highlighted;
}

/**
 * Basic JavaScript syntax highlighting for code previews.
 * Handles keywords, strings, comments, numbers, methods, and common DOM APIs.
 */
export function highlightJS(code: string): string {
  let highlighted = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Use placeholder approach to avoid regex conflicts
  const tokens: { placeholder: string; html: string }[] = [];
  let tokenIndex = 0;

  function addToken(className: string, text: string): string {
    const placeholder = `%%TKN${tokenIndex++}%%`;
    tokens.push({ placeholder, html: `<span class="${className}">${text}</span>` });
    return placeholder;
  }

  // 1. Comments (single-line // and multi-line /* */)
  highlighted = highlighted.replace(/(\/\/[^\n]*)/g, (m) => addToken('syntax-comment', m));
  highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, (m) => addToken('syntax-comment', m));

  // 2. Strings (double-quoted, single-quoted, backtick)
  highlighted = highlighted.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, (m) => addToken('syntax-js-string', m));
  highlighted = highlighted.replace(/(&#39;(?:[^&]|&(?!#39;))*?&#39;)/g, (m) => addToken('syntax-js-string', m));
  highlighted = highlighted.replace(/(`[^`]*?`)/g, (m) => addToken('syntax-js-string', m));

  // 3. Keywords
  const keywords = [
    'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while', 'do',
    'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'import',
    'export', 'default', 'from', 'try', 'catch', 'finally', 'throw', 'async', 'await',
    'typeof', 'instanceof', 'void', 'delete', 'in', 'of', 'null', 'undefined', 'true', 'false',
    'document', 'window', 'console'
  ];
  const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
  highlighted = highlighted.replace(kwRegex, (m) => addToken('syntax-js-keyword', m));

  // 4. DOM API methods
  const methods = [
    'getElementById', 'getElementsByClassName', 'getElementsByTagName', 'getElementsByName',
    'querySelector', 'querySelectorAll', 'closest', 'matches',
    'addEventListener', 'removeEventListener', 'dispatchEvent',
    'setAttribute', 'getAttribute', 'removeAttribute', 'hasAttribute',
    'appendChild', 'removeChild', 'insertBefore', 'replaceChild',
    'classList', 'add', 'remove', 'toggle', 'contains', 'replace',
    'createElement', 'createTextNode', 'cloneNode',
    'innerHTML', 'textContent', 'innerText', 'outerHTML',
    'style', 'dataset', 'className',
    'preventDefault', 'stopPropagation', 'stopImmediatePropagation'
  ];
  const methodRegex = new RegExp(`\\b(${methods.join('|')})\\b`, 'g');
  highlighted = highlighted.replace(methodRegex, (m) => addToken('syntax-js-method', m));

  // 5. Numbers
  highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, (m) => addToken('syntax-js-number', m));

  // Restore tokens
  for (const { placeholder, html } of tokens) {
    highlighted = highlighted.replace(placeholder, html);
  }

  return highlighted;
}
