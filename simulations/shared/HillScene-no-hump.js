/**
 * HillScene (preset: no-hump) - blk-l03-06-02-s05 (what-if). Kabir's world
 * without humps: set every hump to zero and every downhill reaction runs at once.
 * The petrol can, the wood pile and the seed all burn in a second.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - our world: the hump holds; the fuels sit still; predict.
 *   1 run   - the dial; marbles pour over; every fuel catches at once.
 *   2 nails - humps back: every stored fuel sits behind one.
 *
 * Canvas: rolling marbles and flames; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, mix, darken, lighten, blob, drawHillBackdrop, drawFlame, drawCard, ReactionHill, CrossingRun,
  TEMPS, HUMPS_K,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;
const FUELS = [
  { id: 'petrol', label: 'petrol can', x: 120 },
  { id: 'wood', label: 'wood pile', x: 340 },
  { id: 'seed', label: 'the seed', x: 560 },
];

export class HillSceneNoHump extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A petrol can, a wood pile and a seed above a reaction Hill with a hump. With the hump, collisions at room ' +
    'temperature almost never cross and the fuels sit still. With humps set to zero, every collision crosses and ' +
    'every fuel burns at once. Humps are why the world is not on fire.';

  static CONTROLS = [
    { type: 'button', id: 'on', label: 'Humps: normal', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'off', label: 'Humps: zero', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'on';
    this._hill = new ReactionHill({ yR: 380, hump: HUMPS_K.high, drop: 500 });
    this._run = new CrossingRun(this._hill, 31);
    this._burn = 0;
    this._wait = 0;
    this._dialled = false;
  }

  enter() {
    this.mode = 'on';
    this._dialled = false;
    this._set();
  }

  _set() {
    this._hill.set(this.mode === 'off' ? HUMPS_K.zero : HUMPS_K.high, 500);
    this._run.reset();
    this._burn = 0;
    this._wait = 0.3;
  }

  isControlHidden() {
    return this.stage === S_SETUP;
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if ((id === 'on' || id === 'off') && id !== this.mode) {
      this.mode = id;
      this._set();
    }
    if (id === 'on' || id === 'off') this._dialled = true;
    this.requestUiUpdate?.();
  }

  update(d) {
    const run = this._run;
    if (this.mode === 'off') this._burn = Math.min(1, this._burn + d * 0.35);
    if (this._wait > 0) {
      this._wait -= d;
      if (this._wait <= 0) run.start(30, TEMPS.room.K, 1, 0.08);
      return;
    }
    run.step(d);
    if (run.done) { run.active = false; this._wait = 0.8; }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const hill = this._hill, run = this._run, st = this.stage;
    const fire = this.mode === 'off';
    FUELS.forEach((f, i) => this._drawFuel(ctx, c, f, i, t, fire));
    hill.draw(ctx, c);
    run.draw(ctx, c);
    run.drawTrays(ctx, c);
    pill(ctx, c, fire ? 'humps: zero' : 'room 25 \u00b0C, hump in place', 16, 230, { bg: fire ? c.bad : c.s1, size: 14, align: 'left' });
    if (st === S_SETUP) {
      const p = popAt(this.age, 0.8);
      if (p) pill(ctx, c, 'predict: which of the three burn?', 664, 230, { bg: c.accent, size: 15, align: 'right', ...p });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the dial', 664, 230, { bg: c.accent, size: 15, align: 'right', scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_RUN && fire) {
      const p = popAt(this._burn * 3, 1.2);
      if (p) pill(ctx, c, 'every downhill reaction at once', 664, 230, { bg: c.bad, size: 15, align: 'right', ...p });
    }
    if (st === S_NAILS) {
      const p = popAt(this.age, 0.5);
      if (p) pill(ctx, c, 'humps keep the world from burning', 664, 230, { bg: c.good, size: 15, align: 'right', ...p });
    }
  }

  _drawFuel(ctx, c, f, i, t, fire) {
    const x = f.x, y = 118;
    drawCard(ctx, c, x - 96, 30, 192, 168);
    const b = fire ? this._burn : 0;
    const char = (col) => mix(col, darken(c.waste, 0.4), b * 0.8);
    ctx.save();
    if (f.id === 'petrol') {
      rr(ctx, x - 32, y - 34, 64, 76, 10);
      ctx.fillStyle = char(c.s6);
      ctx.fill();
      rr(ctx, x - 20, y - 50, 26, 18, 6);
      ctx.fillStyle = char(darken(c.s6, 0.3));
      ctx.fill();
      rr(ctx, x + 12, y - 46, 12, 16, 4);
      ctx.fillStyle = char(c.waste);
      ctx.fill();
      ctx.strokeStyle = char(lighten(c.s6, 0.35));
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 20, y - 20); ctx.lineTo(x + 20, y + 26);
      ctx.moveTo(x + 20, y - 20); ctx.lineTo(x - 20, y + 26);
      ctx.stroke();
    } else if (f.id === 'wood') {
      for (let k = 0; k < 6; k++) {
        const row = k < 3 ? 0 : k < 5 ? 1 : 2;
        const col = k < 3 ? k : k < 5 ? k - 3 : 0;
        const cx = x - 34 + col * 34 + row * 17, cy = y + 28 - row * 30;
        ctx.beginPath();
        ctx.arc(cx, cy, 16, 0, Math.PI * 2);
        ctx.fillStyle = char(c.wood);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.strokeStyle = char(darken(c.wood, 0.35));
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    } else {
      blob(ctx, x, y + 4, 40, 28, 8, 0.05, 1.2);
      ctx.fillStyle = char(darken(c.mold, 0.35));
      ctx.fill();
      blob(ctx, x, y, 40, 28, 8, 0.05, 1.2);
      ctx.fillStyle = char(c.mold);
      ctx.fill();
    }
    ctx.restore();
    if (fire && b > 0.05) {
      const s = 1.2 + 1.8 * Math.min(1, b * 3) * (1 - 0.5 * Math.max(0, b - 0.7) / 0.3);
      drawFlame(ctx, c, x - 34, y + 22, s * 0.8, t + i);
      drawFlame(ctx, c, x + 30, y + 24, s * 0.85, t * 1.1 + i * 2);
      drawFlame(ctx, c, x - 2, y + 18, s, t * 0.9 + i * 3);
    }
    pill(ctx, c, f.label, x, 178, { bg: fire && b > 0.05 ? c.flame : c.labelMuted, size: 14 });
  }
}
