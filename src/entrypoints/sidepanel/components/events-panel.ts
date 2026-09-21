import type { ElementData } from '../../../lib/messaging';

export function renderEventsPanel(data: ElementData, listeners: any[]) {
  const container = document.getElementById('events-panel')?.querySelector('.panel-body');
  if (!container) return;

  const hasNativeListeners = listeners && listeners.length > 0;
  const hasChildListeners = (data as any).childListeners && (data as any).childListeners.length > 0;
  const hasFrameworkEvents = data.frameworkEvents && data.frameworkEvents.length > 0;
  const hasDomAccess = (data as any).domAccess && (data as any).domAccess.length > 0;
  const hasDomManipulations = (data as any).domManipulations && (data as any).domManipulations.length > 0;

  const hasAnything = hasNativeListeners || hasChildListeners || hasFrameworkEvents || hasDomAccess || hasDomManipulations;

  if (!hasAnything) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No JavaScript connections found for this element.</p>
        <p style="font-size: 11px; margin-top: 8px;">Event listeners, DOM queries (querySelector, getElementById, etc.), and DOM manipulations (setAttribute, classList) are tracked from page load.</p>
      </div>
    `;
    return;
  }
  
  let html = '';

  // ═══════════════════════════════════════════
  // 1. EVENT LISTENERS (on this element)
  // ═══════════════════════════════════════════
  if (hasNativeListeners) {
    html += sectionHeader('Event Listeners', `${listeners.length} on this element`, '#0078D4');
    
    listeners.forEach(l => {
      const flags = [];
      if (l.useCapture) flags.push('capture');
      if (l.passive) flags.push('passive');
      if (l.once) flags.push('once');
      
      html += cardBlock(
        `<span style="color: var(--syntax-tag); font-weight: bold;">${escapeHtml(l.type)}</span>` +
        (flags.length > 0 ? `<span style="font-size: 10px; color: var(--text-secondary); margin-left: 8px;">(${flags.join(', ')})</span>` : ''),
        l.sourcePreview || l.functionName || 'Unknown Handler',
        '#0078D4'
      );
    });
  }

  // ═══════════════════════════════════════════
  // 2. EVENT LISTENERS (on child elements)
  // ═══════════════════════════════════════════
  if (hasChildListeners) {
    const childListeners = (data as any).childListeners;
    html += sectionHeader('Events on Child Elements', `${childListeners.length} listeners inside`, '#A78BFA');
    
    childListeners.forEach((l: any) => {
      const flags = [];
      if (l.useCapture) flags.push('capture');
      if (l.passive) flags.push('passive');
      if (l.once) flags.push('once');
      
      html += cardBlock(
        `<span style="color: var(--syntax-tag); font-weight: bold;">${escapeHtml(l.type)}</span>` +
        `<span style="font-size: 11px; color: #E2E8F0; letter-spacing: 0.3px; margin-left: 8px;">on &lt;${escapeHtml(l.targetLabel || 'child')}&gt;</span>` +
        (flags.length > 0 ? `<span style="font-size: 10px; color: var(--text-secondary); margin-left: 4px;">(${flags.join(', ')})</span>` : ''),
        l.sourcePreview || l.functionName || 'Unknown Handler',
        '#A78BFA'
      );
    });
  }

  // ═══════════════════════════════════════════
  // 3. FRAMEWORK EVENTS (React, etc.)
  // ═══════════════════════════════════════════
  if (hasFrameworkEvents) {
    html += sectionHeader('Framework Events', 'React Props', '#61DAFB');
    
    data.frameworkEvents!.forEach(evt => {
      html += cardBlock(
        `<span style="color: var(--syntax-func); font-weight: bold;">${escapeHtml(evt.event)}</span>`,
        evt.handler,
        '#61DAFB'
      );
    });
  }

  // ═══════════════════════════════════════════
  // 4. DOM ACCESS (querySelector, getElementById, etc.)
  // ═══════════════════════════════════════════
  if (hasDomAccess) {
    const domAccess = (data as any).domAccess;
    html += sectionHeader('DOM Access (Queries)', `${domAccess.length} references found`, '#6EE7B7');
    
    domAccess.forEach((entry: any) => {
      const targetNote = entry.targetLabel === 'self'
        ? '<span style="color: #6EE7B7; font-size: 10px; margin-left: 8px;">→ this element</span>'
        : `<span style="color: #E2E8F0; font-size: 11px; letter-spacing: 0.3px; margin-left: 8px;">→ &lt;${escapeHtml(entry.targetLabel)}&gt; inside</span>`;
      
      const code = formatMethodCall(entry.method, entry.argument);
      
      html += `
        <div style="margin-bottom: 12px; background: var(--bg-secondary); border-radius: 4px; padding: 12px; border: 1px solid var(--border); border-left: 3px solid #6EE7B7;">
          <div style="display: flex; align-items: center; flex-wrap: wrap; margin-bottom: 8px;">
            <span style="color: var(--syntax-func); font-family: var(--font-mono); font-size: 12px; font-weight: bold;">${escapeHtml(entry.method)}</span>
            ${targetNote}
          </div>
          <pre style="font-size: 11px; color: var(--text-primary); font-family: var(--font-mono); background: var(--bg-tertiary); padding: 8px; border-radius: 4px; white-space: pre-wrap; word-break: break-all; margin: 0;">${code}</pre>
          ${entry.callerLocation ? `<div style="font-size: 10px; color: var(--text-secondary); margin-top: 6px; font-family: var(--font-mono); word-break: break-all;">${escapeHtml(entry.callerLocation)}</div>` : ''}
        </div>
      `;
    });
  }

  // ═══════════════════════════════════════════
  // 5. DOM MANIPULATIONS (setAttribute, classList, etc.)
  // ═══════════════════════════════════════════
  if (hasDomManipulations) {
    const domManips = (data as any).domManipulations;
    html += sectionHeader('DOM Manipulations', `${domManips.length} changes tracked`, '#F9A8D4');
    
    domManips.forEach((entry: any) => {
      const targetNote = entry.targetLabel === 'self'
        ? '<span style="color: #F9A8D4; font-size: 10px; margin-left: 8px;">→ this element</span>'
        : `<span style="color: #E2E8F0; font-size: 11px; letter-spacing: 0.3px; margin-left: 8px;">→ &lt;${escapeHtml(entry.targetLabel)}&gt; inside</span>`;
      
      html += `
        <div style="margin-bottom: 12px; background: var(--bg-secondary); border-radius: 4px; padding: 12px; border: 1px solid var(--border); border-left: 3px solid #F9A8D4;">
          <div style="display: flex; align-items: center; flex-wrap: wrap; margin-bottom: 8px;">
            <span style="color: var(--syntax-func); font-family: var(--font-mono); font-size: 12px; font-weight: bold;">${escapeHtml(entry.api)}</span>
            <span style="color: var(--syntax-value); font-family: var(--font-mono); font-size: 11px; margin-left: 6px;">(${escapeHtml(entry.detail)})</span>
            ${targetNote}
          </div>
          ${entry.callerLocation ? `<div style="font-size: 10px; color: var(--text-secondary); font-family: var(--font-mono); word-break: break-all;">${escapeHtml(entry.callerLocation)}</div>` : ''}
        </div>
      `;
    });
  }

  container.innerHTML = html;
}

// ─── Helpers ─────────────────────────────────────

function sectionHeader(title: string, badge: string, color: string): string {
  return `
    <h3 style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px; margin-top: 20px; display: flex; align-items: center; justify-content: space-between;">
      <span style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
        ${title}
      </span>
      <span style="font-size: 10px; color: var(--text-tertiary); font-weight: normal; background: var(--bg-tertiary); padding: 2px 8px; border-radius: 12px;">${badge}</span>
    </h3>
  `;
}

function cardBlock(headerHtml: string, codeContent: string, accentColor: string): string {
  return `
    <div style="margin-bottom: 12px; background: var(--bg-secondary); border-radius: 4px; padding: 12px; border: 1px solid var(--border); border-left: 3px solid ${accentColor};">
      <div style="margin-bottom: 8px;">${headerHtml}</div>
      <pre style="font-size: 11px; color: var(--text-secondary); font-family: var(--font-mono); white-space: pre-wrap; word-break: break-all; margin: 0;">${escapeHtml(codeContent)}</pre>
    </div>
  `;
}

function formatMethodCall(method: string, argument: string): string {
  // Syntax highlight the method call for educational purposes
  const parts = method.split('.');
  const obj = escapeHtml(parts[0]);
  const fn = escapeHtml(parts[1] || method);
  const arg = escapeHtml(argument);
  
  return `<span style="color: var(--syntax-tag);">${obj}</span>.<span style="color: var(--syntax-func);">${fn}</span>(<span style="color: var(--syntax-value);">'${arg}'</span>)`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
