/**
 * WaterKit - coupling, drawn as a waterwheel (Book III.8) and as hexokinase
 * (Book V.5): a falling stream turns a wheel whose rope lifts a bucket; ATP falls
 * to ADP inside an enzyme's pocket while glucose is lifted to tagged glucose. Not a
 * scene. Re-exports HillKit (and through it StoryKit).
 *
 * The rig's physics: a stream of 1 kg/s falling h metres delivers 9.8 h watts.
 * A gear sets how fast the bucket is asked to rise; lifting M kg at v m/s costs
 * 9.8 M v watts. The wheel can pass on at most 80% of the fall (nothing couples
 * perfectly); asked for more, it stalls and the whole fall goes to heat and spray.
 */
import { alpha, mix, darken, lighten, rr, ellipse, font, pill, blob, mulberry32 } from './HillKit.js';

export * from './HillKit.js';

export const G_MS = 9.8;
export const STREAMS = { low: 1, medium: 2, high: 3 };           // fall height, m
export const LOADS = { 1: 1, 2: 2, 4: 4, 8: 8 };                   // bucket, kg
export const GEARS = { slow: 0.12, fast: 0.4 };                     // bucket speed asked, m/s
export const BEST = 0.8;                                            // most of the fall a wheel can pass on

/** One run's physics: powers in watts and whether it stalls. */
export function rigPowers(o) {
  const fall = G_MS * 1 * STREAMS[o.stream];
  if (!o.connected) return { fall, lift: 0, waste: fall, stall: false, v: 0 };
  const ask = G_MS * LOADS[o.load] * GEARS[o.gear];
  if (ask > BEST * fall) return { fall, lift: 0, waste: fall, stall: true, v: 0 };
  return { fall, lift: ask, waste: fall - ask, stall: false, v: GEARS[o.gear] };
}

/**
 * The rig as a state machine: run() for `dur` seconds of sim time; totals in J.
 * `h` is the bucket's height (m, 0..2), for drawing.
 */
export class Rig {
  constructor(o = {}) {
    this.stream = o.stream ?? 'medium';
    this.load = o.load ?? 2;
    this.gear = o.gear ?? 'slow';
    this.connected = o.connected ?? true;
    this.reset();
  }

  reset() {
    this.t = 0;
    this.running = false;
    this.h = 0;
    this.spin = 0;
    this.tot = { fall: 0, lift: 0, waste: 0 };
    this.stalled = false;
  }

  run() { this.reset(); this.running = true; }

  powers() {
    return rigPowers({ stream: this.stream, load: this.load, gear: this.gear, connected: this.connected });
  }

  step(dt) {
    const p = this.powers();
    this.spin += dt * (p.stall ? 0.4 : 1.2 + STREAMS[this.stream] * 0.6) * (this.running ? 1 : 0.2);
    if (!this.running) return;
    this.t += dt;
    this.stalled = p.stall;
    this.tot.fall += p.fall * dt;
    this.tot.lift += p.lift * dt;
    this.tot.waste += p.waste * dt;
    this.h = Math.min(2, this.h + p.v * dt);
    if (this.h >= 2 || this.t > 16) this.running = false;
  }
}

/**
 * Draw the rig: spout and stream (left), wheel, belt to the drum when connected,
 * rope over a pulley to the bucket (right), a shelf the bucket rises to, heat and
 * spray at the foot of the fall. Returns anchor points.
 */
export function drawRig(ctx, c, rig, t, o = {}) {
  const wx = o.wx ?? 190, wy = o.wy ?? 330, R = 70;
  const p = rig.powers();
  const fallH = STREAMS[rig.stream];
  const spoutY = wy - 110 - fallH * 36;
  const streamEnd = o.noWheel ? wy + R + 30 : wy - R + 8;
  // Spout.
  rr(ctx, 40, spoutY - 18, 120, 28, 8);
  ctx.fillStyle = darken(c.wood, 0.3);
  ctx.fill();
  // Stream: a ribbon with moving highlights down to the wheel's top-left paddles.
  const sx = 150;
  ctx.fillStyle = alpha(c.water, 0.75);
  ctx.fillRect(sx - 12, spoutY, 24, streamEnd - spoutY);
  ctx.fillStyle = alpha(lighten(c.water, 0.5), 0.8);
  for (let k = 0; k < 6; k++) {
    const u = (t * 1.6 + k / 6) % 1;
    ctx.fillRect(sx - 6, spoutY + u * (streamEnd - 14 - spoutY), 4, 14);
  }
  pill(ctx, c, `fall ${fallH} m`, 40, spoutY - 36, { bg: c.water, size: 14, align: 'left' });
  // Pool with spray and heat at the foot of the fall.
  ellipse(ctx, wx, wy + R + 36, 120, 16);
  ctx.fillStyle = alpha(c.water, 0.5);
  ctx.fill();
  const wasteK = p.waste / Math.max(1, p.fall);
  for (let k = 0; k < 8; k++) {
    const u = (t * 0.9 + k / 8) % 1;
    const px = wx - 90 + k * 26 + Math.sin(t * 3 + k) * 4, py = wy + R + 30 - u * 40;
    ctx.beginPath();
    ctx.arc(px, py, 3 + 3 * wasteK, 0, Math.PI * 2);
    ctx.fillStyle = alpha(k % 2 ? c.bad : c.glass, (1 - u) * (0.3 + 0.7 * wasteK));
    ctx.fill();
  }
  // Wheel.
  if (!o.noWheel) {
  ctx.save();
  ctx.translate(wx, wy);
  ctx.beginPath();
  ctx.arc(0, 4, R, 0, Math.PI * 2);
  ctx.fillStyle = darken(c.wood, 0.5);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = darken(c.wood, 0.2);
  ctx.fill();
  ctx.rotate(rig.spin);
  for (let k = 0; k < 8; k++) {
    ctx.rotate(Math.PI / 4);
    rr(ctx, -5, -R - 10, 10, R + 10 - 14, 4);
    ctx.fillStyle = c.wood;
    ctx.fill();
    rr(ctx, -14, -R - 12, 28, 14, 5);
    ctx.fillStyle = lighten(c.wood, 0.2);
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(wx, wy, 16, 0, Math.PI * 2);
  ctx.fillStyle = c.s5;
  ctx.fill();
  }
  // Drum, pulley, rope, bucket.
  const dx = wx + 150, dy = wy;
  const px = 540, py = 190;
  if (rig.connected && !o.noWheel) {
    ctx.strokeStyle = c.labelMuted;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(wx, wy - 16);
    ctx.lineTo(dx, dy - 22);
    ctx.moveTo(wx, wy + 16);
    ctx.lineTo(dx, dy + 22);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(dx, dy, 22, 0, Math.PI * 2);
  ctx.fillStyle = rig.connected ? c.s5 : c.raised;
  ctx.fill();
  const gearTxt = rig.gear === 'slow' ? 'slow gear' : 'fast gear';
  pill(ctx, c, rig.connected ? gearTxt : 'not connected', dx, dy + 44, { bg: rig.connected ? c.s5 : c.bad, size: 14 });
  const shelfY = 250, groundY = 440;
  const by = groundY - (rig.h / 2) * (groundY - shelfY) - 40;
  ctx.strokeStyle = c.label;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(dx + 22, dy);
  ctx.lineTo(px - 16, py);
  ctx.moveTo(px + 16, py);
  ctx.lineTo(px + 16, by);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px, py, 16, 0, Math.PI * 2);
  ctx.fillStyle = c.labelMuted;
  ctx.fill();
  rr(ctx, 596, shelfY + 36, 74, 10, 5);
  ctx.fillStyle = darken(c.wood, 0.3);
  ctx.fill();
  const bw = 36 + rig.load * 3;
  ctx.beginPath();
  ctx.moveTo(px + 16 - bw / 2, by);
  ctx.lineTo(px + 16 + bw / 2, by);
  ctx.lineTo(px + 16 + bw / 2 - 6, by + 44);
  ctx.lineTo(px + 16 - bw / 2 + 6, by + 44);
  ctx.closePath();
  ctx.fillStyle = c.s8;
  ctx.fill();
  pill(ctx, c, `${rig.load} kg`, px + 16, by + 22, { bg: c.s8, size: 14 });
  if (rig.stalled) pill(ctx, c, 'stalls: the lift would cost more than the fall', 340, 470, { bg: c.bad, size: 15 });
  return { wx, wy, dx, dy };
}

/** A three-row ledger: fall, lift, heat wasted (J), with bars against the fall. */
export function drawLedger(ctx, c, x, y, w, tot, title = 'this run', unit = 'J') {
  const rows = [
    { label: 'fall', v: tot.fall, col: c.water },
    { label: 'lift', v: tot.lift, col: c.s8 },
    { label: 'heat wasted', v: tot.waste, col: c.bad },
  ];
  const h = 34 + rows.length * 34;
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
  ctx.fillText(title, x + 12, y + 18);
  const full = Math.max(1, tot.fall);
  rows.forEach((r, i) => {
    const ry = y + 46 + i * 34;
    ctx.fillStyle = c.label;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.fillText(r.label, x + 12, ry);
    rr(ctx, x + 108, ry - 8, (w - 190) * Math.min(1, r.v / full) + 4, 16, 8);
    ctx.fillStyle = r.col;
    ctx.fill();
    ctx.fillStyle = c.label;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(r.v)} ${unit}`, x + w - 12, ry);
  });
}

// -- Hexokinase: ATP, glucose and the pocket (Book V.5) --------------------------------------------

export const ATP_FALL = 30.5, TAG_LIFT = 13.8;           // kJ per mole

/** ATP (three phosphates) or ADP (two) as a short chain: base, sugar, phosphate beads. */
export function drawATP(ctx, c, x, y, n = 3, o = {}) {
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  rr(ctx, x - 34, y - 12, 26, 24, 8);
  ctx.fillStyle = c.s1;
  ctx.fill();
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(a) * 11, py = y + Math.sin(a) * 11;
    if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = c.s3;
  ctx.fill();
  for (let k = 0; k < n; k++) {
    ctx.beginPath();
    ctx.arc(x + 22 + k * 16, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = k === 2 ? c.warning : darken(c.warning, 0.15);
    ctx.fill();
  }
  ctx.restore();
}

/** Glucose as a hexagon; tagged glucose carries a phosphate bead. */
export function drawGlucose(ctx, c, x, y, tagged = false, o = {}) {
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const px = x + Math.cos(a) * 16, py = y + Math.sin(a) * 16;
    if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = c.broth;
  ctx.fill();
  ctx.strokeStyle = darken(c.broth, 0.35);
  ctx.lineWidth = 3;
  ctx.stroke();
  if (tagged) {
    ctx.beginPath();
    ctx.arc(x + 22, y - 14, 8, 0, Math.PI * 2);
    ctx.fillStyle = c.warning;
    ctx.fill();
  }
  ctx.restore();
}

/** A loose phosphate bead. */
export function drawPhosphate(ctx, c, x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = c.warning;
  ctx.fill();
}

/**
 * Hexokinase: a two-lobed fold with a cleft. close: 0 open .. 1 closed (induced fit).
 * Pocket centre is at (x + 10, y).
 */
export function drawHexokinase(ctx, c, x, y, close, t) {
  const col = c.s4;
  const gap = 34 * (1 - close);
  const lobe = (dy, sign) => {
    ctx.save();
    ctx.translate(x, y + dy);
    ctx.rotate(sign * (0.35 * (1 - close)));
    blob(ctx, -10, sign * 36, 92, 56, 9, 0.05, 1.3 + sign);
    ctx.fillStyle = darken(col, 0.3);
    ctx.fill();
    blob(ctx, -10, sign * 34, 92, 56, 9, 0.05, 1.3 + sign);
    ctx.fillStyle = col;
    ctx.fill();
    ellipse(ctx, -40, sign * 34 - 18, 26, 10, -0.2);
    ctx.fillStyle = alpha(lighten(col, 0.5), 0.6);
    ctx.fill();
    ctx.restore();
  };
  lobe(-gap / 2, -1);
  lobe(gap / 2, 1);
  // Pocket shadow.
  ellipse(ctx, x + 40, y, 44, 12 + gap * 0.6);
  ctx.fillStyle = alpha(c.bgDeep, 0.35);
  ctx.fill();
  void t;
}

/**
 * The hexokinase cycle. mode: 'none' (side by side in water), 'enzyme' (glucose
 * first, then ATP, phosphate moves across), 'atp' (ATP alone: does almost nothing),
 * 'glucose' (glucose alone: binds, waits), 'loose' (what-if: closes on ATP alone
 * and breaks it into water, over and over).
 */
export class Hexo {
  constructor(mode = 'enzyme') {
    this.mode = mode;
    this.rnd = mulberry32(17);
    this.reset();
  }

  reset() {
    this.t = 0;
    this.phase = 'wait';
    this.pt = 0;
    this.close = 0;
    this.tagged = 0;
    this.fall = 0;
    this.lift = 0;
    this.waste = 0;
    this.till = 20;          // ATP coins in the cell's till
    this.cycles = 0;
  }

  step(dt) {
    this.t += dt;
    this.pt += dt;
    const m = this.mode;
    const target = (m === 'enzyme' && ['closing', 'atp', 'transfer'].includes(this.phase))
      || (m === 'glucose' && this.phase !== 'wait')
      || (m === 'loose' && ['atp', 'transfer'].includes(this.phase)) ? 1 : 0;
    this.close += (target - this.close) * Math.min(1, dt * 5);
    if (m === 'none') {
      // Slow, uncoupled: now and then an ATP breaks in the water; the heat is wasted.
      if (this.rnd() < dt * 0.25 && this.till > 0) { this.till -= 1; this.fall += ATP_FALL; this.waste += ATP_FALL; this.flash = this.t; }
      return;
    }
    if (m === 'atp') return;
    const next = (p) => { this.phase = p; this.pt = 0; };
    if (m === 'glucose') {
      if (this.phase === 'wait' && this.pt > 0.8) next('bound');
      return;
    }
    if (m === 'loose') {
      if (this.till <= 0) return;
      if (this.phase === 'wait' && this.pt > 0.3) next('atp');
      else if (this.phase === 'atp' && this.pt > 0.4) next('transfer');
      else if (this.phase === 'transfer' && this.pt > 0.3) {
        this.till -= 1; this.fall += ATP_FALL; this.waste += ATP_FALL; this.cycles += 1; next('wait');
      }
      return;
    }
    // Enzyme: glucose binds, the fold closes, ATP binds, the phosphate moves, both leave.
    if (this.phase === 'wait' && this.pt > 0.6) next('glucose');
    else if (this.phase === 'glucose' && this.pt > 0.6) next('closing');
    else if (this.phase === 'closing' && this.pt > 0.6) next('atp');
    else if (this.phase === 'atp' && this.pt > 0.6) next('transfer');
    else if (this.phase === 'transfer' && this.pt > 0.8) {
      if (this.till > 0) this.till -= 1;
      this.tagged += 1; this.fall += ATP_FALL; this.lift += TAG_LIFT; this.waste += ATP_FALL - TAG_LIFT; this.cycles += 1;
      next('release');
    } else if (this.phase === 'release' && this.pt > 0.8) next('wait');
  }

  /** Draw the enzyme (unless 'none') with the molecules in their current places. */
  draw(ctx, c, x, y, t) {
    const m = this.mode;
    const px = x + 40, py = y;
    if (m === 'none') {
      rr(ctx, x - 150, y - 110, 300, 220, 18);
      ctx.fillStyle = alpha(c.water, 0.2);
      ctx.fill();
      drawATP(ctx, c, x - 60 + Math.sin(t) * 8, y - 40);
      drawGlucose(ctx, c, x + 70 + Math.cos(t * 0.8) * 8, y + 50);
      if (this.flash != null && t - this.flash < 0.8) {
        pill(ctx, c, 'an ATP broke: heat', x, y - 90, { bg: c.bad, size: 14 });
      }
      return;
    }
    drawHexokinase(ctx, c, x, y, this.close, t);
    const ph = this.phase, u = Math.min(1, this.pt / 0.6);
    const gIn = m === 'glucose' ? (ph === 'wait' ? u : 1) : m === 'enzyme' ? ({ glucose: u, closing: 1, atp: 1, transfer: 1 }[ph] ?? 0) : 0;
    const aIn = m === 'enzyme' ? ({ atp: u, transfer: 1 }[ph] ?? 0) : m === 'loose' ? ({ atp: 1, transfer: 1 }[ph] ?? 0) : m === 'atp' ? 0.35 + 0.1 * Math.sin(t * 2) : 0;
    // Glucose from the upper left into the pocket.
    if (m !== 'atp' && m !== 'loose') {
      const gx = px - 20 + (1 - gIn) * -170, gy = py - 12 + (1 - gIn) * -110;
      if (ph !== 'release') drawGlucose(ctx, c, gx, gy, false);
    }
    // ATP from the lower right.
    if (m !== 'glucose') {
      const ax = px + 30 + (1 - aIn) * 170, ay = py + 16 + (1 - aIn) * 100;
      if (ph === 'transfer' && m !== 'atp') {
        const k = Math.min(1, this.pt / 0.8);
        drawATP(ctx, c, ax, ay, 2);
        if (m === 'enzyme') drawPhosphate(ctx, c, ax + 54 + (-54 - 30) * k, ay + (-28) * k);
        else drawPhosphate(ctx, c, ax + 54, ay + 30 * k);
      } else if (ph !== 'release') drawATP(ctx, c, ax, ay, 3);
    }
    if (ph === 'release' && m === 'enzyme') {
      const k = Math.min(1, this.pt / 0.8);
      drawGlucose(ctx, c, px - 20 - k * 170, py - 12 - k * 110, true);
      drawATP(ctx, c, px + 30 + k * 170, py + 16 + k * 100, 2);
    }
  }
}
