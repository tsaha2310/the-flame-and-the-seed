/**
 * HillScene (preset: metabolism) - blk-l05-04-01-s03 (observe, POE with a dial).
 * The seed's reactions one at a time on the free-energy Hill: release each ball
 * and sort them into downhill and uphill; couple an uphill one to ATP breaking;
 * try coupling a downhill one to ATP being made.
 *
 * Beats (four paragraphs, splitSteps() counts 4):
 *   0 Lens     - the free-energy Hill; each reaction a ball; drawn one at a time.
 *   1 Sort     - release each; it lands in the downhill or the uphill tray.
 *   2 Couple   - an uphill one plus ATP breaking: the pair runs.
 *   3 Reverse  - a downhill one plus ATP being made: only a big fall pays for a coin.
 *
 * Canvas: the Hill re-shapes and the ball rolls; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, font, drawHillBackdrop, drawMarble, drawStepHill, drawCardBox, drawCoin, METAB, ATP_DG, dropPx,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
];
const S_LENS = 0, S_SORT = 1, S_COUPLE = 2, S_REV = 3;
const X0 = 60, X1 = 620, YB = 210;
const SHORT = { starch: 'starch', glucose: 'glucose', fat: 'fat', peptide: 'protein', rna: 'RNA', sugar: 'sugar' };

export class HillSceneMetabolism extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'The seed\'s reactions on the free-energy Hill, one at a time. Starch to glucose, fat to fatty acids and glucose ' +
    'to carbon dioxide and water run downhill. Building protein, RNA and sugar runs uphill and does not go by itself. ' +
    'Coupled to ATP breaking, an uphill step runs. A small downhill step cannot pay to make ATP; burning glucose can.';

  static CONTROLS = [
    { type: 'select', id: 'rx', label: 'Reaction:', options: Object.keys(METAB).map((k) => ({ value: k, label: METAB[k].label })) },
    { type: 'select', id: 'couple', label: 'Couple to:', options: [
      { value: 'none', label: 'nothing' }, { value: 'break', label: 'ATP breaking' }, { value: 'make', label: 'ATP being made' },
    ] },
    { type: 'button', id: 'run', label: 'Release' },
  ];

  constructor(container, config) {
    super(container, config);
    this._rx = 'starch';
    this._couple = 'none';
    this._ball = 0;
    this._released = false;
    this._relAge = 0;
    this._sorted = {};
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => { g.beginPath(); g.moveTo(x - 17, y - 8); g.lineTo(x - 4, y - 8); g.quadraticCurveTo(x + 2, y + 8, x + 17, y + 8); g.strokeStyle = c.s3; g.lineWidth = 4; g.stroke(); }, text: 'the free-energy Hill from III.8' },
      { icon: (g, x, y) => drawMarble(g, c, x, y, 10, c.s4, {}), text: 'each reaction is a ball', sub: 'left reactants, right products' },
      { icon: (g, x, y) => drawCoin(g, c, x, y, 11), text: 'drawn one at a time', sub: 'in life they run together' },
    ];
  }

  enter(stage) {
    if (stage <= S_SORT) { this._sorted = {}; this._rx = 'starch'; this._couple = 'none'; }
    if (stage === S_COUPLE) { this._rx = 'peptide'; this._couple = 'break'; }
    if (stage === S_REV) { this._rx = 'starch'; this._couple = 'make'; }
    this._reset();
  }

  _reset() { this._ball = 0; this._released = false; this._relAge = 0; }

  _k() {
    const r = METAB[this._rx];
    if (this._couple === 'break') return r.dG > 0 ? Math.ceil((r.dG + 5) / -ATP_DG) : 1;
    return this._couple === 'make' ? 1 : 0;
  }

  _net() {
    const r = METAB[this._rx];
    const k = this._k();
    if (this._couple === 'break') return r.dG + k * ATP_DG;
    if (this._couple === 'make') return r.dG - ATP_DG;
    return r.dG;
  }

  isControlHidden(id) {
    if (this.stage === S_LENS) return true;
    if (id === 'couple') return this.stage < S_COUPLE;
    return false;
  }

  getControlValue(id) {
    if (id === 'rx') return this._rx;
    if (id === 'couple') return this._couple;
    return undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    if (id === 'rx' && METAB[value]) { this._rx = value; this._reset(); }
    else if (id === 'couple' && ['none', 'break', 'make'].includes(value)) { this._couple = value; this._reset(); }
    else if (id === 'run') {
      this._reset();
      this._released = true;
      if (this._couple === 'none') this._sorted[this._rx] = METAB[this._rx].dG < 0 ? 'down' : 'up';
    }
    this.requestUiUpdate?.();
  }

  update(d) {
    if (!this._released) return;
    this._relAge += d;
    if (this._relAge > 0.4 && this._net() < 0) this._ball = Math.min(1, this._ball + d * 0.8);
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const r = METAB[this._rx];
    const net = this._net();
    const drop = dropPx(net);
    const y = drawStepHill(ctx, c, X0, X1, YB, drop, { bottom: 350 });
    const bx = X0 + 70 + (X1 - X0 - 140) * this._ball;
    const by = y(bx) - 18;
    drawMarble(ctx, c, bx, by, 16, c.s4, { face: true });
    const k = this._k();
    if (k > 0) {
      const spent = (this._couple === 'break' && this._ball > 0.9) || (this._couple === 'make' && this._ball < 0.9);
      drawCoin(ctx, c, bx + 30, by + 4, 12, spent);
      if (k > 1) pill(ctx, c, `\u00d7${k}`, bx + 48, by - 12, { bg: c.warning, size: 14, align: 'left' });
    }
    if (this.stage === S_LENS) return;
    pill(ctx, c, r.label, 16, 30, { bg: c.s5, size: 15, align: 'left' });
    const kj = (v) => `${v > 0 ? '+' : '\u2212'}${Math.abs(v).toFixed(Math.abs(v) < 100 ? 1 : 0)} kJ`;
    const rows = [`reaction ${kj(r.dG)}`];
    if (this._couple === 'break') rows.push(`${k > 1 ? `${k} ATP` : 'ATP'} breaking ${kj(k * ATP_DG)}`);
    if (this._couple === 'make') rows.push(`ATP being made ${kj(-ATP_DG)}`);
    rows.forEach((txt, i) => pill(ctx, c, txt, 664, 30 + i * 34, { bg: i ? c.warning : c.s1, size: 14, align: 'right' }));
    if (this._couple !== 'none') pill(ctx, c, `net ${kj(net)}`, 664, 30 + rows.length * 34, { bg: net < 0 ? c.good : c.bad, size: 15, align: 'right' });
    if (this._released) {
      const q = popAt(this._relAge, 0.3);
      const txt = net < 0 ? 'downhill: it runs' : 'uphill: it does not run';
      if (q) pill(ctx, c, txt, 340, 300, { bg: net < 0 ? c.good : c.bad, size: 15, ...q });
    } else {
      const hint = this.stage === S_SORT ? 'release each reaction' : this.stage === S_COUPLE ? 'an uphill one, coupled: release' : 'a downhill one, making ATP: release';
      pill(ctx, c, hint, 340, 300, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
    }
    this._drawTrays(ctx, c);
  }

  _drawTrays(ctx, c) {
    const trays = [{ id: 'down', title: 'downhill: runs', x: 16, col: c.good }, { id: 'up', title: 'uphill: does not', x: 348, col: c.bad }];
    for (const tr of trays) {
      drawCardBox(ctx, c, tr.x, 370, 316, 130);
      ctx.fillStyle = c.labelMuted;
      ctx.font = font(c, 800, 14);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(tr.title, tr.x + 14, 390);
      const names = Object.keys(this._sorted).filter((k) => this._sorted[k] === tr.id);
      names.forEach((k, i) => {
        pill(ctx, c, SHORT[k], tr.x + 14 + (i % 3) * 100, 426 + Math.floor(i / 3) * 36, { bg: tr.col, size: 14, align: 'left' });
      });
    }
  }
}
