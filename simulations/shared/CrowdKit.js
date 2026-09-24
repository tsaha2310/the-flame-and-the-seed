/**
 * CrowdKit - the Crowd model's shared engine and drawing (Book II.4 onward): a
 * box of jiggling particles with two dials, temperature (the jiggle) and
 * stickiness (the pull between particles). Not a scene. Re-exports HillKit (and
 * through it StoryKit).
 *
 * Units: px and seconds, every particle mass 1. Temperature is the target mean
 * kinetic energy per particle, in (px/s)^2; stickiness is the depth of the pull
 * well between two touching particles, in the same units. The thermostat nudges
 * the crowd toward the target temperature; switched off, energy only moves by
 * collisions (and leaves with anything that escapes).
 */
import { alpha, mix, darken, lighten, rr, ellipse, blob, font, mulberry32 } from './HillKit.js';

export * from './HillKit.js';

/** Temperatures (C) and their model jiggle (mean kinetic energy per particle). */
export const KE_ROOM = 900;
export function keAt(C) {
  return (KE_ROOM * (C + 273.15)) / 298.15;
}

export const STICK = { zero: 0, low: 250, middle: 2000, high: 20000 };

/**
 * A box of disks. opts: { x0, y0, x1, y1, gravity, stick, temp (C), thermostat,
 * topOpen, seed }. Particles: { x, y, vx, vy, r, kind, tag, gone }.
 */
export class ParticleBox {
  constructor(o = {}) {
    this.x0 = o.x0 ?? 60; this.y0 = o.y0 ?? 80; this.x1 = o.x1 ?? 620; this.y1 = o.y1 ?? 440;
    this.gravity = o.gravity ?? 0;
    this.stick = o.stick ?? 0;
    this.temp = o.temp ?? 25;
    this.thermostat = o.thermostat ?? true;
    this.keScale = o.keScale ?? 1;   // speeds up a gas box without changing what the temperatures mean
    this.topOpen = false;
    this.escapeRule = null;          // (particle, box) => true lets it leave through an open top
    this.rnd = mulberry32(o.seed ?? 3);
    this.p = [];
    this.hitsRight = [];             // times of hits on the right wall
    this.hitMarks = [];              // { t, y } of recent right-wall hits, for the flashes
    this.clock = 0;
    this.escaped = 0;
    this.onPair = null;              // (a, b, relKE) hook for reactions
    this._touch = new Map();
    this.hist = [];
  }

  /** Scatter n particles of radius r and kind in the box (optionally a sub-rect). */
  fill(n, r = 7, kind = 0, rect = null) {
    const R = rect ?? { x0: this.x0, y0: this.y0, x1: this.x1, y1: this.y1 };
    const sp = Math.sqrt(2 * keAt(this.temp) * this.keScale);
    for (let i = 0; i < n; i++) {
      let x, y, tries = 0;
      do {
        x = R.x0 + r + this.rnd() * (R.x1 - R.x0 - 2 * r);
        y = R.y0 + r + this.rnd() * (R.y1 - R.y0 - 2 * r);
        tries += 1;
      } while (tries < 40 && this.p.some((q) => (q.x - x) ** 2 + (q.y - y) ** 2 < (q.r + r + 1) ** 2));
      const a = this.rnd() * Math.PI * 2;
      this.p.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r, kind, x0: x, y0: y });
    }
  }

  /** A tight block of particles (a solid lump) with little jiggle. */
  block(cx, cy, cols, rows, r = 7, kind = 0, fixed = false) {
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      this.p.push({ x: cx + (i - (cols - 1) / 2) * 2 * r, y: cy + (j - (rows - 1) / 2) * 2 * r, vx: 0, vy: 0, r, kind, fixed });
    }
  }

  meanKE(filter = null) {
    let s = 0, n = 0;
    for (const q of this.p) {
      if (q.gone || q.fixed || q.leaving || (filter && !filter(q))) continue;
      s += 0.5 * (q.vx * q.vx + q.vy * q.vy);
      n += 1;
    }
    return n ? s / n : 0;
  }

  /** Right-wall hits per second, averaged over the last `win` seconds. */
  hitRate(win = 3) {
    const t = this.clock;
    this.hitsRight = this.hitsRight.filter((h) => t - h < win);
    return this.hitsRight.length / Math.min(win, Math.max(0.5, t));
  }

  /** The crowd's mean jiggle expressed as a temperature (C). */
  jiggleC(filter = null) {
    return (this.meanKE(filter) / (KE_ROOM * this.keScale)) * 298.15 - 273.15;
  }

  step(dt) {
    const n = 8, h = dt / n;
    for (let k = 0; k < n; k++) this._sub(h);
    this.clock += dt;
    // Position history every 0.25 s for the wander readout.
    if (!this._lastHist || this.clock - this._lastHist >= 0.25) {
      this._lastHist = this.clock;
      this.hist.push(this.p.map((q) => [q.x, q.y]));
      if (this.hist.length > 9) this.hist.shift();
    }
  }

  _sub(h) {
    const ps = this.p;
    const N = ps.length;
    for (const q of ps) { q.ax = 0; q.ay = this.gravity; }
    // Pair forces through a grid.
    const cell = 34;
    const grid = new Map();
    for (let i = 0; i < N; i++) {
      const q = ps[i];
      if (q.gone) continue;
      const key = ((q.x / cell) | 0) * 1000 + ((q.y / cell) | 0);
      let arr = grid.get(key);
      if (!arr) grid.set(key, (arr = []));
      arr.push(i);
    }
    const eps = this.stick;
    for (let i = 0; i < N; i++) {
      const a = ps[i];
      if (a.gone || a.leaving) continue;
      const gx = (a.x / cell) | 0, gy = (a.y / cell) | 0;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const arr = grid.get((gx + dx) * 1000 + gy + dy);
        if (!arr) continue;
        for (const j of arr) {
          if (j <= i) continue;
          const b = ps[j];
          if (b.leaving) continue;
          const rx = b.x - a.x, ry = b.y - a.y;
          const d2 = rx * rx + ry * ry;
          const s = a.r + b.r;
          const reach = eps > 0 ? s * 2 : s;
          if (d2 > reach * reach || d2 < 1e-6) continue;
          const d = Math.sqrt(d2);
          let f = 0;           // positive pushes apart
          if (d < s) {
            f = 3.5e4 * (s - d) / s * 14;
            if (this.onPair) {
              // Once per meeting: a pair that touched in the last 0.1 s is still the same collision.
              const key = i * 4096 + j;
              const last = this._touch.get(key);
              if (last == null || this.clock - last > 0.1) {
                const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
                const closing = -(rvx * rx + rvy * ry) / d;
                if (closing > 0) this.onPair(a, b, 0.5 * closing * closing);
              }
              this._touch.set(key, this.clock);
            }
          }
          if (eps > 0 && d > s * 0.9) {
            const u = Math.max(0, (d - s) / s);
            if (u < 1) f -= (4 * eps * u * (1 - u * u)) / s;
          }
          const fx = (f * rx) / d, fy = (f * ry) / d;
          if (!a.fixed) { a.ax -= fx; a.ay -= fy; }
          if (!b.fixed) { b.ax += fx; b.ay += fy; }
        }
      }
    }
    // Integrate, walls.
    for (const q of ps) {
      if (q.gone || q.fixed) continue;
      q.vx += q.ax * h;
      q.vy += q.ay * h;
      q.x += q.vx * h;
      q.y += q.vy * h;
      if (q.x < this.x0 + q.r) { q.x = this.x0 + q.r; q.vx = Math.abs(q.vx); }
      if (q.x > this.x1 - q.r) {
        q.x = this.x1 - q.r;
        q.vx = -Math.abs(q.vx);
        this.hitsRight.push(this.clock);
        this.hitMarks.push({ t: this.clock, y: q.y });
        if (this.hitMarks.length > 40) this.hitMarks.shift();
      }
      if (q.y > this.y1 - q.r) { q.y = this.y1 - q.r; q.vy = -Math.abs(q.vy); }
      if (q.y < this.y0 + q.r && !q.leaving) {
        if (this.topOpen && (!this.escapeRule || this.escapeRule(q, this))) {
          if (q.y < this.y0 - 40) { q.gone = true; this.escaped += 1; }
        } else { q.y = this.y0 + q.r; q.vy = Math.abs(q.vy); }
      }
    }
    // Thermostat (Berendsen).
    if (this.thermostat) {
      const ke = this.meanKE();
      if (ke > 1e-3) {
        const target = keAt(this.temp) * this.keScale;
        const lam = Math.sqrt(Math.max(0.2, 1 + (h / 0.3) * (target / ke - 1)));
        for (const q of ps) if (!q.gone && !q.fixed && !q.leaving) { q.vx *= lam; q.vy *= lam; }
      } else if (keAt(this.temp) * this.keScale > 1) {
        for (const q of ps) if (!q.gone && !q.fixed) { q.vx += (this.rnd() - 0.5) * 20; q.vy += (this.rnd() - 0.5) * 20; }
      }
    }
  }

  /**
   * State of the crowd from what it is doing: the share with two or more close
   * neighbours (condensed), and how far condensed particles wander in 2 s
   * relative to their neighbours.
   */
  state() {
    const ps = this.p.filter((q) => !q.gone);
    const n = ps.length;
    if (!n) return { id: 'gas', condensed: 0, wander: 0 };
    let cond = 0;
    const isC = ps.map((a) => {
      let k = 0;
      for (const b of ps) if (a !== b && (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < ((a.r + b.r) * 1.35) ** 2) k += 1;
      return k >= 2;
    });
    isC.forEach((v) => { if (v) cond += 1; });
    const share = cond / n;
    let wander = 0;
    if (this.hist.length >= 9) {
      const old = this.hist[0], now = this.hist[this.hist.length - 1];
      // Remove the common drift of the condensed ones.
      let mx = 0, my = 0, m = 0;
      this.p.forEach((q, i) => { if (!q.gone && old[i] && now[i]) { mx += now[i][0] - old[i][0]; my += now[i][1] - old[i][1]; m += 1; } });
      mx /= Math.max(1, m); my /= Math.max(1, m);
      let s = 0, k = 0;
      this.p.forEach((q, i) => {
        if (q.gone || !old[i] || !now[i]) return;
        const dx = now[i][0] - old[i][0] - mx, dy = now[i][1] - old[i][1] - my;
        s += Math.sqrt(dx * dx + dy * dy);
        k += 1;
      });
      wander = s / Math.max(1, k) / (2 * (ps[0]?.r ?? 7));
    }
    let id = 'gas';
    if (share > 0.55) id = wander < 0.45 ? 'solid' : 'liquid';
    return { id, condensed: share, wander };
  }
}

// -- Drawing ----------------------------------------------------------------------------------

/** A glass-walled box, open at the top when `open`. o: { col, rightWallCol } */
export function drawBox(ctx, c, box, o = {}) {
  const { x0, y0, x1, y1 } = box;
  rr(ctx, x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 12, 12);
  ctx.fillStyle = alpha(c.bgSurface, 0.85);
  ctx.fill();
  ctx.strokeStyle = o.col ?? c.glass;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (o.open) {
    ctx.moveTo(x0 - 3, y0 - 3);
    ctx.lineTo(x0 - 3, y1 + 3);
    ctx.lineTo(x1 + 3, y1 + 3);
    ctx.lineTo(x1 + 3, y0 - 3);
  } else {
    ctx.moveTo(x0 - 3, y0 - 3);
    ctx.lineTo(x0 - 3, y1 + 3);
    ctx.lineTo(x1 + 3, y1 + 3);
    ctx.lineTo(x1 + 3, y0 - 3);
    ctx.closePath();
  }
  ctx.stroke();
  if (o.rightWallCol) {
    ctx.strokeStyle = o.rightWallCol;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(x1 + 5, y0);
    ctx.lineTo(x1 + 5, y1);
    ctx.stroke();
  }
}

/** Particle colour by kind: 0 plain (s1), 1 red (s6), 2 blue (s1), 3 purple (s5), 4 salt (s2). */
export function kindCol(c, kind) {
  return [c.s7, c.s6, c.s1, c.s5, c.s2, c.s4][kind] ?? c.s7;
}

/** Draw every particle; `heat` colours by speed (cool to hot). o: { tagCol, heat } */
export function drawParticles(ctx, c, box, o = {}) {
  const keR = keAt(box.temp) * (box.keScale ?? 1);
  for (const q of box.p) {
    if (q.gone) continue;
    let col = kindCol(c, q.kind);
    if (o.heat) {
      const k = 0.5 * (q.vx * q.vx + q.vy * q.vy) / (keR * 2.2);
      col = k < 0.5 ? mix(c.s1, c.s2, Math.min(1, k * 2)) : mix(c.s2, c.bad, Math.min(1, (k - 0.5) * 2));
    }
    if (q.tag) col = o.tagCol ?? c.bad;
    ctx.beginPath();
    ctx.arc(q.x, q.y + q.r * 0.15, q.r, 0, Math.PI * 2);
    ctx.fillStyle = darken(col, 0.35);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    if (q.r >= 5) {
      ellipse(ctx, q.x - q.r * 0.35, q.y - q.r * 0.4, q.r * 0.3, q.r * 0.18, -0.5);
      ctx.fillStyle = lighten(col, 0.55);
      ctx.fill();
    }
    if (q.shell) {
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = alpha(c.s7, 0.7);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}

/** A labelled readout card: rows [{ label, text, col }]. */
export function drawReadout(ctx, c, x, y, w, rows, title = null) {
  const h = 16 + rows.length * 30 + (title ? 22 : 0);
  rr(ctx, x, y + 4, w, h, 11);
  ctx.fillStyle = darken(c.bgSurface, 0.3);
  ctx.fill();
  rr(ctx, x, y, w, h, 11);
  ctx.fillStyle = c.bgSurface;
  ctx.fill();
  ctx.strokeStyle = alpha(c.stroke, 0.8);
  ctx.lineWidth = 2;
  ctx.stroke();
  let yy = y + 22;
  if (title) {
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, x + 12, yy);
    yy += 24;
  }
  rows.forEach((r, i) => {
    const ry = yy + i * 30;
    ctx.fillStyle = c.label;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(r.label, x + 12, ry);
    ctx.fillStyle = r.col ?? c.label;
    ctx.textAlign = 'right';
    ctx.fillText(r.text, x + w - 12, ry);
  });
  return h;
}

export const STATE_COL = (c, id) => (id === 'solid' ? c.s5 : id === 'liquid' ? c.water : c.s2);

/** The temperature ladder for the state dials, in C (absolute zero to a hot tawa). */
export const LADDER = [-273, -200, -150, -100, -50, 0, 25, 50, 100, 150, 200];
export const ROOM_I = 6, TAWA_I = 10;

export function tempLabel(C) {
  if (C === -273) return 'absolute zero';
  if (C === 25) return 'room, 25 \u00b0C';
  if (C === 200) return 'tawa, 200 \u00b0C';
  return `${C > 0 ? '+' : C < 0 ? '\u2212' : ''}${Math.abs(C)} \u00b0C`;
}

/** A small thermometer bar and number for a temperature. */
export function drawTempBar(ctx, c, x, y, h, C) {
  const k = (C + 273) / 473;
  rr(ctx, x - 7, y, 14, h, 7);
  ctx.fillStyle = c.raised;
  ctx.fill();
  const fh = Math.max(8, h * Math.max(0, Math.min(1, k)));
  rr(ctx, x - 7, y + h - fh, 14, fh, 7);
  ctx.fillStyle = mix(c.s1, c.bad, Math.max(0, Math.min(1, k)));
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y + h + 6, 12, 0, Math.PI * 2);
  ctx.fillStyle = mix(c.s1, c.bad, Math.max(0, Math.min(1, k)));
  ctx.fill();
}

/**
 * Evaporation, kept honest by bookkeeping: every `every` seconds one surface particle
 * leaves (the fastest near the top, or with `slowest` the slowest: the what-if), and
 * the puddle's temperature is recomputed from the energy that stays behind. The box
 * thermostat then holds the puddle at that new temperature.
 */
export class Evaporator {
  constructor(box, o = {}) {
    this.box = box;
    this.every = o.every ?? 0.8;
    this.max = o.max ?? 12;            // a puddle this small would cool without limit; stop at a dozen
    this.slowest = !!o.slowest;
    this.t = 0;
    this.left = [];            // particles on their way out
    this.count = 0;
  }

  step(dt) {
    const b = this.box;
    this.t += dt;
    for (const q of this.left) {
      q.vy = Math.min(q.vy, -260);
      if (q.y < b.y0 - 30) q.gone = true;
    }
    if (this.t < this.every || this.count >= this.max) return null;
    this.t = 0;
    const live = b.p.filter((q) => !q.gone && !q.leaving);
    if (live.length < 8) return null;
    const topY = Math.min(...live.map((q) => q.y));
    const surface = live.filter((q) => q.y < topY + 40);
    const ke = (q) => 0.5 * (q.vx * q.vx + q.vy * q.vy);
    surface.sort((a, c2) => ke(c2) - ke(a));
    const q = this.slowest ? surface[surface.length - 1] : surface[0];
    if (!q) return null;
    const n = live.length;
    const mean = keAt(b.temp) * b.keScale;           // the puddle's set jiggle, not a noisy reading
    const newMean = Math.max(1, (n * mean - ke(q)) / (n - 1));
    q.leaving = true;
    q.vy = -300;
    this.left.push(q);
    this.count += 1;
    // New set temperature for the ones left, from what they still hold.
    b.temp = (newMean / (KE_ROOM * b.keScale)) * 298.15 - 273.15;
    return q;
  }
}

// -- Random walks and diffusion (Book III.5) -----------------------------------------------------

/** Speed of a walker at C (px/s), and its step between bumps (px) for a particle size. */
export function walkSpeed(C) {
  return 700 * Math.sqrt((C + 273.15) / 298.15);
}
export function walkStep(size) {
  return size === 'big' ? 16 : 28;
}

/**
 * One tagged particle taking a random walk from the left wall of a box to the
 * right: a straight step of length `step`, a bump, a fresh random direction.
 */
export class Walker {
  constructor(box, o = {}) {
    this.box = box;
    this.rnd = mulberry32(o.seed ?? 9);
    this.step = o.step ?? 28;
    this.speed = o.speed ?? 700;
    this.reset();
  }

  reset() {
    const b = this.box;
    this.x = b.x0 + 6;
    this.y = (b.y0 + b.y1) / 2;
    this.path = [[this.x, this.y]];
    this.bumps = 0;
    this.done = false;
    this.running = false;
    this._newLeg();
  }

  _newLeg() {
    const a = this.rnd() * Math.PI * 2;
    this.dx = Math.cos(a);
    this.dy = Math.sin(a);
    this.left = this.step * (0.5 + this.rnd());
  }

  update(dt) {
    if (!this.running || this.done) return;
    const b = this.box;
    let move = this.speed * dt;
    while (move > 0 && !this.done) {
      const m = Math.min(move, this.left);
      this.x += this.dx * m;
      this.y += this.dy * m;
      this.left -= m;
      move -= m;
      if (this.y < b.y0 + 6) { this.y = b.y0 + 6; this.dy = Math.abs(this.dy); }
      if (this.y > b.y1 - 6) { this.y = b.y1 - 6; this.dy = -Math.abs(this.dy); }
      if (this.x < b.x0 + 6) { this.x = b.x0 + 6; this.dx = Math.abs(this.dx); }
      if (this.x >= b.x1 - 6) { this.x = b.x1 - 6; this.done = true; this.running = false; }
      if (this.left <= 0 && !this.done) {
        this.bumps += 1;
        this.path.push([this.x, this.y]);
        if (this.path.length > 400) this.path.shift();
        this._newLeg();
      }
    }
  }
}

/**
 * A thousand walkers released at the left edge, drawn as dots. Their clock runs
 * `fast` times the single walker's. aimed: the what-if where every walker heads
 * for the emptier side (velocity driven by the crowding gradient, no bumps).
 */
export class DotCloud {
  constructor(box, o = {}) {
    this.box = box;
    this.n = o.n ?? 1000;
    this.rnd = mulberry32(o.seed ?? 5);
    this.step = o.step ?? 28;
    this.speed = o.speed ?? 700;
    this.fast = o.fast ?? 4;
    this.aimed = !!o.aimed;
    this.reset();
  }

  reset() {
    const b = this.box;
    this.d = [];
    for (let i = 0; i < this.n; i++) {
      this.d.push({ x: b.x0 + 4 + this.rnd() * 30, y: b.y0 + 4 + this.rnd() * (b.y1 - b.y0 - 8), vx: 0 });
    }
    this.t = 0;
    this.evenAt = -1;
    this.running = false;
    this.home = null;
  }

  halves() {
    const mid = (this.box.x0 + this.box.x1) / 2;
    let l = 0;
    for (const p of this.d) if (p.x < mid) l += 1;
    return [l, this.n - l];
  }

  /** Crowding in 20 bins across the box. */
  bins(k = 20) {
    const b = this.box;
    const out = new Array(k).fill(0);
    for (const p of this.d) out[Math.max(0, Math.min(k - 1, Math.floor(((p.x - b.x0) / (b.x1 - b.x0)) * k)))] += 1;
    return out;
  }

  update(dt) {
    if (!this.running) return;
    const b = this.box;
    const T = dt * this.fast;
    this.t += T;
    if (this.aimed) {
      // Every walker heads straight for its even share of the box, with nothing to
      // slow it: the ink travels as a front, overshoots, and sloshes for ever.
      if (!this.home) {
        const order = this.d.map((p, i) => i).sort(() => this.rnd() - 0.5);
        this.home = new Array(this.n);
        order.forEach((idx, rank) => { this.home[idx] = b.x0 + 3 + ((rank + 0.5) / this.n) * (b.x1 - b.x0 - 6); });
        this.omega = this.d.map(() => 1.1 * (0.94 + this.rnd() * 0.12));
      }
      this.d.forEach((p, i) => {
        const w2 = this.omega[i] * this.omega[i];
        p.vx += -w2 * (p.x - this.home[i]) * T;
        p.x += p.vx * T;
        if (p.x < b.x0 + 3) { p.x = b.x0 + 3; p.vx = Math.abs(p.vx); }
        if (p.x > b.x1 - 3) { p.x = b.x1 - 3; p.vx = -Math.abs(p.vx); }
      });
    } else {
      // Each dot does the same kind of walk as the tagged one: a step each (step / speed) s.
      const legs = (this.speed * T) / this.step;
      const whole = Math.floor(legs) + (this.rnd() < legs % 1 ? 1 : 0);
      for (const p of this.d) {
        for (let s = 0; s < whole; s++) {
          const a = this.rnd() * Math.PI * 2;
          p.x += Math.cos(a) * this.step;
          p.y += Math.sin(a) * this.step;
          if (p.x < b.x0 + 3) p.x = 2 * (b.x0 + 3) - p.x;
          if (p.x > b.x1 - 3) p.x = 2 * (b.x1 - 3) - p.x;
          if (p.y < b.y0 + 3) p.y = 2 * (b.y0 + 3) - p.y;
          if (p.y > b.y1 - 3) p.y = 2 * (b.y1 - 3) - p.y;
        }
      }
    }
    const [l, r] = this.halves();
    if (this.evenAt < 0 && Math.abs(l - r) <= this.n * 0.04) this.evenAt = this.t;
  }

  draw(ctx, c, col) {
    ctx.fillStyle = col;
    for (const p of this.d) ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  }
}

/** A crowd of jiggling neighbours for the background (decoration only). */
export function drawNeighbours(ctx, c, box, t, n = 120, r = 5) {
  const rnd = mulberry32(77);
  ctx.fillStyle = alpha(c.s7, 0.35);
  for (let i = 0; i < n; i++) {
    const x = box.x0 + 6 + rnd() * (box.x1 - box.x0 - 12), y = box.y0 + 6 + rnd() * (box.y1 - box.y0 - 12);
    const ph = rnd() * 6;
    ctx.beginPath();
    ctx.arc(x + Math.sin(t * 7 + ph) * 2, y + Math.cos(t * 6 + ph) * 2, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// -- Osmosis: two chambers and a sieve (Book III.5 L04) ------------------------------------------

/**
 * Two chambers split by a wall with holes. Water units hop through at a rate set by
 * how crowded the water is at the holes on each side (its share of the chamber),
 * plus a little push from the taller column; salt hops only through big holes.
 * The water level of a side is its total volume (water + salt, salt with its shell).
 */
export class Osmosis {
  constructor(o = {}) {
    this.rnd = mulberry32(o.seed ?? 13);
    this.set(o.saltL ?? 0, o.saltR ?? 0, o.big ?? false);
  }

  set(saltL, saltR, big) {
    this.W = [60, 60];
    this.S = [saltL, saltR];
    this.big = big;
    this.hops = [];
    this.running = false;
    this.t = 0;
  }

  vol(i) { return this.W[i] + 1.6 * this.S[i]; }
  waterShare(i) { return this.W[i] / this.vol(i); }

  step(dt) {
    this.t += dt;
    for (const h of this.hops) h.u += dt / 0.6;
    this.hops = this.hops.filter((h) => h.u < 1);
    if (!this.running) return;
    const lvl = [this.vol(0), this.vol(1)];
    const push = 0.006 * (lvl[0] - lvl[1]);
    const rLR = 7 * this.waterShare(0) * (1 + push), rRL = 7 * this.waterShare(1) * (1 - push);
    const hop = (from, kind) => {
      if (kind === 'water' ? this.W[from] < 2 : this.S[from] < 1) return;
      if (kind === 'water') { this.W[from] -= 1; this.W[1 - from] += 1; } else { this.S[from] -= 1; this.S[1 - from] += 1; }
      this.hops.push({ from, kind, u: 0, y: this.rnd() });
    };
    if (this.rnd() < rLR * dt) hop(0, 'water');
    if (this.rnd() < rRL * dt) hop(1, 'water');
    if (this.big) {
      const c = [this.S[0] / this.vol(0), this.S[1] / this.vol(1)];
      if (this.rnd() < 14 * c[0] * dt) hop(0, 'salt');
      if (this.rnd() < 14 * c[1] * dt) hop(1, 'salt');
    }
  }
}

/** Draw the two-chamber tank: levels, particles scattered in the water, the sieve, hops. */
export function drawTank(ctx, c, osm, x0, y0, w, h, t) {
  const half = w / 2;
  const scale = (h - 20) / 190;          // volume units to px of height
  rr(ctx, x0 - 6, y0 - 6, w + 12, h + 12, 12);
  ctx.fillStyle = alpha(c.bgSurface, 0.85);
  ctx.fill();
  const rnd = mulberry32(21);
  for (let i = 0; i < 2; i++) {
    const cx = x0 + i * half;
    const lvl = osm.vol(i) * scale;
    const top = y0 + h - lvl;
    ctx.fillStyle = alpha(c.water, 0.28);
    ctx.fillRect(cx + 4, top, half - 8, lvl);
    ctx.strokeStyle = c.water;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 4, top);
    ctx.lineTo(cx + half - 4, top);
    ctx.stroke();
    const nW = Math.round(osm.W[i] / 2);
    for (let k = 0; k < nW; k++) {
      const px = cx + 10 + rnd() * (half - 20), py = top + 6 + rnd() * Math.max(1, lvl - 12);
      ctx.beginPath();
      ctx.arc(px + Math.sin(t * 3 + k) * 2, py + Math.cos(t * 2.6 + k) * 2, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = c.s7;
      ctx.fill();
    }
    for (let k = 0; k < osm.S[i]; k++) {
      const px = cx + 14 + rnd() * (half - 28), py = top + 10 + rnd() * Math.max(1, lvl - 20);
      const jx = px + Math.sin(t * 1.5 + k * 2) * 3, jy = py + Math.cos(t * 1.3 + k) * 3;
      ctx.beginPath();
      ctx.arc(jx, jy, 10, 0, Math.PI * 2);
      ctx.strokeStyle = alpha(c.s7, 0.8);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(jx, jy, 6, 0, Math.PI * 2);
      ctx.fillStyle = c.s2;
      ctx.fill();
    }
  }
  // The sieve: a wall with holes.
  const mx = x0 + half;
  ctx.strokeStyle = c.labelMuted;
  ctx.lineWidth = 6;
  ctx.setLineDash(osm.big ? [10, 18] : [14, 6]);
  ctx.beginPath();
  ctx.moveTo(mx, y0);
  ctx.lineTo(mx, y0 + h);
  ctx.stroke();
  ctx.setLineDash([]);
  // Hops through the holes.
  for (const hop of osm.hops) {
    const dir = hop.from === 0 ? 1 : -1;
    const px = mx - dir * 24 + dir * 48 * hop.u;
    const py = y0 + h - 30 - hop.y * 80;
    ctx.beginPath();
    ctx.arc(px, py, hop.kind === 'water' ? 4 : 7, 0, Math.PI * 2);
    ctx.fillStyle = hop.kind === 'water' ? c.s7 : c.s2;
    ctx.fill();
  }
  ctx.strokeStyle = c.glass;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 4);
  ctx.lineTo(x0, y0 + h);
  ctx.lineTo(x0 + w, y0 + h);
  ctx.lineTo(x0 + w, y0 - 4);
  ctx.stroke();
}

/**
 * The pickle bench: a fruit whose water moves toward whichever side has the lower
 * water share. inside: solute units in the fruit; bath: the bath's water share.
 */
export class Fruit {
  constructor(o) {
    this.kind = o.kind;
    this.S = o.solute;
    this.W = o.water;
    this.W0 = o.water;
    this.bath = o.bath;
    this.burstAt = o.burstAt ?? 1.15;
    this.burst = false;
  }

  share() { return this.W / (this.W + this.S); }
  /** Size against a plump, fresh fruit of the same kind (100 units). */
  size() { return (this.W + this.S) / 100; }

  step(dt) {
    if (this.burst) return;
    const dW = 2.5 * (this.bath - this.share()) * (this.W + this.S) * dt;
    this.W = Math.max(2, this.W + dW);
    if (this.size() > this.burstAt) this.burst = true;
  }
}

/** Fruit as a character: a cucumber, raisin or grape, scaled by its water. */
export function drawFruit(ctx, c, f, x, y, t) {
  const k = Math.min(1.5, f.size());
  const col = f.kind === 'cucumber' ? c.mold : f.kind === 'raisin' ? darken(c.s5, 0.35) : c.s5;
  const rx = (f.kind === 'cucumber' ? 60 : 30) * Math.sqrt(k), ry = (f.kind === 'cucumber' ? 24 : 26) * Math.sqrt(k);
  const wob = Math.max(0, 0.9 - k) * 0.25;
  ellipse(ctx, x, y + 4, rx, ry);
  ctx.fillStyle = darken(col, 0.35);
  ctx.fill();
  blob(ctx, x, y, rx, ry, 10, wob, 1.7);
  ctx.fillStyle = col;
  ctx.fill();
  ellipse(ctx, x - rx * 0.35, y - ry * 0.4, rx * 0.3, ry * 0.18, -0.4);
  ctx.fillStyle = lighten(col, 0.5);
  ctx.fill();
  if (f.burst) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * (rx + 12), y + Math.sin(a) * (ry + 12), 4, 0, Math.PI * 2);
      ctx.fillStyle = lighten(col, 0.3);
      ctx.fill();
    }
  }
}

// -- Reactions in the Crowd (Book III.6) ----------------------------------------------------------

export const REACT_TEMPS = { fridge: 5, room: 25, warm: 60, hot: 150 };

/**
 * Red particles fly about; blue ones sit still, as a lump or as powder. A red-blue
 * collision reacts (both become one purple, which floats free) when its closing
 * energy beats the threshold `ea` (times the room jiggle), or always with `every`.
 */
export class ReactionBox {
  constructor(o = {}) {
    this.box = new ParticleBox({ x0: o.x0 ?? 40, y0: o.y0 ?? 100, x1: o.x1 ?? 440, y1: o.y1 ?? 450, stick: 0, temp: o.temp ?? 25, keScale: 9, seed: o.seed ?? 51 });
    this.ea = o.ea ?? 1.6;
    this.every = !!o.every;
    this.times = [];
    this.count = 0;
    this.flashes = [];
    const b = this.box;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    if (o.powder) {
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
        b.p.push({ x: b.x0 + 40 + i * ((b.x1 - b.x0 - 80) / 5), y: b.y0 + 40 + j * ((b.y1 - b.y0 - 80) / 5), vx: 0, vy: 0, r: 7, kind: 2, fixed: true });
      }
    } else b.block(cx, cy, 6, 6, 7, 2, true);
    const reds = o.red ?? 30;
    for (let i = 0; i < reds; i++) {
      let x, y;
      do { x = b.x0 + 12 + b.rnd() * (b.x1 - b.x0 - 24); y = b.y0 + 12 + b.rnd() * (b.y1 - b.y0 - 24); }
      while (b.p.some((q) => (q.x - x) ** 2 + (q.y - y) ** 2 < 400));
      const sp = Math.sqrt(2 * keAt(b.temp) * b.keScale), a = b.rnd() * Math.PI * 2;
      b.p.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 7, kind: 1 });
    }
    b.onPair = (p, q, relKE) => this._meet(p, q, relKE);
  }

  _meet(p, q, relKE) {
    const pair = (p.kind === 1 && q.kind === 2) ? [p, q] : (q.kind === 1 && p.kind === 2) ? [q, p] : null;
    if (!pair) return;
    const [red, blue] = pair;
    const need = this.ea * KE_ROOM * this.box.keScale;
    const ok = this.every || relKE >= need;
    this.flashes.push({ x: (red.x + blue.x) / 2, y: (red.y + blue.y) / 2, t: this.box.clock, ok });
    if (this.flashes.length > 30) this.flashes.shift();
    if (!ok) return;
    red.gone = true;
    blue.kind = 3;
    blue.fixed = false;
    blue.vx = red.vx * 0.5;
    blue.vy = red.vy * 0.5;
    this.count += 1;
    this.times.push(this.box.clock);
  }

  rate(win = 3) {
    const t = this.box.clock;
    this.times = this.times.filter((x) => t - x < win);
    return this.times.length / Math.min(win, Math.max(0.5, t));
  }

  step(dt) { this.box.step(dt); }
}

/** Flash rings where red met blue: a burst for a reaction, a small grey ring for a bounce. */
export function drawFlashes(ctx, c, rx) {
  const now = rx.box.clock;
  for (const f of rx.flashes) {
    const a = 1 - (now - f.t) / 0.5;
    if (a <= 0) continue;
    ctx.beginPath();
    ctx.arc(f.x, f.y, (f.ok ? 20 : 12) * (1.3 - a), 0, Math.PI * 2);
    ctx.strokeStyle = alpha(f.ok ? c.warning : c.labelMuted, a);
    ctx.lineWidth = f.ok ? 4 : 2;
    ctx.stroke();
  }
}
