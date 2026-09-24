/**
 * HillScene (preset: metabolism, labelled) - blk-l05-04-01-s04 (explain). The
 * seed's reactions with their names: taking apart runs downhill (catabolic),
 * building runs uphill and is paid for by ATP breaking (anabolic), all of them
 * together is metabolism, the rule, and the flame against the seed.
 *
 * Beats (five paragraphs, splitSteps() counts 5):
 *   0 Catabolic - the three downhill ones roll in turn; the falls make the coins.
 *   1 Anabolic  - the three uphill ones, each coupled to ATP breaking.
 *   2 Together  - falls on the left pay, through coins, for climbs on the right.
 *   3 Rule      - catabolic down and apart, anabolic up and building.
 *   4 Flame     - the flame is all catabolic; the seed does both.
 *
 * Canvas: rolling balls and flowing coins; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, drawHillBackdrop, drawMarble, drawStepHill, drawCard, drawCoin, drawFlame, blob, darken,
  METAB, ATP_DG, dropPx,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_CATA = 0, S_ANA = 1, S_ALL = 2, S_RULE = 3, S_FLAME = 4;
const DOWN = ['starch', 'fat', 'glucose'], UP = ['peptide', 'rna', 'sugar'];

export class HillSceneMetabolismLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'Taking apart runs downhill: starch to glucose, fat to fatty acids, glucose to carbon dioxide and water. These are ' +
    'catabolic, and their fall makes ATP coins. Building runs uphill: protein, RNA, sugar. These are anabolic and each ' +
    'is paid for by ATP breaking. All of them together is metabolism. The flame only takes apart; the seed does both.';

  constructor(container, config) {
    super(container, config);
    this._i = 0;
    this._t = 0;
    this._ball = 0;
  }

  enter() { this._i = 0; this._t = 0; this._ball = 0; }

  update(d) {
    this._t += d;
    if (this._t > 0.5) this._ball = Math.min(1, this._ball + d * 0.8);
    if (this._t > 3.4) { this._t = 0; this._i += 1; this._ball = 0; }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const st = this.stage;
    if (st === S_CATA || st === S_ANA) this._drawOne(ctx, c, t);
    else if (st === S_FLAME) this._drawFlameSeed(ctx, c, t);
    else this._drawLoop(ctx, c, t, 60, 70, 560, 360, true);
    if (st === S_RULE) {
      const q = popAt(this.age, 0.4);
      if (q) pill(ctx, c, 'catabolic: downhill, takes apart', 16, 30, { bg: c.s1, size: 14, align: 'left', ...q });
      const q2 = popAt(this.age, 1.0);
      if (q2) pill(ctx, c, 'anabolic: uphill, builds', 664, 30, { bg: c.s4, size: 14, align: 'right', ...q2 });
      const q3 = popAt(this.age, 1.6);
      if (q3) pill(ctx, c, 'the falls pay for the climbs, through ATP', 340, 492, { bg: c.warning, size: 14, ...q3 });
    }
    if (st === S_ALL) {
      pill(ctx, c, 'metabolism: all of them, together', 340, 30, { bg: c.accent, size: 15 });
      const q = popAt(this.age, 1.2);
      if (q) pill(ctx, c, 'the word means change: the slow fire', 340, 492, { bg: c.labelMuted, size: 14, ...q });
    }
  }

  /** One reaction on the step Hill, cycling through the down (or up, coupled) set. */
  _drawOne(ctx, c, t) {
    const cata = this.stage === S_CATA;
    const key = (cata ? DOWN : UP)[this._i % 3];
    const r = METAB[key];
    const k = cata ? 0 : Math.ceil((r.dG + 5) / -ATP_DG);
    const net = cata ? r.dG : r.dG + k * ATP_DG;
    const drop = dropPx(r.dG);
    // Uphill ones are drawn as the climb they are; the coin's fall is what pays.
    const y = drawStepHill(ctx, c, 60, 620, cata ? 200 : 330, drop, { bottom: 420 });
    const u = this._ball;
    const bx = 130 + 420 * u;
    drawMarble(ctx, c, bx, y(bx) - 18, 16, c.s4, { face: true });
    if (cata && key === 'glucose' && u > 0.6) {
      for (let i = 0; i < 5; i++) drawCoin(ctx, c, 470 + i * 26, 470 - Math.sin(Math.min(1, (u - 0.6) * 3) * Math.PI) * 20, 11);
      pill(ctx, c, 'the fall makes the coins', 340, 492, { bg: c.warning, size: 14 });
    }
    if (!cata) {
      drawCoin(ctx, c, bx + 30, y(bx) - 14, 12, u > 0.9);
      if (k > 1) pill(ctx, c, `\u00d7${k}`, bx + 48, y(bx) - 30, { bg: c.warning, size: 14, align: 'left' });
      pill(ctx, c, `paid by ATP breaking: net ${net.toFixed(1)} kJ`, 340, 492, { bg: c.warning, size: 14 });
    }
    pill(ctx, c, r.label, 16, 30, { bg: c.s5, size: 15, align: 'left' });
    pill(ctx, c, cata ? 'catabolic: cata = down' : 'anabolic: ana = up', 664, 30, { bg: cata ? c.s1 : c.s4, size: 15, align: 'right' });
  }

  /** Falls on the left, coins flowing across, climbs on the right. */
  _drawLoop(ctx, c, t, x, y, w, h, both) {
    drawCard(ctx, c, x, y, w, h);
    const colL = x + 90, colR = x + w - 90;
    DOWN.forEach((k, i) => {
      const yy = y + 60 + i * 100;
      const u = (t * 0.5 + i * 0.33) % 1;
      pill(ctx, c, { starch: 'starch', fat: 'fat', glucose: 'glucose' }[k], colL - 70, yy - 26, { bg: c.s1, size: 14, align: 'left' });
      ctx.strokeStyle = c.s1;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(colL - 60, yy);
      ctx.lineTo(colL + 40, yy + 40);
      ctx.stroke();
      drawMarble(ctx, c, colL - 60 + 100 * u, yy + 40 * u - 10, 9, c.s1, {});
    });
    if (both) {
      UP.forEach((k, i) => {
        const yy = y + 60 + i * 100;
        const u = (t * 0.5 + i * 0.33 + 0.5) % 1;
        pill(ctx, c, { peptide: 'protein', rna: 'RNA', sugar: 'sugar' }[k], colR + 70, yy - 26, { bg: c.s4, size: 14, align: 'right' });
        ctx.strokeStyle = c.s4;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(colR - 40, yy + 40);
        ctx.lineTo(colR + 60, yy);
        ctx.stroke();
        drawMarble(ctx, c, colR - 40 + 100 * u, yy + 40 - 40 * u - 10, 9, c.s4, {});
      });
      for (let i = 0; i < 6; i++) {
        const u = (t * 0.35 + i / 6) % 1;
        const cx = colL + 50 + (colR - colL - 100) * u;
        const cy = y + h / 2 + 30 - Math.sin(u * Math.PI) * 60;
        drawCoin(ctx, c, cx, cy, 10, u > 0.85);
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const u = (t * 0.6 + i / 4) % 1;
        blob(ctx, colL + 80 + u * 60, y + h / 2 - u * 40, 10 + 12 * u, 6 + 6 * u, 6, 0.2, t + i);
        ctx.fillStyle = darken(c.flame, 0.1);
        ctx.globalAlpha = 1 - u;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  _drawFlameSeed(ctx, c, t) {
    this._drawLoopMini(ctx, c, t, 16, 60, 316, false);
    this._drawLoopMini(ctx, c, t, 348, 60, 316, true);
    const q = popAt(this.age, 0.6);
    if (q) pill(ctx, c, 'the flame: all catabolic, builds nothing', 174, 470, { bg: c.flame, size: 14, ...q });
    const q2 = popAt(this.age, 1.3);
    if (q2) pill(ctx, c, 'the seed: both', 506, 470, { bg: c.good, size: 14, ...q2 });
  }

  _drawLoopMini(ctx, c, t, x, y, w, seed) {
    drawCard(ctx, c, x, y, w, 370);
    if (seed) {
      blob(ctx, x + w / 2, y + 60, 40, 26, 8, 0.05, 1.2);
      ctx.fillStyle = c.mold;
      ctx.fill();
    } else {
      drawFlame(ctx, c, x + w / 2, y + 86, 1.8, t);
    }
    const ys = [y + 160, y + 230, y + 300];
    ys.forEach((yy, i) => {
      const u = (t * 0.5 + i * 0.33) % 1;
      ctx.strokeStyle = c.s1;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + 30, yy - 20);
      ctx.lineTo(x + 130, yy + 20);
      ctx.stroke();
      drawMarble(ctx, c, x + 30 + 100 * u, yy - 20 + 40 * u - 9, 8, c.s1, {});
      if (seed) {
        ctx.strokeStyle = c.s4;
        ctx.beginPath();
        ctx.moveTo(x + w - 130, yy + 20);
        ctx.lineTo(x + w - 30, yy - 20);
        ctx.stroke();
        drawMarble(ctx, c, x + w - 130 + 100 * u, yy + 20 - 40 * u - 9, 8, c.s4, {});
        drawCoin(ctx, c, x + w / 2, yy - 4 + Math.sin(t * 3 + i) * 4, 9);
      }
    });
  }
}
