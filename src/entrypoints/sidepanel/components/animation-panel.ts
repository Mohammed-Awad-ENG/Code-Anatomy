import type { ElementData } from '../../../lib/messaging';

export function renderAnimationPanel(data: ElementData) {
  const container = document.getElementById('animation-panel')?.querySelector('.panel-body');
  if (!container) return;

  if (!data.animationData) {
    container.innerHTML = `<p class="empty-state">Animation data not available.</p>`;
    return;
  }

  const anim = data.animationData;

  if (!anim.hasAnimations) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary); font-size: 13px; padding: 24px 0; font-style: italic;">
        No active animations or transitions detected on this element.
      </div>
    `;
    return;
  }

  let html = `<div style="display: flex; flex-direction: column; gap: 12px;">`;

  // Active Web Animations / CSS Animations Snapshot
  if (anim.activeAnimations.length > 0) {
    html += `
      <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase;">Active Animations (Snapshot)</div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
    `;
    
    for (const a of anim.activeAnimations) {
      let badgeColor = '#7DD3FC';
      if (a.type === 'css-transition') badgeColor = '#F9A8D4';
      if (a.type === 'web-animation') badgeColor = '#A78BFA';
      
      html += `
        <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 6px; border: 1px solid var(--border);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-family: var(--font-mono); font-weight: bold; font-size: 13px; color: var(--text-primary);">${a.name}</div>
            <div style="font-size: 10px; color: ${badgeColor}; border: 1px solid ${badgeColor}40; background: ${badgeColor}15; padding: 2px 6px; border-radius: 4px;">${a.type}</div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
            <div><span style="color: var(--text-secondary);">State:</span> <span style="font-family: var(--font-mono); color: var(--syntax-prop);">${a.playState}</span></div>
            <div><span style="color: var(--text-secondary);">Time:</span> <span style="font-family: var(--font-mono); color: var(--syntax-value);">${a.currentTime !== null ? Math.round(a.currentTime) + 'ms' : 'N/A'}</span></div>
            <div><span style="color: var(--text-secondary);">Duration:</span> <span style="font-family: var(--font-mono); color: var(--syntax-value);">${a.duration}ms</span></div>
            <div><span style="color: var(--text-secondary);">Delay:</span> <span style="font-family: var(--font-mono); color: var(--syntax-value);">${a.delay}ms</span></div>
          </div>
        </div>
      `;
    }
    
    html += `</div>`;
  }

  // CSS Properties
  html += `
    <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; margin-top: 8px;">Computed CSS Properties</div>
    <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 6px; border: 1px solid var(--border); font-family: var(--font-mono); font-size: 12px;">
      <div style="margin-bottom: 8px;">
        <span style="color: var(--syntax-attr);">animation:</span> 
        <span style="color: var(--syntax-value); word-break: break-all;">${anim.cssProperties.animation}</span>
      </div>
      <div>
        <span style="color: var(--syntax-attr);">transition:</span> 
        <span style="color: var(--syntax-value); word-break: break-all;">${anim.cssProperties.transition}</span>
      </div>
    </div>
  `;

  html += `</div>`;
  container.innerHTML = html;
}
