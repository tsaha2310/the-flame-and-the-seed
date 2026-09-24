/**
 * CrowdScene (preset: aimed-walk) - blk-l03-05-03-s05 (what-if). Kabir's aimed
 * particles all head for the emptier side. The ink shoots across the jug as a
 * front, overshoots, and cannot stop: the jug sloshes with ink waves. Smells would
 * arrive as a wall.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - our world: the thousand spread in a slow, smooth blur; predict.
 *   1 run   - the switch; a front, an overshoot, waves that never settle.
 *   2 nails - diffusion is slow and smooth because nobody aims.
 *
 * Canvas: a thousand moving dots and a live crowding profile; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, rr, drawHillBackdrop, drawBox, drawCardBox, DotCloud, walkSpeed, walkStep } from './CrowdKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;
const BOX = { x0: 40, y0: 90, x1: 640, y1: 320 };

export class CrowdSceneAimedWalk extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A thousand ink particles released at one side of a jug. With random walks they spread in a slow, smooth blur ' +
    'until both sides are even. If every particle headed for the emptier side, the ink would shoot across as a front, ' +
    'overshoot, and slosh back and forth in waves that never settle.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Head for the empty side: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Head for the empty side: ON', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._dialled = false;
    this._build();
  }

  _build() {
    this._cloud = new DotCloud(BOX, { step: walkStep('small'), speed: walkSpeed(25), fast: 1.2, aimed: this.mode === 'on' });
    this._cloud.running = true;
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
    if (id === 'on' || id === 'off') { this.mode = id; this._dialled = true; this._build(); }
    this.requestUiUpdate?.();
  }

  update(d) {
    if (this.stage === S_RUN && !this._dialled) return;
    this._t += d;
    this._cloud.update(d);
    if (this.mode === 'off' && this._t > 18) this._build();
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    drawBox(ctx, c, BOX);
    this._cloud.draw(ctx, c, c.s5);
    // Crowding profile.
    const x = 40, y = 350, w = 600, h = 100;
    drawCardBox(ctx, c, x, y, w, h);
    const bins = this._cloud.bins(30);
    const max = Math.max(60, ...bins);
    bins.forEach((v, i) => {
      const bh = (v / max) * (h - 20);
      rr(ctx, x + 10 + i * 19.3, y + h - 10 - bh, 15, Math.max(2, bh), 3);
      ctx.fillStyle = c.s5;
      ctx.fill();
    });
    const on = this.mode === 'on';
    pill(ctx, c, on ? 'every particle aims for the emptier side' : 'our world: nobody aims', 40, 50, { bg: on ? c.bad : c.good, size: 15, align: 'left' });
    const st = this.stage;
    if (st === S_SETUP) {
      const q = popAt(this.age, 1.0);
      if (q) pill(ctx, c, 'predict: aimed ink?', 640, 50, { bg: c.accent, size: 15, align: 'right', ...q });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the dial', 640, 50, { bg: c.accent, size: 15, align: 'right', scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_RUN && on && this._t > 3) pill(ctx, c, 'it sloshes: it cannot stop', 640, 50, { bg: c.bad, size: 15, align: 'right' });
    if (st === S_NAILS) {
      const q = popAt(this.age, 0.5);
      if (q) pill(ctx, c, 'the randomness is the mechanism', 340, 488, { bg: c.good, size: 15, ...q });
    }
  }
}
