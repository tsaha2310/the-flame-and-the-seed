/**
 * LadderKit - the powers-of-ten ladder shared by the two L00-01-04 DOM scenes
 * (ZoomLadderScene, ZoomLadderScene-full-ladder-locked): rung data, flat
 * vector pictures for the lit rungs, and the ladder CSS. Not a scene.
 *
 * Rungs run from Ajji's verandah (10 m) down to 0.1 nm, one per "ten times
 * smaller". The top six have pictures; the rest are dark until a later Book
 * gives the learner the words (the Lens only shows what you have words for).
 */
import { esc } from 'simulations/base/SimUi.js';

export const RUNGS = [
  { size: '10 m', exp: 1, name: 'verandah', art: 'verandah' },
  { size: '1 m', exp: 0, name: 'Kabir', art: 'kabir' },
  { size: '10 cm', exp: -1, name: 'hand', art: 'hand' },
  { size: '1 cm', exp: -2, name: 'moong seed', art: 'seed' },
  { size: '1 mm', exp: -3, name: 'root tip', art: 'roottip' },
  { size: '0.1 mm', exp: -4, name: 'root hairs', art: 'hairs' },
  { size: '10 \u00b5m', exp: -5, book: 'V' },
  { size: '1 \u00b5m', exp: -6 },
  { size: '100 nm', exp: -7 },
  { size: '10 nm', exp: -8, book: 'IV' },
  { size: '1 nm', exp: -9, book: 'II' },
  { size: '0.1 nm', exp: -10, book: 'I' },
];
export const LIT = RUNGS.filter((r) => r.art).length;   // rungs the learner can see today

/** Flat pictures, viewBox 0 0 100 100, coloured by class (see LADDER_CSS). */
const ART = {
  verandah: `<rect class="lk-ground" x="4" y="84" width="92" height="8" rx="4"/>
    <rect class="lk-wall" x="14" y="44" width="72" height="42" rx="3"/>
    <path class="lk-roof" d="M6 46 L50 18 L94 46 Z"/>
    <rect class="lk-door" x="42" y="58" width="16" height="28" rx="3"/>
    <rect class="lk-pillar" x="18" y="46" width="6" height="40" rx="2"/>
    <rect class="lk-pillar" x="76" y="46" width="6" height="40" rx="2"/>
    <rect class="lk-step" x="34" y="86" width="32" height="6" rx="2"/>
    <circle class="lk-leaf" cx="88" cy="78" r="7"/>`,
  kabir: `<ellipse class="lk-shadow" cx="50" cy="94" rx="22" ry="4"/>
    <rect class="lk-shirt" x="30" y="52" width="40" height="34" rx="12"/>
    <rect class="lk-skin" x="20" y="56" width="10" height="26" rx="5"/>
    <rect class="lk-skin" x="70" y="56" width="10" height="26" rx="5"/>
    <rect class="lk-shorts" x="34" y="80" width="32" height="12" rx="5"/>
    <circle class="lk-skin" cx="50" cy="32" r="20"/>
    <path class="lk-hair" d="M31 30 Q34 10 52 11 Q70 12 70 30 Q62 20 50 21 Q38 21 31 30 Z"/>
    <circle class="lk-eye" cx="43" cy="33" r="2.6"/><circle class="lk-eye" cx="57" cy="33" r="2.6"/>
    <path class="lk-smile" d="M44 41 Q50 46 56 41"/>
    <ellipse class="lk-blush" cx="37" cy="40" rx="3.5" ry="2"/><ellipse class="lk-blush" cx="63" cy="40" rx="3.5" ry="2"/>`,
  hand: `<rect class="lk-skin" x="30" y="46" width="42" height="42" rx="14"/>
    <rect class="lk-skin" x="30" y="14" width="9" height="40" rx="4.5"/>
    <rect class="lk-skin" x="41" y="8" width="9" height="44" rx="4.5"/>
    <rect class="lk-skin" x="52" y="10" width="9" height="42" rx="4.5"/>
    <rect class="lk-skin" x="63" y="18" width="9" height="36" rx="4.5"/>
    <rect class="lk-skin" x="14" y="50" width="26" height="10" rx="5" transform="rotate(-35 27 55)"/>
    <rect class="lk-nail" x="42.5" y="10" width="6" height="7" rx="3"/>
    <rect class="lk-nail" x="53.5" y="12" width="6" height="7" rx="3"/>`,
  seed: `<path class="lk-root" d="M64 58 Q84 70 78 94"/>
    <ellipse class="lk-seedshade" cx="46" cy="54" rx="30" ry="21"/>
    <ellipse class="lk-seed" cx="46" cy="50" rx="30" ry="21"/>
    <ellipse class="lk-shine" cx="35" cy="42" rx="9" ry="4.5"/>
    <rect class="lk-hilum" x="46" y="60" width="16" height="4" rx="2"/>`,
  roottip: `<path class="lk-rootbody" d="M34 0 L66 0 L62 70 Q50 98 38 70 Z"/>
    <g class="lk-fur"><path d="M36 20 L18 14 M36 34 L14 32 M37 48 L17 52 M64 22 L84 16 M64 36 L86 36 M63 50 L83 56 M36 8 L20 2 M64 8 L82 2"/></g>
    <path class="lk-cap" d="M40 72 Q50 96 60 72 Z"/>`,
  hairs: `<g class="lk-ropes">
      <rect x="-10" y="18" width="130" height="16" rx="8" transform="rotate(12 50 26)"/>
      <rect x="-10" y="46" width="130" height="18" rx="9" transform="rotate(-8 50 55)"/>
      <rect x="-10" y="74" width="130" height="15" rx="7.5" transform="rotate(18 50 81)"/>
    </g>
    <g class="lk-bricks"><path d="M20 24 L22 36 M40 28 L41 40 M60 32 L61 44 M80 36 L81 48 M18 58 L17 70 M38 56 L37 68 M58 53 L57 65 M78 51 L77 63"/></g>`,
  planet: `<circle class="lk-ocean" cx="50" cy="50" r="40"/>
    <path class="lk-land" d="M22 40 Q30 22 46 26 Q52 36 44 44 Q34 50 26 56 Q18 50 22 40 Z"/>
    <path class="lk-land" d="M56 58 Q66 48 78 54 Q82 68 70 78 Q58 80 56 58 Z"/>
    <ellipse class="lk-shine2" cx="36" cy="30" rx="10" ry="5" transform="rotate(-30 36 30)"/>`,
  locked: `<circle class="lk-dark" cx="50" cy="50" r="44"/>
    <rect class="lk-lockbody" x="34" y="48" width="32" height="26" rx="6"/>
    <path class="lk-shackle" d="M40 48 V38 Q40 28 50 28 Q60 28 60 38 V48"/>`,
};

export function artSvg(key, cls = '') {
  return `<svg class="lk-art ${cls}" viewBox="0 0 100 100" aria-hidden="true">${ART[key] || ART.locked}</svg>`;
}

/** One ladder row: size label, the rung (rails + bar) with a slot, optional extra. */
export function rungRow(r, i, { slot = '', tag = '', button = false } = {}) {
  const lit = !!r.art;
  const el = button ? 'button type="button"' : 'div';
  const close = button ? 'button' : 'div';
  return `<${el} class="lk-row${lit ? '' : ' lk-row--dark'}" data-rung="${i}" style="--i:${i}"
      aria-label="${esc(`${r.size}${lit ? ', ' + r.name : ', dark for now'}`)}">
    <span class="lk-size">${esc(r.size)}</span>
    <span class="lk-rung"><span class="lk-slot">${slot}</span>${lit ? '' : '<span class="lk-lock" aria-hidden="true"></span>'}</span>
    ${tag}
  </${close}>`;
}

export const LADDER_CSS = `
.lk-ladder { display: flex; flex-direction: column; min-width: 0; position: relative; }
.lk-row {
  all: unset; box-sizing: border-box;
  display: grid; grid-template-columns: 70px minmax(0, 1fr); align-items: center;
  min-height: 36px; column-gap: var(--sim-space-2);
  font: inherit; color: inherit;
}
button.lk-row { cursor: pointer; }
button.lk-row:focus-visible .lk-rung { outline: 3px solid var(--sim-accent); outline-offset: 1px; }
.lk-size { text-align: right; font-size: var(--sim-text-sm); font-weight: 800; color: var(--sim-label); font-variant-numeric: tabular-nums; }
.lk-row--dark .lk-size { color: var(--sim-label-muted); }
.lk-rung {
  position: relative; display: flex; align-items: center; justify-content: center; gap: var(--sim-space-2);
  height: 36px;
  border-left: 6px solid var(--sim-wedge); border-right: 6px solid var(--sim-wedge);
  background: linear-gradient(var(--sim-wedge), var(--sim-wedge)) center / 100% 5px no-repeat;
}
.lk-row--dark .lk-rung {
  border-color: color-mix(in oklab, var(--sim-stroke) 70%, var(--sim-bg-deep));
  background: color-mix(in oklab, var(--sim-bg-deep) 70%, var(--sim-stroke)) linear-gradient(color-mix(in oklab, var(--sim-stroke) 70%, var(--sim-bg-deep)), color-mix(in oklab, var(--sim-stroke) 70%, var(--sim-bg-deep))) center / 100% 5px no-repeat;
}
.lk-slot { display: flex; align-items: center; justify-content: center; min-width: 0; }
.lk-lock {
  width: 16px; height: 13px; border-radius: 3px; background: var(--sim-label-muted);
  box-shadow: 0 -6px 0 -2px var(--sim-bg-deep), 0 -7px 0 0 var(--sim-label-muted);
}
.lk-chip {
  display: inline-flex; align-items: center; gap: var(--sim-space-1);
  padding: 2px var(--sim-space-2) 2px 2px;
  border-radius: var(--sim-radius-pill);
  background: var(--sim-bg-surface); border: 2px solid var(--sim-wedge);
  font-size: var(--sim-text-sm); font-weight: 800; white-space: nowrap;
}
.lk-chip .lk-art { width: 26px; height: 26px; }
.lk-art { display: block; width: 100%; height: auto; overflow: hidden; border-radius: 6px; }

.lk-ground { fill: color-mix(in oklab, var(--sim-good) 55%, var(--sim-bg-deep)); }
.lk-wall { fill: color-mix(in oklab, var(--sim-wedge) 45%, var(--sim-bg-surface)); }
.lk-roof { fill: var(--sim-series-6); }
.lk-door { fill: color-mix(in oklab, var(--sim-series-8) 60%, var(--sim-bg-deep)); }
.lk-pillar { fill: color-mix(in oklab, var(--sim-label-muted) 70%, var(--sim-bg-surface)); }
.lk-step { fill: var(--sim-label-muted); }
.lk-leaf { fill: var(--sim-good); }
.lk-shadow { fill: color-mix(in oklab, var(--sim-bg-deep) 70%, transparent); }
.lk-shirt { fill: var(--sim-series-1); }
.lk-shorts { fill: var(--sim-series-5); }
.lk-skin { fill: color-mix(in oklab, var(--sim-series-8) 55%, var(--sim-wedge)); }
.lk-hair { fill: color-mix(in oklab, var(--sim-stroke) 40%, var(--sim-bg-deep)); }
.lk-eye { fill: color-mix(in oklab, var(--sim-stroke) 30%, var(--sim-bg-deep)); }
.lk-smile { fill: none; stroke: color-mix(in oklab, var(--sim-stroke) 30%, var(--sim-bg-deep)); stroke-width: 2.5; stroke-linecap: round; }
.lk-blush { fill: var(--sim-series-4); opacity: 0.55; }
.lk-nail { fill: color-mix(in oklab, var(--sim-series-8) 25%, var(--sim-label)); opacity: 0.8; }
.lk-seed { fill: var(--sim-chloro); }
.lk-seedshade { fill: color-mix(in oklab, var(--sim-chloro) 60%, var(--sim-bg-deep)); }
.lk-shine { fill: color-mix(in oklab, var(--sim-chloro) 40%, var(--sim-label)); opacity: 0.8; }
.lk-hilum { fill: color-mix(in oklab, var(--sim-chloro) 25%, var(--sim-label)); }
.lk-root { fill: none; stroke: color-mix(in oklab, var(--sim-warning) 45%, var(--sim-label-muted)); stroke-width: 6; stroke-linecap: round; }
.lk-rootbody { fill: color-mix(in oklab, var(--sim-warning) 40%, var(--sim-label-muted)); }
.lk-cap { fill: color-mix(in oklab, var(--sim-warning) 70%, var(--sim-label-muted)); }
.lk-fur path { fill: none; stroke: color-mix(in oklab, var(--sim-warning) 30%, var(--sim-label-muted)); stroke-width: 2.5; stroke-linecap: round; }
.lk-ropes rect { fill: color-mix(in oklab, var(--sim-warning) 40%, var(--sim-label-muted)); }
.lk-bricks path { fill: none; stroke: color-mix(in oklab, var(--sim-warning) 30%, var(--sim-bg-deep)); stroke-width: 2; opacity: 0.6; }
.lk-ocean { fill: var(--sim-series-1); }
.lk-land { fill: var(--sim-series-3); }
.lk-shine2 { fill: var(--sim-label); opacity: 0.25; }
.lk-dark { fill: color-mix(in oklab, var(--sim-bg-deep) 80%, var(--sim-stroke)); }
.lk-lockbody { fill: var(--sim-label-muted); }
.lk-shackle { fill: none; stroke: var(--sim-label-muted); stroke-width: 6; }
`;
