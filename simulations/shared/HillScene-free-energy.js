/**
 * HillScene (preset: free-energy) - blk-l03-08-02-s02 (observe, builder). Build
 * the Hill from two layers: heat given out, and ways gained weighted by the
 * temperature. The net says which way the change runs.
 *
 * Beats (six paragraphs, splitSteps() counts 6):
 *   0 Lens     - two layers; the ways layer scaled by temperature; bookkeeping, not a landscape.
 *   1 Ice      - build ice melting: heat taken in, ways gained.
 *   2 -10 C    - read the net: backward; ice stays ice.
 *   3 0 C      - balanced: ice and water together.
 *   4 +10 C    - forward: it melts.
 *   5 Candle   - heat given out, ways gained: downhill at any temperature.
 *
 * Canvas: the Hill re-shapes and the ball rolls on Build; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, drawHillBackdrop, drawMarble, drawPushCard, drawStepHill, drawChangeThing, changeNames,
  pushes, verdict, FE_HEAT, FE_WAYS, FE_TEMPS,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
  [{ idx: 5, dwellMs: null }],
];
const S_LENS = 0, S_ICE = 1, S_M10 = 2, S_ZERO = 3, S_P10 = 4, S_CANDLE = 5;
const X0 = 40, X1 = 640, YB = 340;

export class HillSceneFreeEnergy extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'A Hill built from two pushes: heat given out, and ways gained weighted by temperature. For ice melting, heat is ' +
    'taken in (a push back) and ways are gained (a push forward). At minus 10 degrees the heat wins and ice stays ' +
    'ice; at 0 they balance; at plus 10 the ways win and ice melts. A candle gives out heat and gains ways: downhill always.';

  static CONTROLS = [
    { type: 'select', id: 'heat', label: 'Heat:', options: Object.keys(FE_HEAT).map((k) => ({ value: k, label: FE_HEAT[k].label })) },
    { type: 'select', id: 'ways', label: 'Ways:', options: Object.keys(FE_WAYS).map((k) => ({ value: k, label: FE_WAYS[k].label })) },
    { type: 'select', id: 'temp', label: 'Temperature:', options: Object.keys(FE_TEMPS).map((k) => ({ value: k, label: FE_TEMPS[k].label })) },
    { type: 'button', id: 'build', label: 'Build the Hill' },
  ];

  constructor(container, config) {
    super(container, config);
    this._heat = 'none';
    this._ways = 'none';
    this._temp = 'p25';
    this._ball = 0;          // 0 start .. 1 end
    this._target = 0;
    this._built = false;
    this._builtAge = 0;
    this._iceDone = false;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => { rr(g, x - 17, y - 12, 34, 10, 4); g.fillStyle = c.flame; g.fill(); rr(g, x - 17, y + 2, 34, 10, 4); g.fillStyle = c.s5; g.fill(); }, text: 'two layers: heat and ways' },
      { icon: (g, x, y) => { g.beginPath(); g.arc(x, y + 6, 8, 0, Math.PI * 2); g.fillStyle = c.bad; g.fill(); rr(g, x - 3, y - 16, 6, 18, 3); g.fill(); }, text: 'the ways layer grows with temperature' },
      { icon: (g, x, y) => drawMarble(g, c, x, y, 10, c.s4, {}), text: 'not a real landscape', sub: 'bookkeeping that predicts the way things go' },
    ];
  }

  enter(stage) {
    if (stage >= S_M10 && stage <= S_P10) { this._heat = 'in6'; this._ways = 'gain22'; }
    if (stage === S_CANDLE) { this._heat = 'out600'; this._ways = 'gain60'; }
    this._temp = { [S_M10]: 'm10', [S_ZERO]: 'zero', [S_P10]: 'p10' }[stage] ?? (stage === S_CANDLE ? 'p25' : this._temp);
    if (stage <= S_ICE) { this._heat = 'none'; this._ways = 'none'; this._iceDone = false; }
    this._ball = 0;
    this._built = false;
    if (stage >= S_M10) this._build();
  }

  _p() {
    return pushes(FE_HEAT[this._heat].v, FE_WAYS[this._ways].v, FE_TEMPS[this._temp].C);
  }

  _build() {
    const p = this._p();
    const v = verdict(p.net);
    this._ball = 0;
    this._target = v === 'forward' ? 1 : v === 'balanced' ? 0.5 : 0;
    this._built = true;
    this._builtAge = 0;
  }

  isControlHidden() { return this.stage === S_LENS; }

  getControlValue(id) {
    if (id === 'heat') return this._heat;
    if (id === 'ways') return this._ways;
    if (id === 'temp') return this._temp;
    return undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    if (id === 'heat' && FE_HEAT[value]) this._heat = value;
    else if (id === 'ways' && FE_WAYS[value]) this._ways = value;
    else if (id === 'temp' && FE_TEMPS[value]) this._temp = value;
    if (id === 'build') this._build();
    else { this._built = false; this._ball = 0; }
    if (this.stage === S_ICE && !this._iceDone && this._heat === 'in6' && this._ways === 'gain22') {
      this._iceDone = true;
      this.celebrate(340, 140, 20);
    }
    this.requestUiUpdate?.();
  }

  update(d) {
    if (!this._built) return;
    this._builtAge += d;
    if (this._builtAge < 0.6) return;
    this._ball += (this._target - this._ball) * Math.min(1, d * 1.6);
  }

  _names() {
    const n = changeNames(this._heat, this._ways);
    return [n.a, n.b, n.kind];
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const p = this._p();
    const scale = Math.max(1, Math.abs(p.heat), Math.abs(p.ways));
    const v = verdict(p.net);
    const shown = this._built ? p.net : 0;
    const drop = v === 'balanced' || !this._built ? 0 : Math.sign(shown) * Math.max(24, Math.min(120, (Math.abs(shown) / scale) * 120));
    const y = drawStepHill(ctx, c, X0, X1, YB, drop);
    const [a, b, kind] = this._names();
    pill(ctx, c, a, X0 + 90, YB + 40, { bg: c.s1, size: 14 });
    pill(ctx, c, b, X1 - 90, YB + drop + 40, { bg: c.s3, size: 14 });
    const bx = X0 + 90 + (X1 - X0 - 180) * this._ball;
    drawChangeThing(ctx, c, kind, bx, y(bx) - 22, this._ball, t);
    if (this.stage === S_LENS) return;
    drawPushCard(ctx, c, 16, 14, 396, p, { scale });
    pill(ctx, c, FE_TEMPS[this._temp].label, 664, 30, { bg: this._temp === 'm10' ? c.s1 : c.s2, size: 15, align: 'right' });
    const pulse = { scale: 1 + 0.05 * Math.sin(t * 5) };
    if (this.stage === S_ICE && !this._iceDone) {
      pill(ctx, c, 'ice: heat in, ways gained', 664, 70, { bg: c.accent, size: 14, align: 'right', ...pulse });
    } else if (!this._built) {
      pill(ctx, c, 'press Build the Hill', 664, 70, { bg: c.accent, size: 14, align: 'right', ...pulse });
    } else {
      const q = popAt(this._builtAge, 0.2);
      const txt = v === 'forward' ? 'downhill: it runs' : v === 'balanced' ? 'balanced: both together' : 'uphill: it does not run';
      if (q) pill(ctx, c, txt, 664, 70, { bg: v === 'forward' ? c.good : v === 'balanced' ? c.warning : c.bad, size: 15, align: 'right', ...q });
    }
    if (this.stage === S_CANDLE && this._built) {
      const q = popAt(this._builtAge, 1.2);
      if (q) pill(ctx, c, 'both push forward, always', 664, 108, { bg: c.flame, size: 14, align: 'right', ...q });
    }
  }
}
