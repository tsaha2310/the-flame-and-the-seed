/**
 * HillKit - the Hill model's shared drawing and physics (Book I onward): a
 * side-view landscape, marbles that roll on it with energy kept honest, energy
 * bars, force arrows, and the reaction Hill with a hump. Not a scene: no class
 * extends a simulation here. Re-exports StoryKit so scenes import one module.
 *
 * Units on the track: PXM pixels per metre, g = 9.8 m/s^2. A marble's speed comes
 * from its energy, never from integration alone, so it can never climb above the
 * height it started from (minus whatever rubbing turned into warmth).
 */
import {
  W, H, alpha, mix, darken, lighten, font, rr, ellipse, sparkle, pill, mulberry32,
} from './StoryKit.js';

export * from './StoryKit.js';

export const PXM = 60;              // pixels per metre on the track
export const G = 9.8 * PXM;         // gravity in px/s^2
export const GROUND = 470;          // y of height zero
export const MARBLE_KG = 0.02;      // a 20 g marble, for the joule readouts

export function metres(y) {
  return (GROUND - y) / PXM;
}

// -- Backdrop ----------------------------------------------------------------------------

/** Deep sky, two soft distant ridges and a few slow twinkles: the Hill's own world. */
export function drawHillBackdrop(ctx, c, t = 0) {
  ctx.fillStyle = c.bgDeep;
  ctx.fillRect(0, 0, W, H);
  const ridge = (base, amp, k, ph, col) => {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, base - amp * Math.sin(x * k + ph) - amp * 0.4 * Math.sin(x * k * 2.3 + ph));
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
  };
  ridge(300, 40, 0.009, 0.6, alpha(c.s5, 0.07));
  ridge(360, 30, 0.014, 2.1, alpha(c.s1, 0.06));
  for (let i = 0; i < 14; i++) {
    const x = (i * 97 + 31) % W, y = 24 + ((i * 53) % 200);
    const k = 0.5 + 0.5 * Math.sin(t * 1.3 + i * 1.7);
    sparkle(ctx, x, y, 2 + 2 * k, alpha(c.labelMuted, 0.18 + 0.2 * k));
  }
}

// -- Track -------------------------------------------------------------------------------

/**
 * A landscape through evenly spaced handles, as a function y(x). Monotone cubic
 * (Fritsch-Carlson), so the curve never bulges above or below its handles: a
 * handle's height is the real height of that point.
 */
export class Track {
  constructor(x0, x1, ys) {
    this.x0 = x0;
    this.x1 = x1;
    this.set(ys);
  }

  set(ys) {
    this.ys = ys.slice();
    const n = ys.length;
    this.dx = (this.x1 - this.x0) / (n - 1);
    const d = [];
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / this.dx);
    const m = new Array(n).fill(0);
    m[0] = d[0];
    m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i];
      const s = a * a + b * b;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        m[i] = tau * a * d[i];
        m[i + 1] = tau * b * d[i];
      }
    }
    this.m = m;
    // Dense lookup, one sample per pixel.
    this.samp = [];
    for (let x = this.x0; x <= this.x1; x++) this.samp.push(this._eval(x));
  }

  _eval(x) {
    const n = this.ys.length;
    const u = Math.max(0, Math.min(n - 1 - 1e-9, (x - this.x0) / this.dx));
    const i = Math.floor(u), t = u - i;
    const h00 = 2 * t * t * t - 3 * t * t + 1, h10 = t * t * t - 2 * t * t + t;
    const h01 = -2 * t * t * t + 3 * t * t, h11 = t * t * t - t * t;
    return h00 * this.ys[i] + h10 * this.dx * this.m[i] + h01 * this.ys[i + 1] + h11 * this.dx * this.m[i + 1];
  }

  y(x) {
    const u = Math.max(0, Math.min(this.samp.length - 1.001, x - this.x0));
    const i = Math.floor(u), f = u - i;
    return this.samp[i] * (1 - f) + this.samp[i + 1] * f;
  }

  slope(x) {
    return (this.y(x + 0.5) - this.y(x - 0.5));
  }

  handleX(i) { return this.x0 + i * this.dx; }

  /** Lowest point strictly inside the track (x, y). */
  lowest() {
    let best = 0;
    for (let i = 1; i < this.samp.length; i++) if (this.samp[i] > this.samp[best]) best = i;
    return { x: this.x0 + best, y: this.samp[best] };
  }

  path(ctx) {
    ctx.beginPath();
    ctx.moveTo(this.x0, this.samp[0]);
    for (let i = 2; i < this.samp.length; i += 2) ctx.lineTo(this.x0 + i, this.samp[i]);
    ctx.lineTo(this.x1, this.samp[this.samp.length - 1]);
  }

  /** Earth body with strata, a thick bright rim and one highlight line. o: { col, warm: [0..1 per px] } */
  draw(ctx, c, o = {}) {
    const col = o.col ?? c.s3;
    const body = mix(c.bgSurface, col, 0.28);
    this.path(ctx);
    ctx.lineTo(this.x1, H);
    ctx.lineTo(this.x0, H);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (const off of [30, 64, 104]) {
      ctx.save();
      ctx.translate(0, off);
      this.path(ctx);
      ctx.strokeStyle = alpha(darken(body, 0.3), 0.7);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.save();
    ctx.translate(0, 4);
    this.path(ctx);
    ctx.strokeStyle = darken(col, 0.4);
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();
    this.path(ctx);
    ctx.strokeStyle = col;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.save();
    ctx.translate(0, -2);
    this.path(ctx);
    ctx.strokeStyle = alpha(lighten(col, 0.5), 0.55);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    if (o.warm) this._drawWarm(ctx, c, o.warm);
  }

  /** Thin red trail where rubbing turned motion into warmth (warm: array, one cell per 4 px). */
  _drawWarm(ctx, c, warm) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < warm.length; i++) {
      const k = Math.min(1, warm[i]);
      if (k < 0.02) continue;
      const x = this.x0 + i * 4;
      ctx.beginPath();
      ctx.moveTo(x, this.y(x));
      ctx.lineTo(x + 4, this.y(x + 4));
      ctx.strokeStyle = alpha(c.bad, 0.35 + 0.65 * k);
      ctx.lineWidth = 3 + 4 * k;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// -- A marble on a track -----------------------------------------------------------------

/**
 * One marble, rolling (sliding, strictly: no spin energy) on a Track. `rub` is the
 * rubbing coefficient; rubbing turns motion into `heat` (px-units of g*height) and
 * marks the track's warm trail. Energy is projected every substep, so the marble
 * can never climb above (start height - heat).
 */
export class Marble {
  constructor(track, x, r = 16) {
    this.track = track;
    this.r = r;
    this.place(x);
  }

  /** Start at x already moving at speed v (px/s, signed): a collision's energy. */
  launch(x, v) {
    this.place(x);
    this.v = v;
    this.e0 += 0.5 * v * v;
    this.moving = true;
  }

  place(x) {
    this.x = x;
    this.v = 0;
    this.spin = 0;
    this.heat = 0;
    this.e0 = G * (GROUND - this.track.y(x));   // per unit mass, px^2/s^2
    this.peakAfterDip = -1;
    this.dipped = false;
    this.rest = false;
    this.firstStop = null;
    this.moving = false;
    this.trail = [];
  }

  height() { return GROUND - this.track.y(this.x); }
  speed() { return Math.abs(this.v); }
  pe() { return G * this.height(); }
  ke() { return 0.5 * this.v * this.v; }

  /** Advance by dt. rub: 0 none .. 0.2 high. warm: optional array (one cell per 4 px) to mark. */
  step(dt, rub = 0, warm = null) {
    if (!this.moving || this.rest) return;
    const tr = this.track;
    const n = 12;
    const h = dt / n;
    for (let k = 0; k < n; k++) {
      const m = tr.slope(this.x);
      const cs = 1 / Math.sqrt(1 + m * m);
      // y grows downward, so a positive slope is downhill going right.
      let a = G * m * cs;
      if (rub > 0 && Math.abs(this.v) > 1e-3) a -= Math.sign(this.v) * rub * G * cs;
      const vOld = this.v;
      this.v += a * h;
      if (rub > 0 && vOld !== 0 && Math.sign(this.v) !== Math.sign(vOld) && Math.abs(G * m * cs) <= rub * G * cs) this.v = 0;
      const ds = this.v * h;
      const dxx = ds * cs;
      this.x += dxx;
      if (rub > 0) {
        const lost = rub * G * cs * Math.abs(ds);
        this.heat += lost;
        if (warm) {
          const cell = Math.floor((this.x - tr.x0) / 4);
          if (cell >= 0 && cell < warm.length) warm[cell] += lost / 280;
        }
      }
      // Ends of the track are posts: bounce.
      if (this.x < tr.x0 + this.r) { this.x = tr.x0 + this.r; this.v = Math.abs(this.v); }
      if (this.x > tr.x1 - this.r) { this.x = tr.x1 - this.r; this.v = -Math.abs(this.v); }
      // Keep energy honest.
      const ke = this.e0 - this.heat - G * this.height();
      if (ke <= 0) {
        this.v = 0;
        this.x += Math.sign(m) * 0.02;               // nudge downhill so a turning point never sticks
      } else {
        const sp = Math.sqrt(2 * ke);
        this.v = (this.v === 0 ? Math.sign(m) || 1 : Math.sign(this.v)) * sp;
      }
      if (this.firstStop == null && this.dipped && vOld !== 0 && Math.abs(vOld) < 80 && (this.v === 0 || Math.sign(this.v) !== Math.sign(vOld))) {
        this.firstStop = { x: this.x, y: tr.y(this.x) };
      }
      this.spin += (ds / this.r);
      const hNow = this.height();
      if (!this.dipped && this.e0 / G - hNow > 40) this.dipped = true;
      if (this.dipped) this.peakAfterDip = Math.max(this.peakAfterDip, hNow);
    }
    if (rub > 0 && Math.abs(this.v) < 6 && Math.abs(tr.slope(this.x)) < rub * 1.2) {
      const ke = this.e0 - this.heat - G * this.height();
      if (ke < 400) { this.rest = true; this.v = 0; this.heat = this.e0 - G * this.height(); }
    }
    this.trail.push({ x: this.x, y: tr.y(this.x) });
    if (this.trail.length > 18) this.trail.shift();
  }
}

/** Joules for a 20 g marble from a px-unit energy per unit mass. */
export function joules(ePx) {
  return (MARBLE_KG * ePx) / (PXM * PXM);
}

// -- Characters and marks -----------------------------------------------------------------

/**
 * Glossy marble: ground shadow, cushion, body, a rolling stripe, highlight.
 * o: { face, spin, shadowY, alpha, glow }
 */
export function drawMarble(ctx, c, x, y, r, col, o = {}) {
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.glow) {
    ctx.beginPath();
    ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
    ctx.fillStyle = alpha(o.glow, 0.22);
    ctx.fill();
  }
  if (o.shadowY != null) {
    ellipse(ctx, x, o.shadowY + 2, r * 0.9, r * 0.25);
    ctx.fillStyle = alpha(c.bgDeep, 0.35);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y + r * 0.12, r, 0, Math.PI * 2);
  ctx.fillStyle = darken(col, 0.35);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = col;
  ctx.fill();
  if (r >= 7) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    const sp = o.spin ?? 0;
    ctx.strokeStyle = alpha(lighten(col, 0.45), 0.8);
    ctx.lineWidth = r * 0.28;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(sp) * r * 1.2, y + Math.sin(sp) * r * 1.2);
    ctx.lineTo(x - Math.cos(sp) * r * 1.2, y - Math.sin(sp) * r * 1.2);
    ctx.stroke();
    ctx.restore();
    ellipse(ctx, x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.19, -0.5);
    ctx.fillStyle = lighten(col, 0.7);
    ctx.fill();
  }
  if (o.face && r >= 12) {
    for (const s of [-1, 1]) {
      ellipse(ctx, x + s * r * 0.32, y + r * 0.02, r * 0.13, r * 0.17);
      ctx.fillStyle = darken(col, 0.8);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y + r * 0.26, r * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = darken(col, 0.75);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.restore();
}

/** Bold arrow with a flat head. */
export function arrow(ctx, x1, y1, x2, y2, col, w = 5) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 2) return;
  const hl = Math.min(len * 0.5, w * 3.2);
  ctx.save();
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - Math.cos(a) * hl * 0.8, y2 - Math.sin(a) * hl * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(a - 0.5) * hl, y2 - Math.sin(a - 0.5) * hl);
  ctx.lineTo(x2 - Math.cos(a + 0.5) * hl, y2 - Math.sin(a + 0.5) * hl);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Dashed horizontal level line (e.g. the start height ceiling). */
export function levelLine(ctx, c, x0, x1, y, col, a = 1) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.strokeStyle = col;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/** Planted flag (the learner's prediction). */
export function drawFlag(ctx, c, x, y, col, t = 0) {
  ctx.save();
  ctx.strokeStyle = c.label;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 40);
  ctx.stroke();
  const wv = Math.sin(t * 4) * 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 40);
  ctx.quadraticCurveTo(x + 12, y - 44 + wv, x + 24, y - 36);
  ctx.lineTo(x + 24 + wv * 0.3, y - 24);
  ctx.quadraticCurveTo(x + 12, y - 30 - wv, x, y - 26);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.restore();
}

/** Small thermometer icon; k 0..1 fills the bulb column. */
export function drawThermo(ctx, c, x, y, k, col) {
  ctx.save();
  rr(ctx, x - 5, y - 30, 10, 34, 5);
  ctx.fillStyle = c.raised;
  ctx.fill();
  ctx.strokeStyle = c.stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y + 8, 8, 0, Math.PI * 2);
  ctx.fillStyle = col;
  ctx.fill();
  const hh = 4 + 24 * Math.max(0, Math.min(1, k));
  ctx.fillStyle = col;
  ctx.fillRect(x - 2.5, y + 2 - hh, 5, hh);
  ctx.restore();
}

/**
 * Energy bars card: rows [{ label, value, col }], full = value that fills a bar.
 * Numbers drawn right-aligned inside the card; the unit follows the number.
 */
export function drawEnergyBars(ctx, c, x, y, w, rows, full, o = {}) {
  const rowH = 34;
  const h = 18 + rows.length * rowH + (o.title ? 22 : 0);
  if (o.alpha != null) { ctx.save(); ctx.globalAlpha *= o.alpha; }
  rr(ctx, x, y + 4, w, h, 11);
  ctx.fillStyle = darken(c.bgSurface, 0.3);
  ctx.fill();
  rr(ctx, x, y, w, h, 11);
  ctx.fillStyle = c.bgSurface;
  ctx.fill();
  ctx.strokeStyle = alpha(c.stroke, 0.8);
  ctx.lineWidth = 2;
  ctx.stroke();
  let yy = y + 12;
  if (o.title) {
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(o.title, x + 12, yy + 6);
    yy += 22;
  }
  const lw = o.labelW ?? 78;
  const bw = w - lw - 70;
  rows.forEach((r, i) => {
    const ry = yy + i * rowH;
    ctx.fillStyle = c.label;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(r.label, x + 12, ry + 11);
    rr(ctx, x + lw, ry + 2, bw, 18, 9);
    ctx.fillStyle = c.raised;
    ctx.fill();
    const k = Math.max(0, Math.min(1, r.value / full));
    if (k > 0.01) {
      rr(ctx, x + lw, ry + 2, Math.max(18, bw * k), 18, 9);
      ctx.fillStyle = r.col;
      ctx.fill();
    }
    ctx.fillStyle = c.label;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'right';
    ctx.fillText(r.text ?? '', x + w - 10, ry + 11);
  });
  if (o.alpha != null) ctx.restore();
  return { x, y, w, h };
}

/** A post at a track end. */
export function drawPost(ctx, c, x, yTop) {
  rr(ctx, x - 5, yTop - 30, 10, 34, 4);
  ctx.fillStyle = darken(c.wood, 0.2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, yTop - 30, 6, 0, Math.PI * 2);
  ctx.fillStyle = c.wood;
  ctx.fill();
}

/** Handle knob for a draggable track point. */
export function drawHandle(ctx, c, x, y, hot, t = 0) {
  const r = hot ? 13 : 10 + Math.sin(t * 4) * 1;
  ctx.beginPath();
  ctx.arc(x, y, r + 4, 0, Math.PI * 2);
  ctx.fillStyle = alpha(c.accent, hot ? 0.35 : 0.18);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = c.accent;
  ctx.fill();
  ctx.strokeStyle = c.bgDeep;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 5); ctx.lineTo(x - 4, y - 1); ctx.moveTo(x, y - 5); ctx.lineTo(x + 4, y - 1);
  ctx.moveTo(x, y + 5); ctx.lineTo(x - 4, y + 1); ctx.moveTo(x, y + 5); ctx.lineTo(x + 4, y + 1);
  ctx.stroke();
}

/** Speed/height readout chips beside a marble, kept inside the frame. */
export function marbleReadout(ctx, c, m, o = {}) {
  const x = Math.max(70, Math.min(W - 70, m.x));
  const y = m.track.y(m.x) - m.r - 26;
  const hTxt = `height ${metres(m.track.y(m.x)).toFixed(1)} m`;
  const sTxt = `speed ${(m.speed() / PXM).toFixed(1)} m/s`;
  if (o.height !== false) pill(ctx, c, hTxt, x, Math.max(20, y - 32), { bg: c.s1, size: 14 });
  pill(ctx, c, sTxt, x, Math.max(52, y), { bg: c.s2, size: 14 });
}

// -- Two marbles on a string over a pulley (Book I, L01-02-02) ----------------------------

export const RIG = {
  PULLEY: { x: 340, y: 78, r: 20 },
  HEAVY_KG: 0.04,
  LIGHT_KG: 0.02,
  HEAVY_STARTS: { high: 300, middle: 262, low: 234 },
  HUMPS: { none: 0, low: 40, medium: 70, high: 100 },
};

/**
 * A heavy marble on the left track and a light one on the right, joined by a thread
 * over a pulley: one degree of freedom, s (px the thread has run). The heavy one
 * moves left and down, the light one left and up. Energy is kept honest the same
 * way as Marble. `free` > 1 is the what-if "free climbing": the light marble's
 * height costs only 1/free of its worth.
 */
export class StringRig {
  constructor() {
    const ys = [300, 318, 330, 325, 300, 255, 205, 160];
    this.heavyTrack = new Track(40, 320, ys);
    this.lightTrack = new Track(360, 640, this._lightYs(0));
    this.warmH = new Array(71).fill(0);
    this.warmL = new Array(71).fill(0);
    this.start = 'high';
    this.hump = 'none';
    this.rub = 0;
    this.string = true;
    this.free = 1;
    this.reset();
  }

  _lightYs(hump) {
    const ys = [];
    for (let i = 0; i < 15; i++) {
      const x = 360 + i * 20;
      ys.push(450 - (640 - x) * (320 / 280) - hump * Math.exp(-(((x - 540) / 30) ** 2)));
    }
    return ys;
  }

  setHump(key) {
    this.hump = key;
    this.lightTrack.set(this._lightYs(RIG.HUMPS[key] ?? 0));
    this.reset();
  }

  reset() {
    this.s = 0;
    this.v = 0;
    this.heat = 0;
    this.moving = false;
    this.done = false;
    this.maxClimb = 0;
    this.xH0 = RIG.HEAVY_STARTS[this.start] ?? 300;
    this.xL0 = 620;
    this.solo = new Marble(this.heavyTrack, this.xH0, 20);
    this.warmH.fill(0);
    this.warmL.fill(0);
    this.u0 = this._U(0);
    this.uMin = this.u0;
    for (let q = 0; q <= this.xL0 - 380; q += 4) this.uMin = Math.min(this.uMin, this._U(q));
    this.turnAge = -1;
    this.turnJ = null;
    this.blocked = false;
    this.tRun = 0;
  }

  run() { this.reset(); this.moving = true; }

  xH() { return this.string ? this.xH0 - this.s : this.solo.x; }
  xL() { return this.string ? this.xL0 - this.s : this.xL0; }
  zH(x = this.xH()) { return GROUND - this.heavyTrack.y(x); }
  zL(x = this.xL()) { return GROUND - this.lightTrack.y(x); }
  fall() { return this.zH(this.xH0) - this.zH(); }        // px the heavy one has dropped
  climb() { return this.zL() - this.zL(this.xL0); }        // px the light one has risen

  _U(s) {
    const xh = this.xH0 - s, xl = this.xL0 - s;
    return G * (RIG.HEAVY_KG * this.zH(xh) + (RIG.LIGHT_KG / this.free) * this.zL(xl));
  }

  /** Energies in joules: fall worth, climb worth (true, at full weight), speed, warmth. */
  joulesNow() {
    const k = 1 / (PXM * PXM);
    const fallJ = RIG.HEAVY_KG * G * this.fall() * k;
    const climbJ = RIG.LIGHT_KG * G * this.climb() * k;
    const heatJ = this.heat * k;
    let speedJ;
    if (this.string) {
      const mh = this.heavyTrack.slope(this.xH()), ml = this.lightTrack.slope(this.xL());
      speedJ = 0.5 * (RIG.HEAVY_KG * (1 + mh * mh) + RIG.LIGHT_KG * (1 + ml * ml)) * this.v * this.v * k;
    } else speedJ = RIG.HEAVY_KG * this.solo.ke() * k;
    return { fallJ, climbJ, heatJ, speedJ };
  }

  /** The whole rig's account in joules: stored height (above its lowest pose), speed, warmth. */
  account() {
    const k = 1 / (PXM * PXM);
    const { speedJ, heatJ } = this.joulesNow();
    return { heightJ: (this._U(this.s) - this.uMin) * k, speedJ, heatJ, totalJ: (this.u0 - this.uMin) * k };
  }

  step(dt) {
    if (!this.moving) return;
    this.tRun += dt;
    if (!this.string) {
      this.solo.moving = true;
      this.solo.step(dt, this.rub, this.warmH);
      this.heat = this.solo.heat * RIG.HEAVY_KG;
      return;
    }
    const n = 12, h = dt / n;
    for (let k = 0; k < n; k++) {
      const mh = this.heavyTrack.slope(this.xH()), ml = this.lightTrack.slope(this.xL());
      const meff = RIG.HEAVY_KG * (1 + mh * mh) + RIG.LIGHT_KG * (1 + ml * ml);
      const dU = (this._U(this.s + 0.5) - this._U(this.s - 0.5));
      let a = -dU / meff;
      const fr = this.rub * G * (RIG.HEAVY_KG + RIG.LIGHT_KG);
      if (this.rub > 0 && Math.abs(this.v) > 1e-3) a -= Math.sign(this.v) * fr / meff;
      const vOld = this.v;
      this.v += a * h;
      if (this.rub > 0 && vOld !== 0 && Math.sign(this.v) !== Math.sign(vOld) && Math.abs(dU) <= fr) this.v = 0;
      const ds = this.v * h;
      this.s += ds;
      if (this.rub > 0) {
        const lost = fr * Math.abs(ds);
        this.heat += lost;
        const ch = Math.floor((this.xH() - 40) / 4), cl = Math.floor((this.xL() - 360) / 4);
        if (ch >= 0 && ch < 71) this.warmH[ch] += lost / (G * 0.012);
        if (cl >= 0 && cl < 71) this.warmL[cl] += lost / (G * 0.012);
      }
      const sMax = this.xL0 - 380;
      if (this.s < 0) { this.s = 0; this.v = 0; }
      if (this.s > sMax) { this.s = sMax; this.v = -Math.abs(this.v); }
      const ke = this.u0 - this.heat - this._U(this.s);
      if (ke <= 0) {
        this.v = 0;
      } else {
        const sp = Math.sqrt((2 * ke) / meff);
        this.v = (this.v === 0 ? -Math.sign(dU) || 1 : Math.sign(this.v)) * sp;
      }
      if (vOld > 0 && this.v <= 0 && this.turnAge < 0) {
        this.turnAge = 0;
        this.turnJ = this.joulesNow();            // the account at the top of the climb
      }
      this.maxClimb = Math.max(this.maxClimb, this.climb());
    }
    // Blocked: turned back before the hump top.
    if (this.turnAge >= 0) this.turnAge += dt;
    if (this.turnAge >= 0 && RIG.HUMPS[this.hump] > 0 && this.xL() > 540) this.blocked = true;
    if (this.rub > 0 && this.tRun > 0.6 && Math.abs(this.v) < 3) {
      const ke = this.u0 - this.heat - this._U(this.s);
      if (ke < 2e2 * RIG.LIGHT_KG) { this.v = 0; this.done = true; this.moving = false; }
    }
  }

  /** Pulley, thread, both tracks and both marbles. */
  draw(ctx, c, t, o = {}) {
    const P = RIG.PULLEY;
    // Post
    rr(ctx, P.x - 7, P.y, 14, GROUND - P.y + 30, 5);
    ctx.fillStyle = darken(c.wood, 0.3);
    ctx.fill();
    this.heavyTrack.draw(ctx, c, { warm: this.rub > 0 ? this.warmH : null });
    this.lightTrack.draw(ctx, c, { warm: this.rub > 0 ? this.warmL : null, col: c.s3 });
    const xh = this.xH(), xl = this.xL();
    const yh = this.heavyTrack.y(xh) - 20, yl = this.lightTrack.y(xl) - 13;
    if (this.string) {
      ctx.save();
      ctx.strokeStyle = o.threadCol ?? c.label;
      ctx.lineWidth = o.threadW ?? 2.5;
      ctx.beginPath();
      ctx.moveTo(xh, yh);
      ctx.lineTo(P.x - P.r, P.y);
      ctx.arc(P.x, P.y, P.r, Math.PI, 0);
      ctx.lineTo(xl, yl);
      ctx.stroke();
      ctx.restore();
    }
    // Wheel
    ctx.beginPath();
    ctx.arc(P.x, P.y + 3, P.r, 0, Math.PI * 2);
    ctx.fillStyle = darken(c.s5, 0.35);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(P.x, P.y, P.r, 0, Math.PI * 2);
    ctx.fillStyle = c.s5;
    ctx.fill();
    const rot = this.s / P.r;
    ctx.strokeStyle = lighten(c.s5, 0.5);
    ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) {
      const a = rot + (k * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(P.x, P.y);
      ctx.lineTo(P.x + Math.cos(a) * (P.r - 4), P.y + Math.sin(a) * (P.r - 4));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(P.x, P.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = c.bgDeep;
    ctx.fill();
    drawMarble(ctx, c, xh, yh, 20, c.s5, { spin: -this.s / 20, face: true });
    drawMarble(ctx, c, xl, yl, 13, c.s2, { spin: -this.s / 13, face: true });
    return { xh, yh, xl, yl };
  }
}

// -- Charges (L01-02-04) --------------------------------------------------------------------

/** A charge as a ball with a stroked + or - (positive warm red, negative blue). */
export function drawCharge(ctx, c, x, y, r, sign, o = {}) {
  const col = sign > 0 ? c.s6 : c.s1;
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.ring) {
    ctx.beginPath();
    ctx.arc(x, y, r + 7, 0, Math.PI * 2);
    ctx.strokeStyle = o.ring;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y + r * 0.12, r, 0, Math.PI * 2);
  ctx.fillStyle = darken(col, 0.35);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = col;
  ctx.fill();
  if (r >= 8) {
    ellipse(ctx, x - r * 0.35, y - r * 0.42, r * 0.28, r * 0.16, -0.5);
    ctx.fillStyle = lighten(col, 0.6);
    ctx.fill();
  }
  const s = r * 0.46;
  ctx.strokeStyle = c.bgDeep;
  ctx.lineWidth = Math.max(2, r * 0.2);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.lineTo(x + s, y);
  if (sign > 0) { ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); }
  ctx.stroke();
  ctx.restore();
}

/**
 * Charges on a straight board, and the Hill that one of them (the selected one)
 * feels from all the others: U(x) = sum K q_sel q_j / sqrt(d^2 + A^2). Opposites
 * dig a dip, likes raise a bump. A released charge rolls on that landscape with
 * no rubbing and stops when it clicks against another charge or reaches an end.
 */
export const RAIL = { X0: 50, X1: 630, BOARD_Y: 112, HILL_Y: 300, HILL_TOP: 196, HILL_BOT: 468, R: 18, K: 5400, A: 20 };

export class ChargeRail {
  constructor() {
    this.q = [];
    this.sel = -1;
    this.moving = false;
    this.v = 0;
    this.click = null;         // { x, age } where the rolling charge stopped
    this.likeSign = 1;         // -1 in the like-charges-attract what-if
  }

  clear() { this.q = []; this.sel = -1; this.moving = false; this.click = null; }

  /** Adds a charge at the free spot nearest `x`; returns its index or -1. */
  add(sign, x) {
    if (this.q.length >= 6) return -1;
    const spot = this.freeSpot(x);
    if (spot == null) return -1;
    this.q.push({ x: spot, sign });
    this.sel = this.q.length - 1;
    this.moving = false;
    this.click = null;
    return this.sel;
  }

  freeSpot(x) {
    const { X0, X1, R } = RAIL;
    for (let d = 0; d < X1 - X0; d += 6) {
      for (const cand of [x + d, x - d]) {
        if (cand < X0 + R || cand > X1 - R) continue;
        if (this.q.every((o) => Math.abs(o.x - cand) >= 2 * R + 4)) return cand;
      }
    }
    return null;
  }

  /** Energy the selected charge would have at x (px units, up is positive). */
  U(x, i = this.sel) {
    if (i < 0) return 0;
    const me = this.q[i];
    let u = 0;
    this.q.forEach((o, j) => {
      if (j === i) return;
      const same = me.sign === o.sign;
      const qq = same ? this.likeSign : -1;
      // Two balls cannot overlap, so inside touching distance the Hill is flat.
      const d = Math.max(Math.abs(x - o.x), 2 * RAIL.R);
      u += (RAIL.K * qq) / Math.sqrt(d * d + RAIL.A ** 2);
    });
    return u;
  }

  hillY(x) {
    return Math.max(RAIL.HILL_TOP + 8, Math.min(RAIL.HILL_BOT - 8, RAIL.HILL_Y - this.U(x)));
  }

  /** Drag the selected charge to x without passing through a neighbour. */
  dragTo(x) {
    const me = this.q[this.sel];
    if (!me) return;
    const { X0, X1, R } = RAIL;
    let lo = X0 + R, hi = X1 - R;
    this.q.forEach((o, j) => {
      if (j === this.sel) return;
      if (o.x < me.x) lo = Math.max(lo, o.x + 2 * R + 2);
      else hi = Math.min(hi, o.x - 2 * R - 2);
    });
    me.x = Math.max(lo, Math.min(hi, x));
    this.moving = false;
    this.click = null;
  }

  release() {
    if (this.sel < 0) return;
    this.moving = true;
    this.v = 0;
    this.e0 = this.U(this.q[this.sel].x);
    this.click = null;
  }

  step(dt) {
    if (this.click) this.click.age += dt;
    if (!this.moving || this.sel < 0) return;
    const me = this.q[this.sel];
    const { X0, X1, R } = RAIL;
    const k = 1200;                                   // inverse "mass": sets the pace
    for (let n = 0; n < 10; n++) {
      const h = dt / 10;
      const f = -(this.U(me.x + 0.5) - this.U(me.x - 0.5));
      this.v += f * k * h;
      me.x += this.v * h;
      const ke = this.e0 - this.U(me.x);
      if (ke > 0) this.v = Math.sign(this.v || f) * Math.sqrt(2 * k * ke);
      let hit = null;
      this.q.forEach((o, j) => {
        if (j === this.sel) return;
        if (Math.abs(o.x - me.x) < 2 * R) hit = o;
      });
      if (hit) {
        me.x = hit.x + Math.sign(me.x - hit.x) * 2 * R;
        this.stop(me.x);
        return;
      }
      if (me.x < X0 + R || me.x > X1 - R) {
        me.x = Math.max(X0 + R, Math.min(X1 - R, me.x));
        this.stop(me.x);
        return;
      }
    }
  }

  stop(x) {
    this.moving = false;
    this.v = 0;
    this.click = { x, age: 0 };
  }

  /** Board (top) and the selected charge's Hill (bottom). o: { label } */
  draw(ctx, c, t, o = {}) {
    const { X0, X1, BOARD_Y, HILL_TOP, HILL_BOT, R } = RAIL;
    // Board: a wooden rail.
    rr(ctx, X0 - 20, BOARD_Y + R + 2, X1 - X0 + 40, 14, 7);
    ctx.fillStyle = darken(c.wood, 0.45);
    ctx.fill();
    rr(ctx, X0 - 20, BOARD_Y + R - 2, X1 - X0 + 40, 14, 7);
    ctx.fillStyle = darken(c.wood, 0.25);
    ctx.fill();
    // Hill panel.
    rr(ctx, X0 - 20, HILL_TOP, X1 - X0 + 40, HILL_BOT - HILL_TOP, 14);
    ctx.fillStyle = alpha(c.bgSurface, 0.85);
    ctx.fill();
    ctx.strokeStyle = alpha(c.stroke, 0.7);
    ctx.lineWidth = 2;
    ctx.stroke();
    const me = this.q[this.sel];
    // Guides from each other charge down to its spot on the Hill.
    this.q.forEach((q, j) => {
      if (j === this.sel) return;
      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = alpha(q.sign > 0 ? c.s6 : c.s1, 0.55);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(q.x, BOARD_Y + R + 16);
      ctx.lineTo(q.x, HILL_BOT - 6);
      ctx.stroke();
      ctx.restore();
    });
    // The landscape.
    ctx.save();
    rr(ctx, X0 - 20, HILL_TOP, X1 - X0 + 40, HILL_BOT - HILL_TOP, 14);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(X0 - 20, this.hillY(X0 - 20));
    for (let x = X0 - 20; x <= X1 + 20; x += 3) ctx.lineTo(x, this.hillY(x));
    ctx.lineTo(X1 + 20, HILL_BOT);
    ctx.lineTo(X0 - 20, HILL_BOT);
    ctx.closePath();
    ctx.fillStyle = mix(c.bgSurface, c.s3, 0.25);
    ctx.fill();
    ctx.beginPath();
    for (let x = X0 - 20; x <= X1 + 20; x += 3) {
      if (x === X0 - 20) ctx.moveTo(x, this.hillY(x));
      else ctx.lineTo(x, this.hillY(x));
    }
    ctx.strokeStyle = c.s3;
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
    // Charges on the board.
    this.q.forEach((q, j) => {
      const bob = j === this.sel ? 0 : Math.sin(t * 2 + j) * 1.5;
      drawCharge(ctx, c, q.x, BOARD_Y + bob, R, q.sign, { ring: j === this.sel ? c.accent : null });
    });
    // The selected charge riding its Hill.
    if (me) {
      const hy = this.hillY(me.x) - 16;
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = alpha(c.accent, 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(me.x, BOARD_Y + R + 16);
      ctx.lineTo(me.x, hy - 18);
      ctx.stroke();
      ctx.restore();
      drawCharge(ctx, c, me.x, hy, 16, me.sign, {});
    }
  }
}

// -- The reaction Hill: reactants, a hump, products (Book III) ------------------------------

export const PX_PER_K = 0.085;          // model energy (in kelvin-sized units) to px of height

export const TEMPS = {
  fridge: { label: 'fridge 5 \u00b0C', K: 278 },
  room: { label: 'room 25 \u00b0C', K: 298 },
  warm: { label: 'warm 60 \u00b0C', K: 333 },
  flame: { label: 'flame 1000 \u00b0C', K: 1273 },
};

export const HUMPS_K = { zero: 0, low: 600, medium: 1200, high: 2000 };

/** Share of collisions at temperature T (K) with at least energy e (same units): (1 + x) e^-x. */
export function crossFraction(e, T) {
  const x = e / T;
  return (1 + x) * Math.exp(-x);
}

/** n collision energies at temperature T, stratified so a run of 100 matches the share closely. */
export function collisionEnergies(n, T, rnd) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    // Invert the tail share F(e) = (1 + x) e^-x = u by bisection.
    let lo = 0, hi = 40;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      if ((1 + mid) * Math.exp(-mid) > u) lo = mid; else hi = mid;
    }
    out.push(((lo + hi) / 2) * T);
  }
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Reactants' plateau on the left, a hump, products' plateau lower on the right.
 * hump: barrier from the reactant side (model units); drop: how much lower the
 * products sit. The curve is built piecewise from cosine eases so the barrier from
 * the left is exactly `hump` and from the right exactly `hump + drop`.
 */
export class ReactionHill {
  constructor(o = {}) {
    this.x0 = o.x0 ?? 40;
    this.x1 = o.x1 ?? 640;
    this.yR = o.yR ?? 300;
    this.xa = o.xa ?? 210;
    this.xp = o.xp ?? 340;
    this.xb = o.xb ?? 470;
    this.set(o.hump ?? 1200, o.drop ?? 1000);
  }

  set(hump, drop) {
    this.hump = hump;
    this.drop = drop;
    this.hPx = hump * PX_PER_K;
    this.dPx = drop * PX_PER_K;
  }

  y(x) {
    const ease = (u) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, u)));
    const top = this.yR - this.hPx;
    if (x <= this.xa) return this.yR;
    if (x <= this.xp) return this.yR + (top - this.yR) * ease((x - this.xa) / (this.xp - this.xa));
    if (x <= this.xb) return top + (this.yR + this.dPx - top) * ease((x - this.xp) / (this.xb - this.xp));
    return this.yR + this.dPx;
  }

  slope(x) { return this.y(x + 0.5) - this.y(x - 0.5); }

  path(ctx, dy = 0) {
    ctx.beginPath();
    ctx.moveTo(this.x0, this.y(this.x0) + dy);
    for (let x = this.x0 + 3; x <= this.x1; x += 3) ctx.lineTo(x, this.y(x) + dy);
  }

  /** Earth body, rim, and optional dashed ghost of another hump height. o: { col, ghostHump } */
  draw(ctx, c, o = {}) {
    const col = o.col ?? c.s3;
    const body = mix(c.bgSurface, col, 0.28);
    this.path(ctx);
    ctx.lineTo(this.x1, H);
    ctx.lineTo(this.x0, H);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.path(ctx, 4);
    ctx.strokeStyle = darken(col, 0.4);
    ctx.lineWidth = 8;
    ctx.stroke();
    this.path(ctx);
    ctx.strokeStyle = col;
    ctx.lineWidth = 8;
    ctx.stroke();
    if (o.ghostHump != null && Math.abs(o.ghostHump - this.hump) > 1) {
      const keep = this.hump;
      this.set(o.ghostHump, this.drop);
      ctx.save();
      ctx.setLineDash([8, 8]);
      this.path(ctx);
      ctx.strokeStyle = alpha(c.labelMuted, 0.8);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      this.set(keep, this.drop);
    }
  }
}

/** Colour of a collision by how hard it is, cool to hot. */
export function heatCol(c, k) {
  const u = Math.max(0, Math.min(1, k));
  return u < 0.5 ? mix(c.s1, c.s2, u * 2) : mix(c.s2, c.bad, (u - 0.5) * 2);
}

/**
 * A run of collisions as marbles: each starts on one plateau moving toward the
 * hump with a collision energy; hard enough and it crosses, too soft and it rolls
 * back. Counts `crossed` and `back`. dir: +1 reactants to products, -1 the reverse.
 */
export class CrossingRun {
  constructor(hill, seed = 5) {
    this.hill = hill;
    this.rnd = mulberry32(seed);
    this.reset();
  }

  reset() {
    this.queue = [];
    this.live = [];
    this.crossed = 0;
    this.back = 0;
    this.total = 0;
    this.clock = 0;
    this.active = false;
    this.pileL = [];
    this.pileR = [];
  }

  /** Release n collisions at temperature T (K); gap s between launches. */
  start(n, T, dir = 1, gap = 0.045) {
    this.reset();
    this.dir = dir;
    this.T = T;
    this.total = n;
    this.queue = collisionEnergies(n, T, this.rnd).map((e, i) => ({ e, at: i * gap }));
    this.active = true;
  }

  get done() { return this.active && !this.queue.length && this.live.every((m) => m.side); }

  step(dt) {
    if (!this.active) return;
    const d = dt * 2;                                  // a run plays at double speed
    this.clock += d;
    const hill = this.hill;
    while (this.queue.length && this.queue[0].at <= this.clock) {
      const q = this.queue.shift();
      const v = Math.sqrt(2 * G * q.e * PX_PER_K) + 12;
      const m = new Marble(hill, 0, 6);
      if (this.dir > 0) m.launch(hill.xa - 24, v);
      else m.launch(hill.xb + 24, -v);
      m.e = q.e;
      this.live.push(m);
    }
    const barrier = Math.max(1, this.dir > 0 ? hill.hump : hill.hump + hill.drop);
    for (const m of this.live) {
      m.step(d);
      if (!m.side) {
        // Resolved once it is clearly back on one plateau, heading away from the hump.
        if (m.x < hill.xa - 30 && m.v < 0) m.side = 'L';
        if (m.x > hill.xb + 30 && m.v > 0) m.side = 'R';
        if (m.side) {
          const toR = m.side === 'R';
          if ((this.dir > 0) === toR) this.crossed += 1; else this.back += 1;
          (toR ? this.pileR : this.pileL).push(m.e / barrier);
        }
      }
      if (m.x <= hill.x0 + m.r + 1 || m.x >= hill.x1 - m.r - 1) m.gone = true;
    }
    this.live = this.live.filter((m) => !m.gone);
  }

  /** Marbles in flight, coloured by how hard each collision is against the barrier. */
  draw(ctx, c) {
    const hill = this.hill;
    const barrier = Math.max(1, this.dir > 0 ? hill.hump : hill.hump + hill.drop);
    for (const m of this.live) {
      const y = hill.y(m.x) - m.r;
      drawMarble(ctx, c, m.x, y, m.r, heatCol(c, m.e / barrier / 1.4), {});
    }
  }

  /** Two trays of arrived marbles under the plateaus, with their counts. */
  drawTrays(ctx, c, o = {}) {
    const hill = this.hill;
    const trays = [
      { pile: this.pileL, x: hill.x0 + 6, label: o.leftLabel ?? 'bounced back', n: this.dir > 0 ? this.back : this.crossed },
      { pile: this.pileR, x: hill.x1 - 150, label: o.rightLabel ?? 'crossed', n: this.dir > 0 ? this.crossed : this.back },
    ];
    for (const tr of trays) {
      const y = 470;
      rr(ctx, tr.x, y - 24, 144, 44, 12);
      ctx.fillStyle = c.bgSurface;
      ctx.fill();
      ctx.strokeStyle = alpha(c.stroke, 0.8);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 22, true);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(tr.n), tr.x + 12, y - 1);
      ctx.fillStyle = c.labelMuted;
      ctx.font = font(c, 800, 14);
      ctx.fillText(tr.label, tr.x + 50, y - 1);
    }
  }
}

/** Cartoon hand pressing down on the hump (the catalyst). Palm bottom at (x, y). */
export function drawHand(ctx, c, x, y, s = 1, col = null) {
  const k = col ?? c.s5;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // Cuff
  rr(ctx, -20, -86, 40, 26, 8);
  ctx.fillStyle = darken(k, 0.3);
  ctx.fill();
  // Palm and fingers, pointing down
  rr(ctx, -26, -66, 52, 48, 16);
  ctx.fillStyle = k;
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    rr(ctx, -24 + i * 12.5, -30, 11, 30, 5.5);
    ctx.fillStyle = i % 2 ? lighten(k, 0.08) : k;
    ctx.fill();
  }
  rr(ctx, 20, -60, 14, 28, 7);
  ctx.fillStyle = darken(k, 0.12);
  ctx.fill();
  ellipse(ctx, -10, -52, 8, 5, -0.4);
  ctx.fillStyle = alpha(lighten(k, 0.6), 0.7);
  ctx.fill();
  ctx.restore();
}

/** Small card listing runs: rows [{ text, n, col }]. */
export function drawRunLog(ctx, c, x, y, w, title, rows) {
  const n = rows.length;
  const h = 30 + Math.max(1, n) * 22;
  rr(ctx, x, y + 4, w, h, 11);
  ctx.fillStyle = darken(c.bgSurface, 0.3);
  ctx.fill();
  rr(ctx, x, y, w, h, 11);
  ctx.fillStyle = c.bgSurface;
  ctx.fill();
  ctx.strokeStyle = alpha(c.stroke, 0.8);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = c.labelMuted;
  ctx.font = font(c, 800, 14);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(n ? title : 'runs appear here', x + 12, y + 16);
  rows.forEach((e, i) => {
    const ry = y + 38 + i * 22;
    ctx.fillStyle = c.label;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.fillText(e.text, x + 12, ry);
    ctx.textAlign = 'right';
    ctx.fillStyle = e.col ?? c.label;
    ctx.fillText(String(e.n), x + w - 12, ry);
  });
  return h;
}

export const CATALYST = { none: 2000, some: 1200, lots: 600 };

// -- Free energy: the Hill built from heat and ways (Book III.8) ----------------------------

/** Heat given out (kJ per mole; negative = taken in), ways gained (J per K per mole). */
export const FE_HEAT = {
  in6: { label: 'taken in, 6 kJ', v: -6.01 },
  none: { label: 'none', v: 0 },
  out6: { label: 'given out, 6 kJ', v: 6.01 },
  out600: { label: 'given out, 600 kJ', v: 600 },
};
export const FE_WAYS = {
  lost22: { label: 'lost, 22', v: -22 },
  none: { label: 'none', v: 0 },
  gain22: { label: 'gained, 22', v: 22 },
  gain60: { label: 'gained, 60', v: 60 },
};
export const FE_TEMPS = {
  m10: { label: '\u221210 \u00b0C', C: -10 },
  zero: { label: '0 \u00b0C', C: 0 },
  p10: { label: '+10 \u00b0C', C: 10 },
  p25: { label: '25 \u00b0C', C: 25 },
  p100: { label: '100 \u00b0C', C: 100 },
};

/**
 * The two forward pushes and their sum, in kJ per mole: heat given out, and ways
 * gained weighted by temperature (T in kelvin). net > 0 is downhill: the change
 * runs by itself; its free energy falls by `net`.
 */
export function pushes(heatOut, waysGained, C, waysCount = true) {
  const T = C + 273.15;
  const ways = waysCount ? (T * waysGained) / 1000 : 0;
  return { heat: heatOut, ways, net: heatOut + ways };
}

/** Verdict for a net push: 'forward', 'backward' or 'balanced'. */
export function verdict(net, scale = 1) {
  if (Math.abs(net) < 0.03 * Math.max(1, scale)) return 'balanced';
  return net > 0 ? 'forward' : 'backward';
}

/**
 * The pushes card: a zero line, a heat bar, a ways bar (x temperature) and the net,
 * each pointing right for forward and left for backward. Returns the card box.
 */
export function drawPushCard(ctx, c, x, y, w, p, o = {}) {
  const rows = [
    { label: 'heat', v: p.heat, col: c.flame },
    { label: o.waysLabel ?? 'ways \u00d7 T', v: p.ways, col: c.s5, off: o.waysOff },
    { label: 'net', v: p.net, col: p.net >= 0 ? c.good : c.bad },
  ];
  const h = 30 + rows.length * 38;
  drawCardBox(ctx, c, x, y, w, h);
  const scale = o.scale ?? Math.max(1, ...rows.map((r) => Math.abs(r.v)));
  const zx = x + 70 + (w - 90) / 2, half = (w - 110) / 2;
  ctx.strokeStyle = alpha(c.labelMuted, 0.7);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(zx, y + 28);
  ctx.lineTo(zx, y + h - 8);
  ctx.stroke();
  ctx.fillStyle = c.labelMuted;
  ctx.font = font(c, 800, 14);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('\u2190 back', x + 70, y + 16);
  ctx.textAlign = 'right';
  ctx.fillText('forward \u2192', x + w - 12, y + 16);
  rows.forEach((r, i) => {
    const ry = y + 42 + i * 38;
    ctx.fillStyle = r.off ? c.labelMuted : c.label;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.fillText(r.label, x + 12, ry);
    const len = (Math.abs(r.v) / scale) * half;
    if (len > 1) {
      const x0 = r.v >= 0 ? zx : zx - len;
      rr(ctx, x0, ry - 9, len, 18, 6);
      ctx.fillStyle = r.off ? alpha(r.col, 0.25) : r.col;
      ctx.fill();
    }
    ctx.fillStyle = r.off ? c.labelMuted : c.label;
    ctx.textAlign = r.v >= 0 ? 'right' : 'left';
    const txt = Math.abs(r.v) < 0.005 ? '0.00' : `${r.v >= 0 ? '+' : '\u2212'}${Math.abs(r.v) < 10 ? Math.abs(r.v).toFixed(2) : Math.abs(r.v).toFixed(0)}`;
    ctx.fillText(txt, r.v >= 0 ? zx - 6 : zx + 6, ry);
  });
  return { x, y, w, h };
}

/** Plain card box with lift (no text). */
export function drawCardBox(ctx, c, x, y, w, h) {
  rr(ctx, x, y + 4, w, h, 11);
  ctx.fillStyle = darken(c.bgSurface, 0.3);
  ctx.fill();
  rr(ctx, x, y, w, h, 11);
  ctx.fillStyle = c.bgSurface;
  ctx.fill();
  ctx.strokeStyle = alpha(c.stroke, 0.8);
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * A two-level step Hill: before on the left, after on the right; the right side
 * sits lower by `drop` px (negative = higher). Returns y(x) for placing a ball.
 */
export function drawStepHill(ctx, c, x0, x1, yBase, drop, o = {}) {
  const xa = x0 + (x1 - x0) * 0.38, xb = x0 + (x1 - x0) * 0.62;
  const yL = yBase, yR = yBase + drop;
  const y = (x) => {
    if (x <= xa) return yL;
    if (x >= xb) return yR;
    const u = (x - xa) / (xb - xa);
    return yL + (yR - yL) * (0.5 - 0.5 * Math.cos(Math.PI * u));
  };
  const col = o.col ?? c.s3;
  ctx.beginPath();
  ctx.moveTo(x0, y(x0));
  for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, y(x));
  ctx.lineTo(x1, o.bottom ?? H);
  ctx.lineTo(x0, o.bottom ?? H);
  ctx.closePath();
  ctx.fillStyle = mix(c.bgSurface, col, 0.28);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x0, y(x0));
  for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, y(x));
  ctx.strokeStyle = col;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  return y;
}

/**
 * The thing that changes on a free-energy Hill, k = 0 (before) .. 1 (after):
 * kind 'ice' (a cube melting into a puddle), 'candle' (burning down), else a ball.
 */
export function drawChangeThing(ctx, c, kind, x, y, k, t) {
  if (kind === 'ice') {
    if (k < 0.95) {
      const s = 22 * (1 - k * 0.6);
      rr(ctx, x - s, y - s + 8, s * 2, s * 2, 6);
      ctx.fillStyle = lighten(c.glass, 0.3);
      ctx.fill();
      ctx.strokeStyle = c.glass;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (k > 0.05) {
      ellipse(ctx, x + 10, y + 26, 16 + 20 * k, 6 + 3 * k);
      ctx.fillStyle = c.water;
      ctx.fill();
    }
    return;
  }
  if (kind === 'candle') {
    const hh = 40 * (1 - 0.7 * k);
    rr(ctx, x - 12, y + 26 - hh, 24, hh, 5);
    ctx.fillStyle = lighten(c.broth, 0.6);
    ctx.fill();
    drawFlameLite(ctx, c, x, y + 26 - hh, 0.9, t);
    return;
  }
  drawMarble(ctx, c, x, y + 4, 18, c.s4, { face: true });
}

/** Two-tone flame (local copy so HillKit needs no StoryKit flame import cycle). */
function drawFlameLite(ctx, c, x, y, s, t) {
  const f = 1 + 0.08 * Math.sin(t * 23) + 0.05 * Math.sin(t * 37);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s * f);
  const tear = (w, h) => {
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.quadraticCurveTo(w, -h * 0.35, w * 0.8, -h * 0.1);
    ctx.arc(0, -h * 0.1, w * 0.8, 0, Math.PI);
    ctx.quadraticCurveTo(-w, -h * 0.35, 0, -h);
    ctx.closePath();
  };
  tear(9, 26);
  ctx.fillStyle = c.flame;
  ctx.fill();
  tear(5, 15);
  ctx.fillStyle = c.warning;
  ctx.fill();
  ctx.restore();
}

/** Names and thing-kind for a heat/ways pair. */
export function changeNames(heat, ways) {
  if (heat === 'in6' && ways === 'gain22') return { a: 'ice', b: 'water', kind: 'ice' };
  if (heat === 'out600' && ways === 'gain60') return { a: 'candle wax + air', b: 'CO\u2082 + water', kind: 'candle' };
  return { a: 'before', b: 'after', kind: 'ball' };
}

// -- The valley: free energy against the mix (Book III.8 L03) -------------------------------

const R_KJ = 0.008314;

/**
 * Reactions for the valley Hill. dH kJ/mol, dS J/(K mol), temperature ladder in C.
 * pure: the two sides are separate pure phases (no mixing term), so the valley
 * sits at a wall except exactly at the balance temperature.
 */
export const REACTIONS = {
  ice: { label: 'ice melting', a: 'ice', b: 'water', dH: 6.01, dS: 22.0, temps: [-20, -10, 0, 10, 20], pure: true },
  split: { label: 'water splitting', a: 'water', b: 'hydrogen + oxygen', dH: 242, dS: 44.4, temps: [25, 1000, 2000, 3000, 4000, 5000] },
  methane: { label: 'methane burning', a: 'methane + oxygen', b: 'CO\u2082 + water', dH: -802, dS: -5, temps: [25, 500, 1000, 2000] },
  gas: { label: 'gas dissolving', a: 'gas in the air', b: 'gas in water', dH: -20, dS: -67, temps: [5, 25, 60, 100] },
  salt: { label: 'salt dissolving', a: 'salt crystal', b: 'salt in water', dH: 3.9, dS: 43, temps: [0, 25, 60, 100] },
};

/** Free energy (kJ/mol, relative) at products-share xi, for a reaction at C degrees. */
export function freeG(rx, xi, C, completion = false) {
  const T = C + 273.15;
  const dG = rx.dH - (T * rx.dS) / 1000;
  const x = Math.max(1e-6, Math.min(1 - 1e-6, xi));
  const mixing = rx.pure || completion ? 0 : R_KJ * T * (x * Math.log(x) + (1 - x) * Math.log(1 - x));
  return x * dG + mixing;
}

/** The valley's products share: the minimum of the curve. */
export function valleyAt(rx, C, completion = false) {
  let best = 0, bg = Infinity;
  for (let i = 0; i <= 1000; i++) {
    const xi = i / 1000;
    const g = freeG(rx, xi, C, completion);
    if (g < bg - 1e-12) { bg = g; best = xi; }
  }
  return best;
}

/**
 * The curve mapped into a box, normalised so its full range fills the height.
 * Returns { y(xi), x(xi), xiAt(px) }.
 */
export function valleyCurve(rx, C, box, completion = false) {
  const N = 200;
  const gs = [];
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= N; i++) {
    const g = freeG(rx, i / N, C, completion);
    gs.push(g);
    lo = Math.min(lo, g);
    hi = Math.max(hi, g);
  }
  const span = Math.max(1e-6, hi - lo);
  const flat = hi - lo < 1e-4;
  const yOf = (xi) => {
    const u = Math.max(0, Math.min(N, xi * N));
    const i = Math.min(N - 1, Math.floor(u)), f = u - i;
    const g = gs[i] * (1 - f) + gs[i + 1] * f;
    // Highest free energy at the top of the box, lowest at the bottom.
    return flat ? box.y + box.h * 0.6 : box.y + 12 + (box.h - 24) * (1 - (g - lo) / span);
  };
  return {
    y: yOf,
    x: (xi) => box.x + xi * box.w,
    xiAt: (px) => Math.max(0, Math.min(1, (px - box.x) / box.w)),
  };
}

/** Draw the valley curve with ground under it, and the axis names. */
export function drawValley(ctx, c, curve, box, rx, o = {}) {
  ctx.beginPath();
  ctx.moveTo(box.x, curve.y(0));
  for (let i = 1; i <= 120; i++) ctx.lineTo(curve.x(i / 120), curve.y(i / 120));
  ctx.lineTo(box.x + box.w, box.y + box.h + (o.ground ?? 40));
  ctx.lineTo(box.x, box.y + box.h + (o.ground ?? 40));
  ctx.closePath();
  ctx.fillStyle = mix(c.bgSurface, o.col ?? c.s3, 0.28);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(box.x, curve.y(0));
  for (let i = 1; i <= 120; i++) ctx.lineTo(curve.x(i / 120), curve.y(i / 120));
  ctx.strokeStyle = o.col ?? c.s3;
  ctx.lineWidth = o.lw ?? 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  if (o.names !== false) {
    pill(ctx, c, `all ${rx.a}`, box.x, box.y + box.h + 58, { bg: c.s1, size: 14, align: 'left' });
    pill(ctx, c, `all ${rx.b}`, box.x + box.w, box.y + box.h + 58, { bg: c.s3, size: 14, align: 'right' });
  }
}

/** A ball rolling (overdamped) down a valley curve toward its floor. */
export class ValleyBall {
  constructor() { this.xi = 0; this.moving = false; this.dir = 0; this.settled = false; }

  place(xi) { this.xi = xi; this.moving = false; this.dir = 0; this.settled = false; }

  release() { this.moving = true; this.settled = false; this.dir = 0; }

  step(dt, curve) {
    if (!this.moving) return;
    const e = 0.004;
    const sl = (curve.y(Math.min(1, this.xi + e)) - curve.y(Math.max(0, this.xi - e))) / (2 * e);
    // Screen y grows downward, so a positive slope means lower to the right.
    let v = Math.max(-0.35, Math.min(0.35, sl * 0.004));
    if (Math.abs(v) < 0.004) v = 0;
    if (v !== 0 && this.dir === 0) this.dir = Math.sign(v);
    this.xi = Math.max(0, Math.min(1, this.xi + v * dt));
    if (v === 0 || this.xi <= 0 || this.xi >= 1) { this.moving = false; this.settled = true; }
  }
}

// -- Metabolism on the Hill (Book V.4) ------------------------------------------------------

/** The seed's reactions, standard free-energy change in kJ per mole (model values). */
export const METAB = {
  starch: { label: 'starch \u2192 glucose', dG: -16, kind: 'down' },
  glucose: { label: 'glucose \u2192 CO\u2082 + water', dG: -2870, kind: 'down' },
  fat: { label: 'fat \u2192 fatty acids', dG: -14, kind: 'down' },
  peptide: { label: 'amino acids \u2192 protein', dG: 17, kind: 'up' },
  rna: { label: 'nucleotides \u2192 RNA', dG: 25, kind: 'up' },
  sugar: { label: 'CO\u2082 + water \u2192 sugar', dG: 2870, kind: 'up' },
};
export const ATP_DG = -30.5;

/** Pixel drop for a free-energy change, on a squashed scale so 16 and 2870 both show. */
export function dropPx(dG) {
  if (Math.abs(dG) < 0.5) return 0;
  return -Math.sign(dG) * Math.min(150, 22 + 38 * Math.log10(1 + Math.abs(dG)));
}

/** An ATP coin: gold disc with three phosphate dots; spent = two dots, dimmer. */
export function drawCoin(ctx, c, x, y, r, spent = false) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y + r * 0.15, r, 0, Math.PI * 2);
  ctx.fillStyle = darken(c.warning, 0.4);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = spent ? mix(c.warning, c.bgSurface, 0.45) : c.warning;
  ctx.fill();
  const n = spent ? 2 : 3;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(x - r * 0.45 + i * r * 0.45, y, r * 0.17, 0, Math.PI * 2);
    ctx.fillStyle = darken(c.warning, 0.55);
    ctx.fill();
  }
  ctx.restore();
}
