/**
 * ZoomLadderScene - blk-l00-01-04-s02 (observe, skill game). The powers-of-ten
 * ladder from Ajji's verandah (10 m) down to 0.1 nm, and five things to put on it.
 *
 * Beats (the slide's four paragraphs, splitSteps() counts 4):
 *   0 Lens card   - the first honesty card: what the Lens changes in this picture.
 *   1 The ladder  - a rung for every "ten times smaller"; the steps light down the side.
 *   2 The list    - the five objects arrive in the tray; rungs below the hair are dark.
 *   3 Drag        - drag (or tap, then tap a rung) each object onto its rung; wrong rungs
 *                   say how many times too big or small. Then Go down a rung: the Lens
 *                   zooms past the root hairs into the dark rungs.
 *
 * DomSimulation: a labelled board with tokens (the kit's default for a skill game);
 * tokens and rungs are real buttons, so it also plays by keyboard.
 */
import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { esc } from 'simulations/base/SimUi.js';
import { STORY_DOM_CSS, lensCardHtml, burst } from '../shared/StoryDom.js';
import { RUNGS, LIT, artSvg, rungRow, LADDER_CSS } from './LadderKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
];
const PLAY = 3;

// Tray order is deliberately not the ladder order. Targets are rung indexes;
// the seed (about 5 mm) sits between the 1 cm and 1 mm rungs, so both count.
const OBJECTS = [
  { id: 'hand', art: 'hand', name: 'hand', about: 'about 10 cm', targets: [2] },
  { id: 'verandah', art: 'verandah', name: 'verandah', about: 'about 10 m', targets: [0] },
  { id: 'hairs', art: 'hairs', name: 'root hairs', about: 'under 0.1 mm', targets: [5] },
  { id: 'kabir', art: 'kabir', name: 'Kabir', about: 'about 1 m', targets: [1] },
  { id: 'seed', art: 'seed', name: 'moong seed', about: 'about 5 mm', targets: [3, 4] },
];

const ICON_LADDER = '<svg viewBox="0 0 36 36"><path d="M10 3 V33 M26 3 V33 M10 9 H26 M10 18 H26 M10 27 H26" fill="none" stroke="var(--sim-wedge)" stroke-width="3.5" stroke-linecap="round"/></svg>';
const ICON_COLOUR = '<svg viewBox="0 0 36 36"><circle cx="11" cy="12" r="7" fill="var(--sim-series-6)"/><circle cx="25" cy="12" r="7" fill="var(--sim-series-3)"/><circle cx="18" cy="25" r="7" fill="var(--sim-series-1)"/></svg>';
const ICON_CARD = '<svg viewBox="0 0 36 36"><rect x="5" y="7" width="26" height="22" rx="4" fill="none" stroke="var(--sim-accent)" stroke-width="3"/><path d="M11 15 H25 M11 21 H21" stroke="var(--sim-accent)" stroke-width="3" stroke-linecap="round"/></svg>';

function tokenHtml(o) {
  return `<button type="button" class="zl-token" data-obj="${o.id}" aria-label="${esc(o.name)}, ${esc(o.about)}">
    ${artSvg(o.art)}<span class="zl-token__name">${esc(o.name)}</span></button>`;
}

const CSS = STORY_DOM_CSS + LADDER_CSS + `
.sim-ui { position: relative; }
.zl { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: var(--sim-space-4); position: relative; }
.zl .lk-row { grid-template-columns: 64px minmax(0, 1fr) 40px; }
.zl-hop {
  justify-self: start; font-size: var(--sim-text-sm); font-weight: 800; color: var(--sim-wedge);
  opacity: 0; transform: translateY(-18px);
}
.sim-ui:not([data-step="0"]) .zl-hop { animation: zl-hop-in 0.35s ease both; animation-delay: calc(var(--i) * 0.12s); }
.zl-row--here .lk-rung { box-shadow: 0 0 0 3px var(--sim-accent); border-radius: 4px; }
.zl-row--hot .lk-rung { box-shadow: 0 0 0 3px var(--sim-good); border-radius: 4px; }

.zl-side { display: flex; flex-direction: column; gap: var(--sim-space-3); min-width: 0; }
.zl-lens { display: flex; flex-direction: column; align-items: center; gap: var(--sim-space-2); }
.zl-brass {
  padding: 6px; border-radius: 50%;
  background: color-mix(in oklab, var(--sim-wedge) 75%, var(--sim-bg-deep));
  border: 3px dotted color-mix(in oklab, var(--sim-wedge) 35%, var(--sim-bg-deep));
  box-shadow: 0 5px 0 color-mix(in oklab, var(--sim-wedge) 40%, var(--sim-bg-deep));
}
.zl-glass {
  width: 180px; aspect-ratio: 1; border-radius: 50%; overflow: hidden; position: relative;
  background: color-mix(in oklab, var(--sim-bg-surface) 70%, var(--sim-series-1));
  display: grid; place-items: center;
}
.zl-glass::after {
  content: ''; position: absolute; inset: 10% 45% 55% 12%;
  border-radius: 50%; border-top: 5px solid color-mix(in oklab, var(--sim-glass) 60%, transparent);
  transform: rotate(-30deg); pointer-events: none;
}
.zl-glass--dark { background: color-mix(in oklab, var(--sim-bg-deep) 85%, var(--sim-stroke)); }
.zl-view { width: 78%; }
.zl-readout { display: flex; gap: var(--sim-space-2); align-items: center; flex-wrap: wrap; justify-content: center; }
.zl-readout .sim-tag { border-color: var(--sim-accent); font-size: var(--sim-text-md); }
.zl-name { font-weight: 800; font-size: var(--sim-text-lg); }

.zl-tray { display: flex; flex-wrap: wrap; gap: var(--sim-space-2); justify-content: center; min-height: 104px; align-content: flex-start; }
.sim-ui[data-step="0"] .zl-tray, .sim-ui[data-step="1"] .zl-tray { visibility: hidden; }
.zl-token {
  all: unset; box-sizing: border-box; cursor: grab; touch-action: none;
  display: inline-flex; align-items: center; gap: var(--sim-space-1);
  padding: 3px var(--sim-space-3) 3px 3px;
  border: 2px solid var(--sim-wedge); border-radius: var(--sim-radius-pill);
  background: var(--sim-bg-surface); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-wedge) 50%, var(--sim-bg-deep));
  font-weight: 800; font-size: var(--sim-text-md); color: var(--sim-label);
  animation: zl-drop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.zl-token .lk-art { width: 34px; height: 34px; }
.zl-token:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: 2px; }
.zl-token--sel { border-color: var(--sim-accent); box-shadow: 0 var(--sim-lift) 0 var(--sim-accent); transform: translateY(-3px); }
.zl-token--drag { pointer-events: none; z-index: 4; position: relative; cursor: grabbing; }
.sim-ui:not([data-step="3"]) .zl-token { pointer-events: none; }
.zl-token--placed {
  cursor: default; pointer-events: none; padding: 1px var(--sim-space-2) 1px 1px;
  font-size: var(--sim-text-sm); border-color: var(--sim-good); box-shadow: none;
  animation: zl-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.zl-token--placed .lk-art { width: 26px; height: 26px; }
.zl-msg {
  margin: 0; min-height: 36px; text-align: center; font-weight: 800; font-size: var(--sim-text-md);
  padding: var(--sim-space-1) var(--sim-space-3); border-radius: var(--sim-radius-pill);
}
.zl-msg--good { background: var(--sim-good); color: var(--sim-bg-deep); }
.zl-msg--bad { background: var(--sim-bad); color: var(--sim-bg-deep); }
.zl-msg--hint { background: var(--sim-accent); color: var(--sim-bg-deep); }
.sim-ui:not([data-step="3"]) .zl-msg { visibility: hidden; }

.sim-ui:not([data-step="0"]) .sd-lens { display: none; }

.sim-dom-root--portrait .zl { grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr); gap: var(--sim-space-2); }
.sim-dom-root--portrait .zl .lk-row { grid-template-columns: 54px minmax(0, 1fr) 0; }
.sim-dom-root--portrait .zl-hop { display: none; }
.sim-dom-root--portrait .zl-glass { width: 128px; }
.sim-dom-root--portrait .zl-tray { flex-direction: column; align-items: stretch; }
.sim-dom-root--portrait .zl .lk-chip, .sim-dom-root--portrait .zl-token--placed .zl-token__name { display: none; }

@keyframes zl-hop-in { to { opacity: 1; transform: none; } }
@keyframes zl-drop-in { from { transform: translateY(-20px) scale(0.6); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes zl-pop { from { transform: scale(1.5); } to { transform: none; } }
`;

export class ZoomLadderScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 480;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 582;
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A ladder of powers of ten from a 10 metre verandah down to 0.1 nanometres, one rung for every ten ' +
    'times smaller. Place the verandah, Kabir, a hand, a moong seed and root hairs on their rungs, then ' +
    'move the Lens down the ladder: below the root hairs the rungs are dark for now.';

  static CONTROLS = [
    { type: 'button', id: 'up', label: 'Go up a rung' },
    { type: 'button', id: 'down', label: 'Go down a rung' },
  ];

  constructor(container, config) {
    super(container, config);
    this._placed = new Map();       // object id -> rung index
    this._selected = null;
    this._lensRung = 0;
    this._drag = null;
    this._swallowClick = false;
  }

  async setup() {
    await super.setup();
    const ladder = RUNGS.map((r, i) => rungRow(r, i, {
      button: true,
      tag: i > 0 ? '<span class="zl-hop" aria-hidden="true">\u00f710</span>' : '<span></span>',
    })).join('');
    this.render({
      css: CSS,
      rootClass: 'sd-wall',
      html: `<div class="zl">
          <div class="lk-ladder zl-ladder" aria-label="Powers of ten ladder">${ladder}</div>
          <div class="zl-side">
            <div class="zl-lens">
              <div class="zl-brass"><div class="zl-glass"><div class="zl-view"></div></div></div>
              <div class="zl-readout"><span class="sim-tag zl-size"></span><span class="zl-name"></span></div>
            </div>
            <div class="zl-tray">${OBJECTS.map(tokenHtml).join('')}</div>
            <p class="zl-msg" aria-live="polite"></p>
          </div>
        </div>
        ${lensCardHtml([
          { icon: ICON_LADDER, text: 'Sizes: true on the ladder', sub: 'not between the pictures' },
          { icon: ICON_COLOUR, text: 'Colour: real on the top rungs', sub: 'made up below the width of a hair' },
          { icon: ICON_CARD, text: 'First of many honesty cards', sub: 'each one says what the Lens changed' },
        ])}`,
    });
    this._view = this.root.querySelector('.zl-view');
    this._glass = this.root.querySelector('.zl-glass');
    this._msg = this.root.querySelector('.zl-msg');
    this._ladder = this.root.querySelector('.zl-ladder');
    this.root.addEventListener('click', (e) => this._onClick(e));
    this.root.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this.root.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this.root.addEventListener('pointerup', (e) => this._onPointerUp(e));
    this.root.addEventListener('pointercancel', (e) => this._endDrag(e, false));
    this._setLens(0, 0);
    this.onStep(this.stepIndex);
  }

  onStep(step) {
    if (!this.root || !this._msg) return;
    if (step === PLAY && !this._msg.textContent) this._say('Drag each one onto its rung', 'hint');
  }

  isControlHidden() {
    return this.stepIndex !== PLAY;
  }

  isControlDisabled(id) {
    if (id === 'up') return this._lensRung <= 0;
    if (id === 'down') return this._lensRung >= RUNGS.length - 1;
    return false;
  }

  onControlChange(id) {
    if (this.isControlHidden(id) || this.isControlDisabled(id)) return;
    this._setLens(this._lensRung + (id === 'down' ? 1 : -1));
    this.requestUiUpdate?.();
  }

  // -- Interaction -------------------------------------------------------------------

  _onClick(e) {
    if (this._swallowClick) { this._swallowClick = false; return; }
    if (this.stepIndex !== PLAY) return;
    const tok = e.target.closest('.zl-token');
    if (tok && !tok.classList.contains('zl-token--placed')) {
      this._select(this._selected === tok.dataset.obj ? null : tok.dataset.obj);
      return;
    }
    const row = e.target.closest('.lk-row');
    if (!row) return;
    const rung = Number(row.dataset.rung);
    if (this._selected) this._place(this._selected, rung);
    else { this._setLens(rung); this.requestUiUpdate?.(); }
  }

  _select(id) {
    this._selected = id;
    for (const t of this.root.querySelectorAll('.zl-token')) t.classList.toggle('zl-token--sel', t.dataset.obj === id);
    if (id) this._say('Now pick its rung', 'hint');
  }

  _scale() {
    const w = this.root.getBoundingClientRect().width;
    return w && this.root.offsetWidth ? w / this.root.offsetWidth : 1;
  }

  _rungAt(x, y) {
    const rootNode = this.root.getRootNode();
    const el = typeof rootNode.elementFromPoint === 'function' ? rootNode.elementFromPoint(x, y) : document.elementFromPoint(x, y);
    const row = el && el.closest ? el.closest('.lk-row') : null;
    return row && this._ladder.contains(row) ? Number(row.dataset.rung) : null;
  }

  _onPointerDown(e) {
    const tok = e.target.closest('.zl-token');
    if (!tok || this.stepIndex !== PLAY || tok.classList.contains('zl-token--placed')) return;
    this._drag = { tok, id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, hot: null };
    try { tok.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
  }

  _onPointerMove(e) {
    const d = this._drag;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    const s = this._scale();
    d.tok.classList.add('zl-token--drag');
    d.tok.style.transform = `translate(${dx / s}px, ${dy / s}px) scale(1.08)`;
    const rung = this._rungAt(e.clientX, e.clientY);
    if (rung !== d.hot) {
      this._ladder.querySelector('.zl-row--hot')?.classList.remove('zl-row--hot');
      if (rung != null) this._ladder.querySelector(`[data-rung="${rung}"]`)?.classList.add('zl-row--hot');
      d.hot = rung;
    }
  }

  _onPointerUp(e) {
    this._endDrag(e, true);
  }

  _endDrag(e, drop) {
    const d = this._drag;
    if (!d || e.pointerId !== d.id) return;
    this._drag = null;
    this._ladder.querySelector('.zl-row--hot')?.classList.remove('zl-row--hot');
    if (!d.moved) return;               // a tap: the click handler selects it
    this._swallowClick = true;
    d.tok.classList.remove('zl-token--drag');
    d.tok.style.transform = '';
    const rung = drop ? this._rungAt(e.clientX, e.clientY) : null;
    if (rung != null) this._place(d.tok.dataset.obj, rung);
  }

  _place(id, rung) {
    const obj = OBJECTS.find((o) => o.id === id);
    const tok = this.root.querySelector(`.zl-token[data-obj="${id}"]`);
    if (!obj || !tok) return;
    this._select(null);
    if (obj.targets.includes(rung)) {
      this._placed.set(id, rung);
      tok.classList.add('zl-token--placed');
      tok.setAttribute('aria-disabled', 'true');
      this._ladder.querySelector(`[data-rung="${rung}"] .lk-slot`)?.appendChild(tok);
      this._setLens(rung);
      if (this._placed.size === OBJECTS.length) {
        this._say('All five on their rungs! Now go down', 'good');
        burst(this.root);
      } else {
        this._say(`\u2713 ${obj.name}: ${obj.about}`, 'good');
      }
      this.requestUiUpdate?.();
      return;
    }
    // Wrong rung: say how far off, in powers of ten, without naming the answer.
    const t = obj.targets.reduce((best, x) => (Math.abs(x - rung) < Math.abs(best - rung) ? x : best), obj.targets[0]);
    const n = Math.abs(rung - t);
    const times = n === 1 ? '10' : n === 2 ? '100' : n === 3 ? '1000' : `10^${n}`;
    this._say(rung > t ? `${RUNGS[rung].size} is ${times}\u00d7 too small` : `${RUNGS[rung].size} is ${times}\u00d7 too big`, 'bad');
    tok.animate?.([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 300 });
  }

  _say(text, kind) {
    if (!this._msg) return;
    this._msg.textContent = text;
    this._msg.className = `zl-msg zl-msg--${kind}`;
    this._msg.animate?.([{ transform: 'scale(0.85)' }, { transform: 'scale(1)' }], { duration: 250, easing: 'ease-out' });
  }

  /** Point the Lens at rung i; dir +1 zooms in (down), -1 zooms out (up). */
  _setLens(i, dir = Math.sign(i - this._lensRung)) {
    this._lensRung = Math.max(0, Math.min(RUNGS.length - 1, i));
    if (!this._view || !this._glass || !this._ladder) return;   // not mounted (or a headless fake DOM)
    const r = RUNGS[this._lensRung];
    const lit = !!r.art;
    this._view.innerHTML = artSvg(lit ? r.art : 'locked');
    this._glass.classList.toggle('zl-glass--dark', !lit);
    const sizeEl = this.root.querySelector('.zl-size'), nameEl = this.root.querySelector('.zl-name');
    if (sizeEl) sizeEl.textContent = r.size;
    if (nameEl) nameEl.textContent = lit ? r.name : 'dark for now';
    for (const row of this._ladder.querySelectorAll('.lk-row')) {
      row.classList.toggle('zl-row--here', Number(row.dataset.rung) === this._lensRung);
    }
    if (dir) {
      this._view.animate?.([
        { transform: dir > 0 ? 'scale(0.3)' : 'scale(2.6)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
      ], { duration: 420, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' });
    }
    if (this._lensRung === LIT && this._placed.size === OBJECTS.length) this._say('Past the hair: dark for now', 'hint');
  }
}
