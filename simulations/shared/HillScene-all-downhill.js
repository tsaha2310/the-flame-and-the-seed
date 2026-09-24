/**
 * HillScene (preset: all-downhill) - blk-l05-04-01-s06 (what-if). Switch on "the
 * seed runs only catabolic reactions": it eats its store, recharges ATP and spends
 * it on nothing; the heat goes into the soil; in a day the store is gone and there
 * is no seedling, only a warm empty seed coat. A slow flame.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - our seed: store falls slowly, coins are spent building a shoot.
 *   1 run   - the switch; the store races down, coins pile up unspent, the soil warms.
 *   2 nails - catabolic alone is the flame; the coupling is the difference.
 *
 * Canvas: a seed in soil over one sim day; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, alpha, darken, lighten, mix, font, blob, ellipse, drawHillBackdrop, drawCoin, drawCardBox,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;
const DAY = 12;                        // seconds of scene time per sim day
const SX = 250, SY = 330;              // the seed

export class HillSceneAllDownhill extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A seed in the soil over one day. In our world it slowly uses its store, and the ATP it makes is spent building a ' +
    'shoot. Running only catabolic reactions, it burns through its store, piles up ATP it has nothing to spend on, ' +
    'warms the soil, and by the end of the day there is only a warm, empty seed coat. A slow flame.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Only catabolic: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Only catabolic: ON', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._dialled = false;
    this._reset();
  }

  _reset() {
    this._time = 0;
    this._store = 1;
    this._coins = 0;
    this._shoot = 0;
    this._heat = 0;
  }

  enter() {
    this.mode = 'off';
    this._dialled = false;
    this._reset();
  }

  isControlHidden() { return this.stage === S_SETUP; }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if ((id === 'on' || id === 'off') && id !== this.mode) { this.mode = id; this._reset(); }
    if (id === 'on' || id === 'off') this._dialled = true;
    this.requestUiUpdate?.();
  }

  update(d) {
    if (this.stage === S_RUN && !this._dialled) return;
    const on = this.mode === 'on';
    this._time = Math.min(DAY, this._time + d);
    if (this._time >= DAY) {
      if (this.stage !== S_RUN) this._reset();     // loop the demo
      return;
    }
    const k = d / DAY;
    if (on) {
      this._store = Math.max(0, this._store - k * 1.05);
      if (this._store > 0) { this._coins += k * 30; this._heat = Math.min(1, this._heat + k * 1.2); }
    } else {
      this._store = Math.max(0, this._store - k * 0.35);
      this._shoot = Math.min(1, this._shoot + k * 1.1);
      this._coins = 2 + Math.sin(this._time * 3);
      this._heat = Math.min(0.25, this._heat + k * 0.3);
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const on = this.mode === 'on';
    // Soil.
    ctx.fillStyle = mix(c.bgSurface, c.wood, 0.25);
    ctx.fillRect(0, 250, 680, 270);
    ctx.fillStyle = mix(c.bgSurface, c.mold, 0.5);
    ctx.fillRect(0, 244, 680, 10);
    // Heat into the soil.
    if (this._heat > 0.02) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + t * 0.3;
        const r = 70 + ((t * 30 + i * 20) % 60);
        ctx.beginPath();
        ctx.arc(SX + Math.cos(a) * r, SY + Math.sin(a) * r * 0.7, 6, 0, Math.PI * 2);
        ctx.fillStyle = alpha(c.bad, this._heat * (1 - (r - 70) / 60));
        ctx.fill();
      }
    }
    // Shoot.
    if (this._shoot > 0.01) {
      const hgt = 180 * this._shoot;
      ctx.strokeStyle = c.mold;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(SX, SY - 20);
      ctx.quadraticCurveTo(SX + 14, SY - 20 - hgt * 0.5, SX, SY - 20 - hgt);
      ctx.stroke();
      if (this._shoot > 0.5) {
        const ly = SY - 20 - hgt;
        for (const s of [-1, 1]) {
          ellipse(ctx, SX + s * 22, ly + 6, 22 * this._shoot, 9 * this._shoot, s * 0.4);
          ctx.fillStyle = c.mold;
          ctx.fill();
        }
      }
    }
    // Seed coat and store.
    blob(ctx, SX, SY + 5, 64, 44, 9, 0.05, 1.3);
    ctx.fillStyle = darken(c.wood, 0.5);
    ctx.fill();
    blob(ctx, SX, SY, 64, 44, 9, 0.05, 1.3);
    ctx.fillStyle = mix(mix(c.wood, c.bgSurface, 0.2), c.bgDeep, 0.55 * (1 - this._store));
    ctx.fill();
    const n = Math.round(22 * this._store);
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, r = 8 + (i % 6) * 7;
      ellipse(ctx, SX + Math.cos(a) * r * 1.2, SY + Math.sin(a) * r * 0.7, 7, 5);
      ctx.fillStyle = lighten(c.broth, 0.3);
      ctx.fill();
    }
    if (this._store <= 0.01) pill(ctx, c, 'a warm, empty seed coat', SX, SY + 76, { bg: c.bad, size: 14 });
    this._drawPanel(ctx, c);
    this._drawCoins(ctx, c);
    const st = this.stage;
    pill(ctx, c, on ? 'only catabolic' : 'our seed: both', 16, 30, { bg: on ? c.bad : c.good, size: 15, align: 'left' });
    if (st === S_SETUP) {
      const q = popAt(this.age, 1.0);
      if (q) pill(ctx, c, 'predict: a seed that only takes apart?', 16, 66, { bg: c.accent, size: 14, align: 'left', ...q });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the switch', 16, 66, { bg: c.accent, size: 14, align: 'left', scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_RUN && on && this._store <= 0.01) pill(ctx, c, 'a slow flame', 16, 66, { bg: c.flame, size: 14, align: 'left' });
    if (st === S_NAILS) {
      const q = popAt(this.age, 0.6);
      if (q) pill(ctx, c, 'falls paying for building: the difference', 16, 66, { bg: c.good, size: 14, align: 'left', ...q });
    }
  }

  _drawPanel(ctx, c) {
    const x = 430, y = 60, w = 234;
    drawCardBox(ctx, c, x, y, w, 150);
    const rows = [
      { label: 'hours', v: this._time / DAY, text: `${Math.floor((this._time / DAY) * 24)} h`, col: c.s1 },
      { label: 'store', v: this._store, text: `${Math.round(this._store * 100)}%`, col: c.broth },
      { label: 'shoot', v: this._shoot, text: `${Math.round(this._shoot * 30)} mm`, col: c.mold },
      { label: 'soil heat', v: this._heat, text: this._heat > 0.3 ? 'warm' : 'cool', col: c.bad },
    ];
    rows.forEach((r, i) => {
      const ry = y + 24 + i * 32;
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 14);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.label, x + 12, ry);
      rr(ctx, x + 88, ry - 8, 80, 16, 8);
      ctx.fillStyle = c.raised;
      ctx.fill();
      if (r.v > 0.01) {
        rr(ctx, x + 88, ry - 8, Math.max(16, 80 * Math.min(1, r.v)), 16, 8);
        ctx.fillStyle = r.col;
        ctx.fill();
      }
      ctx.fillStyle = c.label;
      ctx.textAlign = 'right';
      ctx.fillText(r.text, x + w - 10, ry);
    });
  }

  _drawCoins(ctx, c) {
    const n = Math.min(30, Math.round(this._coins));
    const x = 470, y = 470;
    for (let i = 0; i < n; i++) drawCoin(ctx, c, x + (i % 6) * 26, y - Math.floor(i / 6) * 14, 11);
    pill(ctx, c, this.mode === 'on' ? `ATP unspent: ${n}` : 'ATP: spent as it is made', 560, 290, { bg: c.warning, size: 14 });
  }
}
