/**
 * StoryDom - the Flame and the Seed's shared pieces for DomSimulation scenes:
 * the Lens honesty card (an overlay each scene can open with) and a CSS
 * confetti burst for a resolve moment. The DOM counterpart of StoryKit.js.
 * Colours are var(--sim-*) only. Not a scene: no class export.
 */
import { esc } from 'simulations/base/SimUi.js';

/** Magnifier glyph for the card badge. */
const LENS_GLYPH = '<svg class="sd-lens__glyph" viewBox="0 0 24 24" aria-hidden="true">'
  + '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5 L20 20"/></svg>';

export const STORY_DOM_CSS = `
.sd-wall {
  background-color: var(--sim-bg-deep);
  background-image: radial-gradient(color-mix(in oklab, var(--sim-series-2) 14%, transparent) 2px, transparent 2.6px);
  background-size: 34px 34px;
}
.sd-lens {
  position: absolute; inset: 0; z-index: 5;
  display: grid; place-items: center;
  padding: var(--sim-space-4);
  background: color-mix(in oklab, var(--sim-bg-deep) 62%, transparent);
  animation: sd-fade 0.3s ease both;
}
.sd-lens__card {
  width: min(460px, 100%);
  padding: var(--sim-space-5) var(--sim-space-4) var(--sim-space-4);
  border: 3px solid var(--sim-accent);
  border-radius: var(--sim-radius-md);
  background: var(--sim-bg-surface);
  box-shadow: 0 5px 0 color-mix(in oklab, var(--sim-accent) 45%, var(--sim-bg-deep));
  display: flex; flex-direction: column; gap: var(--sim-space-3);
  position: relative;
  animation: sd-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both;
}
.sd-lens__badge {
  position: absolute; inset: auto auto 100% var(--sim-space-4);
  transform: translateY(50%);
  display: flex; align-items: center; gap: var(--sim-space-2);
  padding: var(--sim-space-1) var(--sim-space-3) var(--sim-space-1) var(--sim-space-1);
  border-radius: var(--sim-radius-pill);
  background: var(--sim-accent); color: var(--sim-bg-deep);
  font-weight: 800; font-size: var(--sim-text-md);
}
.sd-lens__glyph { width: 26px; height: 26px; padding: 3px; border-radius: 50%; background: var(--sim-bg-deep);
  fill: none; stroke: var(--sim-accent); stroke-width: 3; stroke-linecap: round; }
.sd-lens__row { display: grid; grid-template-columns: 36px minmax(0, 1fr); align-items: center; gap: var(--sim-space-3);
  animation: sd-rise 0.35s ease both; animation-delay: calc(0.35s + var(--i, 0) * 0.18s); }
.sd-lens__icon { width: 36px; height: 36px; display: grid; place-items: center; }
.sd-lens__icon svg { width: 100%; height: 100%; }
.sd-lens__text { margin: 0; font-weight: 800; font-size: var(--sim-text-lg); line-height: 1.25; }
.sd-lens__sub { display: block; font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }

.sd-burst { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 6; }
.sd-burst__bit {
  position: absolute; inset: 40% auto auto 50%;
  width: 10px; height: 6px; border-radius: 2px;
  background: var(--c);
  animation: sd-fly 1.2s cubic-bezier(0.2, 0.7, 0.4, 1) both;
  animation-delay: calc(var(--i) * 0.012s);
}
@keyframes sd-fly {
  from { transform: translate(0, 0) rotate(0); opacity: 1; }
  70% { opacity: 1; }
  to { transform: translate(var(--dx), var(--dy)) rotate(var(--r)); opacity: 0; }
}
@keyframes sd-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes sd-pop { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes sd-rise { from { transform: translateY(8px); opacity: 0; } to { transform: none; opacity: 1; } }
`;

/**
 * The Lens honesty card overlay. rows: [{ icon: svg markup, text, sub? }].
 * Short lines only - the full wording is on the slide's own Lens line.
 */
export function lensCardHtml(rows) {
  return `<div class="sd-lens" role="note" aria-label="The Lens honesty card">
    <div class="sd-lens__card">
      <span class="sd-lens__badge">${LENS_GLYPH}THE LENS</span>
      ${rows.map((r, i) => `<div class="sd-lens__row" style="--i:${i}">
        <span class="sd-lens__icon" aria-hidden="true">${r.icon || ''}</span>
        <p class="sd-lens__text">${esc(r.text)}${r.sub ? `<span class="sd-lens__sub">${esc(r.sub)}</span>` : ''}</p>
      </div>`).join('')}
    </div>
  </div>`;
}

const BURST_COLOURS = ['var(--sim-series-1)', 'var(--sim-series-2)', 'var(--sim-series-3)', 'var(--sim-series-4)', 'var(--sim-series-5)'];

/**
 * Fire a one-shot confetti burst inside `host` (a positioned element). The
 * burst removes itself when its last piece finishes; no timers to clear.
 */
export function burst(host, n = 28) {
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'sd-burst';
  el.setAttribute('aria-hidden', 'true');
  let html = '';
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
    const d = 120 + Math.random() * 180;
    html += `<span class="sd-burst__bit" style="--i:${i};--c:${BURST_COLOURS[i % BURST_COLOURS.length]};`
      + `--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d + 160)}px;--r:${Math.round(Math.random() * 720)}deg"></span>`;
  }
  el.innerHTML = html;
  let left = n;
  el.addEventListener('animationend', () => { if (--left <= 0) el.remove(); });
  host.appendChild(el);
}
