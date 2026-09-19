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
