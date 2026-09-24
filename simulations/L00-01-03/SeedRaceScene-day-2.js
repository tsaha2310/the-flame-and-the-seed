/**
 * SeedRaceScene-day-2 - blk-l00-01-03-s01 (story). Kabir's two bowls on the
 * morning of day two: live seeds swollen, two with a root tip out; boiled
 * seeds fatter and softer, nothing else.
 *
 * Beats (the slide's five paragraphs, splitSteps() counts 5):
 *   0 Day two        - Lens card, then the night runs: day 1 -> day 2, two live seeds crack.
 *   1 Cheating?      - the bowls are no longer the same.
 *   2 What changed   - a lens on a cracked seed: coat split, root tip out; the boiled
 *                      bowl is only fatter and softer.
 *   3 Same, same     - same seeds, same water, same bowl; only the boiling differs.
 *   4 The squeeze    - a boiled seed squashes flat; try a live one: it springs back.
 *
 * Canvas: swelling, cracking and squeezing are drawn motion; labels are chips only.
 */
import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import { clamp01, smooth } from 'simulations/base/SimMotion.js';
import {
  W, H, loadColors, alpha, mix, lighten, darken, rr, pill, popAt, leader, outBack,
  drawLensCard, drawClockIcon, drawTable, drawBowl, drawWaterTop, drawSeed, seedSpots, growth, sparkle,
} from './SeedKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];

const BOWL_R = 118;
const LIVE = { x: 178, y: 262 };
const BOILED = { x: 502, y: 262 };
const CRACKED = [0, 1];               // the two live seeds that have cracked by morning
const CARD_FOLD_AT = 4.2;             // Lens card folds away, then the night runs
const NIGHT_S = 2;                    // one day in two seconds (honesty card: 10 days in 20 s)
const HOLD = { x: 340, y: 210 };      // where a squeezed seed is held up

export class SeedRaceSceneDay2 extends CanvasSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  static ARIA_LABEL =
    'Two bowls of soaked moong seeds on day two. In the live bowl two seeds have cracked their coats and a ' +
    'tiny white root tip pokes out. The boiled seeds are fatter and paler and nothing else. Same seeds, same ' +
    'water, same bowl; only the boiling differs. Squeezed, a boiled seed squashes flat; a live seed springs back.';

  static CONTROLS = [
    { type: 'button', id: 'boiled', label: 'Squeeze a boiled seed' },
    { type: 'button', id: 'live', label: 'Squeeze a live seed' },
  ];

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;
    this.colors = null;
    this._stage = -1;
    this._age = 0;
    this._fade = 1;
    this._clock = 0;
    this._day = 2;
    this._liveSpots = seedSpots(BOWL_R, 211);
    this._boiledSpots = seedSpots(BOWL_R, 212);
    this._squeeze = null;             // { kind: 'boiled' | 'live', age, idx }
    this._squeezeCount = 0;
    this._onPointerUp = this._handlePointerUp.bind(this);
  }

  async setup() {
    await super.setup();
    this._reloadColors();
    this._canvas.addEventListener('pointerup', this._onPointerUp);
    this._enterStage(0);
    this._drawInitialFrame(this._ctx);
  }

  destroy() {
    if (this._canvas) this._canvas.removeEventListener('pointerup', this._onPointerUp);
    super.destroy();
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

  isControlHidden() {
    return this._stage !== 4;
  }

  isControlDisabled() {
    return !!this._squeeze && this._squeeze.age < 1.4;
  }

  onControlChange(id) {
    if (this.isControlHidden(id) || this.isControlDisabled(id)) return;
    this._startSqueeze(id === 'live' ? 'live' : 'boiled');
    this.requestUiUpdate?.();
  }

  _handlePointerUp(e) {
    if (this._stage !== 4 || this.isControlDisabled()) return;
    const r = this._canvas.getBoundingClientRect();
    if (!r.width) return;
    const x = ((e.clientX - r.left) / r.width) * W;
    this._startSqueeze(x < W / 2 ? 'live' : 'boiled');
    this.requestUiUpdate?.();
  }

  _enterStage(stage) {
    this._stage = stage;
    this._age = 0;
    this._fade = stage === 0 ? 0 : 1;
    this._day = stage === 0 ? 1 : 2;
    this._squeeze = null;
    if (stage === 4) this._startSqueeze('boiled');
    this.requestUiUpdate?.();
  }

  _startSqueeze(kind) {
    this._squeezeCount++;
    const idx = kind === 'live' ? 2 + (this._squeezeCount % 7) : this._squeezeCount % 10;
    this._squeeze = { kind, age: 0, idx };
  }

  // -- Frame --------------------------------------------------------------------

  _tick(ctx, dt) {
    if (!this.colors) return;
    const d = Math.max(0, Math.min(dt, 0.05));   // the first frame can report a negative dt
    this._clock += d;
    this._age += d;
    this._fade = Math.min(1, this._fade + d / 0.35);
    if (this._stage === 0) this._day = 1 + clamp01((this._age - CARD_FOLD_AT - 0.6) / NIGHT_S);
    if (this._squeeze) {
      const before = this._squeeze.age;
      this._squeeze.age += d;
      if (before < 1.4 && this._squeeze.age >= 1.4) this.requestUiUpdate?.();
    }
    this._draw(ctx);
  }

  _drawInitialFrame(ctx) {
    if (this.colors) this._draw(ctx);
  }

  /** Growth of live seed i this morning: only the two CRACKED ones sprout by day 2. */
  _liveState(i) {
    const sd = CRACKED.includes(i) ? 1.7 + i * 0.15 : Infinity;
    const g = growth(this._day, sd, false);
    g.root = g.crack > 0.5 ? Math.max(0.24, Math.min(g.root, 0.28)) * g.crack : 0;
    g.glow = true;
    return g;
  }

  _draw(ctx) {
    const c = this.colors;
    const t = this._clock;
    const a = this._age;
    const st = this._stage;
    ctx.clearRect(0, 0, W, H);
    drawTable(ctx, c);

    const held = this._squeeze;
    this._drawBowl(ctx, LIVE, this._liveSpots, false, held && held.kind === 'live' ? held.idx : -1);
    this._drawBowl(ctx, BOILED, this._boiledSpots, true, held && held.kind === 'boiled' ? held.idx : -1);

    pill(ctx, c, `Day ${Math.floor(this._day + 1e-6)}`, 20, 30, { bg: c.labelMuted, size: 18, align: 'left' });
    pill(ctx, c, 'live', LIVE.x, 414, { bg: c.s3, size: 16 });
    pill(ctx, c, 'boiled 5 min', BOILED.x, 414, { bg: c.bad, size: 16 });

    if (st === 0) {
      const fold = smooth(CARD_FOLD_AT, CARD_FOLD_AT + 0.6, a);
      if (this._day > 1.6 && fold >= 1) {
        const p = popAt(a, CARD_FOLD_AT + 0.6 + NIGHT_S * 0.85);
        if (p) pill(ctx, c, 'overnight', 340, 30, { bg: c.s5, size: 15, ...p });
      }
      drawLensCard(ctx, c, {
        age: a, t, dim: true, fold,
        rows: [
          { icon: (g, x, y, tt) => drawClockIcon(g, c, x, y, tt), text: '10 days pass in 20 seconds' },
          { icon: (g, x, y, tt) => drawSeed(g, c, x, y, 1, tt, { swell: 0.5, ang: -0.3 }), text: 'seeds drawn 10\u00d7 bigger' },
          { icon: (g, x, y, tt) => drawSeed(g, c, x - 6, y - 4, 0.9, tt, { swell: 1, crack: 1, root: 0.35, glow: true, ang: 0.3 }),
            text: 'root tips drawn brighter', sub: 'than they really are' },
        ],
      });
    }
    if (st === 1) {
      const p = popAt(a, 0.2);
      if (p) {
        ctx.save();
        ctx.translate(340, LIVE.y);
        ctx.scale(p.scale, p.scale);
        ctx.globalAlpha *= p.alpha;
        ctx.beginPath();
        ctx.arc(0, 3, 26, 0, Math.PI * 2);
        ctx.fillStyle = darken(c.warning, 0.35);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.fillStyle = c.warning;
        ctx.fill();
        ctx.strokeStyle = c.bgDeep;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-11, -5); ctx.lineTo(11, -5);
        ctx.moveTo(-11, 6); ctx.lineTo(11, 6);
        ctx.moveTo(6, -14); ctx.lineTo(-6, 15);
        ctx.stroke();
        ctx.restore();
      }
      const p2 = popAt(a, 0.6);
      if (p2) pill(ctx, c, 'cheating?', LIVE.x, 108, { bg: c.warning, size: 16, ...p2 });
    }
    if (st === 2) this._drawZoom(ctx);
    if (st === 3) {
      ['same seeds', 'same water', 'same bowl'].forEach((txt, i) => {
        const p = popAt(a, 0.2 + i * 0.3);
        if (p) pill(ctx, c, `\u2713 ${txt}`, 150 + i * 190, 466, { bg: c.good, size: 16, ...p });
      });
      const p = popAt(a, 1.3);
      if (p) pill(ctx, c, 'the only difference', BOILED.x, 108, { bg: c.bad, size: 16, ...p });
    }
    if (st === 4 && held) this._drawSqueeze(ctx, held);

    if (this._fade < 1) {
      ctx.fillStyle = alpha(c.bgDeep, 1 - this._fade);
      ctx.fillRect(0, 0, W, H);
    }
  }

  _drawBowl(ctx, bowl, spots, boiled, skip) {
    const c = this.colors;
    const t = this._clock;
    drawBowl(ctx, c, bowl.x, bowl.y, BOWL_R, t);
    spots.forEach((p, i) => {
      if (i === skip) return;
      const g = boiled ? { ...growth(this._day, Infinity, true) } : this._liveState(i);
      let jig = 0;
      if (!boiled && CRACKED.includes(i) && this._stage === 1) jig = Math.sin(this._clock * 18 + i) * 0.12;
      drawSeed(ctx, c, bowl.x + p.dx, bowl.y + p.dy + Math.sin(t * 1.3 + i) * 1.2, 1.2, t, { ...g, ang: p.ang + jig });
    });
    drawWaterTop(ctx, c, bowl.x, bowl.y, BOWL_R, t);
  }

  /** Beat 2: a lens pulled up over one cracked seed. */
  _drawZoom(ctx) {
    const c = this.colors;
    const t = this._clock;
    const a = this._age;
    const s = outBack((a - 0.1) / 0.45);
    const target = this._liveSpots[CRACKED[0]];
    const tx = LIVE.x + target.dx, ty = LIVE.y + target.dy;
    for (const i of CRACKED) {
      const p = this._liveSpots[i];
      const u = (t * 0.9 + i * 0.3) % 1;
      ctx.beginPath();
      ctx.arc(LIVE.x + p.dx, LIVE.y + p.dy, 16 + u * 16, 0, Math.PI * 2);
      ctx.strokeStyle = alpha(c.warning, 1 - u);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (s <= 0) return;
    const zx = 340, zy = 112, zr = 74;
    leader(ctx, zx - zr * 0.7, zy + zr * 0.7, tx, ty, c.accent, Math.min(1, s));
    ctx.save();
    ctx.translate(zx, zy);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.arc(0, 4, zr + 8, 0, Math.PI * 2);
    ctx.fillStyle = darken(c.accent, 0.4);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, zr + 8, 0, Math.PI * 2);
    ctx.fillStyle = c.accent;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, zr, 0, Math.PI * 2);
    ctx.fillStyle = mix(c.bgDeep, c.water, 0.35);
    ctx.fill();
    ctx.save();
    ctx.clip();
    drawSeed(ctx, c, -18, -4, 3.4, t, { swell: 1, crack: 1, root: 0.14, glow: true, ang: -0.35 });
    ctx.restore();
    ctx.restore();
    const p1 = popAt(a, 0.7);
    if (p1) pill(ctx, c, 'root tip', zx + zr + 56, zy - 22, { bg: c.warning, size: 15, ...p1 });
    const p2 = popAt(a, 1.0);
    if (p2) pill(ctx, c, 'coat split', zx + zr + 56, zy + 18, { bg: c.s3, size: 15, ...p2 });
    const p3 = popAt(a, 1.5);
    if (p3) pill(ctx, c, 'just fatter, softer', BOILED.x, 466, { bg: c.labelMuted, size: 15, ...p3 });
  }

  /** Beat 4: a seed held up between two fingertips and squeezed. */
  _drawSqueeze(ctx, sq) {
    const c = this.colors;
    const t = this._clock;
    const a = sq.age;
    const from = sq.kind === 'live' ? LIVE : BOILED;
    const spot = (sq.kind === 'live' ? this._liveSpots : this._boiledSpots)[sq.idx];
    const lift = SimEaseOut(clamp01(a / 0.5));
    const x = from.x + spot.dx + (HOLD.x - from.x - spot.dx) * lift;
    const y = from.y + spot.dy + (HOLD.y - from.y - spot.dy) * lift;
    const scale = 1.2 + 2.4 * lift;
    const press = smooth(0.55, 0.95, a);
    let squash;
    if (sq.kind === 'boiled') squash = press;
    else squash = 0.2 * press * (1 - smooth(1.0, 1.35, a));

    ctx.fillStyle = alpha(c.bgDeep, 0.45 * lift);
    ctx.fillRect(0, 0, W, H);
    const g = sq.kind === 'boiled'
      ? { ...growth(2.7, Infinity, true) }
      : { ...this._liveState(sq.idx) };
    drawSeed(ctx, c, x, y, scale, t, { ...g, ang: -0.2 * lift + spot.ang * (1 - lift), squash });

    // Fingertips close from above and below.
    const skin = lighten(mix(c.s8, c.wood, 0.5), 0.15);
    // Fingertips rest on the seed's top and bottom (same size maths as drawSeed).
    const gap = 9 * scale * (sq.kind === 'boiled' ? 1.34 * 1.06 : 1.24) * (1 - squash * 0.62) + 2;
    const reach = smooth(0.3, 0.55, a);
    for (const side of [-1, 1]) {
      const fw = 84, fh = 190;
      const tipY = y + side * (gap + (1 - reach) * 140);       // rounded tip touches the seed
      const top = side < 0 ? tipY - fh : tipY;
      ctx.save();
      ctx.globalAlpha *= reach;
      rr(ctx, x - fw / 2, top + 4, fw, fh, fw / 2);
      ctx.fillStyle = darken(skin, 0.3);
      ctx.fill();
      rr(ctx, x - fw / 2, top, fw, fh, fw / 2);
      ctx.fillStyle = skin;
      ctx.fill();
      // Nail near the tip, a knuckle crease further back.
      const nailY = side < 0 ? tipY - 58 : tipY + 22;
      rr(ctx, x - 24, nailY, 48, 36, 18);
      ctx.fillStyle = lighten(skin, 0.5);
      ctx.fill();
      ctx.strokeStyle = darken(skin, 0.2);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const ky = side < 0 ? tipY - 110 : tipY + 110;
      ctx.moveTo(x - 18, ky); ctx.quadraticCurveTo(x, ky + side * 6, x + 18, ky);
      ctx.stroke();
      ctx.restore();
    }

    const p = popAt(a, 1.0);
    if (p) {
      const boiled = sq.kind === 'boiled';
      pill(ctx, c, boiled ? 'squash!' : 'firm: springs back', x + 150, y - 10, { bg: boiled ? c.bad : c.good, size: 17, ...p });
      if (boiled && a < 1.6) {
        for (let k = 0; k < 6; k++) {
          const ang = (k / 6) * Math.PI * 2;
          const r = 30 + (a - 1.0) * 120;
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - (a - 1.0) / 0.6);
          sparkle(ctx, x + Math.cos(ang) * r * 1.6, y + Math.sin(ang) * r * 0.5, 6, lighten(c.broth, 0.4));
          ctx.restore();
        }
      }
    }
    if (a > 1.4) {
      const pulse = 1 + 0.05 * Math.sin(t * 5);
      pill(ctx, c, sq.kind === 'boiled' ? 'now try a live one' : 'tap a bowl to squeeze', 340, 470, { bg: c.accent, size: 16, scale: pulse });
    }
  }
}

function SimEaseOut(u) {
  return 1 - (1 - u) * (1 - u) * (1 - u);
}
