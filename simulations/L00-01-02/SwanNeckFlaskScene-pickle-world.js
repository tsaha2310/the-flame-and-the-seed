/**
 * SwanNeckFlaskScene-pickle-world - blk-l00-01-02-s06 (what-if). Kabir's world,
 * where "life from broth" is switched on, against Ajji's shelf: mango pickle
 * in oil, dahi, jam under wax, honey, a pressure cooker.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - our world, the dial locked at OFF; predict first.
 *   1 run   - the learner turns the dial. ON: every jar spoils within a day,
 *             sealed or not, with microbes appearing inside from nowhere.
 *             OFF: a month passes and nothing spoils.
 *   2 nails - back in our world: microbes drift in from outside and bounce off
 *             oil, wax, lids and seals; each shelf item gets its method chip.
 *             The dial stays live for comparison.
 *
 * Canvas: drifting and bouncing microbes, growing mould and a running clock
 * are continuous motion; labels are short chips only.
 */
import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import { clamp01, smooth } from 'simulations/base/SimMotion.js';
import {
  W, H, loadColors, alpha, darken, lighten, mix, rr, pill, popAt, ellipse, blob,
  drawWall, drawSunbeam, drawShelf, drawMicrobe, drawStink, sparkle, Burst, mulberry32,
} from './FlaskKit.js';

const STEP_SETUP = 0;
const STEP_RUN = 1;
const STEP_NAILS = 2;

const BEAT_STEP_MAP = [
  [{ idx: STEP_SETUP, dwellMs: null }],
  [{ idx: STEP_RUN, dwellMs: null }],
  [{ idx: STEP_NAILS, dwellMs: null }],
];

const SHELF_Y = 420;
const DIAL = { x: 592, y: 132, r: 36 };
const HOUR_PHASE_S = 3;       // the first day takes three seconds, hour by hour
const DAY_PHASE_S = 3.5;      // then days 1..30 fly past
const MONTH_H = 720;

// Shelf items. onset = hour the spoiling starts in Kabir's world (all done within a day).
const ITEMS = [
  { id: 'pickle', name: 'pickle', x: 100, w: 84, h: 116, onset: 4, method: 'salt + oil' },
  { id: 'dahi', name: 'dahi', x: 215, w: 100, h: 88, onset: 2, method: null },
  { id: 'jam', name: 'jam', x: 330, w: 72, h: 92, onset: 6, method: 'wax seal' },
  { id: 'honey', name: 'honey', x: 445, w: 80, h: 110, onset: 9, method: 'sugary, dry' },
  { id: 'cooker', name: 'cooker', x: 568, w: 112, h: 90, onset: 11, method: 'boiled, shut' },
];

function hoursAt(runAge) {
  if (runAge <= HOUR_PHASE_S) return (runAge / HOUR_PHASE_S) * 24;
  return 24 + clamp01((runAge - HOUR_PHASE_S) / DAY_PHASE_S) * (MONTH_H - 24);
}

export class SwanNeckFlaskScenePickleWorld extends CanvasSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  static ARIA_LABEL =
    'Ajji\'s shelf: mango pickle in oil, a pot of dahi, jam under a wax seal, honey and a pressure cooker, ' +
    'with a dial for "life from broth". With the dial off, a month passes and nothing spoils; microbes from ' +
    'outside bounce off the oil, wax, lids and seals. With it on, microbes appear inside every jar and ' +
    'everything spoils within a day, sealed or not.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Life from broth: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Life from broth: ON', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'run', label: 'Run again' },
  ];

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;
    this.colors = null;
    this.mode = 'off';            // read by the host to highlight the active dial button
    this._step = -1;
    this._age = 0;
    this._fade = 1;
    this._clock = 0;
    this._hours = 0;
    this._runOn = false;
    this._runAge = 0;
    this._hasRun = false;
    this._doneAge = -1;
    this._dialAngle = -1;
    this._motes = [];
    this._sparks = [];
    this._burst = new Burst();
    this._rnd = mulberry32(606);
    this._onPointerUp = this._handlePointerUp.bind(this);
  }

  async setup() {
    await super.setup();
    this._reloadColors();
    this._canvas.addEventListener('pointerup', this._onPointerUp);
    this._enterStep(STEP_SETUP);
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
    const step = BEAT_STEP_MAP[b][0].idx;
    if (step !== this._step) this._enterStep(step);
    this.requestUiUpdate?.();
  }

  isControlHidden(id) {
    if (this._step === STEP_SETUP) return true;
    if (id === 'run') return !this._hasRun;
    return false;
  }

  isControlDisabled(id) {
    if (id === 'run') return this._runOn;
    return false;
  }

  onControlChange(id) {
    if (this.isControlHidden(id)) return;
    if (id === 'off' || id === 'on') this._setMode(id);
    else if (id === 'run' && !this._runOn) this._startRun();
    this.requestUiUpdate?.();
  }

  _handlePointerUp(e) {
    if (this._step === STEP_SETUP) return;
    const r = this._canvas.getBoundingClientRect();
    if (!r.width) return;
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    if (Math.hypot(x - DIAL.x, y - DIAL.y) < DIAL.r + 22) {
      this._setMode(this.mode === 'on' ? 'off' : 'on');
      this.requestUiUpdate?.();
    }
  }

  // -- State ----------------------------------------------------------------

  _enterStep(step) {
    this._step = step;
    this._age = 0;
    this._fade = 0;
    this._burst = new Burst();
    this._sparks = [];
    this._doneAge = -1;
    this._runOn = false;
    this._hours = 0;
    this._hasRun = false;
    this.mode = 'off';
    if (step === STEP_NAILS) this._startRun();
    this.requestUiUpdate?.();
  }

  _setMode(mode) {
    this.mode = mode;
    this._startRun();
  }

  _startRun() {
    this._runOn = true;
    this._runAge = 0;
    this._hours = 0;
    this._hasRun = true;
    this._doneAge = -1;
  }

  _rot(item) {
    if (this.mode !== 'on') return 0;
    return smooth(item.onset, item.onset + 7, this._hours);
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
    const target = this.mode === 'on' ? 1 : -1;
    this._dialAngle += (target - this._dialAngle) * (1 - Math.exp(-dt * 10));

    if (this._runOn) {
      this._runAge += dt;
      this._hours = hoursAt(this._runAge);
      if (this._runAge >= HOUR_PHASE_S + DAY_PHASE_S) {
        this._runOn = false;
        this._doneAge = 0;
        const c = this.colors;
        if (this.mode === 'off') {
          const colors = [c.s1, c.s2, c.s3, c.s4, c.s8];
          if (this._step === STEP_NAILS) this._burst.fire(W / 2 - 40, SHELF_Y - 120, colors, 36, 1.5);
          else this._burst.fire(ITEMS[0].x, SHELF_Y - ITEMS[0].h, colors, 24);
        }
        this.requestUiUpdate?.();
      }
    }
    if (this._doneAge >= 0) this._doneAge += dt;

    // Microbes from outside: in through the window, bounced off every top.
    if (this._step !== STEP_SETUP || this._age > 0.5) {
      if (this._rnd() < dt * 1.6) {
        this._motes.push({
          x: 80 + this._rnd() * 150, y: 196, vx: 20 + this._rnd() * 30, vy: 12 + this._rnd() * 14,
          ph: this._rnd() * 6, life: 0,
        });
      }
    }
    for (const m of this._motes) {
      m.life += dt;
      m.vx += Math.sin(this._clock * 1.7 + m.ph) * 14 * dt;
      m.vy += 26 * dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      for (const it of ITEMS) {
        const top = SHELF_Y - it.h - 6;
        if (m.vy > 0 && m.x > it.x - it.w / 2 && m.x < it.x + it.w / 2 && m.y > top - 4 && m.y < top + 6) {
          m.vy = -Math.abs(m.vy) * 0.9 - 18;
          m.vx += (m.x - it.x) * 0.4;
          this._sparks.push({ x: m.x, y: top, age: 0 });
        }
      }
    }
    this._motes = this._motes.filter((m) => m.life < 9 && m.x < W + 10 && m.y < SHELF_Y - 4).slice(-14);
    for (const s of this._sparks) s.age += dt;
    this._sparks = this._sparks.filter((s) => s.age < 0.5);
    this._burst.update(dt);
  }

  // -- Drawing --------------------------------------------------------------

  _draw(ctx) {
    const c = this.colors;
    const t = this._clock;
    ctx.clearRect(0, 0, W, H);
    drawWall(ctx, c);

    // Window: time of day from the clock, fixed at midday once days fly past.
    const tod = this._hours < 24 ? (8 + this._hours) % 24 : 12;
    const day = smooth(5, 7, tod) * (1 - smooth(17, 19, tod));
    rr(ctx, 30, 36, 212, 162, 11);
    ctx.fillStyle = darken(c.wood, 0.35);
    ctx.fill();
    rr(ctx, 38, 44, 196, 146, 8);
    ctx.fillStyle = mix(mix(c.s5, c.bgDeep, 0.55), mix(c.accent, c.bgSurface, 0.5), day);
    ctx.fill();
    if (day < 0.9) {
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.arc(52 + ((i * 53) % 170), 58 + ((i * 37) % 100), 2, 0, Math.PI * 2);
        ctx.fillStyle = alpha(c.warning, 1 - day);
        ctx.fill();
      }
    }
    if (day > 0.02) {
      const sx = 60 + clamp01((tod - 6) / 12) * 150;
      const sy = 120 - Math.sin(clamp01((tod - 6) / 12) * Math.PI) * 50;
      ctx.save();
      ctx.beginPath();
      ctx.rect(38, 44, 196, 146);
      ctx.clip();
      ctx.globalAlpha = day;
      ctx.strokeStyle = c.warning;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + t * 0.4;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * 28, sy + Math.sin(a) * 28);
        ctx.lineTo(sx + Math.cos(a) * 36, sy + Math.sin(a) * 36);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(sx, sy, 21, 0, Math.PI * 2);
      ctx.fillStyle = c.warning;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx - 6, sy - 6, 7, 0, Math.PI * 2);
      ctx.fillStyle = lighten(c.warning, 0.5);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = darken(c.wood, 0.35);
    ctx.fillRect(133, 44, 6, 146);
    ctx.fillRect(38, 114, 196, 6);
    drawSunbeam(ctx, c, 40, 236, 60, 330, 190, SHELF_Y, day);

    drawShelf(ctx, c, 24, 656, SHELF_Y);
    ITEMS.forEach((it, i) => this._drawItem(ctx, it, i));

    for (const m of this._motes) drawMicrobe(ctx, m.x, m.y, 5, c.s3, t, { ph: m.ph });
    for (const s of this._sparks) {
      ctx.save();
      ctx.globalAlpha = 1 - s.age / 0.5;
      sparkle(ctx, s.x, s.y - s.age * 20, 5 + s.age * 10, c.warning);
      ctx.restore();
    }

    this._drawDial(ctx);
    this._drawLabels(ctx);
    this._burst.draw(ctx);

    if (this._fade < 1) {
      ctx.fillStyle = alpha(c.bgDeep, 1 - this._fade);
      ctx.fillRect(0, 0, W, H);
    }
  }

  _drawItem(ctx, it, i) {
    const c = this.colors;
    const t = this._clock;
    const rot = this._rot(it);
    const x = it.x, bot = SHELF_Y, top = SHELF_Y - it.h;
    const glassEdge = alpha(c.glass, 0.9);
    const glassIn = mix(c.bgDeep, c.glass, 0.14);
    const spoil = (col) => mix(col, c.waste, rot * 0.75);
    const lidShake = rot > 0.3 && rot < 1 ? Math.sin(t * 40 + i) * 1.5 * rot : 0;
    let faceY = bot - it.h * 0.45;
    let faceCol = c.s8;
    let contentTop = top + 16;

    ellipse(ctx, x, bot + 1, it.w * 0.52, 6);
    ctx.fillStyle = alpha(darken(c.bgDeep, 0.4), 0.6);
    ctx.fill();

    if (it.id === 'dahi') {
      const clay = darken(c.s8, 0.25);
      blob(ctx, x, bot - it.h * 0.42 + 4, it.w * 0.5, it.h * 0.44, 8, 0.03, 1);
      ctx.fillStyle = darken(clay, 0.35);
      ctx.fill();
      blob(ctx, x, bot - it.h * 0.42, it.w * 0.5, it.h * 0.44, 8, 0.03, 1);
      ctx.fillStyle = clay;
      ctx.fill();
      ellipse(ctx, x - it.w * 0.24, bot - it.h * 0.6, 6, 12, 0.4);
      ctx.fillStyle = lighten(clay, 0.3);
      ctx.fill();
      const cloth = mix(c.labelMuted, c.bgSurface, 0.25);
      rr(ctx, x - it.w * 0.38, top - 6 + lidShake, it.w * 0.76, 18, 8);
      ctx.fillStyle = cloth;
      ctx.fill();
      rr(ctx, x - it.w * 0.34, top + 8, it.w * 0.68, 5, 6);
      ctx.fillStyle = c.s6;
      ctx.fill();
      faceCol = clay;
      faceY = bot - it.h * 0.38;
      contentTop = top + 2;
    } else if (it.id === 'cooker') {
      const steel = mix(c.labelMuted, c.bgSurface, 0.2);
      rr(ctx, x + it.w / 2 - 6, bot - it.h * 0.72, 40, 12, 6);
      ctx.fillStyle = darken(c.stroke, 0.3);
      ctx.fill();
      rr(ctx, x - it.w / 2, top + 14 + 4, it.w, it.h - 14, 10);
      ctx.fillStyle = darken(steel, 0.35);
      ctx.fill();
      rr(ctx, x - it.w / 2, top + 14, it.w, it.h - 14, 10);
      ctx.fillStyle = steel;
      ctx.fill();
      rr(ctx, x - it.w / 2 + 8, top + 22, 8, it.h - 34, 6);
      ctx.fillStyle = lighten(steel, 0.35);
      ctx.fill();
      ellipse(ctx, x, top + 16 + lidShake, it.w * 0.5, 10);
      ctx.fillStyle = darken(steel, 0.15);
      ctx.fill();
      rr(ctx, x - 7, top - 4 + lidShake, 14, 16, 6);
      ctx.fillStyle = darken(c.stroke, 0.3);
      ctx.fill();
      faceCol = steel;
      faceY = bot - it.h * 0.42;
      contentTop = top + 10;
    } else {
      // Glass jars: pickle, jam, honey.
      const fill = it.id === 'pickle' ? c.s8 : it.id === 'jam' ? c.s4 : c.s2;
      rr(ctx, x - it.w / 2 - 3, top - 3, it.w + 6, it.h + 6, 11);
      ctx.fillStyle = glassEdge;
      ctx.fill();
      rr(ctx, x - it.w / 2, top, it.w, it.h, 9);
      ctx.fillStyle = glassIn;
      ctx.fill();
      const fTop = top + (it.id === 'honey' ? 18 : 14);
      rr(ctx, x - it.w / 2 + 4, fTop, it.w - 8, bot - fTop - 4, 7);
      ctx.fillStyle = spoil(it.id === 'honey' ? alpha(fill, 0.85) : fill);
      ctx.fill();
      if (it.id === 'pickle') {
        for (let k = 0; k < 7; k++) {
          const px = x - it.w * 0.3 + (k % 3) * it.w * 0.28 + (k > 2 ? 10 : 0);
          const py = fTop + 34 + Math.floor(k / 3) * 26;
          blob(ctx, px, py, 11, 8, 5, 0.2, k);
          ctx.fillStyle = spoil(darken(fill, 0.25));
          ctx.fill();
        }
        rr(ctx, x - it.w / 2 + 4, fTop, it.w - 8, 14, 6);
        ctx.fillStyle = alpha(c.broth, 0.9);
        ctx.fill();
      } else if (it.id === 'jam') {
        rr(ctx, x - it.w / 2 + 4, fTop, it.w - 8, 9, 6);
        ctx.fillStyle = c.s6;
        ctx.fill();
      } else {
        ctx.strokeStyle = darken(c.wood, 0.35);
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + it.w * 0.18, fTop + 30);
        ctx.lineTo(x + it.w * 0.34, top - 24);
        ctx.stroke();
        ellipse(ctx, x + it.w * 0.18, fTop + 34, 8, 11);
        ctx.fillStyle = darken(c.wood, 0.35);
        ctx.fill();
      }
      rr(ctx, x - it.w / 2 + 7, top + 10, 6, it.h * 0.5, 3);
      ctx.fillStyle = alpha(lighten(c.glass, 0.6), 0.6);
      ctx.fill();
      // Lid / cloth.
      if (it.id === 'pickle') {
        const cloth = mix(c.labelMuted, c.bgSurface, 0.25);
        rr(ctx, x - it.w / 2 - 8, top - 12 + lidShake, it.w + 16, 18, 8);
        ctx.fillStyle = cloth;
        ctx.fill();
        rr(ctx, x - it.w / 2 - 3, top + 3, it.w + 6, 5, 6);
        ctx.fillStyle = c.s6;
        ctx.fill();
      } else if (it.id === 'jam') {
        rr(ctx, x - it.w / 2 - 6, top - 10 + lidShake, it.w + 12, 14, 7);
        ctx.fillStyle = mix(c.label, c.bgSurface, 0.3);
        ctx.fill();
      } else {
        rr(ctx, x - it.w / 2 - 5, top - 10 + lidShake, it.w + 10, 14, 7);
        ctx.fillStyle = darken(c.wood, 0.2);
        ctx.fill();
      }
      faceCol = fill;
      contentTop = fTop;
    }

    // Inside-out spoiling (Kabir's world only): microbes pop up from nothing.
    if (rot > 0) {
      const n = Math.floor(rot * 6 + 1e-6);
      const opaque = it.id === 'dahi' || it.id === 'cooker';
      for (let k = 0; k < 6; k++) {
        const born = rot * 6 - k;
        if (born <= 0) break;
        const mx = x + (((k * 37) % 10) / 10 - 0.5) * it.w * 0.6;
        const my = opaque ? top - 4 - (k % 3) * 6 : contentTop + 12 + ((k * 23) % 60) * (bot - contentTop - 24) / 60;
        if (born < 0.6) {
          ctx.beginPath();
          ctx.arc(mx, my, 4 + born * 22, 0, Math.PI * 2);
          ctx.strokeStyle = alpha(c.s3, 1 - born / 0.6);
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        if (k < n) drawMicrobe(ctx, mx, my, 5 * Math.min(1, born * 2), c.s3, t, { ph: k + i });
      }
      // Mould fuzz on the top.
      const fuzz = mix(c.mold, c.labelMuted, 0.35);
      const nf = Math.round(rot * 5);
      for (let k = 0; k < nf; k++) {
        const fx = x + (k - 2) * it.w * 0.17;
        blob(ctx, fx, top - 2, 9 + (k % 2) * 4, 7, 6, 0.3, k + i);
        ctx.fillStyle = fuzz;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(fx - 2, top - 5, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = lighten(fuzz, 0.4);
        ctx.fill();
      }
      if (rot > 0.6) drawStink(ctx, x, top - 14, t + i, mix(c.mold, c.waste, 0.4), (rot - 0.6) / 0.4);
    }

    this._drawFace(ctx, x, faceY, faceCol, rot, i);
  }

  _drawFace(ctx, x, y, col, rot, i) {
    const c = this.colors;
    const t = this._clock;
    const ink = darken(col, 0.72);
    const sick = rot > 0.5;
    const blink = Math.sin(t * 1.1 + i * 2.3) > 0.985 ? 0.15 : 1;
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      const ex = x + s * 11;
      if (sick) {
        ctx.beginPath();
        ctx.moveTo(ex - 4, y - 4); ctx.lineTo(ex + 4, y + 2);
        ctx.moveTo(ex + 4, y - 4); ctx.lineTo(ex - 4, y + 2);
        ctx.stroke();
      } else {
        ellipse(ctx, ex, y - 1, 3.2, 4 * blink);
        ctx.fill();
        ellipse(ctx, x + s * 19, y + 7, 5, 3);
        ctx.fillStyle = alpha(c.s4, 0.55);
        ctx.fill();
        ctx.fillStyle = ink;
      }
    }
    ctx.beginPath();
    if (sick) {
      ctx.moveTo(x - 9, y + 12);
      ctx.quadraticCurveTo(x - 4.5, y + 7, x, y + 12);
      ctx.quadraticCurveTo(x + 4.5, y + 17, x + 9, y + 12);
    } else {
      ctx.arc(x, y + 7, 6, 0.15 * Math.PI, 0.85 * Math.PI);
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawDial(ctx) {
    const c = this.colors;
    const { x, y, r } = DIAL;
    const on = this.mode === 'on';
    const locked = this._step === STEP_SETUP;
    ctx.beginPath();
    ctx.arc(x, y + 4, r + 8, 0, Math.PI * 2);
    ctx.fillStyle = darken(c.bgSurface, 0.35);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r + 8, 0, Math.PI * 2);
    ctx.fillStyle = c.bgSurface;
    ctx.fill();
    ctx.strokeStyle = on ? c.bad : c.good;
    ctx.lineWidth = 4;
    ctx.stroke();
    const a = -Math.PI / 2 + this._dialAngle * 0.9;
    ctx.beginPath();
    ctx.arc(x, y + 3, r - 6, 0, Math.PI * 2);
    ctx.fillStyle = darken(c.raised, 0.3);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r - 6, 0, Math.PI * 2);
    ctx.fillStyle = mix(c.raised, c.labelMuted, 0.25);
    ctx.fill();
    ctx.strokeStyle = on ? c.bad : c.good;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6);
    ctx.lineTo(x + Math.cos(a) * (r - 12), y + Math.sin(a) * (r - 12));
    ctx.stroke();
    pill(ctx, c, 'life from broth', x, y - r - 30, { bg: c.labelMuted, size: 14 });
    pill(ctx, c, 'OFF', x - 34, y + r + 26, { bg: on ? alpha(c.labelMuted, 0.45) : c.good, size: 14 });
    pill(ctx, c, 'ON', x + 34, y + r + 26, { bg: on ? c.bad : alpha(c.labelMuted, 0.45), size: 14 });
    if (!locked && !this._hasRun) {
      const pulse = 1 + 0.06 * Math.sin(this._clock * 5);
      pill(ctx, c, 'turn the dial', x - 10, y + r + 66, { bg: c.accent, size: 15, scale: pulse });
    }
  }

  _drawLabels(ctx) {
    const c = this.colors;
    const a = this._age;
    const clock = this._hours < 24 ? `Hour ${Math.floor(this._hours)}` : `Day ${Math.floor(this._hours / 24)}`;
    pill(ctx, c, clock, 400, 60, { bg: c.labelMuted, size: 18 });

    ITEMS.forEach((it) => pill(ctx, c, it.name, it.x, SHELF_Y + 34, { bg: c.labelMuted, size: 15 }));

    if (this._step === STEP_SETUP) {
      const p = popAt(a, 0.5);
      if (p) pill(ctx, c, 'a month in the sun?', ITEMS[0].x + 34, 262, { bg: c.warning, size: 15, ...p });
    }
    if (this._step === STEP_NAILS && this.mode === 'off') {
      ITEMS.forEach((it, i) => {
        if (!it.method) return;
        const p = popAt(a, 0.6 + i * 0.35);
        if (p) pill(ctx, c, it.method, it.x, SHELF_Y - it.h - 42, { bg: c.good, size: 15, ...p });
      });
    }
    if (this._doneAge >= 0) {
      const p = popAt(this._doneAge, 0);
      const spoiled = this.mode === 'on';
      const text = spoiled ? 'all spoiled in a day' : this._step === STEP_NAILS ? 'all fresh' : 'still fresh';
      if (p) pill(ctx, c, text, 400, 104, { bg: spoiled ? c.bad : c.good, size: 16, ...p });
    }
  }
}
