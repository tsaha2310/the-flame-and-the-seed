/**
 * HillScene (preset: valley) - blk-l03-08-03-s03 (observe, POE with dials). Free
 * energy against the mix, from all reactants (left) to all products (right). The
 * ball is the current mix; released, it rolls to the valley floor. Pick a
 * reaction, step the temperature, choose where to start.
 *
 * Beats (five paragraphs, splitSteps() counts 5):
 *   0 Lens     - free energy against the mix; the ball is the mix; not a real slope.
 *   1 Split    - water splitting, room temperature: start at all hydrogen + oxygen; it
 *                runs all the way back to water.
 *   2 Hotter   - step the temperature up; the valley slides.
 *   3 Methane  - the valley sits at the products' wall at any temperature.
 *   4 Gas      - gas dissolving: start in the middle; release; warm it; release again.
 *
 * Canvas: the curve re-shapes live and the ball rolls; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, drawHillBackdrop, drawMarble, drawValley, valleyCurve, valleyAt, ValleyBall, REACTIONS,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_LENS = 0, S_SPLIT = 1, S_HOT = 2, S_METHANE = 3, S_GAS = 4;
const BOX = { x: 70, y: 96, w: 540, h: 300 };
const STARTS = { reactants: 0.02, middle: 0.5, products: 0.98 };

export class HillSceneValley extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'A curve of free energy against the mix, from all reactants on the left to all products on the right, with a ' +
    'ball for the current mix. Released, the ball rolls to the valley floor. For water splitting the floor sits at ' +
    'the water wall until the temperature is enormous; for methane burning it sits at the products wall; for gas ' +
    'dissolving it sits in the middle and slides toward the gas as the water warms.';

  static CONTROLS = [
    { type: 'select', id: 'rx', label: 'Reaction:', options: Object.keys(REACTIONS).map((k) => ({ value: k, label: REACTIONS[k].label })) },
    { type: 'button', id: 'cooler', label: 'Cooler' },
    { type: 'button', id: 'hotter', label: 'Hotter' },
    { type: 'select', id: 'start', label: 'Start at:', options: [
      { value: 'reactants', label: 'all reactants' }, { value: 'middle', label: 'the middle' }, { value: 'products', label: 'all products' },
    ] },
    { type: 'button', id: 'run', label: 'Release' },
  ];

  constructor(container, config) {
    super(container, config);
    this._rx = 'split';
    this._ti = 0;
    this._start = 'products';
    this._ball = new ValleyBall();
    this._ball.place(STARTS.products);
    this._settleAge = -1;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => { g.beginPath(); g.moveTo(x - 17, y - 10); g.quadraticCurveTo(x - 4, y + 20, x + 17, y - 4); g.strokeStyle = c.s3; g.lineWidth = 4; g.stroke(); }, text: 'free energy against the mix', sub: 'all reactants left, all products right' },
      { icon: (g, x, y) => drawMarble(g, c, x, y, 10, c.s4, {}), text: 'the ball is the current mix' },
      { icon: (g, x, y) => { g.fillStyle = c.labelMuted; g.fillRect(x - 14, y - 2, 28, 4); }, text: 'nothing here is a real slope' },
    ];
  }

  enter(stage) {
    if (stage <= S_HOT) { this._rx = 'split'; if (stage <= S_SPLIT) this._ti = 0; this._start = 'products'; }
    if (stage === S_METHANE) { this._rx = 'methane'; this._ti = 0; this._start = 'reactants'; }
    if (stage === S_GAS) { this._rx = 'gas'; this._ti = 1; this._start = 'middle'; }
    this._reset();
  }

  _C() {
    const t = REACTIONS[this._rx].temps;
    return t[Math.max(0, Math.min(t.length - 1, this._ti))];
  }

  _reset() {
    this._ball.place(STARTS[this._start]);
    this._settleAge = -1;
  }

  isControlHidden() { return this.stage === S_LENS; }

  isControlDisabled(id) {
    const t = REACTIONS[this._rx].temps;
    if (id === 'cooler') return this._ti <= 0;
    if (id === 'hotter') return this._ti >= t.length - 1;
    return false;
  }

  getControlValue(id) {
    if (id === 'rx') return this._rx;
    if (id === 'start') return this._start;
    return undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    if (id === 'rx' && REACTIONS[value]) { this._rx = value; this._ti = 0; this._reset(); }
    else if (id === 'cooler') { this._ti -= 1; this._reset(); }
    else if (id === 'hotter') { this._ti += 1; this._reset(); }
    else if (id === 'start' && STARTS[value] != null) { this._start = value; this._reset(); }
    else if (id === 'run') { this._reset(); this._ball.release(); }
    this.requestUiUpdate?.();
  }

  update(d) {
    const rx = REACTIONS[this._rx];
    const curve = valleyCurve(rx, this._C(), BOX);
    const b = this._ball;
    b.step(d, curve);
    if (b.settled && this._settleAge < 0) this._settleAge = 0;
    if (this._settleAge >= 0) this._settleAge += d;
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const rx = REACTIONS[this._rx];
    const C = this._C();
    const curve = valleyCurve(rx, C, BOX);
    drawValley(ctx, c, curve, BOX, rx);
    const vx = valleyAt(rx, C);
    // Valley floor marker.
    const fx = curve.x(vx), fy = curve.y(vx);
    ctx.beginPath();
    ctx.moveTo(fx, fy + 10);
    ctx.lineTo(fx - 8, fy + 24);
    ctx.lineTo(fx + 8, fy + 24);
    ctx.closePath();
    ctx.fillStyle = c.warning;
    ctx.fill();
    const b = this._ball;
    const bx = curve.x(b.xi), by = curve.y(b.xi) - 17;
    drawMarble(ctx, c, bx, by, 16, c.s4, { face: !b.moving });
    if (this.stage === S_LENS) return;
    pill(ctx, c, rx.label, 16, 30, { bg: c.s5, size: 15, align: 'left' });
    pill(ctx, c, `${C} \u00b0C`, 664, 30, { bg: C > 500 ? c.flame : c.s2, size: 15, align: 'right' });
    pill(ctx, c, `valley floor: ${Math.round(vx * 100)}% products`, 664, 66, { bg: c.warning, size: 14, align: 'right' });
    if (b.dir !== 0) {
      const fwd = b.dir > 0;
      pill(ctx, c, fwd ? 'runs forward \u2192' : '\u2190 runs backward', 16, 66, { bg: fwd ? c.good : c.s1, size: 14, align: 'left' });
    }
    const st = this.stage;
    const pulse = { scale: 1 + 0.05 * Math.sin(t * 5) };
    if (!b.moving && !b.settled) {
      const hint = st === S_HOT ? 'press Hotter, then Release' : st === S_GAS ? 'release; then warm it and release again' : 'press Release';
      pill(ctx, c, hint, 340, 488, { bg: c.accent, size: 15, ...pulse });
    }
    if (b.settled) {
      const q = popAt(this._settleAge, 0.1);
      let txt = 'at the valley floor: it stops';
      if (this._rx === 'split' && vx < 0.02 && b.xi < 0.05) txt = 'all the way back: they burn to water';
      if (q) pill(ctx, c, txt, 340, 488, { bg: c.good, size: 15, ...q });
    }
  }
}
