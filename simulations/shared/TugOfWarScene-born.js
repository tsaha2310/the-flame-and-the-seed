/**
 * TugOfWarScene (preset: born) - blk-l01-05-03-s03 (observe, POE with dials). Two
 * atoms and the shared pair of electrons between them, drawn as a rope with a
 * knot. Each atom's pull is its real pull score; the knot slides toward the
 * stronger puller, all the way across when one is far stronger. The Tug-of-War
 * model is born here.
 *
 * Beats (five paragraphs, splitSteps() counts 5):
 *   0 Lens    - the pair is a rope; atoms have faces and arms; pull = arm thickness.
 *   1 Na-Cl   - the knot jumps all the way to chlorine.
 *   2 Cl-Cl   - the knot sits in the middle.
 *   3 C-H ... - carbon-hydrogen, carbon-oxygen, oxygen-hydrogen.
 *   4 Table   - tap the table: run across a row, then down a column; pulls are logged.
 *
 * Canvas: the rope slides and sways; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, font, drawHillBackdrop, drawCardBox, ATOMS, TABLE_SYMS, drawTug, knotTarget, bondKind,
  drawMiniTable, tableHit, drawRope, atomCol,
} from './TugKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_LENS = 0, S_NACL = 1, S_CLCL = 2, S_CHO = 3, S_TABLE = 4;
const TX = 380, TY = 300, TS = 36;
const OPTS = TABLE_SYMS.map((s) => ({ value: s, label: `${s} (${ATOMS[s].name})` }));

export class TugOfWarSceneBorn extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'Two atoms pulling on a shared pair of electrons, drawn as a rope with a knot. Sodium against chlorine: the knot ' +
    'jumps all the way to chlorine, making ions. Two chlorines: the knot stays in the middle. Carbon against oxygen: ' +
    'the knot sits nearer oxygen. Across a row of the table the pull rises; down a column it falls.';

  static CONTROLS = [
    { type: 'select', id: 'left', label: 'Left atom:', options: OPTS },
    { type: 'select', id: 'right', label: 'Right atom:', options: OPTS },
  ];

  constructor(container, config) {
    super(container, config);
    this._a = 'Na';
    this._b = 'Cl';
    this._k = 0;
    this._log = [];
    this._changedAt = 0;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y, t) => drawRope(g, c, x - 18, x + 18, y + 4, 0, t, { electrons: false }), text: 'the shared pair: a rope with a knot', sub: 'electrons are not ropes' },
      { icon: (g, x, y) => { g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fillStyle = atomCol(c, 'O'); g.fill(); }, text: 'atoms with faces and arms', sub: 'the story voice; what pulls comes next' },
      { icon: (g, x, y) => { g.strokeStyle = c.label; g.lineCap = 'round'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 14, y - 6); g.lineTo(x + 14, y - 6); g.stroke(); g.lineWidth = 9; g.beginPath(); g.moveTo(x - 14, y + 8); g.lineTo(x + 14, y + 8); g.stroke(); }, text: 'pull strength = arm thickness' },
    ];
  }

  enter(stage) {
    const pairs = { [S_LENS]: ['Na', 'Cl'], [S_NACL]: ['Na', 'Cl'], [S_CLCL]: ['Cl', 'Cl'], [S_CHO]: ['C', 'H'], [S_TABLE]: ['Na', 'Cl'] };
    [this._a, this._b] = pairs[stage];
    this._k = 0;
    this._changedAt = this.clock;
    if (stage === S_TABLE) this._log = [];
  }

  isControlHidden() { return this.stage === S_LENS; }

  getControlValue(id) {
    if (id === 'left') return this._a;
    if (id === 'right') return this._b;
    return undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id) || !ATOMS[value]) return;
    if (id === 'left') this._a = value;
    if (id === 'right') this._set(value);
    this._changedAt = this.clock;
    this.requestUiUpdate?.();
  }

  _set(sym) {
    this._b = sym;
    if (this.stage === S_TABLE) {
      this._log.push({ a: this._a, b: sym });
      if (this._log.length > 5) this._log.shift();
    }
  }

  pointerDown(p) {
    if (this.stage !== S_TABLE) return;
    const sym = tableHit(p, TX, TY, TS);
    if (sym) { this._set(sym); this._changedAt = this.clock; }
  }

  update(d) {
    const target = knotTarget(this._a, this._b);
    this._k += (target - this._k) * Math.min(1, d * 3);
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const st = this.stage;
    const y = st === S_TABLE ? 150 : 200;
    drawTug(ctx, c, this._a, this._b, this._k, 130, 550, y, t, { charges: true });
    if (st === S_LENS) return;
    const kind = bondKind(this._a, this._b);
    const ea = ATOMS[this._a].en, eb = ATOMS[this._b].en;
    pill(ctx, c, `pull ${ea.toFixed(2)}`, 130, 30, { bg: atomCol(c, this._a), size: 14 });
    pill(ctx, c, `pull ${eb.toFixed(2)}`, 550, 30, { bg: atomCol(c, this._b), size: 14 });
    const q = popAt(this.clock - this._changedAt, 0.9);
    if (q) pill(ctx, c, kind.text, 340, 30, { bg: kind.id === 'ionic' ? c.bad : kind.id === 'even' ? c.good : c.warning, size: 15, ...q });
    if (st === S_TABLE) this._drawTable(ctx, c);
    else {
      const hint = st === S_NACL ? 'sodium against chlorine: watch the knot' : st === S_CLCL ? 'two chlorines: watch the knot'
        : 'try C-H, then C-O, then O-H';
      pill(ctx, c, hint, 340, 470, { bg: c.accent, size: 15 });
    }
  }

  _drawTable(ctx, c) {
    drawMiniTable(ctx, c, TX, TY, { s: TS, sel: [this._a, this._b] });
    pill(ctx, c, 'tap an atom: the right-hand puller', TX, TY - 26, { bg: c.accent, size: 14, align: 'left' });
    const x = 16, y = 290, w = 340;
    const n = this._log.length;
    drawCardBox(ctx, c, x, y, w, 40 + Math.max(1, n) * 30);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(n ? `${this._a} fixed; the other atom's pull` : 'run across a row, then down a column', x + 12, y + 20);
    this._log.forEach((e, i) => {
      const ry = y + 50 + i * 30;
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 15);
      ctx.fillText(`${e.b} (${ATOMS[e.b].name})`, x + 12, ry);
      rr(ctx, x + 170, ry - 8, 110 * (ATOMS[e.b].en / 4), 16, 8);
      ctx.fillStyle = atomCol(c, e.b);
      ctx.fill();
      ctx.fillStyle = c.label;
      ctx.textAlign = 'right';
      ctx.fillText(ATOMS[e.b].en.toFixed(2), x + w - 12, ry);
      ctx.textAlign = 'left';
    });
  }
}
