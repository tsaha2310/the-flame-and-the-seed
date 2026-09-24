/**
 * BurnKit - drawing helpers for the three L01-01-01 canvas scenes
 * (BalanceBurnScene, -results, -eater): steel wool with a crawling glow, a
 * candle, a paper strip, and the burn model. Not a scene: no class export.
 * The course look (../shared/StoryKit.js) and the lab bench - balance, jar,
 * air dots (../shared/LabKit.js) - are re-exported here.
 */
import {
  W, H, alpha, mix, lighten, darken, font, rr, ellipse, blob, mulberry32, drawFlame,
} from '../shared/StoryKit.js';

export * from '../shared/StoryKit.js';
export * from '../shared/LabKit.js';

export const JAR_MASS = 250.0;
export const AIR_MASS = 1.2;

/** What each material does in one burn, by the scene's own model (grams). */
export const MATERIALS = {
  wool: { name: 'steel wool', start: 5.0, open: +0.4, sealedBurn: 0.5 },
  candle: { name: 'candle', start: 20.0, open: -0.6, sealedBurn: 0.35 },
  paper: { name: 'paper', start: 2.0, open: -1.7, sealedBurn: 0.4 },
};

// -- Steel wool --------------------------------------------------------------------

/** Fixed tangle of strands for a wool ball (seeded). */
export function makeWool(seed = 5) {
  const rnd = mulberry32(seed);
  const strands = [];
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
    strands.push({
      x: Math.cos(a) * d, y: Math.sin(a) * d,
      a2: rnd() * Math.PI * 2, len: 0.35 + rnd() * 0.4, bend: (rnd() - 0.5) * 0.9,
    });
  }
  strands.sort((p, q) => p.x - q.x);
  return strands;
}

/**
 * Steel wool ball centred at (x, y), radii rx, ry. burn 0..1 is where the glow
 * front has reached (left to right); behind it the strands are dull black.
 */
export function drawWool(ctx, c, strands, x, y, rx, ry, burn, t) {
  const shiny = mix(c.labelMuted, c.glass, 0.25);
  const black = darken(c.labelMuted, 0.78);
  const front = -1.15 + burn * 2.3;
  ctx.lineCap = 'round';
  // Soft base so the ball reads as one object.
  blob(ctx, x, y + ry * 0.15, rx * 1.02, ry * 0.95, 7, 0.08, 1);
  ctx.fillStyle = alpha(burn > 0.6 ? black : darken(shiny, 0.45), 0.55);
  ctx.fill();
  for (const s of strands) {
    const sx = x + s.x * rx * 0.9, sy = y + s.y * ry * 0.85;
    const ex = sx + Math.cos(s.a2) * rx * s.len, ey = sy + Math.sin(s.a2) * ry * s.len;
    const mx = (sx + ex) / 2 + s.bend * ry, my = (sy + ey) / 2 - s.bend * rx * 0.3;
    const dist = s.x - front;
    let col;
    if (dist > 0.12) col = shiny;
    else if (dist > -0.18) col = mix(c.flame, c.warning, 0.5 + 0.5 * Math.sin(t * 20 + s.a2 * 3));
    else col = black;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.strokeStyle = alpha(lighten(c.labelMuted, 0.2), 0.35);
    ctx.lineWidth = 4;
    if (dist <= -0.18) ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // The glow is literal light: a soft halo at the burning front.
  if (burn > 0 && burn < 1) {
    const gx = x + front * rx * 0.9;
    const g = ctx.createRadialGradient(gx, y, 0, gx, y, ry * 1.4);
    g.addColorStop(0, alpha(c.warning, 0.55));
    g.addColorStop(1, alpha(c.flame, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(gx, y, ry * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  return { frontX: x + front * rx * 0.9 };
}

// -- Candle and paper ----------------------------------------------------------------

/** Candle standing with its base at y. wax 0..1 is how much is left; flame 0..1. */
export function drawCandle(ctx, c, x, y, wax, flame, t, s = 1) {
  const col = lighten(c.warning, 0.62);
  const h = (26 + 70 * wax) * s, w = 30 * s;
  ellipse(ctx, x, y, 30 * s, 7 * s);
  ctx.fillStyle = darken(c.wood, 0.3);
  ctx.fill();
  rr(ctx, x - w / 2, y - h + 4, w, h, 7);
  ctx.fillStyle = darken(col, 0.3);
  ctx.fill();
  rr(ctx, x - w / 2, y - h, w, h, 7);
  ctx.fillStyle = col;
  ctx.fill();
  rr(ctx, x - w / 2 + 4, y - h + 6, 5, h - 12, 3);
  ctx.fillStyle = lighten(col, 0.5);
  ctx.fill();
  ctx.strokeStyle = darken(c.labelMuted, 0.6);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + 1, y - h - 9 * s);
  ctx.stroke();
  if (flame > 0.02) drawFlame(ctx, c, x, y - h - 6 * s, 0.9 * s * flame, t);
  return { top: y - h - 30 * s * flame };
}

/**
 * Paper strip lying on a tile from x0 to x1 at y; burn 0..1 moves the burning
 * edge left to right. Behind it: grey ash in broken flakes.
 */
export function drawPaper(ctx, c, x0, x1, y, burn, t, lit = true) {
  const paper = mix(c.label, c.bgSurface, 0.15);
  const ash = mix(c.labelMuted, c.bgDeep, 0.35);
  const fx = x0 + (x1 - x0) * burn;
  for (let k = 0; k < 6; k++) {
    const ax = x0 + ((fx - x0) * (k + 0.5)) / 6;
    if (ax > fx - 6) break;
    ellipse(ctx, ax, y - 3 + (k % 2) * 2, (fx - x0) / 16 + 2, 3.5, (k % 3) * 0.3);
    ctx.fillStyle = ash;
    ctx.fill();
  }
  if (fx < x1) {
    ctx.beginPath();
    ctx.moveTo(fx, y - 1);
    ctx.quadraticCurveTo((fx + x1) / 2, y - 12, x1, y - 6);
    ctx.lineTo(x1, y + 2);
    ctx.quadraticCurveTo((fx + x1) / 2, y - 4, fx, y + 5);
    ctx.closePath();
    ctx.fillStyle = darken(paper, 0.2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fx, y - 3);
    ctx.quadraticCurveTo((fx + x1) / 2, y - 14, x1, y - 8);
    ctx.lineTo(x1, y - 2);
    ctx.quadraticCurveTo((fx + x1) / 2, y - 8, fx, y + 2);
    ctx.closePath();
    ctx.fillStyle = paper;
    ctx.fill();
    ctx.strokeStyle = darken(c.flame, 0.3);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fx, y - 4);
    ctx.lineTo(fx, y + 4);
    ctx.stroke();
  }
  if (lit && burn > 0 && burn < 1) drawFlame(ctx, c, fx, y - 4, 0.75, t);
  return { frontX: fx };
}

