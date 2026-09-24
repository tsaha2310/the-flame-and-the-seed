/**
 * ZoomLadderScene-full-ladder-locked - blk-l00-01-04-s03 (explain). The whole
 * powers-of-ten ladder, lit where the learner has words and locked below, and
 * the route the eight Books take along it.
 *
 * Beats (the slide's five paragraphs, splitSteps() counts 5):
 *   0 Powers of ten - each step down multiplies: x10, x100 ... x1 000 000 at 1 um,
 *                     where the smallest living things are.
 *   1 About ten     - verandah to the smallest piece: about ten rungs; each Book goes
 *                     down a rung or two and back up.
 *   2 Which rung    - a "you are here" pin; Up / Down move it and read out the rung.
 *   3 The route     - the route panel opens.
 *   4 The Books     - I to IV go down, V to VIII come back up, past the top to the planet.
 *
 * The Books are listed along the route in the slide's order, not pinned to
 * rungs (see GENERATION-LOG: the slide and the brief disagree on Books I-IV).
 * DomSimulation: a labelled vertical diagram; no frame loop.
 */
import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { esc } from 'simulations/base/SimUi.js';
import { STORY_DOM_CSS } from '../shared/StoryDom.js';
import { RUNGS, artSvg, rungRow, LADDER_CSS } from './LadderKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const PIN_FROM = 2;
const ONE_M = 1;                       // rung index of 1 m
const LIVING = 7;                      // 1 um: the smallest living things
const HERE = 3;                        // today: the sprouting seed (1 cm)

const DOWN = [['I', 'the grain'], ['II', 'the grip'], ['III', 'the blaze'], ['IV', 'the ladder']];
const UP = [['V', 'the slow fire'], ['VI', 'the tape'], ['VII', 'the whisper'], ['VIII', 'the long game']];

const NB = '\u202f';
function big(n) {
  return String(10 ** n).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
}
/** On the ladder: each rung down divides. */
function per(n) { return '\u00f7' + big(n); }
/** In the panel: "N times smaller". */
function times(n) { return big(n) + '\u00d7'; }

function bookChip([num, name], i) {
  return `<li class="fl-book" style="--i:${i}"><span class="fl-book__num">${num}</span>${esc(name)}</li>`;
}

const CSS = STORY_DOM_CSS + LADDER_CSS + `
.sim-ui { position: relative; }
.fl { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: var(--sim-space-4); }
.fl .lk-row { grid-template-columns: 76px minmax(0, 1fr) 112px; }
.fl .lk-size { white-space: nowrap; }
.fl-planet { opacity: 0; }
.sim-ui[data-step="4"] .fl-planet { animation: fl-rise 0.5s ease 0.9s both; }
.fl-planet .lk-rung { border-style: dashed; border-color: var(--sim-series-1); background: none; }
.fl-planet .lk-size { color: var(--sim-series-1); }

.fl .lk-row > .fl-tag { grid-column: 3; grid-row: 1; }
.fl-tag {
  justify-self: start; font-size: var(--sim-text-sm); font-weight: 800; white-space: nowrap;
  padding: 1px var(--sim-space-2); border-radius: var(--sim-radius-pill);
  opacity: 0;
}
.fl-mult { color: var(--sim-wedge); }
.sim-ui[data-step="0"] .fl-mult { animation: fl-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: calc(0.3s + var(--k) * 0.45s); }
.sim-ui[data-step="0"] .fl-row--hop .lk-rung { animation: fl-flash 0.6s ease both; animation-delay: calc(0.3s + var(--k) * 0.45s); }
.fl-life { background: var(--sim-good); color: var(--sim-bg-deep); align-self: center; font-size: var(--sim-text-md); padding: var(--sim-space-1) var(--sim-space-3); }
.sim-ui[data-step="0"] .fl-life { animation: fl-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 3.1s both; }
.fl-pin { background: var(--sim-accent); color: var(--sim-bg-deep); }
.sim-ui[data-step="2"] .fl-pin, .sim-ui[data-step="3"] .fl-pin, .sim-ui[data-step="4"] .fl-pin { opacity: 1; animation: fl-bob 1.4s ease-in-out infinite; }
.fl-row--here .lk-rung { box-shadow: 0 0 0 3px var(--sim-accent); border-radius: 4px; }
.sim-ui[data-step="0"] .fl-row--here .lk-rung, .sim-ui[data-step="1"] .fl-row--here .lk-rung { box-shadow: none; }

.fl-side { display: grid; min-width: 0; }
.fl-panel { grid-area: 1 / 1; display: none; flex-direction: column; gap: var(--sim-space-3); align-content: start; }
.sim-ui[data-step="0"] .fl-panel--p0, .sim-ui[data-step="1"] .fl-panel--p1, .sim-ui[data-step="2"] .fl-panel--p2,
.sim-ui[data-step="3"] .fl-panel--route, .sim-ui[data-step="4"] .fl-panel--route { display: flex; }
.fl-panel .sim-field { animation: fl-rise 0.35s ease both; animation-delay: calc(0.3s + (var(--i, 1) - 1) * 0.45s); }
.fl-brass {
  align-self: center; padding: 5px; border-radius: 50%;
  background: color-mix(in oklab, var(--sim-wedge) 75%, var(--sim-bg-deep));
  border: 3px dotted color-mix(in oklab, var(--sim-wedge) 35%, var(--sim-bg-deep));
  box-shadow: 0 5px 0 color-mix(in oklab, var(--sim-wedge) 40%, var(--sim-bg-deep));
}
.fl-glass { width: 150px; aspect-ratio: 1; border-radius: 50%; overflow: hidden; display: grid; place-items: center;
  background: color-mix(in oklab, var(--sim-bg-surface) 70%, var(--sim-series-1)); }
.fl-glass--dark { background: color-mix(in oklab, var(--sim-bg-deep) 85%, var(--sim-stroke)); }
.fl-view { width: 78%; }
.sim-dom-root--portrait .fl-glass { width: 110px; }
.fl-big { margin: 0; font: 700 var(--sim-text-2xl)/1.1 var(--sim-font-display); text-align: center; }
.fl-yoyo { width: 120px; align-self: center; }
.fl-yoyo__lens { animation: fl-yoyo 2.4s ease-in-out infinite; }
.fl-yoyo__rail { stroke: var(--sim-wedge); stroke-width: 5; stroke-linecap: round; fill: none; }
.fl-yoyo__glass { fill: color-mix(in oklab, var(--sim-bg-surface) 60%, var(--sim-series-1)); stroke: color-mix(in oklab, var(--sim-wedge) 70%, var(--sim-bg-deep)); stroke-width: 4; }

.fl-route { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sim-space-3); }
.fl-col { display: flex; flex-direction: column; gap: var(--sim-space-2); min-width: 0; }
.fl-col__head { display: flex; align-items: center; gap: var(--sim-space-2); font-weight: 800; font-size: var(--sim-text-md); }
.fl-arrow { font-size: var(--sim-text-2xl); line-height: 1; font-weight: 800; }
.fl-col--down .fl-arrow { color: var(--sim-series-5); }
.fl-col--up .fl-arrow { color: var(--sim-series-3); }
.fl-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: var(--sim-space-2); }
.fl-book {
  display: flex; align-items: center; gap: var(--sim-space-2);
  padding: 3px var(--sim-space-2) 3px 3px; border-radius: var(--sim-radius-pill);
  background: var(--sim-bg-surface); border: 2px solid var(--sim-stroke);
  font-size: var(--sim-text-sm); font-weight: 800; white-space: nowrap;
  opacity: 0;
}
.fl-col--down .fl-book { border-color: var(--sim-series-5); }
.fl-col--up .fl-book { border-color: var(--sim-series-3); }
.fl-book__num {
  min-width: 34px; text-align: center; padding: 2px 6px; border-radius: var(--sim-radius-pill);
  color: var(--sim-bg-deep); font-weight: 800;
}
.fl-col--down .fl-book__num { background: var(--sim-series-5); }
.fl-col--up .fl-book__num { background: var(--sim-series-3); }
.sim-ui[data-step="4"] .fl-book { animation: fl-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: calc(0.2s + var(--i) * 0.15s); }
.fl-col--up .fl-book { animation-delay: calc(0.9s + var(--i) * 0.15s) !important; }
.fl-planet-note { opacity: 0; font-weight: 800; font-size: var(--sim-text-sm); color: var(--sim-series-1); }
.sim-ui[data-step="4"] .fl-planet-note { animation: fl-rise 0.4s ease 1.6s both; }

.sim-dom-root--portrait .fl { grid-template-columns: minmax(0, 1fr) minmax(0, 0.95fr); gap: var(--sim-space-2); }
.sim-dom-root--portrait .fl .lk-row { grid-template-columns: 50px minmax(0, 1fr) 0; }
.sim-dom-root--portrait .fl .lk-size { white-space: normal; }
.sim-dom-root--portrait .fl-tag { display: none; }
.sim-dom-root--portrait .lk-chip .fl-name { display: none; }
.sim-dom-root--portrait .fl-route { grid-template-columns: minmax(0, 1fr); }

@keyframes fl-pop { from { transform: scale(0.3); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes fl-rise { from { transform: translateY(8px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes fl-flash { 0% { box-shadow: 0 0 0 0 var(--sim-wedge); } 40% { box-shadow: 0 0 0 5px var(--sim-wedge); } 100% { box-shadow: 0 0 0 0 transparent; } }
@keyframes fl-bob { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-4px); } }
@keyframes fl-yoyo { 0%, 100% { transform: translateY(0); } 40%, 60% { transform: translateY(42px); } }
`;

const YOYO = `<svg class="fl-yoyo" viewBox="0 0 120 120" aria-hidden="true">
  <path class="fl-yoyo__rail" d="M36 6 V114 M84 6 V114 M36 20 H84 M36 48 H84 M36 76 H84 M36 104 H84"/>
  <g class="fl-yoyo__lens"><circle class="fl-yoyo__glass" cx="60" cy="20" r="14"/></g>
</svg>`;

export class ZoomLadderSceneFullLadderLocked extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 504;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 516;
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'The whole powers-of-ten ladder, from a 10 metre verandah down to 0.1 nanometres: each step down is ten ' +
    'times smaller, and six steps below a metre is a millionth of a metre, where the smallest living things are. ' +
    'Rungs below the width of a hair are locked for now. A pin marks which rung you are on. Books I to IV go ' +
    'down the ladder; Books V to VIII come back up, past the top to the planet.';

  static CONTROLS = [
    { type: 'button', id: 'up', label: 'Pin up a rung' },
    { type: 'button', id: 'down', label: 'Pin down a rung' },
  ];

  constructor(container, config) {
    super(container, config);
    this._pin = HERE;
  }

  async setup() {
    await super.setup();
    const rows = RUNGS.map((r, i) => {
      const k = i - ONE_M;
      const hop = i > ONE_M && i <= LIVING;
      let tag = '<span class="fl-tag"></span>';
      if (hop) tag = `<span class="fl-tag fl-mult" style="--k:${k}">${per(k)}</span>`;
      const slot = r.art ? `<span class="lk-chip">${artSvg(r.art)}<span class="fl-name">${esc(r.name)}</span></span>` : '';
      return rungRow(r, i, { slot, tag }).replace('class="lk-row', `class="lk-row${hop ? ' fl-row--hop' : ''}`)
        .replace('style="--i:', `style="--k:${k};--i:`);
    }).join('');
    const planet = `<div class="lk-row fl-planet" aria-label="the planet, about ten thousand kilometres">
      <span class="lk-size">10\u202f000 km</span>
      <span class="lk-rung"><span class="lk-slot"><span class="lk-chip">${artSvg('planet')}<span class="fl-name">planet</span></span></span></span>
      <span class="fl-tag"></span></div>`;
    this.render({
      css: CSS,
      rootClass: 'sd-wall',
      html: `<div class="fl">
          <div class="lk-ladder fl-ladder" aria-label="Powers of ten ladder">${planet}${rows}</div>
          <div class="fl-side">
            <div class="fl-panel fl-panel--p0">
              <p class="fl-big">1 step = ${times(1)} smaller</p>
              <div class="sim-field" style="--i:2"><span class="sim-field__label">2 steps</span><span class="sim-field__value">${times(2)}</span></div>
              <div class="sim-field" style="--i:3"><span class="sim-field__label">3 steps</span><span class="sim-field__value">${times(3)}</span></div>
              <div class="sim-field" style="--i:6"><span class="sim-field__label">6 steps</span><span class="sim-field__value">${times(6)}</span></div>
              <span class="fl-tag fl-life">1 \u00b5m: smallest living things</span>
            </div>
            <div class="fl-panel fl-panel--p1">
              <p class="fl-big">about 10 rungs</p>
              <div class="sim-field" style="--i:0"><span class="sim-field__label">top</span><span class="sim-field__value">verandah, 10 m</span></div>
              <div class="sim-field" style="--i:1"><span class="sim-field__label">bottom</span><span class="sim-field__value">0.1 nm</span></div>
              ${YOYO}
              <p class="sim-meta">each Book: down a rung or two, then back up</p>
            </div>
            <div class="fl-panel fl-panel--p2">
              <div class="fl-brass"><div class="fl-glass"><div class="fl-view"></div></div></div>
              <p class="fl-big fl-read-size"></p>
              <div class="sim-field"><span class="sim-field__label">from 1 m</span><span class="sim-field__value fl-read-steps"></span></div>
              <div class="sim-field"><span class="sim-field__label">you see it?</span><span class="sim-field__value fl-read-lit"></span></div>
            </div>
            <div class="fl-panel fl-panel--route">
              <p class="fl-big">the whole route</p>
              <div class="fl-route">
                <div class="fl-col fl-col--down"><div class="fl-col__head"><span class="fl-arrow" aria-hidden="true">\u2193</span>go down</div>
                  <ul class="fl-list">${DOWN.map(bookChip).join('')}</ul></div>
                <div class="fl-col fl-col--up"><div class="fl-col__head"><span class="fl-arrow" aria-hidden="true">\u2191</span>come back up</div>
                  <ul class="fl-list">${UP.map(bookChip).join('')}</ul>
                  <span class="fl-planet-note">\u2191 to the planet</span></div>
              </div>
            </div>
          </div>
        </div>`,
    });
    this._ladder = this.root.querySelector('.fl-ladder');
    this._movePin(HERE);
    this.onStep(this.stepIndex);
  }

  onStep() {
    this.requestUiUpdate?.();
  }

  isControlHidden() {
    return this.stepIndex < PIN_FROM;
  }

  isControlDisabled(id) {
    if (id === 'up') return this._pin <= 0;
    if (id === 'down') return this._pin >= RUNGS.length - 1;
    return false;
  }

  onControlChange(id) {
    if (this.isControlHidden(id) || this.isControlDisabled(id)) return;
    this._movePin(this._pin + (id === 'down' ? 1 : -1));
    this.requestUiUpdate?.();
  }

  _movePin(i) {
    this._pin = Math.max(0, Math.min(RUNGS.length - 1, i));
    const view = this.root && this.root.querySelector('.fl-view');
    if (!this._ladder || !view) return;   // not mounted (or a headless fake DOM)
    for (const row of this._ladder.querySelectorAll('.lk-row[data-rung]')) {
      const here = Number(row.dataset.rung) === this._pin;
      row.classList.toggle('fl-row--here', here);
      const old = row.querySelector('.fl-pin');
      if (old) old.remove();
      if (here) {
        row.insertAdjacentHTML('beforeend', '<span class="fl-tag fl-pin">\u2190 you are here</span>');
      }
    }
    const r = RUNGS[this._pin];
    const n = ONE_M - this._pin;
    this.root.querySelector('.fl-read-size').textContent = r.size;
    view.innerHTML = artSvg(r.art || 'locked');
    this.root.querySelector('.fl-glass').classList.toggle('fl-glass--dark', !r.art);
    view.animate?.([{ transform: 'scale(0.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 350, easing: 'ease-out' });
    this.root.querySelector('.fl-read-steps').textContent =
      n === 0 ? 'this is 1 m' : n > 0 ? `${times(n)} bigger` : `${-n} rung${n === -1 ? '' : 's'} down, \u00f7${String(10 ** -n).replace(/\B(?=(\d{3})+(?!\d))/g, NB)}`;
    this.root.querySelector('.fl-read-lit').textContent = r.art ? `yes: ${r.name}` : 'dark for now';
  }
}
