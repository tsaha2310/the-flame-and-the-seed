/**
 * CrowdScene (preset: pressure, labelled) - blk-l02-04-03-s04 (explain). Gas
 * pressure as the drumming of particles on a wall, and evaporation as the escape
 * of the fastest, with the words laid on: the three ways to raise pressure, who
 * leaves, the team average, the matka, the rule, and sweat.
 *
 * Beats (six paragraphs, splitSteps() counts 6):
 *   0 Drumming   - hits push; hotter, more particles, a smaller box all raise the count.
 *   1 Who leaves - with the top open, only the fastest break free.
 *   2 Average    - take the fastest runners off a team: the average drops.
 *   3 Matka      - it sweats through its clay all night; by morning the water is cool.
 *   4 Rule       - pressure is drumming; evaporation cools.
 *   5 Sweat      - on skin, and a wet cloth on a forehead.
 *
 * Canvas: live particle boxes and a speed histogram; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, alpha, darken, lighten, font, blob, ellipse, drawHillBackdrop, drawBox, drawParticles,
  drawReadout, drawCardBox, drawThermo, ParticleBox, STICK, Evaporator, keAt,
} from './CrowdKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
  [{ idx: 5, dwellMs: null }],
];
const S_DRUM = 0, S_LEAVE = 1, S_AVG = 2, S_MATKA = 3, S_RULE = 4, S_SWEAT = 5;
const CYCLE = [
  { txt: 'room temperature', temp: 25, n: 30, w: 400 },
  { txt: 'hotter: harder and more often', temp: 150, n: 30, w: 400 },
  { txt: 'more particles: more hits', temp: 25, n: 60, w: 400 },
  { txt: 'a smaller box: more hits per wall', temp: 25, n: 30, w: 250 },
];

export class CrowdScenePressureLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'Gas pressure is particles drumming on a wall: hotter, more particles or a smaller box all mean more hits. With ' +
    'the top open, only the fastest particles escape, so the average jiggle of those left drops: evaporation cools. ' +
    'A clay matka sweats through its wall all night and the water inside is cool by morning. Sweat does the same.';

  constructor(container, config) {
    super(container, config);
    this._ci = 0;
    this._t = 0;
  }

  enter(stage) {
    this._ci = 0;
    this._t = 0;
    this._shownHits = 0;
    this._hitT = 0;
    if (stage === S_DRUM) this._gas();
    else if (stage === S_LEAVE || stage === S_AVG || stage === S_RULE) this._puddle();
    else this._box = null;
    this._matka = 0;
  }

  _gas() {
    const cfg = CYCLE[this._ci % CYCLE.length];
    const b = new ParticleBox({ x0: 40, y0: 110, x1: 40 + cfg.w, y1: 450, stick: 0, temp: cfg.temp, keScale: 9, seed: 31 });
    b.fill(cfg.n, 7);
    this._box = b;
    this._evap = null;
  }

  _puddle() {
    const b = new ParticleBox({ x0: 40, y0: 110, x1: 440, y1: 450, stick: STICK.middle * 9, gravity: 36, temp: 25, keScale: 9, seed: 33 });
    b.fill(80, 7, 0, { x0: 40, y0: 330, x1: 440, y1: 450 });
    this._box = b;
    this._evap = null;
    this._settle = 2;
  }

  update(d) {
    this._t += d;
    const b = this._box;
    if (this.stage === S_MATKA) this._matka = Math.min(1, this._matka + d / 8);
    if (!b) return;
    if (this.stage === S_DRUM && this._t > 4) { this._t = 0; this._ci += 1; this._gas(); }
    if (this._settle > 0) {
      this._settle -= d;
      if (this._settle <= 0) this._evap = new Evaporator(b, { every: 0.9, max: 12 });
    }
    if (this._evap) this._evap.step(d);
    b.step(d);
    this._hitT += d;
    if (this._hitT >= 1) { this._hitT = 0; this._shownHits = Math.round(b.hitRate(2)); }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const st = this.stage;
    const say = (txt, bg, at, x = 340, y = 480) => {
      const q = popAt(this.age, at);
      if (q) pill(ctx, c, txt, x, y, { bg, size: 15, ...q });
    };
    const b = this._box;
    if (b) {
      drawBox(ctx, c, b, { open: st !== S_DRUM, rightWallCol: st === S_DRUM ? c.s5 : null });
      if (st === S_DRUM) {
        for (const h of b.hitMarks) {
          const a = 1 - (b.clock - h.t) / 0.4;
          if (a <= 0) continue;
          ctx.beginPath();
          ctx.arc(b.x1 + 5, h.y, 10 * (1.4 - a), 0, Math.PI * 2);
          ctx.strokeStyle = alpha(c.warning, a);
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
      drawParticles(ctx, c, b, { heat: st !== S_DRUM });
      for (const q of b.p) {
        if (!q.leaving || q.gone) continue;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = c.bad;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    if (st === S_DRUM) {
      const cfg = CYCLE[this._ci % CYCLE.length];
      pill(ctx, c, cfg.txt, 40, 70, { bg: c.accent, size: 15, align: 'left' });
      drawReadout(ctx, c, 500, 110, 164, [{ label: 'hits per second', text: String(this._shownHits), col: c.warning }]);
      say('each hit pushes: together, pressure', c.s5, 0.5, 582, 200);
    }
    if (st === S_LEAVE) {
      pill(ctx, c, 'top open', 40, 70, { bg: c.labelMuted, size: 15, align: 'left' });
      say('only the fastest break free', c.bad, 1.5, 560, 70);
      say('not any particles: the fastest ones', c.labelMuted, 2.5, 560, 110);
    }
    if (st === S_AVG || st === S_RULE) this._drawHist(ctx, c);
    if (st === S_AVG) say('take the fastest off the team: the average drops', c.s1, 1.0, 340, 70);
    if (st === S_RULE) {
      say('pressure: the drumming of particles on a wall', c.s5, 0.3, 340, 60);
      say('evaporation cools: only the fast escape', c.s1, 1.0, 340, 96);
    }
    if (st === S_MATKA) this._drawMatka(ctx, c, t, say);
    if (st === S_SWEAT) this._drawSweat(ctx, c, t, say);
  }

  /** Speed histogram of the puddle (those still in it), with the mean marked. */
  _drawHist(ctx, c) {
    const b = this._box;
    const x = 470, y = 150, w = 196, h = 200;
    drawCardBox(ctx, c, x, y, w, h);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('jiggle left', x + 12, y + 18);
    const keR = keAt(25) * 9;
    const bins = new Array(8).fill(0);
    let n = 0;
    for (const q of b.p) {
      if (q.gone || q.leaving) continue;
      const k = 0.5 * (q.vx * q.vx + q.vy * q.vy) / keR;
      bins[Math.min(7, Math.floor(k * 2))] += 1;
      n += 1;
    }
    const max = Math.max(4, ...bins);
    bins.forEach((v, i) => {
      const bh = (v / max) * (h - 70);
      rr(ctx, x + 14 + i * 22, y + h - 20 - bh, 18, Math.max(3, bh), 4);
      ctx.fillStyle = i >= 4 ? c.bad : i >= 2 ? c.s2 : c.s1;
      ctx.fill();
    });
    ctx.fillStyle = c.label;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(b.temp)} \u00b0C`, x + w - 12, y + 18);

  }

  _drawMatka(ctx, c, t, say) {
    const x = 240, y = 300;
    const clay = darken(c.flame, 0.35);
    blob(ctx, x, y + 6, 120, 110, 10, 0.02, 0.5);
    ctx.fillStyle = darken(clay, 0.35);
    ctx.fill();
    blob(ctx, x, y, 120, 110, 10, 0.02, 0.5);
    ctx.fillStyle = clay;
    ctx.fill();
    rr(ctx, x - 40, y - 140, 80, 40, 12);
    ctx.fillStyle = clay;
    ctx.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const u = (t * 0.4 + i * 0.37) % 1;
      const px = x + Math.cos(a) * (122 + u * 30), py = y + Math.sin(a) * (104 + u * 20) - u * 20;
      ellipse(ctx, px, py, 5, 7);
      ctx.fillStyle = alpha(c.water, 1 - u);
      ctx.fill();
    }
    const tempC = 30 - 8 * this._matka;
    drawThermo(ctx, c, x, y + 20, 0.9 - this._matka * 0.5, mix2(c, this._matka));
    pill(ctx, c, `water: ${tempC.toFixed(0)} \u00b0C`, x, y + 76, { bg: c.water, size: 15 });
    const hrs = Math.round(this._matka * 10);
    drawReadout(ctx, c, 460, 150, 196, [{ label: 'night', text: `${hrs} of 10 hours` }, { label: 'air', text: '30 \u00b0C' }]);
    say('the matka sweats through its clay', c.flame, 0.4, 340, 60);
    say('the fastest leave all night: by morning, cool', c.s1, 1.4, 340, 480);
  }

  _drawSweat(ctx, c, t, say) {
    const skin = darken(c.wood, 0.2);
    const face = (x, y, sleepy) => {
      ctx.beginPath();
      ctx.arc(x, y + 5, 80, 0, Math.PI * 2);
      ctx.fillStyle = darken(skin, 0.3);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 80, 0, Math.PI * 2);
      ctx.fillStyle = skin;
      ctx.fill();
      const ink = darken(skin, 0.75);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        if (sleepy) ctx.arc(x + sx * 28, y + 6, 10, 0.15 * Math.PI, 0.85 * Math.PI);
        else ctx.arc(x + sx * 28, y + 4, 6, 0, Math.PI * 2);
        ctx.stroke();
        ellipse(ctx, x + sx * 48, y + 28, 12, 7);
        ctx.fillStyle = alpha(c.bad, 0.45);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(x, y + 32, 14, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    };
    face(180, 250, false);
    for (let i = 0; i < 5; i++) {
      const u = (t * 0.5 + i * 0.23) % 1;
      ellipse(ctx, 130 + i * 25, 196 - u * 50, 5, 7);
      ctx.fillStyle = alpha(c.water, 1 - u);
      ctx.fill();
    }
    pill(ctx, c, 'sweat on skin', 180, 360, { bg: c.water, size: 15 });
    face(500, 250, true);
    rr(ctx, 426, 186, 148, 32, 12);
    ctx.fillStyle = lighten(c.glass, 0.4);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      const u = (t * 0.5 + i * 0.25) % 1;
      ellipse(ctx, 450 + i * 34, 180 - u * 40, 4, 6);
      ctx.fillStyle = alpha(c.water, 1 - u);
      ctx.fill();
    }
    pill(ctx, c, 'a wet cloth on a fever', 500, 360, { bg: c.s1, size: 15 });
    say('the same escape: the fast ones leave, you cool', c.accent, 0.6, 340, 440);
  }
}

function mix2(c, k) {
  return k > 0.5 ? c.s1 : c.bad;
}
