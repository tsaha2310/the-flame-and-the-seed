/**
 * SwanNeckFlaskScene-results - blk-l00-01-02-s04 (explain). The results of
 * Redi's jars and Pasteur's flasks, a lens that finds microbes in the dust,
 * the verdict on spontaneous generation, and life from life.
 *
 * Beats (the slide's five paragraphs, splitSteps() counts 5):
 *   0 Redi         - maggots only in the open jar; flies and their eggs on the cloth.
 *   1 Pasteur      - untouched flask clear for months, snapped and tilted ones cloudy;
 *                    the dust in the bend pulses.
 *   2 The lens     - tap (or Move the lens) to look: microbes on dust, in cloudy broth,
 *                    none in clear broth, riding dust in the air.
 *   3 The verdict  - spontaneous generation card; both tests stamp it failed.
 *   4 Life -> life - fly -> eggs -> maggot loop; one microbe splits into two, then four.
 *
 * Canvas: every beat is drawn, animated creatures and glassware; the lens needs
 * clipping. Labels are short chips only.
 */
import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import { clamp01, smooth } from 'simulations/base/SimMotion.js';
import {
  W, H, loadColors, alpha, darken, lighten, mix, font, rr, pill, popAt, leader, ellipse,
  drawWall, drawSunbeam, drawShelf, drawFly, drawStink, drawDust, drawMicrobe, drawMaggot,
  drawFlask, drawFlaskIcon, drawJar, makeFlask, flaskDip, flaskMouth, brothTop, brothColor,
  outBack, Burst, makeFlies, stepFlies,
} from './FlaskKit.js';

const STAGE_REDI = 0;
const STAGE_PASTEUR = 1;
const STAGE_LENS = 2;
const STAGE_VERDICT = 3;
const STAGE_LIFE = 4;

const BEAT_STEP_MAP = [
  [{ idx: STAGE_REDI, dwellMs: null }],
  [{ idx: STAGE_PASTEUR, dwellMs: null }],
  [{ idx: STAGE_LENS, dwellMs: null }],
  [{ idx: STAGE_VERDICT, dwellMs: null }],
  [{ idx: STAGE_LIFE, dwellMs: null }],
];

const SHELF_JARS = 430;
const SHELF_FLASKS = 374;
const LENS_R = 66;

export class SwanNeckFlaskSceneResults extends CanvasSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  static ARIA_LABEL =
    'Results. Redi: maggots only in the open jar, flies and their eggs on the cloth of the covered jar. ' +
    'Pasteur: the untouched swan-neck flask stays clear, the snapped and tilted flasks go cloudy. ' +
    'A lens shows microbes on the dust and in cloudy broth, none in clear broth. ' +
    'Spontaneous generation is stamped failed by both tests. Finally, flies come from eggs laid by flies, ' +
    'and one microbe splits into two, then four: life from life.';

  static CONTROLS = [
    { type: 'button', id: 'lens', label: 'Move the lens' },
  ];

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;
    this.colors = null;
    this._stage = -1;
    this._age = 0;
    this._fade = 1;
    this._clock = 0;
    this._jars = [];
    this._flies = [];
    this._flasks = [];
    this._motes = [];
    this._burst = new Burst();
    this._lens = { x: 760, y: -90, tx: 0, ty: 0 };
    this._lensTarget = 0;
    this._lensMoved = false;
    this._lifeFired = false;
    this._onPointerUp = this._handlePointerUp.bind(this);
  }

  async setup() {
    await super.setup();
    this._reloadColors();
    this._canvas.addEventListener('pointerup', this._onPointerUp);
    this._enterStage(STAGE_REDI);
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

  isControlHidden(id) {
    return id === 'lens' ? this._stage !== STAGE_LENS : true;
  }

  onControlChange(id) {
    if (id !== 'lens' || this._stage !== STAGE_LENS) return;
    this._lensTarget = (this._lensTarget + 1) % 4;
    this._aimLens(this._lensTarget);
    this._lensMoved = true;
  }

  _handlePointerUp(e) {
    if (this._stage !== STAGE_LENS) return;
    const r = this._canvas.getBoundingClientRect();
    if (!r.width) return;
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    this._lens.tx = Math.max(LENS_R, Math.min(W - LENS_R, x));
    this._lens.ty = Math.max(LENS_R, Math.min(H - LENS_R - 40, y));
    this._lensMoved = true;
  }

  // -- State ----------------------------------------------------------------

  _enterStage(stage) {
    this._stage = stage;
    this._age = 0;
    this._fade = 0;
    this._burst = new Burst();
    this._motes = [];
    this._lifeFired = false;
    this._jars = [
      { x: 200, y: SHELF_JARS, w: 130, h: 160, covered: false, maggots: 1, eggs: 0 },
      { x: 470, y: SHELF_JARS, w: 130, h: 160, covered: true, maggots: 0, eggs: 1 },
    ];
    this._flies = makeFlies([0, 0, 0, 1, 1, 1]);
    this._flasks = [100, 320, 540].map((x, i) => makeFlask('swan', x, 320, 42, 41 + i));
    const [keep, snapped, tilted] = this._flasks;
    keep.pile = 0.9;
    snapped.snapped = true;
    snapped.cloud = 1;
    tilted.cloud = 1;
    if (stage === STAGE_LENS) {
      this._lens = { x: 760, y: -90, tx: 0, ty: 0 };
      this._lensTarget = 0;
      this._lensMoved = false;
      this._aimLens(0);
    }
    this.requestUiUpdate?.();
  }

  /** Lens targets: dust in the trap, cloudy broth, clear broth, the air. */
  _aimLens(k) {
    const [keep, snapped] = this._flasks;
    let p;
    if (k === 0) p = flaskDip(keep);
    else if (k === 1) p = { x: snapped.x, y: snapped.y + snapped.R * 0.1 };
    else if (k === 2) p = { x: keep.x, y: keep.y + keep.R * 0.1 };
    else p = { x: 330, y: 150 };
    this._lens.tx = Math.max(LENS_R, Math.min(W - LENS_R, p.x));
    this._lens.ty = Math.max(LENS_R, p.y);
  }

  /** What sits under the lens centre. */
  _lensSees() {
    const { x, y } = this._lens;
    for (const f of this._flasks) {
      if (f.pile > 0) {
        const d = flaskDip(f);
        if (Math.hypot(x - d.x, y - d.y) < 26) return 'dust';
      }
    }
    for (const f of this._flasks) {
      if (Math.hypot(x - f.x, y - f.y) < f.R && y > brothTop(f)) return f.cloud > 0.5 ? 'cloudy' : 'clear';
    }
    return 'air';
  }

  // -- Frame ----------------------------------------------------------------

  _tick(ctx, dt) {
    if (!this.colors) return;
    const d = Math.max(0, Math.min(dt, 0.05));   // the first frame can report a negative dt
    this._clock += d;
    this._age += d;
    this._fade = Math.min(1, this._fade + d / 0.35);
    this._update(d);
    this._draw(ctx);
  }

  _drawInitialFrame(ctx) {
    if (this.colors) this._draw(ctx);
  }

  _update(dt) {
    const s = this._stage;
    if (s === STAGE_REDI) stepFlies(this._flies, this._jars, this._clock, true);
    if (s === STAGE_LENS) {
      const k = 1 - Math.exp(-dt * 4);
      this._lens.x += (this._lens.tx - this._lens.x) * k;
      this._lens.y += (this._lens.ty - this._lens.y) * k;
    }
    if (s === STAGE_PASTEUR || s === STAGE_LENS) {
      if (Math.random() < dt * 5) {
        this._motes.push({ x: 30 + Math.random() * (W - 60), y: -6, vy: 30 + Math.random() * 20, ph: Math.random() * 6, r: 1.8 + Math.random() * 1.2 });
      }
      for (const m of this._motes) {
        m.y += m.vy * dt;
        m.x += Math.sin(this._clock * 2 + m.ph) * 6 * dt;
      }
      this._motes = this._motes.filter((m) => m.y < SHELF_FLASKS);
    }
    if (s === STAGE_LIFE && !this._lifeFired && this._age > 0.3) {
      this._lifeFired = true;
      const c = this.colors;
      this._burst.fire(W / 2, 64, [c.s1, c.s2, c.s3, c.s4, c.s5], 34, 1.4);
    }
    this._burst.update(dt);
  }

  // -- Drawing --------------------------------------------------------------

  _draw(ctx) {
    const c = this.colors;
    ctx.clearRect(0, 0, W, H);
    drawWall(ctx, c);
    const s = this._stage;
    if (s === STAGE_REDI) this._drawRedi(ctx);
    else if (s === STAGE_PASTEUR || s === STAGE_LENS) this._drawPasteur(ctx, true);
    else if (s === STAGE_VERDICT) this._drawVerdict(ctx);
    else this._drawLife(ctx);
    this._burst.draw(ctx);
    if (this._fade < 1) {
      ctx.fillStyle = alpha(c.bgDeep, 1 - this._fade);
      ctx.fillRect(0, 0, W, H);
    }
  }

  _drawRedi(ctx) {
    const c = this.colors;
    const t = this._clock;
    const a = this._age;
    drawSunbeam(ctx, c, 60, 220, 120, 420, 0, SHELF_JARS);
    drawShelf(ctx, c, 40, 640, SHELF_JARS);
    for (const j of this._jars) drawJar(ctx, c, j, t);
    for (const fl of this._flies) drawFly(ctx, c, fl.x, fl.y, 1.7, t, { landed: fl.landed, dir: fl.dir, ph: fl.ph });

    pill(ctx, c, 'Redi, 1668', 24, 34, { bg: c.s2, size: 16, align: 'left' });
    pill(ctx, c, 'open', 200, 458, { bg: c.labelMuted, size: 15 });
    pill(ctx, c, 'cloth on top', 470, 458, { bg: c.labelMuted, size: 15 });
    const p1 = popAt(a, 0.3);
    if (p1) pill(ctx, c, 'maggots', 200, 345, { bg: c.bad, size: 16, ...p1 });
    const p2 = popAt(a, 0.6);
    if (p2) pill(ctx, c, 'none inside', 470, 345, { bg: c.good, size: 16, ...p2 });
    const p3 = popAt(a, 1.0);
    if (p3) {
      leader(ctx, 590, 218, 512, 252, c.warning, p3.alpha);
      pill(ctx, c, 'fly eggs', 600, 204, { bg: c.warning, size: 15, ...p3 });
    }

    // Where the maggots came from: fly -> eggs -> maggot.
    const p4 = popAt(a, 1.5);
    if (p4) {
      ctx.save();
      ctx.globalAlpha *= p4.alpha;
      const y = 496;
      drawFly(ctx, c, 262, y, 1.6, t, { dir: 1 });
      this._arrow(ctx, 284, y, 316, y, c.labelMuted);
      for (let i = 0; i < 3; i++) {
        ellipse(ctx, 330 + i * 8, y + (i % 2) * 3, 3.4, 2.1, 0.3);
        ctx.fillStyle = lighten(c.warning, 0.65);
        ctx.fill();
      }
      this._arrow(ctx, 356, y, 388, y, c.labelMuted);
      drawMaggot(ctx, c, 410, y, 1.4, t, 0);
      ctx.restore();
    }
  }

  _drawPasteur(ctx, labels) {
    const c = this.colors;
    const t = this._clock;
    const a = this._age;
    drawSunbeam(ctx, c, 30, 190, 160, 460, 0, SHELF_FLASKS);
    drawShelf(ctx, c, 30, 650, SHELF_FLASKS);
    for (const m of this._motes) drawDust(ctx, c, m.x, m.y, m.r, m.ph);
    for (const f of this._flasks) {
      drawFlask(ctx, c, f, t);
      if (f.cloud > 0.6) {
        const m = flaskMouth(f);
        drawStink(ctx, m.x, m.y - 8, t, mix(c.mold, c.waste, 0.4));
      }
    }
    const keep = this._flasks[0];
    if (this._stage === STAGE_PASTEUR) {
      const d = flaskDip(keep);
      const u = (t * 0.8) % 1;
      ctx.save();
      ctx.globalAlpha = (1 - u) * smooth(1.2, 1.6, a);
      ctx.beginPath();
      ctx.arc(d.x, d.y + 3, 10 + u * 22, 0, Math.PI * 2);
      ctx.strokeStyle = c.warning;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
    if (!labels) return;

    pill(ctx, c, 'Pasteur, 1859', 24, 34, { bg: c.s1, size: 16, align: 'left' });
    const names = ['untouched', 'neck snapped', 'tilted'];
    const verdicts = [['clear for months', c.good], ['cloudy in days', c.bad], ['cloudy', c.bad]];
    this._flasks.forEach((f, i) => {
      const x = f.x + f.R * 0.8;
      pill(ctx, c, names[i], x, SHELF_FLASKS + 30, { bg: c.labelMuted, size: 15 });
      if (this._stage !== STAGE_PASTEUR) return;
      const p = popAt(a, 0.3 + i * 0.25);
      if (p) pill(ctx, c, verdicts[i][0], x, 180, { bg: verdicts[i][1], size: 16, ...p });
    });
    if (this._stage === STAGE_PASTEUR) {
      const p = popAt(a, 1.3);
      if (p) {
        const d = flaskDip(keep);
        leader(ctx, 240, 452, d.x, d.y + 8, c.warning, p.alpha);
        pill(ctx, c, 'the dust?', 250, 466, { bg: c.warning, size: 16, ...p });
      }
    }
    if (this._stage === STAGE_LENS) this._drawLens(ctx);
  }

  _drawLens(ctx) {
    const c = this.colors;
    const t = this._clock;
    const { x, y } = this._lens;
    const sees = this._lensSees();

    // Magnified view, clipped to the glass.
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, LENS_R, 0, Math.PI * 2);
    ctx.clip();
    const inner = mix(c.bgDeep, c.glass, 0.14);
    ctx.fillStyle = sees === 'air' ? c.bgSurface : sees === 'dust' ? inner : brothColor(c, sees === 'cloudy' ? 1 : 0);
    if (sees === 'clear') {
      ctx.fillStyle = inner;
      ctx.fillRect(x - LENS_R, y - LENS_R, LENS_R * 2, LENS_R * 2);
      ctx.fillStyle = brothColor(c, 0);
    }
    ctx.fillRect(x - LENS_R, y - LENS_R, LENS_R * 2, LENS_R * 2);

    if (sees === 'dust') {
      const grains = [[-26, 16, 22], [18, 22, 18], [4, -18, 16]];
      grains.forEach(([gx, gy, gr], i) => {
        drawDust(ctx, c, x + gx, y + gy, gr, i * 2);
        drawMicrobe(ctx, x + gx + gr * 0.4, y + gy - gr * 0.7 + Math.sin(t * 2 + i) * 2, 11, i % 2 ? c.s5 : c.s3, t, { face: true, ph: i });
      });
    } else if (sees === 'cloudy') {
      for (let i = 0; i < 7; i++) {
        const ang = t * (0.3 + i * 0.05) + i * 0.9;
        const rad = 14 + (i * 13) % 44;
        drawMicrobe(ctx, x + Math.cos(ang) * rad, y + Math.sin(ang) * rad * 0.8, 12 + (i % 3), i % 3 ? c.s3 : c.s5, t, { face: true, ph: i });
      }
    } else if (sees === 'clear') {
      ctx.strokeStyle = alpha(lighten(c.broth, 0.6), 0.8);
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const u = (t * 0.3 + i * 0.2) % 1;
        ctx.beginPath();
        ctx.arc(x - 40 + i * 20, y + LENS_R - u * LENS_R * 2, 4 + (i % 3) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const u = (t * 0.18 + i / 3) % 1;
        const gx = x - 36 + i * 36 + Math.sin(t + i) * 8;
        const gy = y - LENS_R - 20 + u * (LENS_R * 2 + 40);
        drawDust(ctx, c, gx, gy, 12, i);
        if (i !== 1) drawMicrobe(ctx, gx + 6, gy - 11, 10, c.s3, t, { face: true, ph: i });
      }
    }
    ctx.restore();

    // Rim, glare and handle.
    const rim = darken(c.s2, 0.25);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    rr(ctx, LENS_R + 2, -8 + 3, 50, 16, 8);
    ctx.fillStyle = darken(rim, 0.3);
    ctx.fill();
    rr(ctx, LENS_R + 2, -8, 50, 16, 8);
    ctx.fillStyle = rim;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y, LENS_R + 8, 0, Math.PI * 2);
    ctx.arc(x, y, LENS_R, 0, Math.PI * 2, true);
    ctx.fillStyle = rim;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, LENS_R - 12, Math.PI * 1.1, Math.PI * 1.4);
    ctx.strokeStyle = alpha(lighten(c.glass, 0.7), 0.7);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    const text = { dust: 'microbes on the dust', cloudy: 'microbes everywhere', clear: 'nothing alive', air: 'microbes ride the dust' }[sees];
    const bg = sees === 'clear' ? c.labelMuted : c.s3;
    const ly = y - LENS_R - 26 < 20 ? y + LENS_R + 26 : y - LENS_R - 26;
    const lx = Math.max(110, Math.min(W - 110, x));
    pill(ctx, c, text, lx, ly, { bg, size: 16 });

    if (!this._lensMoved) {
      const pulse = 1 + 0.05 * Math.sin(this._clock * 5);
      pill(ctx, c, 'tap to move the lens', W / 2, 474, { bg: c.accent, size: 16, scale: pulse });
    }
  }

  _drawVerdict(ctx) {
    const c = this.colors;
    const t = this._clock;
    const a = this._age;
    this._drawPasteur(ctx, false);
    ctx.fillStyle = alpha(c.bgDeep, 0.62);
    ctx.fillRect(0, 0, W, H);

    const cw = 460, ch = 290, cx = (W - cw) / 2, cy = 70;
    const s = outBack((a - 0.05) / 0.4);
    if (s <= 0) return;
    const shake = a > 2.1 && a < 2.4 ? Math.sin(a * 90) * 4 * (2.4 - a) / 0.3 : 0;
    ctx.save();
    ctx.translate(W / 2 + shake, cy + ch / 2);
    ctx.scale(s, s);
    ctx.translate(-W / 2, -(cy + ch / 2));
    rr(ctx, cx, cy + 5, cw, ch, 11);
    ctx.fillStyle = darken(c.bgSurface, 0.35);
    ctx.fill();
    rr(ctx, cx, cy, cw, ch, 11);
    ctx.fillStyle = c.bgSurface;
    ctx.fill();
    ctx.strokeStyle = c.stroke;
    ctx.lineWidth = 3;
    ctx.stroke();

    pill(ctx, c, 'hypothesis', cx + 22, cy + 2, { bg: c.labelMuted, size: 14, align: 'left' });
    ctx.fillStyle = c.label;
    ctx.font = font(c, 700, 26, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('spontaneous generation', W / 2, cy + 48);

    // broth -> ? life
    drawFlaskIcon(ctx, c, W / 2 - 80, cy + 104, 0, t);
    this._arrow(ctx, W / 2 - 50, cy + 100, W / 2 + 30, cy + 100, c.labelMuted);
    drawMicrobe(ctx, W / 2 + 60, cy + 100, 14, c.s3, t, { face: true, ph: 2 });
    pill(ctx, c, '?', W / 2 + 84, cy + 80, { bg: c.warning, size: 14 });
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 700, 16);
    ctx.fillText('life from non-life', W / 2, cy + 142);

    const tests = [['Redi\'s jars', 0.8], ['Pasteur\'s flasks', 1.4]];
    tests.forEach(([name, at], i) => {
      const ry = cy + 190 + i * 50;
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 18);
      ctx.textAlign = 'left';
      ctx.fillText(name, cx + 60, ry);
      ctx.fillStyle = c.labelMuted;
      ctx.font = font(c, 700, 15);
      ctx.fillText('tested', cx + 250, ry);
      const k = clamp01((a - at) / 0.3);
      if (k <= 0) return;
      const sc = 1.8 - 0.8 * outBack(k);
      ctx.save();
      ctx.translate(cx + 390, ry);
      ctx.scale(sc, sc);
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.beginPath();
      ctx.arc(0, 3, 17, 0, Math.PI * 2);
      ctx.fillStyle = darken(c.bad, 0.35);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.fillStyle = c.bad;
      ctx.fill();
      ctx.strokeStyle = c.bgDeep;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-7, -7); ctx.lineTo(7, 7);
      ctx.moveTo(7, -7); ctx.lineTo(-7, 7);
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();

    // The stamp slams in below the card.
    const k = clamp01((a - 2.1) / 0.25);
    if (k > 0) {
      const sc = 2.2 - 1.2 * k;
      ctx.save();
      ctx.translate(W / 2, cy + ch + 70);
      ctx.rotate(-0.12);
      ctx.scale(sc, sc);
      ctx.globalAlpha = Math.min(1, k * 1.5);
      rr(ctx, -110, -30, 220, 60, 10);
      ctx.fillStyle = c.bad;
      ctx.fill();
      rr(ctx, -102, -22, 204, 44, 7);
      ctx.strokeStyle = c.bgDeep;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = c.bgDeep;
      ctx.font = font(c, 700, 30, true);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FAILED', 0, 2);
      ctx.restore();
    }
  }

  _drawLife(ctx) {
    const c = this.colors;
    const t = this._clock;
    const a = this._age;

    const p0 = popAt(a, 0.15);
    if (p0) pill(ctx, c, 'life \u2192 life', W / 2, 52, { bg: c.good, size: 24, display: true, ...p0 });

    // Fly cycle: fly -> eggs -> maggot -> fly.
    const cx = 190, cy = 280, R = 100;
    const nodes = [-Math.PI / 2, Math.PI / 6, (Math.PI * 5) / 6].map((ang) => ({ x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R }));
    const ringIn = clamp01((a - 0.4) / 0.6);
    ctx.save();
    ctx.globalAlpha = ringIn;
    ctx.strokeStyle = alpha(c.s5, 0.8);
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = -t * 30;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 3; i++) {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 3 + Math.PI / 3;
      const hx = cx + Math.cos(ang) * R, hy = cy + Math.sin(ang) * R;
      const dir = ang + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(dir) * 10, hy + Math.sin(dir) * 10);
      ctx.lineTo(hx + Math.cos(dir + 2.5) * 10, hy + Math.sin(dir + 2.5) * 10);
      ctx.lineTo(hx + Math.cos(dir - 2.5) * 10, hy + Math.sin(dir - 2.5) * 10);
      ctx.closePath();
      ctx.fillStyle = c.s5;
      ctx.fill();
    }
    nodes.forEach((n, i) => {
      const bob = Math.sin(t * 2 + i) * 3;
      ctx.beginPath();
      ctx.arc(n.x, n.y + 4, 38, 0, Math.PI * 2);
      ctx.fillStyle = darken(c.bgSurface, 0.35);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(n.x, n.y, 38, 0, Math.PI * 2);
      ctx.fillStyle = c.bgSurface;
      ctx.fill();
      ctx.strokeStyle = c.s5;
      ctx.lineWidth = 3;
      ctx.stroke();
      if (i === 0) drawFly(ctx, c, n.x - 4, n.y + 4 + bob, 2.6, t, { dir: 1 });
      else if (i === 1) {
        for (let k = 0; k < 5; k++) {
          ellipse(ctx, n.x - 14 + k * 7, n.y + (k % 2) * 6 - 2 + bob * 0.3, 5, 3.2, 0.4);
          ctx.fillStyle = lighten(c.warning, 0.6);
          ctx.fill();
        }
      } else drawMaggot(ctx, c, n.x, n.y + bob * 0.3, 2.2, t, 0);
    });
    ctx.restore();
    if (ringIn > 0) {
      pill(ctx, c, 'fly', nodes[0].x + 70, nodes[0].y, { bg: c.s5, size: 15, alpha: ringIn });
      pill(ctx, c, 'eggs', nodes[1].x, 404, { bg: c.s5, size: 15, alpha: ringIn });
      pill(ctx, c, 'maggot', nodes[2].x, 404, { bg: c.s5, size: 15, alpha: ringIn });
    }

    // Microbe division: 1 -> 2 -> 4, looping.
    const mx = 500, my = 280;
    const splitIn = clamp01((a - 0.8) / 0.5);
    if (splitIn > 0) {
      // Petri dish, to balance the fly ring.
      ctx.save();
      ctx.globalAlpha = splitIn;
      ctx.beginPath();
      ctx.arc(mx, my + 5, 104, 0, Math.PI * 2);
      ctx.fillStyle = darken(c.bgSurface, 0.35);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx, my, 104, 0, Math.PI * 2);
      ctx.fillStyle = mix(c.bgSurface, c.broth, 0.12);
      ctx.fill();
      ctx.strokeStyle = c.s3;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(mx, my, 80, Math.PI * 1.1, Math.PI * 1.4);
      ctx.strokeStyle = alpha(lighten(c.glass, 0.6), 0.6);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
      const u = ((a - 0.8) % 4.2) / 4.2;
      const s1 = smooth(0.2, 0.42, u);
      const s2 = smooth(0.55, 0.77, u);
      const fadeOut = 1 - smooth(0.9, 1, u);
      ctx.save();
      ctx.globalAlpha = splitIn * fadeOut;
      const pts = [];
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          pts.push({ x: mx + sx * 46 * s1, y: my + sy * 44 * s2 });
        }
      }
      const r = 36 - 10 * s1 - 6 * s2;
      const seen = new Set();
      for (const p of pts) {
        const key = `${Math.round(p.x)}:${Math.round(p.y)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        drawMicrobe(ctx, p.x, p.y, r, c.s3, t, { face: true, ph: p.x * 0.1 + p.y * 0.07 });
      }
      ctx.restore();
      const n = s2 > 0.5 ? 4 : s1 > 0.5 ? 2 : 1;
      pill(ctx, c, 'microbes split', mx, 404, { bg: c.s3, size: 15, alpha: splitIn });
      pill(ctx, c, `\u00d7 ${n}`, mx, 150, { bg: c.s3, size: 16, alpha: splitIn * fadeOut });
    }
  }

  _arrow(ctx, x1, y1, x2, y2, col) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - 4, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2 + 2, y2);
    ctx.lineTo(x2 - 8, y2 - 6);
    ctx.lineTo(x2 - 8, y2 + 6);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
  }
}
