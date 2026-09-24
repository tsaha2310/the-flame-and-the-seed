/**
 * HillScene (preset: catalyst, labelled) - blk-l03-06-03-s04 (explain). The
 * catalysed Hill with the words laid on it: a lower path to the same products,
 * the valley untouched, the hump lowered from both sides, the rule, and a seed
 * full of catalysts.
 *
 * Beats (five paragraphs, splitSteps() counts 5):
 *   0 Potato   - a different, lower path; more cross; the potato is not used up.
 *   1 Valley   - the hump drops, the valley does not: same energy out per crossing.
 *   2 Both     - lowered from both sides: the reverse speeds up as much.
 *   3 Rule     - lowers the hump, never the hill: how fast, never how far.
 *   4 The seed - thousands of catalysts, each lowering one hump.
 *
 * Canvas: looping runs; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, blob, darken, lighten, ellipse, drawHillBackdrop, drawHand, drawCard, arrow, ReactionHill,
  CrossingRun, TEMPS, CATALYST, PX_PER_K,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_POTATO = 0, S_VALLEY = 1, S_BOTH = 2, S_RULE = 3, S_SEED = 4;
const DROP = 1000;

export class HillSceneCatalystLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'The catalysed reaction Hill. The potato offers a lower path to the same products, so many more collisions ' +
    'cross at room temperature, and the potato is not used up. The hump drops but the products sit exactly as low ' +
    'as before, and the hump drops from both sides, so the reverse speeds up too. A seed is full of such catalysts.';

  constructor(container, config) {
    super(container, config);
    this._hill = new ReactionHill({ hump: CATALYST.lots, drop: DROP });
    this._run = new CrossingRun(this._hill, 29);
    this._wait = 0;
    this._runs = 0;
  }

  enter() {
    this._run.reset();
    this._wait = 0.4;
    this._runs = 0;
  }

  update(d) {
    const run = this._run;
    if (this.stage === S_SEED) return;
    if (this._wait > 0) {
      this._wait -= d;
      if (this._wait <= 0) {
        const dir = this.stage === S_BOTH && this._runs % 2 ? -1 : 1;
        run.start(40, TEMPS.room.K, dir, 0.06);
      }
      return;
    }
    run.step(d);
    if (run.done) { run.active = false; this._runs += 1; this._wait = 1.2; }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const hill = this._hill, run = this._run, st = this.stage;
    if (st === S_SEED) { this._drawSeed(ctx, c, t); return; }
    hill.draw(ctx, c, { ghostHump: CATALYST.none });
    const top = hill.yR - hill.hPx;
    const ghostTop = hill.yR - CATALYST.none * PX_PER_K;
    const low = hill.yR + hill.dPx;
    drawHand(ctx, c, hill.xp, top - 4 + Math.sin(t * 3) * 2, 0.8);
    pill(ctx, c, 'peroxide', 110, hill.yR - 26, { bg: c.s1, size: 14 });
    pill(ctx, c, 'water + oxygen', 570, low - 26, { bg: c.s3, size: 14 });
    run.draw(ctx, c);
    if (st === S_POTATO) {
      pill(ctx, c, 'old path', hill.xp, ghostTop - 22, { bg: c.labelMuted, size: 14 });
      const p = popAt(this.age, 0.4);
      if (p) pill(ctx, c, 'a different, lower path', 480, 200, { bg: c.s5, size: 14, ...p });
      this._potato(ctx, c, 100, 420);
      const p2 = popAt(this.age, 1.2);
      if (p2) pill(ctx, c, 'the potato: not used up', 160, 470, { bg: c.wood, size: 14, align: 'left', ...p2 });
    }
    if (st === S_VALLEY || st === S_RULE) {
      const ax = 600;
      arrow(ctx, ax, hill.yR, ax, low - 2, c.warning, 5);
      ctx.save();
      ctx.strokeStyle = c.warning;
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hill.xa - 40, hill.yR);
      ctx.lineTo(ax + 20, hill.yR);
      ctx.stroke();
      ctx.restore();
      if (st === S_VALLEY) {
        pill(ctx, c, 'hump: lower', hill.xp - 40, top - 104, { bg: c.s5, size: 14, align: 'right' });
        const p = popAt(this.age, 0.8);
        if (p) pill(ctx, c, 'valley: not moved. Same energy out', 664, 30, { bg: c.warning, size: 14, align: 'right', ...p });
      }
    }
    if (st === S_BOTH) {
      const rev = run.dir < 0;
      arrow(ctx, 520, low - 10, 520, ghostTop + 6, c.labelMuted, 4);
      arrow(ctx, 560, low - 10, 560, top + 6, c.s5, 5);
      pill(ctx, c, rev ? 'backwards: the lower hump helps too' : 'forwards: over the lower hump', 16, 30, { bg: rev ? c.s3 : c.s1, size: 14, align: 'left' });
      pill(ctx, c, `${run.crossed} of 40 crossed`, 664, 30, { bg: c.s2, size: 14, align: 'right' });
    }
    if (st === S_RULE) {
      const p = popAt(this.age, 0.4);
      if (p) pill(ctx, c, 'lowers the hump, never the hill', 16, 30, { bg: c.s5, size: 15, align: 'left', ...p });
      const p2 = popAt(this.age, 1.2);
      if (p2) pill(ctx, c, 'how fast, never how far', 16, 70, { bg: c.accent, size: 15, align: 'left', ...p2 });
    }
  }

  _potato(ctx, c, x, y) {
    const col = darken(c.wood, 0.35);
    blob(ctx, x, y + 4, 34, 24, 7, 0.08, 2.1);
    ctx.fillStyle = darken(col, 0.35);
    ctx.fill();
    blob(ctx, x, y, 34, 24, 7, 0.08, 2.1);
    ctx.fillStyle = col;
    ctx.fill();
    for (const [dx, dy] of [[-12, -6], [8, 4], [16, -8]]) {
      ellipse(ctx, x + dx, y + dy, 3, 2);
      ctx.fillStyle = darken(col, 0.45);
      ctx.fill();
    }
    ellipse(ctx, x - 14, y - 12, 8, 4, -0.4);
    ctx.fillStyle = lighten(col, 0.3);
    ctx.fill();

  }

  /** A seed as a grid of small Hills, each with its own small hand. */
  _drawSeed(ctx, c, t) {
    const p = popAt(this.age, 0.2);
    if (!p) return;
    ctx.save();
    ctx.globalAlpha *= p.alpha;
    drawCard(ctx, c, 30, 60, 620, 400);
    for (let i = 0; i < 12; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      const x = 60 + col * 150, y = 90 + row * 120;
      const hump = 26 + ((i * 7) % 5) * 6, drop = 10 + ((i * 3) % 4) * 6;
      const hx = x + 64;
      ctx.beginPath();
      ctx.moveTo(x, y + 60);
      ctx.lineTo(x + 30, y + 60);
      ctx.quadraticCurveTo(hx, y + 60 - hump * 2, x + 98, y + 60 + drop);
      ctx.lineTo(x + 128, y + 60 + drop);
      ctx.strokeStyle = [c.s1, c.s2, c.s3, c.s4, c.s5, c.s7][i % 6];
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.stroke();
      drawHand(ctx, c, hx, y + 60 - hump + Math.sin(t * 3 + i) * 1.5, 0.3, [c.s1, c.s2, c.s3, c.s4, c.s5, c.s7][i % 6]);
    }
    ctx.restore();
    pill(ctx, c, 'a seed: thousands of catalysts, each one hump', 340, 30, { bg: c.accent, size: 15 });
    const q = popAt(this.age, 1.2);
    if (q) pill(ctx, c, 'none of them moves a valley', 340, 488, { bg: c.warning, size: 15, ...q });
  }
}
