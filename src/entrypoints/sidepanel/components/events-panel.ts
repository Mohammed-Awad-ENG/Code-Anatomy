import type { ElementData } from '../../../lib/messaging';

export function renderEventsPanel(data: ElementData, listeners: any[]) {
  const container = document.getElementById('events-panel')?.querySelector('.panel-body');
  if (!container) return;

  const hasNativeListeners = listeners && listeners.length > 0;
  const hasFrameworkEvents = data.frameworkEvents && data.frameworkEvents.length > 0;

  if (!hasNativeListeners && !hasFrameworkEvents) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No event listeners found on this exact element.</p>
        <p style="font-size: 11px; margin-top: 8px;">Note: Listeners on parent elements (event delegation) or added before the extension loaded are not detected.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';

  // Render Framework Events (React, etc)
  if (hasFrameworkEvents) {
    const fwHeader = document.createElement('h3');
    fwHeader.textContent = 'Framework Events (React)';
    fwHeader.style.fontSize = '13px';
    fwHeader.style.marginBottom = '12px';
    fwHeader.style.color = 'var(--text-primary)';
    container.appendChild(fwHeader);

    data.frameworkEvents!.forEach(evt => {
      const el = document.createElement('div');
      el.style.marginBottom = '16px';
      el.style.padding = '12px';
      el.style.backgroundColor = 'var(--bg-secondary)';
      el.style.borderRadius = '4px';
      el.style.borderLeft = '3px solid var(--accent)';
      
      const header = document.createElement('div');
      header.style.fontWeight = 'bold';
      header.style.marginBottom = '8px';
      header.style.color = 'var(--syntax-tag)';
      header.textContent = evt.event;
      
      const code = document.createElement('pre');
      code.style.fontSize = '12px';
      code.style.color = 'var(--text-secondary)';
      code.style.fontFamily = 'var(--font-mono)';
      code.style.whiteSpace = 'pre-wrap';
      code.style.wordBreak = 'break-all';
      code.textContent = evt.handler;
      
      el.appendChild(header);
      el.appendChild(code);
      container.appendChild(el);
    });
  }

  // Render Native Events
  if (hasNativeListeners) {
    const nativeHeader = document.createElement('h3');
    nativeHeader.textContent = 'Native DOM Events';
    nativeHeader.style.fontSize = '13px';
    nativeHeader.style.marginTop = hasFrameworkEvents ? '24px' : '0';
    nativeHeader.style.marginBottom = '12px';
    nativeHeader.style.color = 'var(--text-primary)';
    container.appendChild(nativeHeader);

    listeners.forEach(l => {
      const el = document.createElement('div');
      el.style.marginBottom = '16px';
      el.style.padding = '12px';
      el.style.backgroundColor = 'var(--bg-secondary)';
      el.style.borderRadius = '4px';
      el.style.borderLeft = '3px solid var(--accent)';
      
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.marginBottom = '8px';
      
      const typeSpan = document.createElement('strong');
      typeSpan.style.color = 'var(--syntax-tag)';
      typeSpan.textContent = l.type;
      
      const flagsSpan = document.createElement('span');
      flagsSpan.style.fontSize = '11px';
      flagsSpan.style.color = 'var(--text-secondary)';
      
      const flags = [];
      if (l.useCapture) flags.push('capture');
      if (l.passive) flags.push('passive');
      if (l.once) flags.push('once');
      
      flagsSpan.textContent = flags.length > 0 ? `(${flags.join(', ')})` : '';
      
      header.appendChild(typeSpan);
      header.appendChild(flagsSpan);
      
      const code = document.createElement('pre');
      code.style.fontSize = '12px';
      code.style.color = 'var(--text-secondary)';
      code.style.fontFamily = 'var(--font-mono)';
      code.style.whiteSpace = 'pre-wrap';
      code.style.wordBreak = 'break-all';
      code.textContent = l.sourcePreview || l.functionName || 'Unknown Handler';
      
      el.appendChild(header);
      el.appendChild(code);
      container.appendChild(el);
    });
  }
}
