/**
 * SeedRaceScene-vital-force - blk-l00-01-03-s06 (what-if). Kabir's spark
 * model against five seeds: fresh, boiled 10 s, soaked at 60 C, kept dry for
 * fifty years, half-boiled.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - what each seed actually did; the half-boiled card waits for a prediction.
 *   1 run   - the learner turns the dial. Model ON: every card becomes spark or no
 *             spark, and "why?" tags mark what the model cannot explain.
 *   2 nails - Ajji's VITAL FORCE ? card is pinned up. The dial stays live.
 *
 * DomSimulation, not canvas: a row of comparison cards with short labels is the
 * DOM row of docs/simulation-authoring.md section 3. The flip and the spark glow
 * are CSS animations; there is no frame loop.
 */
import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { esc } from 'simulations/base/SimUi.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];

// obs: what the seed did. spark: what the spark model draws. why: what it cannot explain.
const SEEDS = [
  { id: 'fresh', name: 'fresh', obs: 'sprouts', obsKind: 'good', art: 'sprout', spark: 'on', model: 'spark', why: null },
  { id: 'boil', name: 'boiled 10 s', obs: 'never', obsKind: 'bad', art: 'boiled', spark: 'off', model: 'no spark', why: 'why 10 s?' },
  { id: 'warm', name: 'soaked 60\u00a0\u00b0C', obs: 'sprouts', obsKind: 'good', art: 'sprout', spark: 'on', model: 'spark', why: 'why not 60\u00a0\u00b0C?' },
  { id: 'old', name: 'dry 50 years', obs: 'sprouts', obsKind: 'good', art: 'sprout', spark: 'on', model: 'spark', why: 'how 50 years?' },
  { id: 'half', name: 'half-boiled', obs: '?', obsKind: 'q', art: 'half', spark: 'half', model: 'half a spark?', why: null },
];

function seedSvg(art) {
  const boiled = art === 'boiled';
  const sprout = art === 'sprout';
  return `<svg class="vf-svg" viewBox="0 0 100 84" aria-hidden="true">
    <ellipse class="vf-shade" cx="44" cy="52" rx="${boiled ? 28 : 25}" ry="${boiled ? 19 : 17}"/>
    <ellipse class="vf-coat${boiled ? ' vf-coat--boiled' : ''}" cx="44" cy="48" rx="${boiled ? 28 : 25}" ry="${boiled ? 19 : 17}"/>
    <ellipse class="vf-shine" cx="35" cy="41" rx="8" ry="4"/>
    <rect class="vf-hilum" x="44" y="56" width="14" height="4" rx="2"/>
    ${sprout ? `<g class="vf-growth">
      <path class="vf-root" d="M66 52 Q80 62 76 80"/>
      <path class="vf-stem" d="M62 40 Q70 26 64 16"/>
      <ellipse class="vf-leaf" cx="56" cy="14" rx="9" ry="5" transform="rotate(-25 56 14)"/>
      <ellipse class="vf-leaf" cx="72" cy="13" rx="9" ry="5" transform="rotate(25 72 13)"/>
    </g>` : ''}
  </svg>`;
}

const STAR = '<path d="M20 4 Q22.5 17.5 36 20 Q22.5 22.5 20 36 Q17.5 22.5 4 20 Q17.5 17.5 20 4Z"/>';

/** The model's spark: a star with a halo, or an empty dashed ring. */
function sparkSvg(kind, extra = '') {
  if (kind === 'off') return `<span class="vf-spark vf-spark--off ${extra}" aria-hidden="true"></span>`;
  return `<svg class="vf-spark vf-spark--${kind} ${extra}" viewBox="0 0 40 40" aria-hidden="true">`
    + `<circle class="vf-halo" cx="20" cy="20" r="17"/>${STAR}</svg>`;
}

function card(s) {
  return `<article class="sim-card vf-card" data-kind="${s.id}" aria-label="${esc(s.name)}">
    <div class="vf-art">
      <div class="vf-layer vf-layer--obs">${seedSvg(s.art)}${s.art === 'half' ? '<span class="sim-q vf-bigq" aria-hidden="true">?</span>' : ''}</div>
      <div class="vf-layer vf-layer--model">${seedSvg(s.art === 'sprout' ? 'plain' : s.art)}${sparkSvg(s.spark)}</div>
    </div>
    <h3 class="vf-name">${esc(s.name)}</h3>
    <p class="vf-out vf-out--obs vf-out--${s.obsKind}">${esc(s.obs)}</p>
    <p class="vf-out vf-out--model vf-out--${s.spark}">${esc(s.model)}</p>
    ${s.why ? `<span class="sim-tag vf-why">${esc(s.why)}</span>` : '<span class="vf-why vf-why--none" aria-hidden="true"></span>'}
  </article>`;
}

const CSS = `
.vf-top { display: flex; align-items: center; justify-content: center; gap: var(--sim-space-3); min-height: 44px; flex-wrap: wrap; }
.vf-hint { border-color: var(--sim-accent); animation: vf-bob 1.2s ease-in-out infinite; }
.vf-legend { display: none; align-items: center; gap: var(--sim-space-2); font-size: var(--sim-text-md); font-weight: 800; }
.vf-legend .vf-mini { width: 22px; height: 22px; }
.vf-pin {
  display: none;
  align-items: center;
  gap: var(--sim-space-2);
  padding: var(--sim-space-2) var(--sim-space-4);
  border: var(--sim-border);
  border-color: var(--sim-warning);
  border-radius: var(--sim-radius-sm);
  background: var(--sim-bg-surface);
  box-shadow: 0 var(--sim-lift) 0 var(--sim-warning);
  font: 700 var(--sim-text-xl)/1 var(--sim-font-display);
  letter-spacing: 0.04em;
  transform: rotate(-3deg);
}
.vf-pin::before {
  content: '';
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--sim-series-6);
  box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-series-6) 60%, var(--sim-bg-deep));
}
.sim-ui[data-step="2"] .vf-pin { display: flex; animation: vf-pin-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.sim-ui[data-step="2"] .vf-hint { display: none; }

.vf-cards { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--sim-space-3); }
.sim-dom-root--portrait .vf-cards { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sim-space-2); }
.vf-card { align-items: center; text-align: center; gap: var(--sim-space-2); padding: var(--sim-space-2); }
.sim-ui[data-step="0"] .vf-card[data-kind="half"] { border-color: var(--sim-accent); box-shadow: 0 var(--sim-lift) 0 var(--sim-accent); }
.vf-art { display: grid; place-items: center; width: 100%; aspect-ratio: 100 / 84; }
.vf-layer { grid-area: 1 / 1; display: grid; place-items: center; width: 100%; height: 100%; transition: opacity 0.3s ease; }
.vf-layer > * { grid-area: 1 / 1; }
.vf-layer--model { opacity: 0; }
.vf-svg { width: 100%; height: auto; display: block; }
.vf-shade { fill: color-mix(in oklab, var(--sim-chloro) 60%, var(--sim-bg-deep)); }
.vf-coat { fill: var(--sim-chloro); }
.vf-coat--boiled { fill: color-mix(in oklab, var(--sim-chloro) 50%, var(--sim-waste)); }
.vf-shine { fill: color-mix(in oklab, var(--sim-chloro) 45%, var(--sim-label)); opacity: 0.7; }
.vf-hilum { fill: color-mix(in oklab, var(--sim-chloro) 25%, var(--sim-label)); }
.vf-root { fill: none; stroke: color-mix(in oklab, var(--sim-warning) 45%, var(--sim-label-muted)); stroke-width: 5; stroke-linecap: round; }
.vf-stem { fill: none; stroke: var(--sim-good); stroke-width: 3; stroke-linecap: round; }
.vf-leaf { fill: var(--sim-good); }
.vf-growth { transform-origin: 62px 48px; animation: vf-grow 2.4s ease-in-out infinite alternate; }
.vf-bigq { width: 34px; height: 34px; font-size: var(--sim-text-xl); background: var(--sim-bg-surface); }

.vf-spark { width: 46px; height: 46px; margin: 10% 0 0 -12%; }
.vf-spark path { fill: var(--sim-warning); stroke: color-mix(in oklab, var(--sim-warning) 55%, var(--sim-bg-deep)); stroke-width: 1.5; }
.vf-halo { fill: var(--sim-warning); opacity: 0.28; }
.vf-spark--on, .vf-spark--half { animation: vf-pulse 1.4s ease-in-out infinite; }
.vf-spark--half { animation: vf-flicker 0.9s steps(2, jump-none) infinite; }
.vf-spark--off { width: 30px; height: 30px; border: 3px dashed var(--sim-label-muted); border-radius: 50%; }
.vf-legend .vf-spark { margin: 0; }

.vf-name { margin: 0; font-size: var(--sim-text-md); font-weight: 800; line-height: 1.2; min-height: 2.4em; display: grid; place-items: center; }
.vf-out {
  margin: 0; width: 100%;
  padding: var(--sim-space-1) var(--sim-space-2);
  border-radius: var(--sim-radius-pill);
  font-size: var(--sim-text-sm); font-weight: 800;
  color: var(--sim-bg-deep);
}
.vf-out--good { background: var(--sim-good); }
.vf-out--bad { background: var(--sim-bad); }
.vf-out--q { background: var(--sim-accent); }
.vf-out--on, .vf-out--half { background: var(--sim-warning); }
.vf-out--off { background: var(--sim-label-muted); }
.vf-out--model { display: none; }
.vf-why { visibility: hidden; border-color: var(--sim-warning); line-height: 1.15; }
.vf-why--none { min-height: 1px; }

.sim-ui[data-mode="on"] .vf-layer--obs { opacity: 0; }
.sim-ui[data-mode="on"] .vf-layer--model { opacity: 1; }
.sim-ui[data-mode="on"] .vf-out--obs { display: none; }
.sim-ui[data-mode="on"] .vf-out--model { display: block; }
.sim-ui[data-mode="on"] .vf-why { visibility: visible; animation: vf-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both; }
.sim-ui[data-mode="on"] .vf-legend { display: flex; }
.sim-ui[data-mode="on"] .vf-card { animation: vf-flip-on 0.45s ease both; }
.sim-ui[data-mode="off"] .vf-card { animation: vf-flip-off 0.45s ease both; }
.sim-ui[data-mode="on"] .vf-hint, .sim-ui[data-dialled="1"] .vf-hint { display: none; }
.sim-ui[data-step="0"] .vf-hint { display: none; }

@keyframes vf-flip-on { 0% { transform: rotateY(0); } 50% { transform: rotateY(90deg); } 100% { transform: rotateY(0); } }
@keyframes vf-flip-off { 0% { transform: rotateY(0); } 50% { transform: rotateY(-90deg); } 100% { transform: rotateY(0); } }
@keyframes vf-pulse { 0%, 100% { transform: scale(0.85); } 50% { transform: scale(1.15); } }
@keyframes vf-flicker { 0% { opacity: 1; } 100% { opacity: 0.15; } }
@keyframes vf-grow { from { transform: scale(0.92); } to { transform: scale(1.04); } }
@keyframes vf-pop { from { transform: scale(0.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes vf-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes vf-pin-in { from { transform: translateY(-30px) rotate(-12deg) scale(1.3); opacity: 0; } to { transform: rotate(-3deg); opacity: 1; } }
`;

export class SeedRaceSceneVitalForce extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 328;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 556;
  static FIT = true;
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'Five seeds: fresh, boiled ten seconds, soaked at sixty degrees, kept dry fifty years, and half-boiled. ' +
    'Observed: all sprout except the boiled one; the half-boiled one is untested. With the vital force dial on, ' +
    'each becomes only spark or no spark, and the model cannot say why ten seconds kills, why sixty degrees ' +
    'does not, or how a dry seed keeps its spark for fifty years.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Vital force model: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Vital force model: ON', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';           // read by the host to highlight the active dial button
    this._dialled = false;
  }

  async setup() {
    await super.setup();
    this.render({
      css: CSS,
      html: `<div class="vf-top">
          <div class="vf-pin" role="note">VITAL FORCE <span class="sim-q" aria-hidden="true">?</span></div>
          <span class="sim-tag vf-hint">turn the dial</span>
          <div class="vf-legend">the model draws:
            ${sparkSvg('on', 'vf-mini')} spark
            ${sparkSvg('off', 'vf-mini')} no spark
          </div>
        </div>
        <div class="vf-cards">${SEEDS.map(card).join('')}</div>`,
    });
    this.onStep(0);
  }

  isControlHidden() {
    return this.stepIndex === 0;
  }

  onStep(step) {
    if (step === 0) this._setMode('off');
  }

  onControlChange(id) {
    if (this.isControlHidden(id) || (id !== 'on' && id !== 'off')) return;
    this._dialled = true;
    if (this.root) this.root.dataset.dialled = '1';
    this._setMode(id);
    this.requestUiUpdate?.();
  }

  _setMode(mode) {
    this.mode = mode;
    if (!this.root) return;
    // 'rest' until the learner first turns the dial, so the flip does not play on load.
    this.root.dataset.mode = mode === 'off' && !this._dialled ? 'rest' : mode;
    this.refit();
  }
}
