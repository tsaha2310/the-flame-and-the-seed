/**
 * HillScene (preset: hump, labelled) - blk-l03-06-02-s03 (explain). The reaction
 * Hill with the words laid on it: why the path climbs first, activation energy,
 * the gas that waits and the match that walks, the rule, and how steeply warming
 * raises the rate.
 *
 * Beats (five paragraphs, splitSteps() counts 5):
 *   0 Path       - bonds break first (cost), new bonds form (pay back more).
 *   1 Activation - the hump's height; softer collisions bounce back.
 *   2 The match  - room temperature: nothing crosses; a match's patch: most cross.
 *   3 Rule       - downhill still climbs a hump first; the match is needed once.
 *   4 Steeply    - the share that crosses at fridge, room, warm and flame.
 *
 * Canvas: looping marble runs; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, font, drawHillBackdrop, drawFlame, drawCard, arrow, ReactionHill, CrossingRun,
  TEMPS, HUMPS_K, crossFraction,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_PATH = 0, S_ACT = 1, S_MATCH = 2, S_RULE = 3, S_STEEP = 4;
const DROP = 1000;

export class HillSceneHumpLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'The reaction Hill labelled. The path climbs before it falls because bonds must break before new ones form. ' +
    'The hump\'s height is the activation energy; softer collisions bounce back. At room temperature methane and ' +
    'oxygen almost never cross; a match\'s hot patch lets most cross, and the heat released keeps the flame going. ' +
    'A small rise in temperature raises the share that crosses steeply.';

  constructor(container, config) {
    super(container, config);
    this._hill = new ReactionHill({ hump: HUMPS_K.medium, drop: DROP });
    this._run = new CrossingRun(this._hill, 23);
    this._temp = 'room';
    this._wait = 0;
    this._runs = 0;
  }

  enter(stage) {
    const hump = stage === S_MATCH || stage === S_RULE || stage === S_STEEP ? HUMPS_K.high : HUMPS_K.medium;
    this._hill.set(hump, DROP);
    this._temp = stage === S_PATH ? 'flame' : 'room';
    this._run.reset();
    this._wait = 0.5;
    this._runs = 0;
  }

  update(d) {
    const run = this._run;
    if (this._wait > 0) {
      this._wait -= d;
      if (this._wait <= 0) {
        if (this.stage >= S_MATCH) this._temp = this.stage === S_STEEP ? ['fridge', 'room', 'warm', 'flame'][this._runs % 4] : this._runs % 2 ? 'flame' : 'room';
        run.start(this.stage === S_PATH ? 12 : 40, TEMPS[this._temp].K, 1, this.stage === S_PATH ? 0.25 : 0.06);
      }
      return;
    }
    run.step(d);
    if (run.done) { this._runs += 1; this._wait = 1.4; run.active = false; }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const hill = this._hill, run = this._run, st = this.stage;
    hill.draw(ctx, c);
    const top = hill.yR - hill.hPx;
    pill(ctx, c, 'fuel + oxygen', 110, hill.yR - 26, { bg: c.s1, size: 14 });
    pill(ctx, c, 'CO\u2082 + water', 570, hill.yR + hill.dPx - 26, { bg: c.s3, size: 14 });
    run.draw(ctx, c);
    if (st === S_PATH) {
      const a = popAt(this.age, 0.3);
      if (a) {
        ctx.save();
        ctx.globalAlpha *= a.alpha;
        arrow(ctx, 238, hill.yR - 20, 300, top + 20, c.bad, 6);
        arrow(ctx, 380, top + 20, 448, hill.yR + hill.dPx - 24, c.good, 6);
        ctx.restore();
        pill(ctx, c, 'bonds break first: costs', 250, top - 10, { bg: c.bad, size: 14, align: 'right', ...a });
      }
      const b = popAt(this.age, 1.0);
      if (b) pill(ctx, c, 'new bonds form: pay back more', 420, top + 30, { bg: c.good, size: 14, align: 'left', ...b });
    }
    if (st === S_ACT) {
      const x = hill.xp + 64;
      ctx.save();
      ctx.strokeStyle = c.warning;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(hill.xa - 60, hill.yR);
      ctx.lineTo(x + 10, hill.yR);
      ctx.moveTo(hill.xp, top);
      ctx.lineTo(x + 10, top);
      ctx.stroke();
      ctx.restore();
      arrow(ctx, x, hill.yR, x, top + 2, c.warning, 5);
      if (st === S_ACT) {
        pill(ctx, c, 'activation energy', x + 14, (hill.yR + top) / 2, { bg: c.warning, size: 15, align: 'left' });
        const p = popAt(this.age, 1.2);
        if (p) pill(ctx, c, 'softer collisions bounce back', 150, 140, { bg: c.s1, size: 14, ...p });
      }
    }
    if (st >= S_MATCH) {
      const hot = this._temp === 'flame';
      pill(ctx, c, TEMPS[this._temp].label, 664, 30, { bg: hot ? c.flame : c.s2, size: 15, align: 'right' });
      if (hot) drawFlame(ctx, c, 90, hill.yR - 8, 1.3, t);
      if (st === S_MATCH) {
        pill(ctx, c, hot ? 'a match: a hot patch, most cross' : 'room: the gas waits, nothing crosses', 16, 30, { bg: hot ? c.flame : c.s1, size: 15, align: 'left' });
        const p = popAt(this.age, 3);
        if (p && hot) pill(ctx, c, 'each crossing heats the next patch', 340, 76, { bg: c.warning, size: 14, ...p });
      }
    }
    if (st === S_RULE) {
      const p = popAt(this.age, 0.4);
      if (p) pill(ctx, c, 'downhill, but a hump first', 340, 76, { bg: c.accent, size: 15, ...p });
      const p2 = popAt(this.age, 1.2);
      if (p2) pill(ctx, c, 'the match is needed only once', 340, 116, { bg: c.flame, size: 15, ...p2 });
    }
    if (st !== S_MATCH && st !== S_RULE) run.drawTrays(ctx, c);
    if (st === S_STEEP) this._drawChart(ctx, c);
  }

  /** Share of collisions hard enough to cross the medium hump, per temperature. */
  _drawChart(ctx, c) {
    const x = 16, y = 14, w = 300, h = 186;
    const p = popAt(this.age, 0.2);
    if (!p) return;
    ctx.save();
    ctx.globalAlpha *= p.alpha;
    drawCard(ctx, c, x, y, w, h);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('crossings per 1000 (high hump)', x + 14, y + 18);
    const keys = ['fridge', 'room', 'warm', 'flame'];
    const grow = Math.min(1, (this.age - 0.4) / 1.2);
    keys.forEach((k, i) => {
      const n = Math.round(crossFraction(HUMPS_K.high, TEMPS[k].K) * 1000);
      // Bar heights on a log scale, so 6 and 540 both fit.
      const f = Math.log10(1 + n) / 3;
      const bx = x + 26 + i * 68, bw = 42, base = y + h - 36, bh = 110 * f * Math.max(0, grow);
      rr(ctx, bx, base - bh, bw, Math.max(4, bh), 6);
      ctx.fillStyle = k === 'flame' ? c.flame : k === 'fridge' ? c.s1 : c.s2;
      ctx.fill();
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 14);
      ctx.textAlign = 'center';
      ctx.fillText(String(n), bx + bw / 2, base - bh - 12);
      ctx.fillStyle = c.labelMuted;
      ctx.fillText(k, bx + bw / 2, base + 16);
    });
    ctx.restore();
    const q = popAt(this.age, 2.0);
    if (q) pill(ctx, c, 'warming: the rate climbs steeply', 490, 60, { bg: c.accent, size: 14, ...q });
    const q2 = popAt(this.age, 2.6);
    if (q2) pill(ctx, c, 'that was the milk', 490, 100, { bg: c.labelMuted, size: 14, ...q2 });
  }
}
