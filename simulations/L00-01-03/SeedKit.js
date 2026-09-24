/**
 * SeedKit - drawing helpers for the L00-01-03 canvas scenes (SeedRaceScene,
 * -day-2, -results): moong seeds seen from above (dry, soaked, boiled,
 * cracked, root out, shoot open), water bowls, the wooden table, and the
 * growth model the race runs on. Not a scene: no class export. The course
 * look (palette, chips, microbes, confetti) comes from ../shared/StoryKit.js
 * and is re-exported here.
 */
import { smooth, clamp01 } from 'simulations/base/SimMotion.js';
import {
  W, H, alpha, mix, lighten, darken, rr, ellipse, mulberry32,
} from '../shared/StoryKit.js';

export * from '../shared/StoryKit.js';

// -- Colours for seed parts, all derived from closed-palette tokens -----------

export function seedCoat(c, boiled) {
  return boiled ? lighten(mix(c.mold, c.waste, 0.45), 0.18) : c.mold;
}
/** Inside of the seed: the two pale halves. */
export function seedInner(c) { return lighten(c.broth, 0.55); }
/** The root: cream, with a darker rim so it reads on light and dark. */
export function rootColor(c) { return lighten(c.warning, 0.72); }
export function leafColor(c) { return mix(c.good, c.mold, 0.4); }

// -- Table and bowl (top-down) -------------------------------------------------

export function drawTable(ctx, c) {
  const top = mix(c.wood, c.bgSurface, 0.62);
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, H);
  // Plank seams as strokes, not fillRects: a thin filled rect reads as a
  // text container to the headless legibility check.
  ctx.strokeStyle = darken(top, 0.12);
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let y = 1.5; y < H; y += 58) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.strokeStyle = alpha(darken(top, 0.2), 0.6);
  ctx.lineWidth = 2;
  for (let k = 0; k < 9; k++) {
    const y = 20 + k * 58 + ((k * 17) % 23);
    ctx.beginPath();
    ctx.moveTo((k * 97) % 300, y);
    ctx.quadraticCurveTo(((k * 97) % 300) + 90, y - 6, ((k * 97) % 300) + 180, y);
    ctx.stroke();
  }
}

/** Bowl seen from above: rim, water, moving ripple. Seeds are drawn after. */
export function drawBowl(ctx, c, x, y, r, t) {
  const steel = mix(c.labelMuted, c.bgSurface, 0.15);
  ctx.beginPath();
  ctx.arc(x, y + 6, r + 12, 0, Math.PI * 2);
  ctx.fillStyle = alpha(darken(c.bgDeep, 0.3), 0.35);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r + 12, 0, Math.PI * 2);
  ctx.fillStyle = steel;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = darken(steel, 0.25);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = mix(darken(steel, 0.3), c.water, 0.35);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r + 7, Math.PI * 1.08, Math.PI * 1.42);
  ctx.strokeStyle = lighten(steel, 0.45);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** Water surface over the seeds: a faint tint and two drifting glints. */
export function drawWaterTop(ctx, c, x, y, r, t) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = alpha(c.water, 0.1);
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.strokeStyle = alpha(lighten(c.water, 0.6), 0.45);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    const u = (t * 0.07 + k * 0.5) % 1;
    const gy = y - r + u * r * 2;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5 + k * 20, gy);
    ctx.quadraticCurveTo(x - r * 0.2 + k * 20, gy - 6, x + r * 0.1 + k * 20, gy);
    ctx.stroke();
  }
  ctx.restore();
}

// -- The seed -----------------------------------------------------------------

/**
 * A moong seed from above. o: {
 *   ang      long-axis angle (radians)
 *   swell    0 dry .. 1 fully soaked
 *   boiled   duller coat, fatter, softer
 *   crack    0..1 coat splitting open at the hilum end
 *   root     0..1 root length
 *   shoot    0..1 shoot and first leaves
 *   glow     root tip drawn brighter than life (honesty card)
 *   squash   0..1 squeezed flat (boiled) }
 * s scales the whole seed; base size is 26 x 18 px.
 */
export function drawSeed(ctx, c, x, y, s, t, o = {}) {
  const swell = o.swell ?? 0;
  const k = 1 + swell * (o.boiled ? 0.34 : 0.24);
  const sq = o.squash ?? 0;
  const rx = 13 * s * k * (1 + sq * 0.55);
  const ry = 9 * s * k * (1 - sq * 0.62) * (o.boiled ? 1.06 : 1);
  const coat = seedCoat(c, o.boiled);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.ang ?? 0);

  // Root and shoot come out of the hilum end (+x), curling toward +y.
  const root = o.root ?? 0;
  if (root > 0.01) {
    const L = root * 38 * s;
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const a = u * 1.5;
      pts.push({ x: rx * 0.8 + Math.sin(a) * L * 0.6 * u + u * L * 0.35, y: ry * 0.3 + (1 - Math.cos(a)) * L * 0.55 });
    }
    const col = rootColor(c);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [wd, cc] of [[6 * s + 2, darken(col, 0.45)], [6 * s - 1, col]]) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const p of pts) ctx.lineTo(p.x, p.y);
      ctx.lineWidth = Math.max(1, wd * (0.7 + 0.3 * (1 - root)));
      ctx.strokeStyle = cc;
      ctx.stroke();
    }
    const tip = pts[pts.length - 1];
    if (o.glow) {
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 6 * s + 3 * Math.sin(t * 4), 0, Math.PI * 2);
      ctx.fillStyle = alpha(c.warning, 0.35);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 2.6 * s, 0, Math.PI * 2);
    ctx.fillStyle = lighten(col, 0.5);
    ctx.fill();
  }

  // Cushion shade, coat, highlight.
  ellipse(ctx, 0, ry * 0.18, rx, ry);
  ctx.fillStyle = darken(coat, 0.35);
  ctx.fill();
  ellipse(ctx, 0, 0, rx, ry);
  ctx.fillStyle = coat;
  ctx.fill();
  if (o.boiled && swell > 0.3) {
    ctx.strokeStyle = alpha(darken(coat, 0.25), 0.7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-rx * 0.5, -ry * 0.1);
    ctx.quadraticCurveTo(-rx * 0.1, ry * 0.25, rx * 0.35, -ry * 0.05);
    ctx.stroke();
  }
  if (sq > 0.4) {
    ellipse(ctx, rx * 0.1, 0, rx * 0.55 * sq, ry * 0.6);
    ctx.fillStyle = seedInner(c);
    ctx.fill();
  }
  ellipse(ctx, -rx * 0.35, -ry * 0.4, rx * 0.32, ry * 0.2, -0.2);
  ctx.fillStyle = lighten(coat, 0.45);
  ctx.fill();
  // Hilum: the pale scar on the side.
  rr(ctx, rx * 0.05, ry * 0.52, rx * 0.55, Math.max(2, ry * 0.2), 2);
  ctx.fillStyle = lighten(coat, 0.75);
  ctx.fill();

  const crack = o.crack ?? 0;
  if (crack > 0.01) {
    ctx.beginPath();
    ctx.moveTo(rx * 0.98, ry * 0.1);
    ctx.quadraticCurveTo(rx * (1 - crack * 0.7), -ry * 0.1 * crack, rx * (0.98 - crack * 0.9), ry * 0.12);
    ctx.quadraticCurveTo(rx * (1 - crack * 0.6), ry * 0.35 * crack, rx * 0.98, ry * 0.1);
    ctx.closePath();
    ctx.fillStyle = seedInner(c);
    ctx.fill();
  }

  const shoot = o.shoot ?? 0;
  if (shoot > 0.01) {
    const col = leafColor(c);
    const bx = rx * 0.7, by = -ry * 0.2;
    ctx.strokeStyle = darken(col, 0.2);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + 8 * s * shoot, by - 12 * s * shoot, bx + 4 * s * shoot, by - 20 * s * shoot);
    ctx.stroke();
    const lx = bx + 4 * s * shoot, ly = by - 20 * s * shoot;
    for (const side of [-1, 1]) {
      ellipse(ctx, lx + side * 7 * s * shoot, ly - 2 * s, 8 * s * shoot, 4.5 * s * shoot, side * 0.5);
      ctx.fillStyle = darken(col, 0.25);
      ctx.fill();
      ellipse(ctx, lx + side * 7 * s * shoot, ly - 3.5 * s, 8 * s * shoot, 4.5 * s * shoot, side * 0.5);
      ctx.fillStyle = col;
      ctx.fill();
    }
  }
  ctx.restore();
}

// -- Seeds in a bowl, and the growth model ---------------------------------------

/** Ten non-overlapping seed spots in a bowl of radius r (seeded, stable). */
export function seedSpots(r, seed, n = 10) {
  const rnd = mulberry32(seed);
  const out = [];
  // Relax the spacing until all n fit, so a bowl always holds exactly n seeds.
  for (let gap = r * 0.3; out.length < n; gap *= 0.9) {
    for (let guard = 0; out.length < n && guard < 400; guard++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.58;
      const p = { dx: Math.cos(a) * d, dy: Math.sin(a) * d, ang: rnd() * Math.PI * 2, u: rnd(), v: rnd() };
      if (out.every((q) => Math.hypot(q.dx - p.dx, q.dy - p.dy) > gap)) out.push(p);
    }
  }
  return out;
}

export const SOAK = {
  room: { lo: 1.3, hi: 2.6, alive: 1.0 },
  warm: { lo: 0.7, hi: 1.4, alive: 1.0 },
  cold: { lo: 3.6, hi: 7.5, alive: 0.8 },
};

/** Day each seed first cracks its coat, or Infinity if it never will. */
export function sproutDays(spots, boilSeconds, soak) {
  const s = SOAK[soak] || SOAK.room;
  return spots.map((p) => {
    if (boilSeconds > 0) return Infinity;
    if (p.v > s.alive) return Infinity;
    return s.lo + p.u * (s.hi - s.lo);
  });
}

/** Growth state of one seed on a given day. */
export function growth(day, sproutDay, boiled) {
  const swell = smooth(0, 0.7, day);
  if (!Number.isFinite(sproutDay)) return { swell, crack: 0, root: 0, shoot: 0, boiled };
  return {
    swell,
    crack: smooth(sproutDay - 0.4, sproutDay, day),
    root: clamp01((day - sproutDay) / 5),
    shoot: smooth(sproutDay + 2.5, sproutDay + 5.5, day),
    boiled,
  };
}
