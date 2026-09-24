/**
 * CrowdScene (preset: every-hit-counts) - blk-l03-06-01-s06 (what-if). Kabir's
 * every-hit world: every collision reacts. The box reacts out in a moment; then
 * the shelf milk sours in seconds, the diya's oil reacts with the air with no
 * match, and the seed burns up as you watch.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - our world: most collisions bounce; the milk, the oil, the seed sit still.
 *   1 run   - the switch; the box goes purple; milk, oil, seed in turn.
 *   2 nails - most collisions fail; something must be paid first (next lesson).
 *
 * Canvas: reacting particles and three kitchen vignettes; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, mix, darken, blob, drawHillBackdrop, drawBox, drawParticles, drawCardBox, drawFlame,
  ReactionBox, drawFlashes,
} from './CrowdKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;
const BOX = { x0: 30, y0: 110, x1: 350, y1: 440 };

export class CrowdSceneEveryHitCounts extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A box of red and blue particles where, in our world, most collisions just bounce. If every collision reacted, ' +
    'the box would react out at once, shelf milk would sour in seconds, the oil in a diya would react with the air ' +
    'without a match, and a seed would burn up as you watch.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Every collision reacts: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Every collision reacts: ON', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._dialled = false;
    this._build();
  }

  _build() {
    this._rx = new ReactionBox({ ...BOX, red: 40, ea: 2.4, every: this.mode === 'on', seed: 71 });
    this._t = 0;
  }

  enter() {
    this.mode = 'off';
    this._dialled = false;
    this._build();
  }

  isControlHidden() { return this.stage === S_SETUP; }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if ((id === 'on' || id === 'off') && id !== this.mode) { this.mode = id; this._build(); }
    if (id === 'on' || id === 'off') this._dialled = true;
    this.requestUiUpdate?.();
  }

  update(d) {
    this._t += d;
    this._rx.step(d);
    if (this.mode === 'off' && this._t > 14) this._build();
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const b = this._rx.box, on = this.mode === 'on';
    drawBox(ctx, c, b);
    drawParticles(ctx, c, b);
    drawFlashes(ctx, c, this._rx);
    pill(ctx, c, on ? 'every hit reacts' : 'our world: most hits bounce', 30, 70, { bg: on ? c.bad : c.good, size: 15, align: 'left' });
    // Three vignettes on the right; in the what-if they go one after another.
    const phase = on ? this._t : -1;
    this._milk(ctx, c, 380, 40, phase >= 1 ? Math.min(1, (phase - 1) / 1.5) : 0);
    this._oil(ctx, c, 380, 190, phase >= 3 ? Math.min(1, (phase - 3) / 1.5) : 0, t);
    this._seed(ctx, c, 380, 340, phase >= 5 ? Math.min(1, (phase - 5) / 2) : 0, t);
    const st = this.stage;
    if (st === S_SETUP) {
      const q = popAt(this.age, 1.0);
      if (q) pill(ctx, c, 'predict: the shelf milk?', 190, 480, { bg: c.accent, size: 15, ...q });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the dial', 190, 480, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_NAILS) {
      const q = popAt(this.age, 0.5);
      if (q) pill(ctx, c, 'most collisions fail', 190, 480, { bg: c.good, size: 15, ...q });
    }
  }

  _card(ctx, c, x, y, title, k) {
    drawCardBox(ctx, c, x, y, 284, 130);
    pill(ctx, c, title, x + 12, y + 20, { bg: k > 0.05 ? c.bad : c.labelMuted, size: 14, align: 'left' });
  }

  _milk(ctx, c, x, y, k) {
    this._card(ctx, c, x, y, k > 0.95 ? 'milk: sour in seconds' : 'shelf milk', k);
    rr(ctx, x + 30, y + 44, 50, 72, 10);
    ctx.fillStyle = mix(c.label, c.s3, 0.2 + 0.6 * k);
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    rr(ctx, x + 110, y + 70, 150, 16, 8);
    ctx.fillStyle = c.raised;
    ctx.fill();
    if (k > 0.01) {
      rr(ctx, x + 110, y + 70, 150 * k, 16, 8);
      ctx.fillStyle = c.s3;
      ctx.fill();
    }
  }

  _oil(ctx, c, x, y, k, t) {
    this._card(ctx, c, x, y, k > 0.05 ? 'diya oil: burns with no match' : 'diya oil in its jar', k);
    blob(ctx, x + 60, y + 90, 36, 18, 8, 0.05, 0.3);
    ctx.fillStyle = darken(c.wood, 0.3);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 60, y + 84, 28, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = c.broth;
    ctx.fill();
    if (k > 0.05) {
      for (let i = 0; i < 4; i++) drawFlame(ctx, c, x + 110 + i * 40, y + 110, 0.7 + k * 0.9, t + i);
    }
  }

  _seed(ctx, c, x, y, k, t) {
    this._card(ctx, c, x, y, k > 0.05 ? 'the seed: burns as you watch' : 'a seed', k);
    const s = 1 - 0.7 * k;
    blob(ctx, x + 140, y + 84, 36 * s, 24 * s, 8, 0.05, 1.2);
    ctx.fillStyle = mix(c.mold, c.waste, k);
    ctx.fill();
    if (k > 0.05 && k < 0.98) drawFlame(ctx, c, x + 140, y + 84, 1.4, t);
  }
}
