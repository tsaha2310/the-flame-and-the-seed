/**
 * HillScene (preset: like-attract) - blk-l01-02-04-s05 (what-if). A box of
 * positive and negative charges. In our world opposites pull and likes push, so
 * they pair up into small, spaced-out clumps. Kabir's switch reverses both: every
 * positive rushes to every positive, every negative to every negative, two lumps
 * form, the view zooms out and the lumps keep growing.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - our world: small neutral clumps, spaced out; predict.
 *   1 run   - the switch; two lumps; zoom out, more charges pour in, lumps grow.
 *   2 nails - back in our world: likes push (spreading), opposites pull (holding).
 *
 * Canvas: many interacting particles; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, rr, alpha, drawHillBackdrop, drawCharge, mulberry32 } from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;
const BOX = { x0: 30, y0: 64, x1: 650, y1: 488 };
const CX = (BOX.x0 + BOX.x1) / 2, CY = (BOX.y0 + BOX.y1) / 2;
const R = 10, N0 = 40, NMAX = 110, K = 9000;

export class HillSceneLikeAttract extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A box of positive and negative charges. In our world opposites attract and likes repel, so the charges pair ' +
    'into small clumps spread through the box. With like charges attracting instead, all the positives form one lump ' +
    'and all the negatives another, and the lumps keep growing as more charges arrive: no spacing, nothing small.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Like charges attract: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Like charges attract: ON', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._p = [];
    this._rnd = mulberry32(7);
    this._onAge = -1;
    this._zoom = 1;
    this._dialled = false;
  }

  enter() {
    this.mode = 'off';
    this._dialled = false;
    this._scatter();
  }

  _scatter() {
    this._p = [];
    const rnd = this._rnd;
    for (let i = 0; i < N0; i++) {
      this._p.push({
        x: BOX.x0 + 30 + rnd() * (BOX.x1 - BOX.x0 - 60), y: BOX.y0 + 30 + rnd() * (BOX.y1 - BOX.y0 - 60),
        vx: (rnd() - 0.5) * 60, vy: (rnd() - 0.5) * 60, s: i % 2 ? 1 : -1,
      });
    }
    this._onAge = -1;
    this._zoom = 1;
  }

  isControlHidden() {
    return this.stage === S_SETUP;
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'on' || id === 'off') {
      if (id !== this.mode) {
        this.mode = id;
        this._scatter();
        if (id === 'on') this._onAge = 0;
      }
      this._dialled = true;
    }
    this.requestUiUpdate?.();
  }

  /** The world's walls, which widen as the view zooms out. */
  _walls() {
    const z = this._zoom;
    return {
      x0: CX - (CX - BOX.x0) / z, x1: CX + (BOX.x1 - CX) / z,
      y0: CY - (CY - BOX.y0) / z, y1: CY + (BOX.y1 - CY) / z,
    };
  }

  update(d) {
    const on = this.mode === 'on';
    if (this._onAge >= 0) this._onAge += d;
    if (on && this._onAge > 4) {
      this._zoom = Math.max(0.6, this._zoom - d * 0.08);
      // More charges pour in from the widening edges.
      if (this._p.length < NMAX && this._rnd() < d * 14) {
        const w = this._walls();
        const s = this._rnd() < 0.5 ? 1 : -1;
        this._p.push({ x: w.x0 + 20 + this._rnd() * (w.x1 - w.x0 - 40), y: w.y0 + 20 + this._rnd() * (w.y1 - w.y0 - 40), vx: 0, vy: 0, s });
      }
    }
    const sub = 2;
    const h = d / sub;
    const p = this._p, n = p.length;
    const w = this._walls();
    for (let k = 0; k < sub; k++) {
      for (let i = 0; i < n; i++) { p[i].ax = 0; p[i].ay = 0; }
      for (let i = 0; i < n; i++) {
        const a = p[i];
        for (let j = i + 1; j < n; j++) {
          const b = p[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy + 64;
          const dd = Math.sqrt(d2);
          const same = a.s === b.s;
          // Our world: likes push (+), opposites pull (-). The switch flips both.
          let coef = same ? 1 : -1;
          if (on) coef = -coef;
          let f = (coef * K) / dd;                                // a flat (2D) world: force falls as 1/d
          if (dd < 2 * R + 2) f += (2 * R + 2 - dd) * 900;       // balls cannot overlap
          const fx = (f * dx) / dd, fy = (f * dy) / dd;
          a.ax += fx; a.ay += fy;
          b.ax -= fx; b.ay -= fy;
        }
      }
      for (const q of p) {
        q.vx = (q.vx + q.ax * h) * (1 - 1.2 * h);
        q.vy = (q.vy + q.ay * h) * (1 - 1.2 * h);
        const sp = Math.hypot(q.vx, q.vy);
        if (sp > 420) { q.vx *= 420 / sp; q.vy *= 420 / sp; }
        q.x += q.vx * h;
        q.y += q.vy * h;
        if (q.x < w.x0 + R) { q.x = w.x0 + R; q.vx = Math.abs(q.vx) * 0.5; }
        if (q.x > w.x1 - R) { q.x = w.x1 - R; q.vx = -Math.abs(q.vx) * 0.5; }
        if (q.y < w.y0 + R) { q.y = w.y0 + R; q.vy = Math.abs(q.vy) * 0.5; }
        if (q.y > w.y1 - R) { q.y = w.y1 - R; q.vy = -Math.abs(q.vy) * 0.5; }
      }
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const z = this._zoom;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.scale(z, z);
    ctx.translate(-CX, -CY);
    const w = this._walls();
    rr(ctx, w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0, 16 / z);
    ctx.fillStyle = alpha(c.bgSurface, 0.7);
    ctx.fill();
    ctx.strokeStyle = alpha(c.stroke, 0.8);
    ctx.lineWidth = 3 / z;
    ctx.stroke();
    for (const q of this._p) drawCharge(ctx, c, q.x, q.y, R, q.s);
    ctx.restore();
    const on = this.mode === 'on';
    const st = this.stage;
    pill(ctx, c, on ? 'likes attract, opposites repel' : 'our world: opposites pull, likes push', 16, 30, { bg: on ? c.bad : c.good, size: 15, align: 'left' });
    if (st === S_SETUP) {
      const p = popAt(this.age, 1.2);
      if (p) pill(ctx, c, 'predict: flip the rule. Where do they all go?', 340, 500, { bg: c.accent, size: 15, ...p });
    }
    if (st === S_RUN) {
      if (!this._dialled) pill(ctx, c, 'turn the switch', 664, 30, { bg: c.accent, size: 15, align: 'right', scale: 1 + 0.05 * Math.sin(t * 5) });
      if (on) {
        const a = this._onAge;
        const p1 = popAt(a, 2.5);
        if (p1) pill(ctx, c, 'two lumps', 664, 30, { bg: c.bad, size: 15, align: 'right', ...p1 });
        const p2 = popAt(a, 6);
        if (p2) pill(ctx, c, 'zooming out: the lumps keep growing', 340, 500, { bg: c.bad, size: 15, ...p2 });
        const p3 = popAt(a, 9);
        if (p3) pill(ctx, c, 'no spacing, nothing small', 340, 462, { bg: c.labelMuted, size: 15, ...p3 });
      }
    }
    if (st === S_NAILS) {
      const p1 = popAt(this.age, 0.6);
      if (p1) pill(ctx, c, 'likes push: things spread out', 340, 462, { bg: c.s1, size: 15, ...p1 });
      const p2 = popAt(this.age, 1.3);
      if (p2) pill(ctx, c, 'opposites pull: things hold together', 340, 500, { bg: c.s6, size: 15, ...p2 });
    }
  }
}
