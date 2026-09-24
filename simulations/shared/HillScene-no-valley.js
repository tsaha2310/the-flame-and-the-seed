/**
 * HillScene (preset: no-valley) - blk-l03-08-03-s06 (what-if). Switch on "every
 * reaction runs to completion": every valley moves to a wall. The fizzy drink
 * goes flat, the buffer's weak acid gives up everything, the sugar pile dissolves
 * all at once. Nothing sits partway.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - three valleys with floors partway; predict.
 *   1 run   - the switch; each ball runs to a wall; the drink, blood, sugar respond.
 *   2 nails - valleys in the middle make equilibria, buffers and partial reactions.
 *
 * Canvas: three live valley curves and balls; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, alpha, lighten, drawHillBackdrop, drawCard, drawMarble, drawValley, valleyCurve, ValleyBall,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;
// Model reactions: floors partway at 25 C (dH kJ/mol, dS J/(K mol)).
const PANELS = [
  { id: 'fizz', title: 'fizzy drink', rx: { a: 'in the drink', b: 'in the air', dH: 20, dS: 80 }, x: 16, start: 0.02 },
  { id: 'buffer', title: 'blood\'s buffer', rx: { a: 'acid kept', b: 'acid given up', dH: 11, dS: 0 }, x: 236, start: 0.3 },
  { id: 'sugar', title: 'saturated sugar', rx: { a: 'sugar pile', b: 'dissolved', dH: 0, dS: 0 }, x: 456, start: 0.02 },
];
const PW = 208;

export class HillSceneNoValley extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'Three free-energy valleys: a fizzy drink, a weak acid in blood\'s buffer, and a saturated sugar glass, each with ' +
    'its floor partway. With every reaction forced to completion, each ball runs to the products wall: the drink goes ' +
    'flat, the acid gives up everything so the buffer cannot hold, and the sugar pile dissolves entirely.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Run to completion: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Run to completion: ON', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._balls = PANELS.map(() => new ValleyBall());
    this._t = 0;
    this._dialled = false;
  }

  enter() {
    this.mode = 'off';
    this._dialled = false;
    this._reset();
  }

  _reset() {
    this._balls.forEach((b, i) => b.place(PANELS[i].start));
    this._t = 0;
  }

  isControlHidden() { return this.stage === S_SETUP; }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if ((id === 'on' || id === 'off') && id !== this.mode) { this.mode = id; this._reset(); }
    if (id === 'on' || id === 'off') this._dialled = true;
    this.requestUiUpdate?.();
  }

  _box(p) { return { x: p.x + 16, y: 96, w: PW - 32, h: 130 }; }

  _curve(p) {
    const box = this._box(p);
    if (this.mode === 'on') {
      // What-if: completion. Every curve falls straight to the products' wall.
      return { y: (xi) => box.y + 12 + (box.h - 24) * xi, x: (xi) => box.x + xi * box.w, xiAt: (px) => (px - box.x) / box.w };
    }
    return valleyCurve({ ...p.rx, pure: false }, 25, box);
  }

  update(d) {
    this._t += d;
    if (this.stage === S_RUN && !this._dialled) return;
    PANELS.forEach((p, i) => {
      const b = this._balls[i];
      if (this._t > 0.6 && !b.moving && !b.settled) b.release();
      b.step(d, this._curve(p));
    });
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const on = this.mode === 'on';
    PANELS.forEach((p, i) => {
      drawCard(ctx, c, p.x, 50, PW, 350);
      pill(ctx, c, p.title, p.x + PW / 2, 50, { bg: c.s5, size: 14 });
      const box = this._box(p), curve = this._curve(p);
      drawValley(ctx, c, curve, box, p.rx, { names: false, ground: 0, lw: 5 });
      const b = this._balls[i];
      drawMarble(ctx, c, curve.x(b.xi), curve.y(b.xi) - 11, 10, c.s4, {});
      this._icon(ctx, c, p, b.xi, p.x + PW / 2 - 50, 310, t);
    });
    pill(ctx, c, on ? 'every reaction runs to completion' : 'our world: floors partway', 340, 438, { bg: on ? c.bad : c.good, size: 15 });
    const st = this.stage;
    if (st === S_SETUP) {
      const q = popAt(this.age, 1.0);
      if (q) pill(ctx, c, 'predict: drink, buffer, sugar?', 340, 480, { bg: c.accent, size: 15, ...q });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the switch', 340, 480, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_RUN && on) {
      const q = popAt(this._t, 2.5);
      if (q) pill(ctx, c, 'nothing sits partway', 340, 480, { bg: c.bad, size: 15, ...q });
    }
    if (st === S_NAILS) {
      const q = popAt(this.age, 0.6);
      if (q) pill(ctx, c, 'valleys in the middle: equilibria, buffers', 340, 480, { bg: c.good, size: 15, ...q });
    }
  }

  /** Bubbles in a bottle, a blood-drop gauge, or a sugar pile, driven by the ball's share. */
  _icon(ctx, c, p, xi, x, y, t) {
    if (p.id === 'fizz') {
      rr(ctx, x - 22, y - 40, 44, 80, 12);
      ctx.fillStyle = alpha(c.s2, 0.45);
      ctx.fill();
      ctx.strokeStyle = c.glass;
      ctx.lineWidth = 3;
      ctx.stroke();
      const n = Math.round(12 * (1 - xi));
      for (let k = 0; k < n; k++) {
        const u = (t * 0.6 + k / 12) % 1;
        ctx.beginPath();
        ctx.arc(x - 14 + ((k * 7) % 28), y + 34 - u * 70, 3, 0, Math.PI * 2);
        ctx.fillStyle = lighten(c.glass, 0.4);
        ctx.fill();
      }
      pill(ctx, c, xi > 0.97 ? 'flat' : 'fizzy', x + 96, y, { bg: xi > 0.97 ? c.bad : c.good, size: 14 });
    } else if (p.id === 'buffer') {
      ctx.beginPath();
      ctx.moveTo(x, y - 36);
      ctx.quadraticCurveTo(x + 24, y - 6, x + 22, y + 12);
      ctx.arc(x, y + 12, 22, 0, Math.PI);
      ctx.quadraticCurveTo(x - 24, y - 6, x, y - 36);
      ctx.fillStyle = c.s6;
      ctx.fill();
      pill(ctx, c, xi > 0.97 ? 'cannot hold' : 'holds', x + 96, y, { bg: xi > 0.97 ? c.bad : c.good, size: 14 });
    } else {
      rr(ctx, x - 26, y - 36, 52, 72, 8);
      ctx.fillStyle = alpha(c.water, 0.3);
      ctx.fill();
      ctx.strokeStyle = c.glass;
      ctx.lineWidth = 3;
      ctx.stroke();
      const pile = Math.max(0, 1 - xi);
      if (pile > 0.02) {
        ctx.beginPath();
        ctx.moveTo(x - 20 * pile, y + 34);
        ctx.lineTo(x, y + 34 - 24 * pile);
        ctx.lineTo(x + 20 * pile, y + 34);
        ctx.closePath();
        ctx.fillStyle = lighten(c.labelMuted, 0.6);
        ctx.fill();
      }
      pill(ctx, c, xi > 0.97 ? 'all gone' : 'a pile stays', x + 96, y, { bg: xi > 0.97 ? c.bad : c.good, size: 14 });
    }
  }
}
