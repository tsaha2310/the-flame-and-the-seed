/**
 * HillScene (preset: heat-only) - blk-l03-08-02-s05 (what-if). Switch "ways do
 * not count" on and the Hill goes back to the Book I, heat-only version. Ice in a
 * warm room never melts, salt never dissolves, ink never spreads: every change
 * that takes in heat is forbidden, and there is no equilibrium anywhere.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - our world at 25 C: ice melts, salt dissolves, ink spreads; predict.
 *   1 run   - the switch; the three glasses freeze in place; the ways bar greys out.
 *   2 nails - the ways dial makes melting, dissolving, spreading and equilibrium possible.
 *
 * Canvas: three glasses changing continuously; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, alpha, lighten, ellipse, drawHillBackdrop, drawCard, drawPushCard, pushes, FE_HEAT, FE_WAYS,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;
const GLASSES = [
  { id: 'ice', label: 'ice', x: 120, verb: 'never melts' },
  { id: 'salt', label: 'salt', x: 340, verb: 'never dissolves' },
  { id: 'ink', label: 'ink', x: 560, verb: 'never spreads' },
];

export class HillSceneHeatOnly extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'Three glasses at 25 degrees: an ice cube, a spoon of salt and a drop of ink. In our world the ice melts, the salt ' +
    'dissolves and the ink spreads. With ways not counting, only heat decides: all three stay as they are for ever, ' +
    'because each change takes in heat or gives out none. There is no equilibrium anywhere.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Ways do not count: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Ways do not count: ON', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._k = 0;
    this._dialled = false;
  }

  enter() {
    this.mode = 'off';
    this._k = 0;
    this._dialled = false;
  }

  isControlHidden() { return this.stage === S_SETUP; }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'on' || id === 'off') {
      if (id !== this.mode) this._k = 0;
      this.mode = id;
      this._dialled = true;
    }
    this.requestUiUpdate?.();
  }

  update(d) {
    const frozen = this.mode === 'on' || (this.stage === S_RUN && !this._dialled);
    if (!frozen) {
      this._k = Math.min(1, this._k + d * 0.22);
      if (this._k >= 1 && this.stage !== S_RUN) this._k = 0;     // loop the demo
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const on = this.mode === 'on';
    GLASSES.forEach((g) => this._glass(ctx, c, g, t));
    const p = pushes(FE_HEAT.in6.v, FE_WAYS.gain22.v, 25, !on);
    pill(ctx, c, 'ice melting at 25 \u00b0C', 16, 262, { bg: c.labelMuted, size: 14, align: 'left' });
    drawPushCard(ctx, c, 16, 284, 396, p, { scale: 7, waysOff: on, waysLabel: on ? 'ways (off)' : 'ways \u00d7 T' });
    const net = p.net > 0.03 ? 'downhill: it melts' : 'uphill: it never melts';
    pill(ctx, c, net, 16, 480, { bg: p.net > 0.03 ? c.good : c.bad, size: 14, align: 'left' });
    const st = this.stage;
    const x = 664;
    pill(ctx, c, on ? 'heat-only world' : 'our world, 25 \u00b0C', x, 280, { bg: on ? c.bad : c.good, size: 15, align: 'right' });
    if (st === S_SETUP) {
      const q = popAt(this.age, 1.0);
      if (q) pill(ctx, c, 'predict: ice, heat only?', x, 320, { bg: c.accent, size: 15, align: 'right', ...q });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the switch', x, 320, { bg: c.accent, size: 15, align: 'right', scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_RUN && on) {
      GLASSES.forEach((g, i) => {
        const q = popAt(this.age, 0.3 + i * 0.4);
        if (q) pill(ctx, c, `${g.label} ${g.verb}`, x, 320 + i * 36, { bg: c.bad, size: 14, align: 'right', ...q });
      });
      const q = popAt(this.age, 1.8);
      if (q) pill(ctx, c, 'no equilibrium anywhere', x, 428, { bg: c.labelMuted, size: 14, align: 'right', ...q });
    }
    if (st === S_NAILS) {
      const q = popAt(this.age, 0.5);
      if (q) pill(ctx, c, 'ways make melting possible', x, 320, { bg: c.s5, size: 14, align: 'right', ...q });
      const q2 = popAt(this.age, 1.1);
      if (q2) pill(ctx, c, '...and every equilibrium', x, 356, { bg: c.s5, size: 14, align: 'right', ...q2 });
    }
  }

  _glass(ctx, c, g, t) {
    const x = g.x, k = this._k;
    drawCard(ctx, c, x - 100, 16, 200, 222);
    const gx = x - 46, gy = 52, gw = 92, gh = 130;
    rr(ctx, gx, gy + 30, gw, gh - 30, 10);
    ctx.fillStyle = alpha(c.water, 0.3);
    ctx.fill();
    ctx.save();
    rr(ctx, gx, gy + 30, gw, gh - 30, 10);
    ctx.clip();
    if (g.id === 'ice') {
      const s = 26 * (1 - 0.85 * k);
      if (s > 3) {
        rr(ctx, x - s, gy + 36 + Math.sin(t * 2) * 2, s * 2, s * 1.6, 5);
        ctx.fillStyle = lighten(c.glass, 0.35);
        ctx.fill();
        ctx.strokeStyle = c.glass;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    } else if (g.id === 'salt') {
      const n = Math.round(14 * (1 - k));
      for (let i = 0; i < n; i++) {
        const px = x - 18 + (i % 5) * 9 - (Math.floor(i / 5) % 2) * 4, py = gy + gh - 8 - Math.floor(i / 5) * 7;
        rr(ctx, px, py, 7, 6, 1.5);
        ctx.fillStyle = lighten(c.labelMuted, 0.6);
        ctx.fill();
      }
      for (let i = 0; i < Math.round(20 * k); i++) {
        ellipse(ctx, gx + 10 + ((i * 37) % 72), gy + 40 + ((i * 53) % 80), 2, 2);
        ctx.fillStyle = alpha(lighten(c.labelMuted, 0.6), 0.8);
        ctx.fill();
      }
    } else {
      const r = 10 + 44 * k;
      ctx.beginPath();
      ctx.arc(x, gy + 70 + 20 * k, r, 0, Math.PI * 2);
      ctx.fillStyle = alpha(c.s5, 0.9 - 0.6 * k);
      ctx.fill();
    }
    ctx.restore();
    rr(ctx, gx, gy, gw, gh, 10);
    ctx.strokeStyle = c.glass;
    ctx.lineWidth = 3;
    ctx.stroke();
    pill(ctx, c, g.label, x, 212, { bg: c.labelMuted, size: 14 });
  }
}
