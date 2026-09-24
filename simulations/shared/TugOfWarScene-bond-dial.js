/**
 * TugOfWarScene (preset: bond-dial) - blk-l02-01-03-s02 (detective). Pick any two
 * atoms; the shared electrons sit level, tilt, or jump across. Readouts: the pull
 * difference and what forms. Every pair tried lands as a dot on a difference line,
 * so the rule (what difference makes the knot jump) can be read off it.
 *
 * Beats (three blocks, splitSteps() counts 3):
 *   0 Lens  - a rope with a knot; faces in the story view, plain circles in the readout.
 *   1 Pairs - try the eight pairs (tap a row, or use the dials); each is ticked.
 *   2 Rule  - the difference line: where does the knot jump, where does it stay?
 *
 * Canvas: the rope slides; dots land on the line; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, font, mix, drawHillBackdrop, drawCardBox, drawRope, drawTug, knotTarget, bondKind, ATOMS,
  TABLE_SYMS, atomCol,
} from './TugKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_LENS = 0, S_PAIRS = 1, S_RULE = 2;
const PAIRS = [['Na', 'Cl'], ['Cl', 'Cl'], ['H', 'H'], ['H', 'O'], ['C', 'H'], ['C', 'O'], ['Mg', 'O'], ['C', 'C']];
const OPTS = TABLE_SYMS.map((s) => ({ value: s, label: `${s} (${ATOMS[s].name})` }));
const LIST = { x: 16, y: 244, w: 250, row: 26 };
const LINE = { x0: 310, x1: 650, y: 440 };

export class TugOfWarSceneBondDial extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'Pick two atoms and watch the shared electrons: with a small difference in pull they sit in the middle, with a ' +
    'medium one they tilt toward the stronger puller, and with a big one, about 1.7 or more, they jump all the way ' +
    'across and ions form. Each pair tried is marked on a line of pull differences.';

  static CONTROLS = [
    { type: 'select', id: 'left', label: 'Left atom:', options: OPTS },
    { type: 'select', id: 'right', label: 'Right atom:', options: OPTS },
  ];

  constructor(container, config) {
    super(container, config);
    this._a = 'Na';
    this._b = 'Cl';
    this._k = 0;
    this._tried = {};
    this._changedAt = 0;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y, t) => drawRope(g, c, x - 18, x + 18, y + 4, 0, t, { electrons: false }), text: 'the shared pair: a rope with a knot', sub: 'electrons are not ropes' },
      { icon: (g, x, y) => { g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fillStyle = atomCol(c, 'Cl'); g.fill(); }, text: 'faces in the story, circles in the readout' },
      { icon: (g, x, y) => { rr(g, x - 17, y - 10, 34, 20, 10); g.fillStyle = c.s2; g.fill(); }, text: 'pull scores from the real table' },
    ];
  }

  enter(stage) {
    if (stage <= S_PAIRS) { this._tried = {}; [this._a, this._b] = PAIRS[0]; }
    this._mark();
  }

  _mark() {
    const key = [this._a, this._b].sort().join('-');
    this._tried[key] = { a: this._a, b: this._b };
    this._changedAt = this.clock;
  }

  isControlHidden() { return this.stage === S_LENS; }

  getControlValue(id) {
    if (id === 'left') return this._a;
    if (id === 'right') return this._b;
    return undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id) || !ATOMS[value]) return;
    if (id === 'left') this._a = value; else this._b = value;
    this._mark();
    this.requestUiUpdate?.();
  }

  pointerDown(p) {
    if (this.stage === S_LENS) return;
    const i = Math.floor((p.y - LIST.y - 34) / LIST.row);
    if (p.x >= LIST.x && p.x <= LIST.x + LIST.w && i >= 0 && i < PAIRS.length) {
      [this._a, this._b] = PAIRS[i];
      this._mark();
    }
  }

  update(d) {
    this._k += (knotTarget(this._a, this._b) - this._k) * Math.min(1, d * 3);
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    drawTug(ctx, c, this._a, this._b, this._k, 140, 540, 118, t, { charges: true });
    if (this.stage === S_LENS) return;
    const kind = bondKind(this._a, this._b);
    const diff = Math.abs(ATOMS[this._a].en - ATOMS[this._b].en);
    pill(ctx, c, `pull difference ${diff.toFixed(2)}`, 16, 30, { bg: c.s2, size: 14, align: 'left' });
    const q = popAt(this.clock - this._changedAt, 0.9);
    if (q) pill(ctx, c, `forms: ${kind.text}`, 664, 30, { bg: kind.id === 'ionic' ? c.bad : kind.id === 'even' ? c.good : c.warning, size: 14, align: 'right', ...q });
    this._drawList(ctx, c);
    this._drawLine(ctx, c);
  }

  _drawList(ctx, c) {
    const { x, y, w, row } = LIST;
    drawCardBox(ctx, c, x, y, w, 40 + PAIRS.length * row);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('pairs to try (tap one)', x + 12, y + 18);
    PAIRS.forEach(([a, b], i) => {
      const ry = y + 34 + i * row + row / 2;
      const key = [a, b].sort().join('-');
      const done = !!this._tried[key];
      const cur = [this._a, this._b].sort().join('-') === key;
      if (cur) {
        rr(ctx, x + 6, ry - row / 2 + 2, w - 12, row - 4, 8);
        ctx.fillStyle = mix(c.bgSurface, c.accent, 0.2);
        ctx.fill();
      }
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 15);
      ctx.textAlign = 'left';
      ctx.fillText(`${ATOMS[a].name} + ${ATOMS[b].name}`, x + 14, ry);
      if (done) {
        const k = bondKind(a, b);
        ctx.fillStyle = k.id === 'ionic' ? c.bad : k.id === 'even' ? c.good : c.warning;
        ctx.textAlign = 'right';
        ctx.fillText(k.short, x + w - 12, ry);
      }
    });
  }

  /** The difference line: 0 .. 3.2, one plain circle per pair tried. */
  _drawLine(ctx, c) {
    const { x0, x1, y } = LINE;
    drawCardBox(ctx, c, x0 - 14, y - 150, x1 - x0 + 28, 200);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('pull difference', x0, y - 130);
    ctx.strokeStyle = c.labelMuted;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    const X = (d) => x0 + (d / 3.2) * (x1 - x0);
    ctx.fillStyle = c.label;
    ctx.font = font(c, 700, 14);
    ctx.textAlign = 'center';
    for (const v of [0, 1, 2, 3]) {
      ctx.fillText(String(v), X(v), y + 22);
      ctx.fillRect(X(v) - 1, y - 6, 2, 12);
    }
    const keys = Object.keys(this._tried);
    keys.forEach((key, i) => {
      const e = this._tried[key];
      const d = Math.abs(ATOMS[e.a].en - ATOMS[e.b].en);
      const k = bondKind(e.a, e.b);
      const stack = keys.slice(0, i).filter((kk) => {
        const o = this._tried[kk];
        return Math.abs(Math.abs(ATOMS[o.a].en - ATOMS[o.b].en) - d) < 0.12;
      }).length;
      const cy = y - 22 - stack * 22;
      ctx.beginPath();
      ctx.arc(X(d), cy, 9, 0, Math.PI * 2);
      ctx.fillStyle = k.id === 'ionic' ? c.bad : k.id === 'even' ? c.good : c.warning;
      ctx.fill();
    });
    if (this.stage === S_RULE) {
      const q = popAt(this.age, 0.4);
      if (q) pill(ctx, c, 'where does the knot jump?', (x0 + x1) / 2, y - 96, { bg: c.accent, size: 14, ...q });
      const shared = keys.filter((k) => bondKind(this._tried[k].a, this._tried[k].b).id === 'even').length;
      if (shared && keys.length >= 6) {
        const q2 = popAt(this.age, 1.2);
        if (q2) pill(ctx, c, 'small: middle. Big: all the way', (x0 + x1) / 2, y - 60, { bg: c.labelMuted, size: 14, ...q2 });
      }
    }
  }
}
