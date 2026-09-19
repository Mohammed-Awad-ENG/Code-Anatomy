export function highlightHTML(html: string): string {
  // Simple regex-based syntax highlighter for HTML
  let highlighted = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Tags
  highlighted = highlighted.replace(/(&lt;\/?)([a-zA-Z0-9\-]+)/g, '$1<span class="syntax-tag">$2</span>');
  
  // Attributes (e.g. class="...")
  highlighted = highlighted.replace(/([a-zA-Z0-9\-]+)(=)(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="syntax-attr">$1</span>$2<span class="syntax-value">$3</span>');
  // Attributes without quotes
  highlighted = highlighted.replace(/([a-zA-Z0-9\-]+)(=)(?!&quot;|&#39;)([^ \/&]+)/g, '<span class="syntax-attr">$1</span>$2<span class="syntax-value">$3</span>');
  
  // Standalone attributes (e.g. disabled)
  // highlighted = highlighted.replace(/(\s+)([a-zA-Z0-9\-]+)(\s*&gt;|\s+)/g, '$1<span class="syntax-attr">$2</span>$3');

  return highlighted;
}

export function highlightCSS(css: string): string {
  // Very basic CSS highlighting for inline styles / rules
  let highlighted = css
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Properties and values
  highlighted = highlighted.replace(/([a-zA-Z0-9\-]+)(\s*:)/g, '<span class="syntax-prop">$1</span>$2');
  
  // Comments (e.g. /* Utility class */)
  highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color: var(--text-secondary)">$1</span>');
  
  return highlighted;
}
