/**
 * SeedRaceScene-results - blk-l00-01-03-s04 (explain). What ten seconds of
 * boiling does to a moong seed, and the idea people used to explain it.
 *
 * Beats (the slide's six paragraphs, splitSteps() counts 6):
 *   0 Never          - live seed sprouts; the boiled one does nothing, day 10, day 100.
 *   1 Nothing taken  - a balance settles level (same weight); two lens cutaways show
 *                      the same coat, the same two halves, the same curled shoot.
 *   2 Vital force    - a glowing "spark" in the live seed; boiling drives it out.
 *   3 On the board   - vital force is pinned beside spontaneous generation, untested.
 *   4 Arrangement    - same twelve parts in both seeds: in order in one, jumbled in the
 *                      other. "Boil again" replays the jumble.
 *   5 The shape      - the investigation's question card goes up in the middle.
 *
 * Canvas: growth, a settling balance, a rising spark and parts scrambling are
 * drawn motion; labels are chips only.
 */
import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import { clamp01, smooth } from 'simulations/base/SimMotion.js';
import {
  W, H, loadColors, alpha, mix, lighten, darken, font, rr, ellipse, pill, popAt, leader,
  outBack, sparkle, Burst, mulberry32, drawTable, drawBowl, drawWaterTop, drawSeed, growth,
  seedCoat, seedInner, leafColor,
} from './SeedKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
  [{ idx: 5, dwellMs: null }],
];

const LEFT = { x: 180, y: 262 };
const RIGHT = { x: 500, y: 262 };
const PARTS = 12;

/** Day shown on the "never" beat: 0 -> 10 in 4 s, then on to 100. */
function neverDay(age) {
  if (age < 4) return (age / 4) * 10;
  return 10 + smooth(4, 7, age) * 90;
}

export class SeedRaceSceneResults extends CanvasSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  static ARIA_LABEL =
    'A live moong seed sprouts; a seed boiled for ten seconds never does, even by day one hundred. ' +
    'On a balance the two weigh the same, and cut open they show the same coat, two halves and curled ' +
    'shoot. The old idea: a vital force, a spark that boiling drives out, pinned on the board as an untested ' +
    'hypothesis. The same twelve parts sit in order in the live seed and jumbled in the boiled one.';

  static CONTROLS = [
    { type: 'button', id: 'again', label: 'Boil again' },
  ];

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;
    this.colors = null;
    this._stage = -1;
    this._age = 0;
    this._fade = 1;
    this._clock = 0;
    this._boilAge = 0;
    this._boilSeed = 1;
    this._jumble = [];
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
    return id !== 'again' || this._stage !== 4;
  }

  isControlDisabled() {
    return this._boilAge < 2.4;
  }

  onControlChange(id) {
    if (this.isControlHidden(id) || this.isControlDisabled(id)) return;
    this._boil();
    this.requestUiUpdate?.();
  }

  _enterStage(stage) {
    this._stage = stage;
    this._age = 0;
    this._fade = 0;
    this._fired = false;
    this._burst = new Burst();
    if (stage === 4) this._boil();
    this.requestUiUpdate?.();
  }

  /** New random jumble target for the boiled seed's parts. */
  _boil() {
    const rnd = mulberry32(97 + this._boilSeed++);
    this._jumble = Array.from({ length: PARTS }, () => {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
      return { x: Math.cos(a) * d * 92, y: Math.sin(a) * d * 58, ph: rnd() * 6 };
    });
    this._boilAge = 0;
  }

  // -- Frame --------------------------------------------------------------------

  _tick(ctx, dt) {
    if (!this.colors) return;
    const d = Math.max(0, Math.min(dt, 0.05));   // the first frame can report a negative dt
    this._clock += d;
    this._age += d;
    this._fade = Math.min(1, this._fade + d / 0.35);
    const before = this._boilAge;
    this._boilAge += d;
    if (this._stage === 4 && before < 2.4 && this._boilAge >= 2.4) this.requestUiUpdate?.();
    if (this._stage === 5 && !this._fired && this._age > 0.9) {
      this._fired = true;
      const c = this.colors;
      this._burst.fire(340, 250, [c.s1, c.s2, c.s3, c.s4, c.s5], 30, 1.4);
    }
    this._burst.update(d);
    this._draw(ctx);
  }

  _drawInitialFrame(ctx) {
    if (this.colors) this._draw(ctx);
  }

  _draw(ctx) {
    const c = this.colors;
    ctx.clearRect(0, 0, W, H);
    const s = this._stage;
    if (s === 3 || s === 5) this._drawBoard(ctx);
    else drawTable(ctx, c);
    if (s === 0) this._drawNever(ctx);
    else if (s === 1) this._drawWeigh(ctx);
    else if (s === 2) this._drawSpark(ctx);
    else if (s === 4) this._drawParts(ctx);
    this._burst.draw(ctx);
    if (this._fade < 1) {
      ctx.fillStyle = alpha(c.bgDeep, 1 - this._fade);
      ctx.fillRect(0, 0, W, H);
    }
  }

  // -- Beat 0: never ---------------------------------------------------------------

  _drawNever(ctx) {
    const c = this.colors;
    const t = this._clock;
    const a = this._age;
    const day = neverDay(a);
    for (const [bowl, boiled] of [[LEFT, false], [RIGHT, true]]) {
      drawBowl(ctx, c, bowl.x, bowl.y, 120, t);
      const g = growth(day, boiled ? Infinity : 1.6, boiled);
      drawSeed(ctx, c, bowl.x - 30, bowl.y + 6, 2.1, t, { ...g, ang: -0.25, glow: false });
      drawWaterTop(ctx, c, bowl.x, bowl.y, 120, t);
    }
    pill(ctx, c, `Day ${Math.floor(day)}`, 340, 34, { bg: c.labelMuted, size: 18 });
    pill(ctx, c, 'live', LEFT.x, 414, { bg: c.s3, size: 16 });
    pill(ctx, c, 'boiled 10 s', RIGHT.x, 414, { bg: c.bad, size: 16 });
    const p1 = day >= 2 ? popAt(a, 0.9) : null;
    if (p1) pill(ctx, c, 'sprouted', LEFT.x, 110, { bg: c.good, size: 16, ...p1 });
    if (a > 4.2) {
      const p = popAt(a, 4.2);
      pill(ctx, c, day >= 99 ? 'never' : 'nothing yet', RIGHT.x, 110, { bg: c.bad, size: 16, ...p });
    }
  }

  // -- Beat 1: same weight, same parts -----------------------------------------------

  _drawWeigh(ctx) {
    const c = this.colors;
    const t = this._clock;
    const a = this._age;
    const tilt = 0.16 * Math.sin(a * 5) * Math.exp(-a * 1.4);
    const steel = mix(c.labelMuted, c.bgSurface, 0.15);
    // Stand and beam.
    rr(ctx, 300, 204, 80, 12, 6);
    ctx.fillStyle = darken(steel, 0.25);
    ctx.fill();
    ctx.fillStyle = steel;
    ctx.fillRect(336, 64, 8, 142);
    ctx.save();
    ctx.translate(340, 66);
    ctx.rotate(tilt);
    rr(ctx, -150, -5, 300, 10, 5);
    ctx.fillStyle = steel;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(340, 66, 9, 0, Math.PI * 2);
    ctx.fillStyle = c.warning;
    ctx.fill();
    for (const side of [-1, 1]) {
      const ex = 340 + side * 145 * Math.cos(tilt), ey = 66 + side * 145 * Math.sin(tilt);
      const py = ey + 64;
      ctx.strokeStyle = darken(steel, 0.1);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex, ey); ctx.lineTo(ex - 40, py);
      ctx.moveTo(ex, ey); ctx.lineTo(ex + 40, py);
      ctx.stroke();
      drawSeed(ctx, c, ex, py - 12, 1.3, t, { swell: 1, boiled: side > 0, ang: 0.1 });
      ctx.beginPath();
      ctx.moveTo(ex - 48, py);
      ctx.quadraticCurveTo(ex, py + 22, ex + 48, py);
      ctx.closePath();
      ctx.fillStyle = steel;
      ctx.fill();
    }
    const pw = a > 1.6 ? popAt(a, 1.6) : null;
    if (pw) pill(ctx, c, '= same weight', 340, 240, { bg: c.good, size: 16, ...pw });

    // Two lens cutaways.
    const k = outBack((a - 1.9) / 0.45);
    if (k <= 0) return;
    for (const [x, boiled, name] of [[176, false, 'live'], [504, true, 'boiled']]) {
      const y = 386;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(k, k);
      ctx.beginPath();
      ctx.arc(0, 4, 84, 0, Math.PI * 2);
      ctx.fillStyle = darken(c.accent, 0.4);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 84, 0, Math.PI * 2);
      ctx.fillStyle = c.accent;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 76, 0, Math.PI * 2);
      ctx.fillStyle = mix(c.bgDeep, c.water, 0.25);
      ctx.fill();
      this._cutaway(ctx, 0, 0, boiled, t);
      ctx.restore();
      pill(ctx, c, name, x, 286, { bg: boiled ? c.bad : c.s3, size: 15, alpha: Math.min(1, k) });
    }
    const labels = [['coat', 332, 44, -34], ['two halves', 386, 0, 0], ['curled shoot', 440, 38, 22]];
    labels.forEach(([txt, y, fx, fy], i) => {
      const p = popAt(a, 2.5 + i * 0.35);
      if (!p) return;
      leader(ctx, 290, y, 176 + fx, 386 + fy, c.labelMuted, p.alpha);
      leader(ctx, 390, y, 504 + fx, 386 + fy, c.labelMuted, p.alpha);
      pill(ctx, c, `\u2713 ${txt}`, 340, y, { bg: c.good, size: 14, ...p });
    });
  }

  /** A seed cut open: coat, two pale halves, the tiny curled shoot between them. */
  _cutaway(ctx, x, y, boiled, t) {
    const c = this.colors;
    const coat = seedCoat(c, boiled);
    const inner = boiled ? mix(seedInner(c), c.waste, 0.12) : seedInner(c);
    ellipse(ctx, x, y + 4, 62, 44);
    ctx.fillStyle = darken(coat, 0.35);
    ctx.fill();
    ellipse(ctx, x, y, 62, 44);
    ctx.fillStyle = coat;
    ctx.fill();
    ellipse(ctx, x, y, 54, 37);
    ctx.fillStyle = inner;
    ctx.fill();
    ctx.strokeStyle = darken(inner, 0.3);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 50, y); ctx.lineTo(x + 50, y);
    ctx.stroke();
    // Curled shoot near the hilum end.
    const sh = boiled ? mix(leafColor(c), c.waste, 0.3) : leafColor(c);
    ctx.strokeStyle = sh;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x + 34, y + 20, 11, Math.PI * 0.9, Math.PI * 2.3);
    ctx.stroke();
    ellipse(ctx, x + 40, y + 12, 5, 3, 0.6);
    ctx.fillStyle = sh;
    ctx.fill();
    ellipse(ctx, x - 22, y - 16, 14, 5, -0.3);
    ctx.fillStyle = lighten(inner, 0.45);
    ctx.fill();
  }

  // -- Beat 2: the spark idea --------------------------------------------------------

  _drawSpark(ctx) {
    const c = this.colors;
    const t = this._clock;
    const a = this._age;
    for (const [bowl, boiled] of [[LEFT, false], [RIGHT, true]]) {
      drawBowl(ctx, c, bowl.x, bowl.y, 120, t);
      drawSeed(ctx, c, bowl.x, bowl.y, 3, t, { swell: 1, boiled, ang: -0.2 });
      drawWaterTop(ctx, c, bowl.x, bowl.y, 120, t);
    }
    // A hypothesised spark: drawn as light, since that is what the idea claims.
    const pulse = 0.8 + 0.2 * Math.sin(t * 4);
    this._glow(ctx, LEFT.x, LEFT.y, 30 * pulse, 1);
    const u = (a % 3) / 3;
    const sy = RIGHT.y - u * 190;
    this._glow(ctx, RIGHT.x + Math.sin(u * 9) * 8, sy, 24 * (1 - u * 0.6), 1 - u);
    ctx.strokeStyle = alpha(lighten(c.water, 0.6), 0.7);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const v = (t * 0.4 + k / 3) % 1;
      const bx = RIGHT.x - 40 + k * 40, by = RIGHT.y - 40 - v * 90;
      ctx.globalAlpha = Math.sin(v * Math.PI) * 0.8;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + 8, by - 10, bx, by - 20);
      ctx.quadraticCurveTo(bx - 8, by - 30, bx, by - 40);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    pill(ctx, c, 'live', LEFT.x, 414, { bg: c.s3, size: 16 });
    pill(ctx, c, 'boiled 10 s', RIGHT.x, 414, { bg: c.bad, size: 16 });
    const p = popAt(a, 0.6);
    if (p) {
      leader(ctx, 290, 64, LEFT.x + 10, LEFT.y - 30, c.warning, p.alpha);
      pill(ctx, c, 'vital force?', 340, 50, { bg: c.warning, size: 17, ...p });
    }
    const p2 = popAt(a, 1.4);
    if (p2) pill(ctx, c, 'driven out?', RIGHT.x + 100, 110, { bg: c.bad, size: 15, ...p2 });
  }

  _glow(ctx, x, y, r, a) {
    const c = this.colors;
    if (a <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
    g.addColorStop(0, alpha(lighten(c.warning, 0.5), 0.95 * a));
    g.addColorStop(0.4, alpha(c.warning, 0.55 * a));
    g.addColorStop(1, alpha(c.warning, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = a;
    sparkle(ctx, x, y, r * 0.55, lighten(c.warning, 0.7));
    ctx.restore();
  }

  // -- Beats 3 and 5: the board ---------------------------------------------------------

  _drawBoard(ctx) {
    const c = this.colors;
    const a = this._age;
    const cork = mix(c.wood, c.bgSurface, 0.55);
    ctx.fillStyle = darken(cork, 0.45);
    ctx.fillRect(0, 0, W, H);
    rr(ctx, 16, 16, W - 32, H - 32, 11);
    ctx.fillStyle = cork;
    ctx.fill();
    ctx.fillStyle = alpha(darken(cork, 0.25), 0.6);
    for (let i = 0; i < 90; i++) {
      ctx.beginPath();
      ctx.arc(30 + ((i * 97) % 620), 30 + ((i * 53) % 460), 1.6 + (i % 3) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    pill(ctx, c, 'hypotheses', 34, 44, { bg: c.labelMuted, size: 15, align: 'left' });

    const finale = this._stage === 5;
    const sc = finale ? 0.78 : 1;
    this._card(ctx, finale ? 150 : 180, finale ? 140 : 250, 230 * sc, 170 * sc, 1, (x, y, w) => {
      this._cardText(ctx, 'spontaneous', 'generation', x, y, w, sc);
      this._stamp(ctx, x + w / 2, y + 118 * sc, 'FAILED', c.bad, sc, 1);
    });
    const drop = finale ? 1 : outBack((a - 0.3) / 0.5);
    this._card(ctx, finale ? 530 : 480, finale ? 140 : 250, 230 * sc, 170 * sc, drop, (x, y, w) => {
      this._cardText(ctx, 'vital force', '?', x, y, w, sc);
      const p = finale ? { scale: 1, alpha: 1 } : popAt(a, 1.0);
      if (p) pill(ctx, c, 'not tested yet', x + w / 2, y + 118 * sc, { bg: c.warning, size: finale ? 14 : 15, ...p });
    });
    if (!finale) return;

    // The investigation's question goes up in the middle, strung to both.
    const k = outBack((a - 0.4) / 0.5);
    ctx.strokeStyle = alpha(c.s6, 0.9 * Math.min(1, k));
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(150, 208); ctx.quadraticCurveTo(160, 280, 340, 279);
    ctx.moveTo(530, 208); ctx.quadraticCurveTo(520, 280, 340, 279);
    ctx.stroke();
    this._card(ctx, 340, 364, 330, 190, k, (x, y, w) => {
      this._cardText(ctx, 'what arrangement', 'was lost?', x, y, w, 1.1);
      pill(ctx, c, 'every part kept', x + w / 2, y + 150, { bg: c.good, size: 15 });
    }, c.accent);
  }

  /**
   * A pinned paper card, drawn in canvas coordinates (no transform) so its text
   * stays checkable by the headless legibility pass. k (0..1+) drops it in.
   */
  _card(ctx, cx, cy, w, h, k, body, border) {
    const c = this.colors;
    if (k <= 0) return;
    const x = cx - w / 2, y = cy - h / 2 - (1 - Math.min(1, k)) * 40;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, k * 1.5);
    rr(ctx, x, y + 5, w, h, 9);
    ctx.fillStyle = alpha(darken(c.bgDeep, 0.3), 0.45);
    ctx.fill();
    rr(ctx, x, y, w, h, 9);
    ctx.fillStyle = c.bgSurface;
    ctx.fill();
    ctx.strokeStyle = border || c.stroke;
    ctx.lineWidth = border ? 4 : 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, y + 10, 8, 0, Math.PI * 2);
    ctx.fillStyle = c.s6;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - 2, y + 8, 3, 0, Math.PI * 2);
    ctx.fillStyle = lighten(c.s6, 0.6);
    ctx.fill();
    body(x, y, w, h);
    ctx.restore();
  }

  _cardText(ctx, line1, line2, x, y, w, sc) {
    const c = this.colors;
    ctx.fillStyle = c.label;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(c, 700, Math.round(24 * sc), true);
    ctx.fillText(line1, x + w / 2, y + 48 * sc);
    ctx.fillText(line2, x + w / 2, y + 80 * sc);
  }

  _stamp(ctx, x, y, text, col, sc, k) {
    const c = this.colors;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.12);
    ctx.scale(sc * k, sc * k);
    rr(ctx, -70, -20, 140, 40, 8);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.fillStyle = c.bgDeep;
    ctx.font = font(c, 700, 22, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 2);
    ctx.restore();
  }

  // -- Beat 4: same parts, arrangement lost ----------------------------------------------

  _drawParts(ctx) {
    const c = this.colors;
    const t = this._clock;
    const a = this._age;
    const b = this._boilAge;
    const series = [c.s1, c.s2, c.s3, c.s4, c.s5, c.s6, c.s7, c.s8];
    const ordered = Array.from({ length: PARTS }, (_, i) => {
      const ang = (i / PARTS) * Math.PI * 2;
      return { x: Math.cos(ang) * 84, y: Math.sin(ang) * 50 };
    });
    const mixK = smooth(0.6, 2.0, b);
    for (const [bowl, boiled] of [[LEFT, false], [RIGHT, true]]) {
      const coat = seedCoat(c, boiled);
      ellipse(ctx, bowl.x, bowl.y + 6, 132, 92);
      ctx.fillStyle = darken(coat, 0.35);
      ctx.fill();
      ellipse(ctx, bowl.x, bowl.y, 132, 92);
      ctx.fillStyle = coat;
      ctx.fill();
      ellipse(ctx, bowl.x, bowl.y, 118, 79);
      ctx.fillStyle = mix(c.bgDeep, seedInner(c), 0.18);
      ctx.fill();
      const pos = ordered.map((p, i) => {
        if (!boiled) return { x: bowl.x + p.x, y: bowl.y + p.y };
        const j = this._jumble[i] || p;
        const shake = (1 - mixK) * smooth(0, 0.6, b) * 4 * Math.sin(t * 40 + i);
        return {
          x: bowl.x + p.x + (j.x - p.x) * mixK + shake,
          y: bowl.y + p.y + (j.y - p.y) * mixK + Math.sin(t * 1.5 + (j.ph || 0)) * 2 * mixK,
        };
      });
      // Links: a closed chain in order; they snap as the parts jumble.
      ctx.strokeStyle = alpha(c.label, boiled ? 0.7 * (1 - mixK) : 0.7);
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < PARTS; i++) {
        const p = pos[i], q = pos[(i + 1) % PARTS];
        ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
      pos.forEach((p, i) => {
        const col = series[i % series.length];
        ctx.beginPath();
        ctx.arc(p.x, p.y + 3, 12, 0, Math.PI * 2);
        ctx.fillStyle = darken(col, 0.35);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x - 4, p.y - 4, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = lighten(col, 0.6);
        ctx.fill();
      });
      pill(ctx, c, `${PARTS} parts`, bowl.x, 398, { bg: c.labelMuted, size: 16 });
    }
    if (b < 2.2) {
      ctx.strokeStyle = alpha(lighten(c.water, 0.6), 0.8);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const v = (t * 0.5 + k / 3) % 1;
        const bx = RIGHT.x - 50 + k * 50, by = RIGHT.y - 96 - v * 60;
        ctx.globalAlpha = Math.sin(v * Math.PI) * (1 - smooth(1.6, 2.2, b));
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + 7, by - 9, bx, by - 18);
        ctx.quadraticCurveTo(bx - 7, by - 27, bx, by - 36);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    const p1 = popAt(a, 0.3);
    if (p1) pill(ctx, c, 'in order', LEFT.x, 128, { bg: c.good, size: 16, ...p1 });
    const p2 = popAt(b, 2.0);
    if (p2) pill(ctx, c, 'jumbled', RIGHT.x, 128, { bg: c.bad, size: 16, ...p2 });
    const p3 = popAt(a, 2.4);
    if (p3) pill(ctx, c, '= same parts', 340, 456, { bg: c.good, size: 16, ...p3 });
    pill(ctx, c, 'live', LEFT.x, 40, { bg: c.s3, size: 15 });
    pill(ctx, c, 'boiled', RIGHT.x, 40, { bg: c.bad, size: 15 });
  }
}
