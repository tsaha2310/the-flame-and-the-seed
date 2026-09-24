/**
 * SealedJarBurnScene-results - blk-l01-01-02-s03 (explain). What Lavoisier's
 * sealed jar said, one number at a time.
 *
 * Beats (the slide's seven paragraphs, splitSteps() counts 7):
 *   0 Same       - the sealed jar weighs the same before and after heating.
 *   1 Air in     - opening it, air rushes in (Open again replays it).
 *   2 Tin alone  - the tin is heavier by exactly the air that rushed in.
 *   3 Verdict    - phlogiston said "lighter"; the balance said "heavier".
 *   4 Oxygen     - about a fifth of the air is oxygen; it joins the metal.
 *   5 The rule   - conservation of mass: a sealed jar's total does not change.
 *   6 Rearranged - nothing gained, nothing lost, only rearranged.
 *
 * Canvas, driving the shared Apparatus; labels are chips only, drawn in canvas
 * coordinates.
 */
import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import { clamp01, smooth } from 'simulations/base/SimMotion.js';
import {
  W, H, loadColors, alpha, darken, font, rr, pill, popAt, leader, Burst,
  drawWall, drawShelf, drawCard, grams, Apparatus, drawMetal, SHIFT_G, METAL_G, JAR_G, AIR_G, LAYOUT,
} from './LavoisierKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
  [{ idx: 5, dwellMs: null }],
  [{ idx: 6, dwellMs: null }],
];
const TOTAL = JAR_G + AIR_G + METAL_G;
const RX = 400;                         // right-hand label column centre

export class SealedJarBurnSceneResults extends CanvasSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  static ARIA_LABEL =
    'Lavoisier\'s results. The sealed jar weighs 311.5 grams before and after heating the tin. Opened, air ' +
    'rushes in. The tin alone is 0.3 grams heavier, exactly the air that rushed in. Phlogiston said lighter; ' +
    'the balance said heavier. About a fifth of the air is oxygen, and burning is a thing joining oxygen. In a ' +
    'sealed jar the total mass never changes: conservation of mass.';

  static CONTROLS = [
    { type: 'button', id: 'again', label: 'Open again' },
  ];

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;
    this.colors = null;
    this._stage = -1;
    this._age = 0;
    this._fade = 1;
    this._clock = 0;
    this._app = new Apparatus(31);
    this._burst = new Burst();
    this._fired = false;
  }

  async setup() {
    await super.setup();
    this._reloadColors();
    this._enterStage(0);
    this._drawInitialFrame(this._ctx);
  }

  _reloadColors() {
    this.colors = loadColors(this.container);
  }

  onBeatChange(beatIndex) {
    const b = Math.max(0, Math.min(BEAT_STEP_MAP.length - 1, beatIndex | 0));
    const stage = BEAT_STEP_MAP[b][0].idx;
    if (stage !== this._stage) this._enterStage(stage);
    this.requestUiUpdate?.();
  }

  isControlHidden(id) {
    return id !== 'again' || this._stage !== 1;
  }

  isControlDisabled() {
    return this._app.phase === 'open';
  }

  onControlChange(id) {
    if (this.isControlHidden(id) || this.isControlDisabled(id)) return;
    this._startOpen();
    this.requestUiUpdate?.();
  }

  /** Put the bench in the "just heated, still sealed" state. */
  _heated() {
    const app = this._app;
    app.reset();
    app.progress = 1;
    app.gas.dots = app.gas.dots.filter((d) => d.kind !== 'o');
  }

  _startOpen() {
    this._heated();
    this._app.phase = 'open';
    this._app.age = 0;
  }

  _enterStage(stage) {
    this._stage = stage;
    this._age = 0;
    this._fade = 0;
    this._fired = false;
    this._burst = new Burst();
    const app = this._app;
    if (stage === 0 || stage === 3) this._heated();
    if (stage === 1) this._startOpen();
    if (stage === 2) { this._heated(); app.opened = 1; app.rushed = 1; app.phase = 'alone'; app.age = 0; }
    if (stage === 5 || stage === 6) { app.reset(); app.physics = 'oxygen'; app.phase = 'heat'; app.age = 0; }
    this.requestUiUpdate?.();
  }

  // -- Frame --------------------------------------------------------------------------------

  _tick(ctx, dt) {
    if (!this.colors) return;
    const d = Math.max(0, Math.min(dt, 0.05));   // the first frame can report a negative dt
    this._clock += d;
    this._age += d;
    this._fade = Math.min(1, this._fade + d / 0.35);
    const app = this._app;
    const ended = app.update(d, this._clock);
    // Each beat shows one part of the run, then holds.
    if (this._stage === 1 && ended === 'open') { app.phase = 'idle'; app.opened = 1; app.rushed = 1; this.requestUiUpdate?.(); }
    if ((this._stage === 5 || this._stage === 6) && ended === 'heat') { app.phase = 'idle'; }
    if (this._stage === 6 && !this._fired && this._age > 3.8) {
      this._fired = true;
      const c = this.colors;
      this._burst.fire(LAYOUT.MAIN.x, 150, [c.s1, c.s2, c.s3, c.s4, c.s5], 34, 1.4);
    }
    this._burst.update(d);
    this._draw(ctx);
  }

  _drawInitialFrame(ctx) {
    if (this.colors) this._draw(ctx);
  }

  _draw(ctx) {
    const c = this.colors;
    const t = this._clock;
    const a = this._age;
    const s = this._stage;
    ctx.clearRect(0, 0, W, H);
    drawWall(ctx, c);
    if (s === 4) {
      this._drawOxygen(ctx);
    } else {
      drawShelf(ctx, c, 10, 372, LAYOUT.MAIN.py + 80);
      this._app.draw(ctx, c, t);
    }

    if (s === 0) {
      [['before: 311.5 g', 0.3], ['after heating: 311.5 g', 0.8]].forEach(([txt, at], i) => {
        const p = popAt(a, at);
        if (p) pill(ctx, c, txt, RX + 110, 160 + i * 50, { bg: c.labelMuted, size: 16, ...p });
      });
      const p = popAt(a, 1.4);
      if (p) pill(ctx, c, 'nothing in or out', RX + 110, 280, { bg: c.good, size: 17, ...p });
    } else if (s === 1) {
      const p = popAt(a, 0.8);
      if (p) {
        leader(ctx, RX + 30, 118, LAYOUT.MAIN.x + 20, 172, c.s1, p.alpha);
        pill(ctx, c, 'air rushes in', RX + 110, 110, { bg: c.s1, size: 17, ...p });
      }
      const p2 = popAt(a, 1.8);
      if (p2) pill(ctx, c, `jar: ${grams(TOTAL)} \u2192 ${grams(this._app.mainReading())}`, RX + 110, 170, { bg: c.labelMuted, size: 15, ...p2 });
    } else if (s === 2) {
      const p = popAt(a, 1.8);
      if (p) {
        pill(ctx, c, `tin: ${grams(METAL_G)} \u2192 ${grams(METAL_G + SHIFT_G)}`, RX + 110, 200, { bg: c.labelMuted, size: 16, ...p });
        pill(ctx, c, `+${SHIFT_G.toFixed(1)} g in the tin`, RX + 110, 256, { bg: c.s1, size: 16, ...p });
      }
      const p2 = popAt(a, 2.5);
      if (p2) pill(ctx, c, `= ${SHIFT_G.toFixed(1)} g of air rushed in`, RX + 110, 306, { bg: c.s1, size: 16, ...p2 });
    } else if (s === 3) {
      this._drawVerdict(ctx);
    } else if (s === 5) {
      const p = popAt(a, 0.4);
      if (p) pill(ctx, c, 'conservation of mass', RX + 110, 150, { bg: c.accent, size: 19, display: true, ...p });
      const p2 = popAt(a, 1.2);
      if (p2) pill(ctx, c, `sealed total: ${grams(TOTAL)}, always`, RX + 110, 206, { bg: c.good, size: 15, ...p2 });
    } else if (s === 6) {
      const labels = [['nothing gained', 0.4], ['nothing lost', 1.0], ['only rearranged', 3.9]];
      labels.forEach(([txt, at], i) => {
        const p = popAt(a, at);
        if (p) pill(ctx, c, txt, RX + 110, 150 + i * 56, { bg: i === 2 ? c.accent : c.good, size: 17, ...p });
      });
    }
    this._burst.draw(ctx);
    if (this._fade < 1) {
      ctx.fillStyle = alpha(c.bgDeep, 1 - this._fade);
      ctx.fillRect(0, 0, W, H);
    }
  }

  _drawVerdict(ctx) {
    const c = this.colors;
    const a = this._age;
    ctx.fillStyle = alpha(c.bgDeep, 0.55);
    ctx.fillRect(0, 0, W, H);
    const cards = [
      { head: 'phlogiston said', val: 'lighter \u2193', col: c.flame, mark: '\u2717', markCol: c.bad, at: 0.2 },
      { head: 'the balance said', val: 'heavier \u2191', col: c.s1, mark: '\u2713', markCol: c.good, at: 0.8 },
    ];
    cards.forEach((k, i) => {
      const p = popAt(a, k.at);
      if (!p) return;
      const x = 70 + i * 290, y = 150 - (1 - Math.min(1, p.scale)) * 30, w = 250, h = 190;
      ctx.save();
      ctx.globalAlpha *= p.alpha;
      drawCard(ctx, c, x, y, w, h);
      ctx.fillStyle = c.labelMuted;
      ctx.font = font(c, 700, 17);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(k.head, x + w / 2, y + 42);
      ctx.fillStyle = k.col;
      ctx.font = font(c, 700, 34, true);
      ctx.fillText(k.val, x + w / 2, y + 96);
      ctx.restore();
      const pm = popAt(a, k.at + 0.8);
      if (pm) pill(ctx, c, k.mark, x + w / 2, y + 152, { bg: k.markCol, size: 20, ...pm });
    });
    const p = popAt(a, 1.8);
    if (p) pill(ctx, c, 'Paris, 1774: one number', W / 2, 108, { bg: c.labelMuted, size: 16, ...p });
  }

  /** Beat 4: an air sample, one dot in five blue; the blue ones join the tin. */
  _drawOxygen(ctx) {
    const c = this.colors;
    const t = this._clock;
    const a = this._age;
    const fly = smooth(1.6, 3.6, a);
    drawCard(ctx, c, 30, 90, 280, 280);
    pill(ctx, c, 'a sample of air', 42, 90, { bg: c.labelMuted, size: 14, align: 'left' });
    const tin = { x: 520, y: 330 };
    let k = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const gx = 70 + col * 50, gy = 140 + row * 50;
        const blue = (row * 5 + col) % 5 === 2;
        let x = gx, y = gy;
        if (blue) {
          const u = clamp01(fly * 1.3 - k * 0.07);
          x = gx + (tin.x - gx) * u;
          y = gy + (tin.y - 16 - gy) * u - Math.sin(u * Math.PI) * 60;
          k++;
          if (u >= 1) continue;
        }
        ctx.beginPath();
        ctx.arc(x, y + Math.sin(t * 2 + row + col) * 2, blue ? 10 : 8, 0, Math.PI * 2);
        ctx.fillStyle = blue ? c.s1 : alpha(c.labelMuted, 0.6);
        ctx.fill();
      }
    }
    drawShelf(ctx, c, 400, 650, 360);
    drawMetal(ctx, c, 'tin', tin.x, tin.y, fly, t, 1.4);
    const p = popAt(a, 0.5);
    if (p) pill(ctx, c, 'oxygen: about 1 in 5', 170, 430, { bg: c.s1, size: 16, ...p });
    const p2 = popAt(a, 3.8);
    if (p2) pill(ctx, c, 'burning = joining oxygen', 520, 200, { bg: c.accent, size: 16, ...p2 });
  }
}
