/**
 * SwanNeckFlaskScene - blk-l00-01-02-s03 (observe). Redi's jars (1668) and
 * Pasteur's swan-neck flask (1859) replayed, then the learner runs three
 * flasks for thirty days and does Pasteur's two follow-up tests.
 *
 * Beats (the slide's five paragraphs, splitSteps() counts 5):
 *   0 Lens card        - the honesty card over the idle bench.
 *   1 Two men          - Redi's jars and Pasteur's flask side by side, 191 years apart.
 *   2 The setups       - Redi's week runs (maggots only in the open jar), then Pasteur
 *                        boils the broth and bends the neck; dust settles in the bend.
 *   3 Three flasks     - open / sealed / swan neck; learner runs 30 days.
 *   4 Snap and tilt    - three swan flasks: leave one, snap one, tilt one; run 30 more
 *                        days. Free play from here (Start over).
 *
 * Canvas, not DOM: particles (dust following the neck), clouding broth and
 * flying insects are continuous motion; labels are short chips only.
 */
import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import { clamp01, smooth, lerp } from 'simulations/base/SimMotion.js';
import {
  W, H, loadColors, alpha, darken, lighten, mix, font, rr, pill, popAt, leader,
  drawWall, drawSunbeam, drawShelf, drawCard, drawFly, drawFlame, drawStink, drawDust,
  drawMicrobe, drawFlask, drawNeckPiece, drawFlaskIcon, drawJar, makeFlask, neckPath,
  pathAt, dipIndex, flaskMouth, flaskDip, brothTop, sparkle, outBack, Burst, makeFlies, stepFlies, SNAP_INDEX,
} from './FlaskKit.js';

const STAGE_LENS = 0;
const STAGE_TWO_MEN = 1;
const STAGE_SETUPS = 2;
const STAGE_THREE = 3;
const STAGE_TESTS = 4;

const BEAT_STEP_MAP = [
  [{ idx: STAGE_LENS, dwellMs: null }],
  [{ idx: STAGE_TWO_MEN, dwellMs: null }],
  [{ idx: STAGE_SETUPS, dwellMs: null }],
  [{ idx: STAGE_THREE, dwellMs: null }],
  [{ idx: STAGE_TESTS, dwellMs: null }],
];

const RUN_SECONDS = 5;        // thirty days pass in five seconds
const DAY_CAP = 120;
const SHELF_SPLIT = 452;
const SHELF_LINE = 384;

/** Cloudiness from the day a flask first let microbes in. */
function cloudFor(f, day) {
  return f.contamDay == null ? 0 : smooth(f.contamDay + 1.5, f.contamDay + 7, day);
}

export class SwanNeckFlaskScene extends CanvasSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  static ARIA_LABEL =
    'Redi\'s two jars of meat and Pasteur\'s swan-neck flask. Flies reach the meat only in the open jar. ' +
    'Pasteur boils broth and bends the flask neck into an S; dust settles in the bend. Three flasks, open, ' +
    'sealed and swan-neck, run for thirty days: only the open one clouds. Then one swan neck is snapped ' +
    'and another tilted so broth touches the dust: both cloud, the untouched one stays clear.';

  static CONTROLS = [
    { type: 'button', id: 'run', label: 'Run 30 days' },
    { type: 'button', id: 'snap', label: 'Snap the neck' },
    { type: 'button', id: 'tilt', label: 'Tilt the flask' },
    { type: 'button', id: 'again', label: 'Start over' },
  ];

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;
    this.colors = null;
    this._stage = -1;
    this._age = 0;
    this._fade = 1;
    this._clock = 0;
    this._day = 0;
    this._runOn = false;
    this._runFrom = 0;
    this._runTo = 0;
    this._runAge = 0;
    this._verdictAge = -1;
    this._flasks = [];
    this._pflask = null;
    this._jars = [];
    this._flies = [];
    this._motes = [];
    this._moteDebt = 0;
    this._burst = new Burst();
    this._shards = new Burst();
    this._tiltAge = -1;
    this._celebrate = -1;
    this._rediDay = 0;
    this._onPointerUp = this._handlePointerUp.bind(this);
  }

  async setup() {
    await super.setup();
    this._reloadColors();
    this._canvas.addEventListener('pointerup', this._onPointerUp);
    this._enterStage(STAGE_LENS);
    this._drawInitialFrame(this._ctx);
  }

  destroy() {
    if (this._canvas) this._canvas.removeEventListener('pointerup', this._onPointerUp);
    super.destroy();
  }

  _reloadColors() {
    this.colors = loadColors(this.container);
  }

  // -- Beats and controls ---------------------------------------------------

  onBeatChange(beatIndex) {
    const b = Math.max(0, Math.min(BEAT_STEP_MAP.length - 1, beatIndex | 0));
    const stage = BEAT_STEP_MAP[b][0].idx;
    if (stage !== this._stage) this._enterStage(stage);
    this.requestUiUpdate?.();
  }

  isControlHidden(id) {
    if (this._stage < STAGE_THREE) return true;
    if (id === 'snap' || id === 'tilt') return this._stage !== STAGE_TESTS;
    if (id === 'again') return !this._touched();
    return false;
  }

  isControlDisabled(id) {
    const busy = this._runOn || this._busy();
    if (id === 'run') return busy || this._day >= this._dayCap();
    if (id === 'snap') return busy || this._flasks[1]?.snapped;
    if (id === 'tilt') return busy || this._flasks[2]?.tilted;
    if (id === 'again') return this._runOn;
    return false;
  }

  onControlChange(id) {
    if (this.isControlHidden(id) || this.isControlDisabled(id)) return;
    if (id === 'run') this._startRun();
    else if (id === 'snap') this._snap();
    else if (id === 'tilt') this._tilt();
    else if (id === 'again') this._enterStage(this._stage);
    this.requestUiUpdate?.();
  }

  _dayCap() { return this._stage === STAGE_THREE ? 30 : DAY_CAP; }
  _baseDay() { return this._stage === STAGE_TESTS ? 30 : 0; }
  _busy() { return this._tiltAge >= 0 || (this._flasks[1] && this._flasks[1].snapAge >= 0 && this._flasks[1].snapAge < 1.2); }
  _touched() {
    return this._day > this._baseDay() || this._runOn || this._flasks.some((f) => f.snapped || f.tilted);
  }

  _handlePointerUp(e) {
    if (this._stage < STAGE_THREE) return;
    const r = this._canvas.getBoundingClientRect();
    if (!r.width) return;
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    const hit = (f) => x > f.x - f.R * 1.2 && x < f.x + f.R * 2.5 && y > f.y - f.R * 2.4 && y < f.y + f.R * 1.2;
    if (this._stage === STAGE_TESTS && hit(this._flasks[1]) && !this.isControlDisabled('snap')) this._snap();
    else if (this._stage === STAGE_TESTS && hit(this._flasks[2]) && !this.isControlDisabled('tilt')) this._tilt();
    else if (!this.isControlDisabled('run')) this._startRun();
    this.requestUiUpdate?.();
  }

  // -- State ----------------------------------------------------------------

  _enterStage(stage) {
    this._stage = stage;
    this._age = 0;
    this._fade = 0;
    this._runOn = false;
    this._verdictAge = -1;
    this._celebrate = -1;
    this._tiltAge = -1;
    this._motes = [];
    this._burst = new Burst();
    this._shards = new Burst();
    this._day = stage === STAGE_TESTS ? 30 : 0;

    if (stage <= STAGE_SETUPS) {
      this._jars = [
        { x: 100, y: SHELF_SPLIT, w: 104, h: 126, covered: false, maggots: 0, eggs: 0 },
        { x: 248, y: SHELF_SPLIT, w: 104, h: 126, covered: true, maggots: 0, eggs: 0 },
      ];
      this._flies = makeFlies([0, 0, 0, 1, 1]);
      this._flasks = [];
      this._pflask = makeFlask('swan', 469, 362, 50, 11);
      this._pflask.morph = 0;
      this._pflask.kind = 'open';
    } else if (stage === STAGE_THREE) {
      this._flasks = [
        makeFlask('open', 152, 330, 46, 21),
        makeFlask('sealed', 322, 330, 46, 22),
        makeFlask('swan', 467, 330, 46, 23),
      ];
      this._flasks[0].contamDay = 0;
      this._flasks[2].pile = 0.15;
    } else {
      this._flasks = [92, 304, 516].map((x, i) => {
        const f = makeFlask('swan', x, 330, 42, 31 + i);
        f.pile = 0.9;
        return f;
      });
    }
    this.requestUiUpdate?.();
  }

  _startRun() {
    this._runOn = true;
    this._runFrom = this._day;
    this._runTo = Math.min(this._dayCap(), this._day + 30);
    this._runAge = 0;
    this._verdictAge = -1;
  }

  _snap() {
    const f = this._flasks[1];
    if (!f || f.snapped) return;
    f.snapped = true;
    f.snapAge = 0;
    f.contamDay = this._day;
    const p = neckPath(f.R, f.morph)[SNAP_INDEX];
    this._shards.fire(f.x + p.x, f.y + p.y, [lighten(this.colors.glass, 0.4), this.colors.glass], 12, 0.8);
    this._verdictAge = -1;
  }

  _tilt() {
    const f = this._flasks[2];
    if (!f || f.tilted) return;
    this._tiltAge = 0;
    this._verdictAge = -1;
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
    if (s <= STAGE_SETUPS) this._updateSplit(dt);
    else this._updateLineup(dt);
    this._updateMotes(dt);
    this._burst.update(dt);
    this._shards.update(dt);
    if (this._verdictAge >= 0) this._verdictAge += dt;
    if (this._celebrate >= 0) this._celebrate += dt;
  }

  _updateSplit(dt) {
    const a = this._age;
    const redi = this._stage === STAGE_SETUPS;
    const day = redi ? clamp01(a / 3.2) * 7 : 0;
    this._rediDay = day;
    this._jars[0].maggots = smooth(2.5, 6.5, day);
    this._jars[1].eggs = smooth(1.5, 5, day);
    stepFlies(this._flies, this._jars, this._clock, redi);
    const f = this._pflask;
    if (this._stage === STAGE_SETUPS) {
      f.boil = smooth(3.9, 4.4, a) * (1 - smooth(5.4, 5.8, a));
      f.morph = smooth(5.8, 7.4, a);
      f.kind = f.morph > 0.5 ? 'swan' : 'open';
      f.pile = smooth(8, 14, a) * 0.8;
    } else {
      f.boil = 0; f.morph = 0; f.kind = 'open'; f.pile = 0;
    }
  }

  _updateLineup(dt) {
    if (this._runOn) {
      this._runAge += dt;
      const u = clamp01(this._runAge / RUN_SECONDS);
      this._day = lerp(this._runFrom, this._runTo, u);
      if (u >= 1) {
        this._runOn = false;
        this._verdictAge = 0;
        this._celebrate = 0;
        const c = this.colors;
        const colors = [c.s1, c.s2, c.s3, c.s4, c.s5];
        if (this._stage === STAGE_THREE) {
          const m = flaskMouth(this._flasks[2]);
          this._burst.fire(m.x, m.y, colors, 26);
        } else {
          this._burst.fire(W / 2, 150, colors, 34, 1.4);
        }
        this.requestUiUpdate?.();
      }
    }
    if (this._stage === STAGE_THREE) {
      this._flasks[2].pile = 0.15 + 0.75 * clamp01(this._day / 30);
    }
    const sf = this._flasks[1];
    if (sf && sf.snapAge >= 0) {
      sf.snapAge += dt;
      if (sf.snapAge >= 1.2 && sf.snapAge - dt < 1.2) this.requestUiUpdate?.();
    }
    if (this._tiltAge >= 0) {
      const f = this._flasks[2];
      const a = (this._tiltAge += dt);
      f.tilt = 0.7 * (smooth(0, 0.7, a) - smooth(1.7, 2.4, a));
      f.stream = smooth(0.5, 1.2, a) - smooth(1.6, 2.2, a);
      f.pile = 0.9 * (1 - smooth(1.3, 2.1, a));
      if (a >= 1.2 && f.contamDay == null) f.contamDay = this._day;
      if (a >= 2.4) {
        f.tilt = 0; f.stream = 0; f.pile = 0; f.tilted = true;
        this._tiltAge = -1;
        this.requestUiUpdate?.();
      }
    }
    for (const f of this._flasks) f.cloud = cloudFor(f, this._day);
  }

  /** Dust drifting down: some aimed at each mouth, the rest settling on the shelf. */
  _updateMotes(dt) {
    const s = this._stage;
    let targets = [];
    let spawnY = -6, x0 = 0, x1 = W, floor = SHELF_LINE;
    if (s === STAGE_SETUPS && this._age > 7.6) {
      targets = [this._pflask];
      spawnY = 60; x0 = 360; x1 = 652; floor = SHELF_SPLIT;
    } else if (s >= STAGE_THREE) {
      targets = this._flasks.filter((f) => !f.tilt);
    } else {
      this._motes = [];
      return;
    }
    const rate = 5 + (this._runOn ? 16 : 0);
    this._moteDebt += rate * dt;
    while (this._moteDebt >= 1) {
      this._moteDebt -= 1;
      const aimed = targets.length && Math.random() < 0.7;
      const f = aimed ? targets[Math.floor(Math.random() * targets.length)] : null;
      const m = f ? flaskMouth(f) : null;
      this._motes.push({
        x: m ? m.x + (Math.random() - 0.5) * f.R * 0.16 : x0 + Math.random() * (x1 - x0),
        y: spawnY, f, mode: 'air', s: 0, ph: Math.random() * 6, r: 1.8 + Math.random() * 1.2, life: 0,
        vy: 38 + Math.random() * 22,
      });
    }
    const speed = this._runOn ? 2.4 : 1;
    for (const p of this._motes) {
      p.life += dt;
      if (p.mode === 'air') {
        p.y += p.vy * speed * dt;
        p.x += Math.sin(this._clock * 2 + p.ph) * 6 * dt;
        if (p.f) {
          const m = flaskMouth(p.f);
          if (p.y >= m.y - 2) {
            if (p.f.kind === 'sealed' && !p.f.snapped) p.dead = true;
            else if (p.f.kind === 'swan' && !p.f.snapped) { p.mode = 'neck'; p.s = neckPath(p.f.R, p.f.morph).length - 1; }
            else p.mode = 'fall';
          }
        } else if (p.y > floor) p.dead = true;
      } else if (p.mode === 'neck') {
        const pts = neckPath(p.f.R, p.f.morph);
        p.s -= 26 * speed * dt;
        const dip = dipIndex(pts);
        if (p.s <= dip || p.f.tilt) p.dead = true;
        else { const q = pathAt(pts, p.s); p.x = p.f.x + q.x; p.y = p.f.y + q.y; }
      } else if (p.mode === 'fall') {
        p.y += p.vy * speed * dt;
        if (p.y >= brothTop(p.f)) p.dead = true;
      }
    }
    this._motes = this._motes.filter((p) => !p.dead && p.life < 20);
  }

  // -- Drawing --------------------------------------------------------------

  _draw(ctx) {
    const c = this.colors;
    ctx.clearRect(0, 0, W, H);
    drawWall(ctx, c);
    if (this._stage <= STAGE_SETUPS) this._drawSplit(ctx, this._stage !== STAGE_LENS);
    else this._drawLineup(ctx);
    this._burst.draw(ctx);
    if (this._stage === STAGE_LENS) this._drawLensCard(ctx);
    if (this._fade < 1) {
      ctx.fillStyle = alpha(c.bgDeep, 1 - this._fade);
      ctx.fillRect(0, 0, W, H);
    }
  }

  _drawMotes(ctx) {
    for (const p of this._motes) drawDust(ctx, this.colors, p.x, p.y, p.r, p.ph);
  }

  _drawSplit(ctx, labels) {
    const c = this.colors;
    const t = this._clock;
    const a = this._age;
    const setups = this._stage === STAGE_SETUPS;

    drawCard(ctx, c, 16, 54, 316, 450);
    drawCard(ctx, c, 348, 54, 316, 450);
    drawShelf(ctx, c, 28, 320, SHELF_SPLIT);
    drawShelf(ctx, c, 360, 652, SHELF_SPLIT);

    for (const j of this._jars) drawJar(ctx, c, j, t);
    for (const fl of this._flies) drawFly(ctx, c, fl.x, fl.y, 1.5, t, { landed: fl.landed, dir: fl.dir, ph: fl.ph });

    // Pasteur: tripod, spirit lamp, flask, torch while bending.
    const f = this._pflask;
    ctx.strokeStyle = darken(c.stroke, 0.1);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(f.x - f.R * 0.55, f.y + f.R * 0.95); ctx.lineTo(f.x - f.R * 0.8, SHELF_SPLIT);
    ctx.moveTo(f.x + f.R * 0.55, f.y + f.R * 0.95); ctx.lineTo(f.x + f.R * 0.8, SHELF_SPLIT);
    ctx.stroke();
    rr(ctx, f.x - 20, SHELF_SPLIT - 20, 40, 20, 8);
    ctx.fillStyle = darken(c.s7, 0.2);
    ctx.fill();
    rr(ctx, f.x - 4, SHELF_SPLIT - 27, 8, 8, 6);
    ctx.fillStyle = c.labelMuted;
    ctx.fill();
    if (f.boil > 0.02) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, f.boil * 1.5);
      drawFlame(ctx, c, f.x, SHELF_SPLIT - 26, 0.75, t);
      ctx.restore();
    }
    drawFlask(ctx, c, f, t);
    const torch = smooth(5.7, 5.9, a) * (1 - smooth(7.3, 7.5, a));
    if (setups && torch > 0.02) {
      const p = pathAt(neckPath(f.R, f.morph), 26);
      ctx.save();
      ctx.globalAlpha = torch;
      drawFlame(ctx, c, f.x + p.x, f.y + p.y + 34, 0.6, t);
      ctx.restore();
    }
    this._drawMotes(ctx);

    if (!labels) return;

    // Timeline: 1668 ... 191 years ... 1859.
    ctx.strokeStyle = alpha(c.labelMuted, 0.8);
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(174, 28); ctx.lineTo(506, 28);
    ctx.stroke();
    ctx.setLineDash([]);
    pill(ctx, c, '1668', 174, 28, { bg: c.s2, size: 16 });
    pill(ctx, c, '1859', 506, 28, { bg: c.s1, size: 16 });
    pill(ctx, c, '191 years', 340, 28, { bg: c.labelMuted, size: 14 });

    pill(ctx, c, 'Redi\'s jars', 30, 86, { bg: c.s2, size: 16, align: 'left' });
    pill(ctx, c, 'Pasteur\'s flask', 362, 86, { bg: c.s1, size: 16, align: 'left' });
    if (setups) pill(ctx, c, `Day ${Math.floor(this._rediDay)}`, 318, 86, { bg: c.labelMuted, size: 15, align: 'right' });

    pill(ctx, c, 'open', 100, 480, { bg: c.labelMuted, size: 15 });
    pill(ctx, c, 'cloth on top', 248, 480, { bg: c.labelMuted, size: 15 });
    pill(ctx, c, setups && a > 4.2 ? 'boiled broth' : 'broth', 469, 480, { bg: c.labelMuted, size: 15 });

    if (!setups) return;
    const p1 = popAt(a, 3.3);
    if (p1) pill(ctx, c, 'maggots', 100, 372, { bg: c.bad, size: 16, ...p1 });
    const p2 = popAt(a, 3.6);
    if (p2) pill(ctx, c, 'none inside', 248, 372, { bg: c.good, size: 16, ...p2 });
    const p3 = popAt(a, 7.8);
    if (p3) {
      const m = flaskMouth(f);
      leader(ctx, 600, 226, m.x + 4, m.y - 6, c.accent, p3.alpha);
      pill(ctx, c, 'air gets in', 600, 212, { bg: c.accent, size: 15, ...p3 });
    }
    const p4 = popAt(a, 8.6);
    if (p4) {
      const d = flaskDip(f);
      leader(ctx, 590, 340, d.x + 2, d.y + 6, c.warning, p4.alpha);
      pill(ctx, c, 'dust stuck', 604, 354, { bg: c.warning, size: 15, ...p4 });
    }
  }

  _drawLineup(ctx) {
    const c = this.colors;
    const t = this._clock;
    drawSunbeam(ctx, c, 30, 190, 160, 460, 0, SHELF_LINE);
    drawShelf(ctx, c, 30, 650, SHELF_LINE);
    this._drawMotes(ctx);
    for (const f of this._flasks) {
      drawFlask(ctx, c, f, t);
      if (f.cloud > 0.6) {
        const m = flaskMouth(f);
        drawStink(ctx, m.x, m.y - 8, t, alpha(mix(c.mold, c.waste, 0.4), 1), (f.cloud - 0.6) / 0.4);
      }
    }
    const sf = this._flasks[1];
    if (sf && sf.snapped) drawNeckPiece(ctx, c, sf, sf.snapAge);
    this._shards.draw(ctx);

    // Resolve moment: sparkles ring the flask that stayed clear.
    if (this._celebrate >= 0 && this._celebrate < 1.6) {
      const clear = this._flasks.filter((f) => f.cloud < 0.5 && (this._stage === STAGE_THREE ? f.kind === 'swan' : true));
      const u = this._celebrate / 1.6;
      for (const f of clear) {
        for (let k = 0; k < 6; k++) {
          const ang = (k / 6) * Math.PI * 2 + u * 2;
          const rad = f.R * (1.1 + u * 0.7);
          ctx.save();
          ctx.globalAlpha = Math.sin(u * Math.PI);
          sparkle(ctx, f.x + Math.cos(ang) * rad, f.y + Math.sin(ang) * rad, 7, k % 2 ? c.warning : c.good);
          ctx.restore();
        }
      }
    }

    pill(ctx, c, `Day ${Math.floor(this._day)}`, 650, 32, { bg: c.labelMuted, size: 16, align: 'right' });

    const names = this._stage === STAGE_THREE ? ['open', 'sealed', 'swan neck'] : ['leave it', 'snap it', 'tilt it'];
    this._flasks.forEach((f, i) => {
      const x = this._stage === STAGE_THREE ? (f.kind === 'swan' ? f.x + f.R * 0.8 : f.x) : f.x + f.R * 0.8;
      pill(ctx, c, names[i], x, SHELF_LINE + 32, { bg: c.labelMuted, size: 15 });
      if (this._verdictAge >= 0) {
        const p = popAt(this._verdictAge, i * 0.25);
        if (p) {
          const cloudy = f.cloud > 0.5;
          pill(ctx, c, cloudy ? 'cloudy' : 'clear', x, 190, { bg: cloudy ? c.bad : c.good, size: 16, ...p });
        }
      }
    });

    const sa = sf ? sf.snapAge : -1;
    if (this._stage === STAGE_TESTS && sa >= 0 && sa < 1.6) {
      const p = popAt(sa, 0);
      pill(ctx, c, 'snap!', sf.x + 10, sf.y - sf.R * 1.9, { bg: c.warning, size: 15, scale: p.scale, alpha: 1 - smooth(1.2, 1.6, sa) });
    }
    if (this._tiltAge >= 0) {
      const f = this._flasks[2];
      const p = popAt(this._tiltAge, 1.0);
      if (p) pill(ctx, c, 'broth meets dust', f.x + f.R * 0.6, f.y - f.R * 2.4, { bg: c.warning, size: 15, ...p });
    }

    if (!this._touched()) {
      const pulse = 1 + 0.05 * Math.sin(this._clock * 5);
      const hint = this._stage === STAGE_THREE ? 'tap to run 30 days' : 'snap one, tilt one, then run';
      pill(ctx, c, hint, W / 2, 476, { bg: c.accent, size: 16, scale: pulse });
    }
  }

  _drawLensCard(ctx) {
    const c = this.colors;
    const t = this._clock;
    const a = this._age;
    ctx.fillStyle = alpha(c.bgDeep, 0.6);
    ctx.fillRect(0, 0, W, H);
    const s = outBack((a - 0.1) / 0.45);
    if (s <= 0) return;
    const cw = 440, ch = 282, cx = (W - cw) / 2, cy = 118;
    ctx.save();
    ctx.translate(W / 2, cy + ch / 2);
    ctx.scale(s, s);
    ctx.translate(-W / 2, -(cy + ch / 2));
    rr(ctx, cx, cy + 5, cw, ch, 11);
    ctx.fillStyle = darken(c.bgSurface, 0.35);
    ctx.fill();
    rr(ctx, cx, cy, cw, ch, 11);
    ctx.fillStyle = c.bgSurface;
    ctx.fill();
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Magnifier badge + title chip.
    ctx.beginPath();
    ctx.arc(cx + 34, cy + 2, 15, 0, Math.PI * 2);
    ctx.fillStyle = c.accent;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 31, cy - 1, 7, 0, Math.PI * 2);
    ctx.strokeStyle = c.bgDeep;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 36, cy + 4); ctx.lineTo(cx + 41, cy + 9);
    ctx.stroke();
    pill(ctx, c, 'THE LENS', cx + 58, cy + 2, { bg: c.accent, size: 15, align: 'left' });

    const rows = [
      ['clock', 'days pass in seconds', null],
      ['clear', 'clear broth = fresh', null],
      ['cloudy', 'cloudy broth = spoiled', null],
      ['dot', 'dot = microbe', 'real ones: 1000\u00d7 smaller'],
    ];
    rows.forEach(([icon, text, sub], i) => {
      const ra = clamp01((a - 0.45 - i * 0.2) / 0.3);
      if (ra <= 0) return;
      const ry = cy + 58 + i * 56;
      const ix = cx + 50;
      ctx.save();
      ctx.globalAlpha = ra;
      if (icon === 'clock') {
        ctx.beginPath();
        ctx.arc(ix, ry, 15, 0, Math.PI * 2);
        ctx.fillStyle = c.s2;
        ctx.fill();
        ctx.strokeStyle = c.bgDeep;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ix, ry); ctx.lineTo(ix + Math.cos(t * 6) * 10, ry + Math.sin(t * 6) * 10);
        ctx.moveTo(ix, ry); ctx.lineTo(ix + Math.cos(t * 0.5) * 6, ry + Math.sin(t * 0.5) * 6);
        ctx.stroke();
      } else if (icon === 'clear') {
        drawFlaskIcon(ctx, c, ix, ry + 8, 0, t);
      } else if (icon === 'cloudy') {
        drawFlaskIcon(ctx, c, ix, ry + 8, 1, t);
      } else {
        drawMicrobe(ctx, ix, ry, 9, c.s3, t, { ph: 1 });
      }
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 18);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, ix + 36, sub ? ry - 9 : ry);
      if (sub) {
        ctx.fillStyle = c.labelMuted;
        ctx.font = font(c, 700, 15);
        ctx.fillText(sub, ix + 36, ry + 12);
      }
      ctx.restore();
    });
    ctx.restore();
  }
}
