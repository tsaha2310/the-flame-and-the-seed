/**
 * BalanceBurnScene-results - blk-l01-01-01-s04 (explain). What the balance said.
 *
 * Beats (the slide's five paragraphs, splitSteps() counts 5):
 *   0 Heavier     - steel wool 5.0 g -> about 5.4 g, three times over; "Burn another ball"
 *                   adds a run.
 *   1 Four results - candle and paper get lighter in open air, stay the same in the jar.
 *   2 In and out  - air joins the wool; gas leaves the candle. The balance shows both.
 *   3 Mass        - the number on the display is mass; the unit is the gram.
 *   4 The rule    - in the sealed jar the candle burns down and the reading never moves.
 *
 * Canvas: burns, air and gas dots are continuous motion; labels are chips only.
 * Text is drawn in canvas coordinates (no transforms) so the headless
 * legibility check can see it.
 */
import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import { clamp01, smooth } from 'simulations/base/SimMotion.js';
import {
  W, H, loadColors, alpha, darken, font, rr, pill, popAt, leader, Burst,
  drawWall, drawShelf, drawCard, MATERIALS, JAR_MASS, AIR_MASS, grams, drawBalance, drawTile,
  makeWool, drawWool, drawCandle, drawPaper, jarBox, drawJar, Air,
} from './BurnKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];

const FAST_BURN = 2.4;             // a replayed burn, seconds
const LOOP = 5;                    // grid panels: burn, hold, repeat
const RUN_GAINS = [0.4, 0.4, 0.3, 0.4, 0.5, 0.4, 0.4];

const PANELS = [
  { what: 'candle', where: 'open', x: 16, y: 56 },
  { what: 'candle', where: 'sealed', x: 348, y: 56 },
  { what: 'paper', where: 'open', x: 16, y: 288 },
  { what: 'paper', where: 'sealed', x: 348, y: 288 },
];
const PW = 316, PH = 218;

export class BalanceBurnSceneResults extends CanvasSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  static ARIA_LABEL =
    'Results on the balance. Steel wool goes from 5.0 to about 5.4 grams every time it is burned. A candle and ' +
    'paper get lighter in open air but stay exactly the same inside a sealed jar. Air joins the wool; gas leaves ' +
    'the candle. The number on the balance is mass, in grams. Burning moves mass around; it never destroys or makes it.';

  static CONTROLS = [
    { type: 'button', id: 'again', label: 'Burn another ball' },
  ];

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;
    this.colors = null;
    this._stage = -1;
    this._age = 0;
    this._fade = 1;
    this._clock = 0;
    this._wool = makeWool(11);
    this._runs = [];
    this._runAge = -1;
    this._burst = new Burst();
    this._fired = false;
    this._airs = [];
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
    return id !== 'again' || this._stage !== 0;
  }

  isControlDisabled() {
    return this._runAge >= 0 && this._runAge < FAST_BURN || this._runs.length >= RUN_GAINS.length;
  }

  onControlChange(id) {
    if (this.isControlHidden(id) || this.isControlDisabled(id)) return;
    this._runAge = 0;
    this._runs.push(null);
    this.requestUiUpdate?.();
  }

  _enterStage(stage) {
    this._stage = stage;
    this._age = 0;
    this._fade = 0;
    this._fired = false;
    this._burst = new Burst();
    if (stage === 0) { this._runs = [null]; this._runAge = 0; }
    if (stage === 1) {
      this._airs = PANELS.map((p, i) => {
        const box = p.where === 'sealed' ? this._panelJar(p) : { x0: p.x + 8, x1: p.x + PW - 8, y0: p.y + 34, y1: p.y + PH - 70 };
        return new Air(90 + i, p.where === 'sealed' ? 16 : 14, box);
      });
    }
    if (stage === 2) {
      this._airs = [new Air(95, 36, { x0: 20, x1: 320, y0: 70, y1: 380 }), new Air(96, 20, { x0: 360, x1: 660, y0: 70, y1: 380 })];
    }
    if (stage === 4) this._airs = [new Air(97, 26, jarBox(340, 380, 230, 250))];
    this.requestUiUpdate?.();
  }

  _panelJar(p) {
    return jarBox(p.x + PW / 2 - 50, p.y + PH - 64, 130, 120);
  }

  // -- Frame ---------------------------------------------------------------------------

  _tick(ctx, dt) {
    if (!this.colors) return;
    const d = Math.max(0, Math.min(dt, 0.05));   // the first frame can report a negative dt
    this._clock += d;
    this._age += d;
    this._fade = Math.min(1, this._fade + d / 0.35);
    if (this._runAge >= 0) {
      const before = this._runAge;
      this._runAge += d;
      if (before < FAST_BURN && this._runAge >= FAST_BURN) {
        const i = this._runs.length - 1;
        this._runs[i] = RUN_GAINS[i];
        // Kabir's three runs: the first burn is followed by two quick repeats.
        if (this._stage === 0 && this._runs.length < 3) { this._runs.push(null); this._runAge = 0; }
        this.requestUiUpdate?.();
      }
    }
    this._updateAir(d);
    if (this._stage === 4 && !this._fired && this._age > 3.2) {
      this._fired = true;
      const c = this.colors;
      this._burst.fire(340, 120, [c.s1, c.s2, c.s3, c.s4, c.s5], 34, 1.4);
    }
    this._burst.update(d);
    this._draw(ctx);
  }

  _drawInitialFrame(ctx) {
    if (this.colors) this._draw(ctx);
  }

  _loopBurn(offset = 0) {
    const u = ((this._age + offset) % LOOP) / LOOP;
    return { burn: clamp01(u / 0.7), lit: u < 0.7, done: u >= 0.7 };
  }

  _updateAir(dt) {
    const t = this._clock;
    if (this._stage === 1) {
      PANELS.forEach((p, i) => {
        const air = this._airs[i];
        const lb = this._loopBurn(i * 0.4);
        const sealed = p.where === 'sealed';
        const fp = this._panelFlame(p, lb.burn);
        if (lb.lit && Math.random() < dt * 6) air.emit(fp.x, fp.y - 10, 1);
        if (!sealed) air.dots = air.dots.filter((q) => !q.gas || q.y > p.y + 4);
        if (sealed && air.dots.length > 60) air.dots.splice(16, 1);
        air.update(dt, t, sealed ? this._panelJar(p) : null, null);
      });
    } else if (this._stage === 2) {
      const lb = this._loopBurn();
      this._airs[0].update(dt, t, null, lb.lit ? { x: 106 + lb.burn * 128, y: 356, reach: 150, pull: 90, r: 14 } : null);
      while (this._airs[0].dots.length < 36) this._airs[0].dots.push({ x: 22, y: 80 + Math.random() * 280, vx: 14, vy: 0, gas: false, life: 0 });
      if (lb.lit && Math.random() < dt * 9) this._airs[1].emit(510, 386 - 26 - 70 * (1 - lb.burn * 0.25) - 34, 1);
      this._airs[1].update(dt, t, null, null);
    } else if (this._stage === 4) {
      const box = jarBox(340, 380, 230, 250);
      if (this._age < 3 && Math.random() < dt * 8) this._airs[0].emit(340, 380 - 26 - 70 * (1 - this._age / 12) - 30, 1);
      this._airs[0].update(dt, t, box, this._age < 3 ? { x: 340, y: 290, reach: 60, pull: 40, r: 8 } : null);
    }
  }

  _panelFlame(p, burn) {
    const cx = p.x + PW / 2 - 50, by = p.y + PH - 64;
    if (p.what === 'candle') return { x: cx, y: by - 4 - 0.6 * (26 + 70 * (1 - burn * 0.25)) - 12 };
    return { x: cx - 44 + 88 * burn, y: by - 12 };
  }

  // -- Drawing ---------------------------------------------------------------------------

  _draw(ctx) {
    const c = this.colors;
    ctx.clearRect(0, 0, W, H);
    drawWall(ctx, c);
    const s = this._stage;
    if (s === 0) this._drawWool(ctx);
    else if (s === 1) this._drawGrid(ctx);
    else if (s === 2) this._drawInOut(ctx);
    else if (s === 3) this._drawMass(ctx);
    else this._drawRule(ctx);
    this._burst.draw(ctx);
    if (this._fade < 1) {
      ctx.fillStyle = alpha(c.bgDeep, 1 - this._fade);
      ctx.fillRect(0, 0, W, H);
    }
  }

  _drawWool(ctx) {
    const c = this.colors;
    const t = this._clock;
    const burning = this._runAge >= 0 && this._runAge < FAST_BURN;
    const burn = burning ? this._runAge / FAST_BURN : 1;
    const i = this._runs.length - 1;
    const gain = RUN_GAINS[Math.max(0, i)];
    const reading = 5.0 + gain * burn;
    drawShelf(ctx, c, 10, 460, 460);
    drawBalance(ctx, c, 230, 380, reading);
    drawTile(ctx, c, 230, 380, 150);
    drawWool(ctx, c, this._wool, 230, 340, 74, 42, burn, t);
    pill(ctx, c, 'steel wool', 24, 34, { bg: c.labelMuted, size: 16, align: 'left' });
    pill(ctx, c, 'before: 5.0 g', 230, 120, { bg: c.labelMuted, size: 15 });
    if (!burning) {
      const p = popAt(this._runAge - FAST_BURN, 0);
      if (p) pill(ctx, c, `heavier: +${gain.toFixed(1)} g`, 230, 160, { bg: c.s1, size: 17, ...p });
    }

    const x = 468, y = 52, w = 200, h = 380;
    drawCard(ctx, c, x, y, w, h);
    pill(ctx, c, 'Ajji\'s runs', x + 12, y, { bg: c.labelMuted, size: 14, align: 'left' });
    this._runs.forEach((g, k) => {
      const ry = y + 44 + k * 44;
      ctx.fillStyle = c.labelMuted;
      ctx.font = font(c, 700, 14);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`run ${k + 1}`, x + 12, ry);
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 15);
      ctx.fillText(g == null ? '5.0 \u2192 ...' : `5.0 \u2192 ${(5 + g).toFixed(1)} g`, x + 60, ry);
      if (g != null) pill(ctx, c, '\u2191', x + w - 10, ry, { bg: c.s1, size: 14, align: 'right' });
    });
  }

  _drawGrid(ctx) {
    const c = this.colors;
    const t = this._clock;
    pill(ctx, c, 'open air', 16 + PW / 2, 30, { bg: c.labelMuted, size: 15 });
    pill(ctx, c, 'sealed jar', 348 + PW / 2, 30, { bg: c.labelMuted, size: 15 });
    PANELS.forEach((p, i) => {
      const m = MATERIALS[p.what];
      const lb = this._loopBurn(i * 0.4);
      const sealed = p.where === 'sealed';
      drawCard(ctx, c, p.x, p.y, PW, PH);
      ctx.save();
      rr(ctx, p.x, p.y, PW, PH, 11);
      ctx.clip();
      const cx = p.x + PW / 2 - 50, by = p.y + PH - 64;
      const reading = sealed ? JAR_MASS + AIR_MASS + m.start : m.start + m.open * lb.burn;
      if (!sealed) this._airs[i].draw(ctx, c);
      drawBalance(ctx, c, cx, by, reading, { s: 0.62 });
      drawTile(ctx, c, cx, by, 100);
      if (p.what === 'candle') drawCandle(ctx, c, cx, by - 4, 1 - lb.burn * 0.25, lb.lit ? 1 : 0, t, 0.6);
      else drawPaper(ctx, c, cx - 44, cx + 44, by - 6, lb.burn, t, lb.lit);
      if (sealed) {
        this._airs[i].draw(ctx, c);
        drawJar(ctx, c, this._panelJar(p), lb.burn * 0.6);
      }
      ctx.restore();
      pill(ctx, c, m.name, p.x + 12, p.y + 22, { bg: p.what === 'candle' ? c.s2 : c.s5, size: 14, align: 'left' });
      const diff = sealed ? 0 : m.open;
      const txt = diff === 0 ? 'no change' : `${diff.toFixed(1)} g`;
      const pp = lb.done ? popAt(((this._age + i * 0.4) % LOOP) - LOOP * 0.7, 0) : null;
      if (pp) pill(ctx, c, txt, p.x + PW - 14, p.y + 60, { bg: diff === 0 ? c.good : c.s8, size: 15, align: 'right', ...pp });
    });
  }

  _drawInOut(ctx) {
    const c = this.colors;
    const t = this._clock;
    const lb = this._loopBurn();
    drawShelf(ctx, c, 10, 670, 470);
    this._airs[0].draw(ctx, c);
    this._airs[1].draw(ctx, c);
    drawBalance(ctx, c, 170, 390, 5.0 + 0.4 * lb.burn, { s: 0.85 });
    drawTile(ctx, c, 170, 390, 130);
    drawWool(ctx, c, this._wool, 170, 356, 62, 34, lb.burn, t);
    drawBalance(ctx, c, 510, 390, 20.0 - 0.6 * lb.burn, { s: 0.85 });
    drawTile(ctx, c, 510, 390, 130);
    drawCandle(ctx, c, 510, 386, 1 - lb.burn * 0.25, lb.lit ? 1 : 0, t);
    const p1 = popAt(this._age, 0.4);
    if (p1) {
      pill(ctx, c, 'from the air: in', 170, 96, { bg: c.s1, size: 16, ...p1 });
      this._arrow(ctx, 110, 150, 150, 300, c.s1, p1.alpha);
      this._arrow(ctx, 240, 150, 196, 300, c.s1, p1.alpha);
    }
    const p2 = popAt(this._age, 0.9);
    if (p2) {
      pill(ctx, c, 'into the air: out', 510, 96, { bg: c.s8, size: 16, ...p2 });
      this._arrow(ctx, 510, 220, 510, 130, c.s8, p2.alpha);
    }
    pill(ctx, c, '+0.4 g', 170, 488, { bg: c.s1, size: 15 });
    pill(ctx, c, '-0.6 g', 510, 488, { bg: c.s8, size: 15 });
  }

  _drawMass(ctx) {
    const c = this.colors;
    const t = this._clock;
    drawShelf(ctx, c, 60, 620, 470);
    const box = drawBalance(ctx, c, 340, 330, 5.4, { s: 1.35 });
    drawTile(ctx, c, 340, 330, 180);
    drawWool(ctx, c, this._wool, 340, 288, 80, 44, 1, t);
    const numX = box.x + box.w * 0.45, unitX = box.x + box.w - 22;
    const p1 = popAt(this._age, 0.3);
    if (p1) {
      leader(ctx, 150, 420, numX - 20, box.y + box.h / 2, c.accent, p1.alpha);
      pill(ctx, c, 'mass', 130, 436, { bg: c.accent, size: 18, ...p1 });
    }
    const p2 = popAt(this._age, 0.9);
    if (p2) {
      leader(ctx, 540, 420, unitX, box.y + box.h / 2 + 8, c.warning, p2.alpha);
      pill(ctx, c, 'g = gram', 560, 436, { bg: c.warning, size: 18, ...p2 });
    }
    const p3 = popAt(this._age, 1.5);
    if (p3) pill(ctx, c, 'the balance measures mass', 340, 120, { bg: c.labelMuted, size: 16, ...p3 });
  }

  _drawRule(ctx) {
    const c = this.colors;
    const t = this._clock;
    const box = jarBox(340, 380, 230, 250);
    const burn = clamp01(this._age / 3);
    drawShelf(ctx, c, 60, 620, 470);
    drawBalance(ctx, c, 340, 380, JAR_MASS + AIR_MASS + MATERIALS.candle.start, { s: 1.1 });
    drawTile(ctx, c, 340, 380, 150);
    drawCandle(ctx, c, 340, 376, 1 - burn * 0.3, this._age < 3 ? 1 - smooth(2.4, 3, this._age) : 0, t);
    this._airs[0].draw(ctx, c);
    drawJar(ctx, c, box, burn * 0.7);
    const labels = [['never destroyed', 0.8, 120, c.good], ['never made', 1.6, 560, c.good]];
    for (const [txt, at, x, bg] of labels) {
      const p = popAt(this._age, at);
      if (p) pill(ctx, c, txt, x, 200, { bg, size: 17, ...p });
    }
    const p = popAt(this._age, 3.1);
    if (p) pill(ctx, c, 'moved around', 340, 96, { bg: c.accent, size: 18, ...p });
  }

  _arrow(ctx, x1, y1, x2, y2, col, a) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -this._clock * 30;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2 + Math.cos(ang) * 6, y2 + Math.sin(ang) * 6);
    ctx.lineTo(x2 + Math.cos(ang + 2.5) * 14, y2 + Math.sin(ang + 2.5) * 14);
    ctx.lineTo(x2 + Math.cos(ang - 2.5) * 14, y2 + Math.sin(ang - 2.5) * 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
