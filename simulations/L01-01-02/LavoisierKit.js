/**
 * LavoisierKit - the sealed-jar burn shared by the three L01-01-02 scenes
 * (SealedJarBurnScene, -results, -phlogiston-world). An Apparatus runs
 * Lavoisier's 1774 experiment on the course balance: weigh the sealed jar,
 * heat the metal with a burning lens, open the jar, weigh the metal alone.
 * Not a scene: no class export beyond the Apparatus helper.
 *
 * Physics 'oxygen' (the real world): blue oxygen dots (a fifth of the air)
 * join the metal, which turns to calx; opening the jar lets air rush in.
 * Physics 'phlogiston' (the old story, as a prediction or a what-if): orange
 * fire-stuff leaves the metal into the jar; opening lets air rush out.
 *
 * Numbers are the scene's own model: jar 300.0 g, air 1.5 g of which 0.3 g
 * oxygen, metal 10.0 g; the metal gains (or, as phlogiston, loses) 0.3 g.
 */
import { clamp01, smooth } from 'simulations/base/SimMotion.js';
import {
  alpha, mix, lighten, darken, ellipse, blob, mulberry32,
} from '../shared/StoryKit.js';
import { drawBalance, drawTile, jarBox, drawJar, jarNeck } from '../shared/LabKit.js';

export * from '../shared/StoryKit.js';
export * from '../shared/LabKit.js';

export const JAR_G = 300.0;
export const AIR_G = 1.5;
export const METAL_G = 10.0;
export const SHIFT_G = 0.3;          // oxygen joining (or phlogiston leaving) the metal

export const METALS = {
  tin: { name: 'tin' },
  mercury: { name: 'mercury' },
  iron: { name: 'iron' },
};

const MAIN = { x: 190, py: 392 };
export const JAR_BOX = jarBox(MAIN.x, MAIN.py, 190, 206);
const METAL_Y = MAIN.py - 16;

// Phase lengths (s). "Burns are sped up a hundred times" (honesty card).
const T = { weigh: 1.0, heat: 3.6, open: 2.0, alone: 1.8 };

function calxColor(c, metal) {
  if (metal === 'mercury') return c.s6;
  if (metal === 'iron') return darken(c.labelMuted, 0.75);
  return lighten(c.labelMuted, 0.6);
}
function metalColor(c, metal) {
  return metal === 'iron' ? mix(c.labelMuted, c.stroke, 0.5) : mix(c.labelMuted, c.glass, 0.35);
}

/** The metal in its dish, at (x, y) dish centre; calx 0..1. */
export function drawMetal(ctx, c, metal, x, y, calx, t, s = 1) {
  const dish = mix(c.labelMuted, c.bgSurface, 0.45);
  ellipse(ctx, x, y + 4 * s, 46 * s, 12 * s);
  ctx.fillStyle = darken(dish, 0.35);
  ctx.fill();
  ellipse(ctx, x, y, 46 * s, 12 * s);
  ctx.fillStyle = dish;
  ctx.fill();
  const shiny = metalColor(c, metal);
  const ash = calxColor(c, metal);
  const col = mix(shiny, ash, calx);
  if (metal === 'mercury') {
    ellipse(ctx, x, y - 2 * s, 34 * s, 8 * s);
    ctx.fillStyle = col;
    ctx.fill();
    ellipse(ctx, x - 10 * s, y - 4 * s, 12 * s, 2.5 * s);
    ctx.fillStyle = lighten(col, 0.55);
    ctx.fill();
    const n = Math.round(calx * 9);
    for (let k = 0; k < n; k++) {
      ellipse(ctx, x - 26 * s + k * 6.5 * s, y - 2 * s + ((k * 5) % 5 - 2) * s, 4 * s, 2.2 * s);
      ctx.fillStyle = c.s6;
      ctx.fill();
    }
  } else if (metal === 'iron') {
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k < 26; k++) {
      const px = x - 30 * s + ((k * 37) % 60) * s, py = y - 6 * s + ((k * 13) % 9) * s * 0.9;
      const a = (k * 1.7) % 3.14;
      ctx.moveTo(px - Math.cos(a) * 5 * s, py - Math.sin(a) * 2 * s);
      ctx.lineTo(px + Math.cos(a) * 5 * s, py + Math.sin(a) * 2 * s);
    }
    ctx.stroke();
  } else {
    for (let k = 0; k < 6; k++) {
      const px = x - 24 * s + k * 9.5 * s, py = y - 5 * s - (k % 2) * 4 * s;
      blob(ctx, px, py + 2 * s, 7 * s, 5 * s, 5, 0.18, k);
      ctx.fillStyle = darken(col, 0.3);
      ctx.fill();
      blob(ctx, px, py, 7 * s, 5 * s, 5, 0.18, k);
      ctx.fillStyle = col;
      ctx.fill();
      ellipse(ctx, px - 2 * s, py - 2 * s, 2.4 * s, 1.4 * s);
      ctx.fillStyle = lighten(col, 0.5 * (1 - calx) + 0.1);
      ctx.fill();
    }
  }
}

/** Air in (or around) the jar: grey dots, a fifth of them blue oxygen; orange phlogiston. */
class Gas {
  constructor(seed, box) {
    const rnd = mulberry32(seed);
    this.box = box;
    this.dots = [];
    for (let i = 0; i < 30; i++) {
      this.dots.push({
        x: box.x0 + 12 + rnd() * (box.x1 - box.x0 - 24), y: box.y0 + 40 + rnd() * (box.y1 - box.y0 - 70),
        vx: (rnd() - 0.5) * 30, vy: (rnd() - 0.5) * 30, kind: i % 5 === 0 ? 'o' : 'n',
      });
    }
    this.oxygen = this.dots.filter((d) => d.kind === 'o').length;
    this.joined = 0;
  }

  update(dt, t, fenced, sink) {
    const b = this.box;
    for (const d of this.dots) {
      d.vx += Math.sin(t * 1.4 + d.y * 0.05) * 20 * dt;
      d.vy += Math.cos(t * 1.2 + d.x * 0.05) * 20 * dt;
      if (d.kind === 'p') d.vy -= 10 * dt;
      if (d.target) {
        const dx = d.target.x - d.x, dy = d.target.y - d.y, dist = Math.hypot(dx, dy) || 1;
        d.vx += (dx / dist) * 160 * dt;
        d.vy += (dy / dist) * 160 * dt;
        if (d.target.leave && d.y < d.target.y + 6) d.target = d.target.next || null;
      }
      if (sink && d.kind === 'o') {
        const dx = sink.x - d.x, dy = sink.y - d.y, dist = Math.hypot(dx, dy) || 1;
        d.vx += (dx / dist) * 120 * dt;
        d.vy += (dy / dist) * 120 * dt;
        if (dist < 14) { d.dead = true; this.joined++; }
      }
      const vmax = d.target ? 120 : 45;
      d.vx = Math.max(-vmax, Math.min(vmax, d.vx));
      d.vy = Math.max(-vmax, Math.min(vmax, d.vy));
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (fenced && !d.target) {
        if (d.x < b.x0 + 8) { d.x = b.x0 + 8; d.vx = Math.abs(d.vx); }
        if (d.x > b.x1 - 8) { d.x = b.x1 - 8; d.vx = -Math.abs(d.vx); }
        if (d.y < b.y0 + 8) { d.y = b.y0 + 8; d.vy = Math.abs(d.vy); }
        if (d.y > b.y1 - 20) { d.y = b.y1 - 20; d.vy = -Math.abs(d.vy); }
      }
      if (d.y < -20 || d.x < -20 || d.x > 700) d.dead = true;
    }
    this.dots = this.dots.filter((d) => !d.dead);
  }

  draw(ctx, c) {
    for (const d of this.dots) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.kind === 'n' ? 2.6 : 3.6, 0, Math.PI * 2);
      ctx.fillStyle = d.kind === 'o' ? c.s1 : d.kind === 'p' ? c.flame : alpha(c.labelMuted, 0.6);
      ctx.fill();
    }
  }
}

/** Lavoisier's burning lens: sunlight focused onto the metal (literal light, so a gradient). */
function drawBurningLens(ctx, c, on, t) {
  const lx = 62, ly = 150;
  if (on > 0) {
    const g = ctx.createLinearGradient(lx, ly, MAIN.x, METAL_Y);
    g.addColorStop(0, alpha(c.warning, 0.35 * on));
    g.addColorStop(1, alpha(c.warning, 0.75 * on));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(lx - 30, ly - 12);
    ctx.lineTo(lx + 30, ly + 12);
    ctx.lineTo(MAIN.x + 2, METAL_Y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = alpha(c.warning, 0.18 * on);
    ctx.beginPath();
    ctx.moveTo(lx - 40, ly - 16);
    ctx.lineTo(lx + 40, ly + 16);
    ctx.lineTo(lx + 10 - 120, ly - 150);
    ctx.lineTo(lx - 60 - 60, ly - 110);
    ctx.closePath();
    ctx.fill();
    const pulse = 1 + 0.15 * Math.sin(t * 12);
    ctx.beginPath();
    ctx.arc(MAIN.x, METAL_Y - 4, 9 * pulse * on, 0, Math.PI * 2);
    ctx.fillStyle = alpha(lighten(c.warning, 0.4), 0.9);
    ctx.fill();
  }
  ellipse(ctx, lx, ly + 3, 36, 11, 0.38);
  ctx.fillStyle = darken(c.wood, 0.4);
  ctx.fill();
  ellipse(ctx, lx, ly, 36, 11, 0.38);
  ctx.fillStyle = alpha(c.glass, 0.5);
  ctx.fill();
  ctx.strokeStyle = darken(c.wood, 0.2);
  ctx.lineWidth = 4;
  ctx.stroke();
}

/**
 * One bench: main balance with the jar, a small balance for "the metal alone",
 * a burning lens. Drive with run(), update(dt, t), draw(ctx, c, t).
 */
export class Apparatus {
  constructor(seed = 1) {
    this.seed = seed;
    this.metal = 'tin';
    this.physics = 'oxygen';
    this.sealed = true;
    this.reset();
  }

  reset() {
    this.phase = 'idle';
    this.age = 0;
    this.progress = 0;       // heat progress 0..1
    this.opened = 0;         // stopper 0..1
    this.rushed = 0;         // how much of the rush has happened 0..1
    this.moved = 0;          // dish moved to the small balance 0..1
    this.done = false;
    this.gas = new Gas(this.seed, JAR_BOX);
    this.openAir = new Gas(this.seed + 50, { x0: 20, x1: 440, y0: 60, y1: 400 });
  }

  run() {
    this.reset();
    this.phase = 'weigh';
  }

  get busy() { return this.phase !== 'idle' && this.phase !== 'done'; }
  get sign() { return this.physics === 'oxygen' ? 1 : -1; }

  /** Mass of the metal (with its calx) right now. */
  metalMass() { return METAL_G + this.sign * SHIFT_G * this.progress; }

  /** The balance: the sealed jar and everything in it; once the jar is lifted off, the metal alone. */
  mainReading() {
    if (!this.sealed || this.moved >= 0.4) return this.metalMass();
    return JAR_G + AIR_G + METAL_G + this.sign * SHIFT_G * this.rushed;
  }

  /** True once the balance is weighing the metal alone. */
  get alone() { return !this.sealed || this.moved >= 0.4; }

  /** Advance; returns the name of a phase that just finished, or null. */
  update(dt, t) {
    let ended = null;
    if (this.busy) {
      this.age += dt;
      const len = T[this.phase];
      if (this.phase === 'heat') this.progress = clamp01(this.age / len);
      if (this.phase === 'open') { this.opened = smooth(0, 0.35, this.age / len); this.rushed = smooth(0.2, 1, this.age / len); }
      if (this.phase === 'alone') this.moved = smooth(0.1, 0.9, this.age / len);
      if (this.age >= len) {
        ended = this.phase;
        this.age = 0;
        const order = this.sealed ? ['weigh', 'heat', 'open', 'alone', 'done'] : ['weigh', 'heat', 'done'];
        this.phase = order[order.indexOf(this.phase) + 1];
        if (this.phase === 'done') this.done = true;
      }
    }
    const heating = this.phase === 'heat';
    const metalPt = { x: MAIN.x, y: METAL_Y - 6 };
    if (heating && this.physics === 'phlogiston' && Math.random() < dt * 5) {
      (this.sealed ? this.gas : this.openAir).dots.push({ x: metalPt.x + (Math.random() - 0.5) * 30, y: metalPt.y - 6, vx: 0, vy: -40, kind: 'p' });
    }
    const sink = heating && this.physics === 'oxygen' ? metalPt : null;
    if (this.sealed) {
      // Opening: in the real world outside air rushes in through the neck; in the
      // phlogiston world the over-full jar pushes air out.
      if (this.phase === 'open' && this.opened > 0.5) {
        const n = jarNeck(JAR_BOX);
        if (this.sign > 0 && Math.random() < dt * 14) {
          this.gas.dots.push({ x: n.x + (Math.random() - 0.5) * 20, y: n.y - 60, vx: 0, vy: 90, kind: Math.random() < 0.2 ? 'o' : 'n',
            target: { x: n.x, y: n.y + 30, leave: true, next: null } });
        }
        if (this.sign < 0 && Math.random() < dt * 14) {
          const d = this.gas.dots.find((q) => !q.target);
          if (d) d.target = { x: n.x, y: n.y, leave: true, next: { x: n.x + 60, y: n.y - 200 } };
        }
      }
      this.gas.update(dt, t, true, sink);
    } else {
      this.openAir.update(dt, t, false, sink);
      while (this.openAir.dots.filter((d) => d.kind !== 'p').length < 30) {
        this.openAir.dots.push({ x: 24, y: 80 + Math.random() * 280, vx: 20, vy: 0, kind: Math.random() < 0.2 ? 'o' : 'n' });
      }
    }
    return ended;
  }

  draw(ctx, c, t, o = {}) {
    const heating = this.phase === 'heat';
    drawBurningLens(ctx, c, heating ? 1 : 0, t);
    if (!this.sealed) this.openAir.draw(ctx, c);
    drawBalance(ctx, c, MAIN.x, MAIN.py, this.mainReading(), { pop: o.pop || 0 });
    drawTile(ctx, c, MAIN.x, MAIN.py, 120);
    const mx = MAIN.x, my = METAL_Y;
    const jarLift = this.sealed ? smooth(0, 1, this.moved) : 0;
    drawMetal(ctx, c, this.metal, mx, my, this.progress, t);
    if (heating && this.physics === 'oxygen') {
      ctx.beginPath();
      ctx.arc(mx, my - 6, 22 + 4 * Math.sin(t * 10), 0, Math.PI * 2);
      ctx.strokeStyle = alpha(c.s1, 0.5);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (this.sealed) {
      ctx.save();
      ctx.globalAlpha *= 1 - jarLift;
      if (jarLift < 0.05) this.gas.draw(ctx, c);
      const lifted = { ...JAR_BOX, y0: JAR_BOX.y0 - jarLift * 140, y1: JAR_BOX.y1 - jarLift * 140 };
      drawJar(ctx, c, lifted, 0, { neck: true, open: this.opened });
      ctx.restore();
    }
  }
}

export const LAYOUT = { MAIN, METAL_Y };
