import type { ElementData } from '../../../lib/messaging';
import { highlightJS } from '../utils/syntax-highlight';

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
    
    domAccess.forEach((entry: any, idx: number) => {
      const targetNote = entry.targetLabel === 'self'
        ? '<span style="color: #6EE7B7; font-size: 10px; margin-left: 8px;">→ this element</span>'
        : `<span class="child-target-badge">targets child &lt;${escapeHtml(entry.targetLabel)}&gt;</span>`;
      
      html += renderDomAccessCard(entry, targetNote, idx);
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
        : `<span class="child-target-badge">applied to child &lt;${escapeHtml(entry.targetLabel)}&gt;</span>`;

      const description = describeManipulation(entry.api, entry.detail);

      html += `
        <div style="margin-bottom: 12px; background: var(--bg-secondary); border-radius: 4px; padding: 12px; border: 1px solid var(--border); border-left: 3px solid #F9A8D4;">
          <div style="display: flex; align-items: center; flex-wrap: wrap; margin-bottom: 4px;">
            <span style="color: var(--syntax-func); font-family: var(--font-mono); font-size: 12px; font-weight: bold;">${escapeHtml(entry.api)}</span>
            <span style="color: var(--syntax-value); font-family: var(--font-mono); font-size: 11px; margin-left: 6px;">(${escapeHtml(entry.detail)})</span>
            ${targetNote}
          </div>
          <div style="font-size: 11px; color: #E2E8F0; margin: 8px 0; padding: 6px 10px; background: rgba(249, 168, 212, 0.07); border-left: 2px solid rgba(249, 168, 212, 0.4); border-radius: 2px; line-height: 1.5;">${description}</div>
          ${entry.callerLocation ? `<div style="font-size: 10px; color: var(--text-secondary); font-family: var(--font-mono); word-break: break-all;">${escapeHtml(entry.callerLocation)}</div>` : ''}
        </div>
      `;
    });
  }

  container.innerHTML = html;

  // Wire up collapse/expand toggles for scope blocks
  container.querySelectorAll('[data-scope-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = (btn as HTMLElement).getAttribute('data-scope-toggle')!;
      const scopeBlock = document.getElementById(targetId);
      if (!scopeBlock) return;
      const isHidden = scopeBlock.style.display === 'none';
      scopeBlock.style.display = isHidden ? 'block' : 'none';
      (btn as HTMLElement).textContent = isHidden ? '▾ Hide scope' : '▸ Show scope';
    });
  });
}

// ─── DOM Access Scope Rendering ──────────────────

/**
 * Renders a single DOM access card with scope context.
 *
 * - If we captured the enclosing function's source (`callerScope`),
 *   we show the whole function body — collapsed by default — with
 *   the DOM access line highlighted inside it.
 *
 * - If no scope was captured (strict-mode / ESM), we reconstruct a
 *   simple standalone statement such as:
 *     let loginButton = document.querySelector('#loginButton')
 */
function renderDomAccessCard(entry: any, targetNote: string, idx: number): string {
  const scope: string = entry.callerScope || '';
  const hasScope = scope.length > 0;

  // ── The call as it would look in source ──
  const callCode = buildCallExpression(entry.method, entry.argument);

  // ── Header row ──
  const header = `
    <div style="display: flex; align-items: center; flex-wrap: wrap; margin-bottom: 8px;">
      <span style="color: var(--syntax-func); font-family: var(--font-mono); font-size: 12px; font-weight: bold;">${escapeHtml(entry.method)}</span>
      ${targetNote}
    </div>`;

  let codeBlock: string;

  if (hasScope) {
    // ── Function scope available: show inline call + collapsible function body ──
    const scopeId = `scope-block-${idx}`;
    const highlightedScope = highlightJS(scope);

    codeBlock = `
      ${header}
      <pre class="dom-access-code-block">${highlightJS(callCode)}</pre>
      <button data-scope-toggle="${scopeId}" class="scope-toggle-btn">▸ Show scope</button>
      <div id="${scopeId}" class="scope-body" style="display: none;">
        <div style="font-size: 10px; color: var(--text-tertiary); margin-bottom: 4px; font-family: var(--font-mono); letter-spacing: 0.5px;">ENCLOSING FUNCTION</div>
        <pre class="dom-access-scope-block">${highlightedScope}</pre>
      </div>`;
  } else {
    // ── No scope captured: show reconstructed standalone statement ──
    const standalone = buildStandaloneStatement(entry.method, entry.argument);
    codeBlock = `
      ${header}
      <pre class="dom-access-code-block">${highlightJS(standalone)}</pre>`;
  }

  return `
    <div style="margin-bottom: 12px; background: var(--bg-secondary); border-radius: 4px; padding: 12px; border: 1px solid var(--border); border-left: 3px solid #6EE7B7;">
      ${codeBlock}
      ${entry.callerLocation ? `<div style="font-size: 10px; color: var(--text-secondary); margin-top: 6px; font-family: var(--font-mono); word-break: break-all;">${escapeHtml(entry.callerLocation)}</div>` : ''}
    </div>`;
}

/**
 * Build a raw call expression string, e.g.:
 *   document.querySelector('#loginButton')
 */
function buildCallExpression(method: string, argument: string): string {
  // Use the correct quote style based on method type
  if (method.includes('getElementById') || method.includes('getElementsByName')) {
    // These take plain IDs / names, no CSS selector
    return `${method}('${argument}')`;
  }
  // querySelector / querySelectorAll / getElementsByClassName / getElementsByTagName
  return `${method}('${argument}')`;
}

/**
 * Build a reconstructed top-level statement that shows the query
 * the way a learner would write it:
 *
 *   let loginButton = document.querySelector('#loginButton')
 *
 * The variable name is derived from the selector argument.
 */
function buildStandaloneStatement(method: string, argument: string): string {
  const varName = deriveVariableName(method, argument);
  const call = buildCallExpression(method, argument);
  return `let ${varName} = ${call}`;
}

/**
 * Derive a sensible camelCase variable name from the selector /
 * argument so the reconstructed statement reads naturally.
 *
 * Examples:
 *   '#loginButton'        → loginButton
 *   '.nav-item'           → navItem
 *   'div'                 → divElements
 *   'username'  (byName)  → usernameInput
 */
function deriveVariableName(method: string, argument: string): string {
  let name = argument
    // Strip leading CSS selector sigils
    .replace(/^[#.]/, '')
    // Replace non-alphanumeric chars with spaces (for camelCase conversion)
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();

  if (!name) return 'element';

  // Convert to camelCase
  const parts = name.split(/\s+/);
  name = parts[0].toLowerCase() +
    parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('');

  // Pluralise for collection-returning methods
  if (
    method.includes('querySelectorAll') ||
    method.includes('getElementsBy')
  ) {
    name += name.endsWith('s') ? 'List' : 's';
  }

  // Suffix for getElementsByName
  if (method.includes('getElementsByName') && !name.toLowerCase().includes('input')) {
    name += 'Input';
  }

  return name || 'element';
}

// ─── Shared Helpers ─────────────────────────────────────

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

/**
 * Generate a human-readable description of what a DOM manipulation did.
 */
function describeManipulation(api: string, detail: string): string {
  // detail examples: 'popover="auto"', 'aria-hidden', 'active, visible', 'hidden, true'
  switch (api) {
    case 'setAttribute': {
      const match = detail.match(/^(.+?)="(.*)"$/);
      if (match) {
        return `Set the <code>${escapeHtml(match[1])}</code> attribute to <code>"${escapeHtml(match[2])}"</code>`;
      }
      return `Set attribute: <code>${escapeHtml(detail)}</code>`;
    }
    case 'removeAttribute':
      return `Removed the <code>${escapeHtml(detail)}</code> attribute`;
    case 'classList.add': {
      const classes = detail.split(',').map(c => c.trim());
      const formatted = classes.map(c => `<code>"${escapeHtml(c)}"</code>`).join(', ');
      return `Added CSS class${classes.length > 1 ? 'es' : ''} ${formatted}`;
    }
    case 'classList.remove': {
      const classes = detail.split(',').map(c => c.trim());
      const formatted = classes.map(c => `<code>"${escapeHtml(c)}"</code>`).join(', ');
      return `Removed CSS class${classes.length > 1 ? 'es' : ''} ${formatted}`;
    }
    case 'classList.toggle': {
      const parts = detail.split(',').map(p => p.trim());
      const className = parts[0];
      if (parts.length > 1) {
        return `Toggled CSS class <code>"${escapeHtml(className)}"</code> (force: ${escapeHtml(parts[1])})`;
      }
      return `Toggled CSS class <code>"${escapeHtml(className)}"</code> on/off`;
    }
    default:
      return `Called <code>${escapeHtml(api)}</code> with <code>${escapeHtml(detail)}</code>`;
  }
}

function cardBlock(headerHtml: string, codeContent: string, accentColor: string): string {
  const isNative = codeContent.includes('[native code]');

  const codeHtml = isNative
    ? `<pre style="font-size: 11px; color: var(--text-secondary); font-family: var(--font-mono); white-space: pre-wrap; word-break: break-all; margin: 0;">${highlightJS(codeContent)}</pre>
       <div class="native-code-explainer">
         <span class="native-code-icon">ⓘ</span>
         <span>This is a <strong>built-in browser function</strong>. The source code is implemented in the browser engine (C++), not in JavaScript, so the browser shows <code>[native code]</code> instead of the actual implementation.</span>
       </div>`
    : `<pre style="font-size: 11px; color: var(--text-secondary); font-family: var(--font-mono); white-space: pre-wrap; word-break: break-all; margin: 0;">${escapeHtml(codeContent)}</pre>`;

  return `
    <div style="margin-bottom: 12px; background: var(--bg-secondary); border-radius: 4px; padding: 12px; border: 1px solid var(--border); border-left: 3px solid ${accentColor};">
      <div style="margin-bottom: 8px;">${headerHtml}</div>
      ${codeHtml}
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
