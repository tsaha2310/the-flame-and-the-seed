/**
 * FlaskKit - drawing helpers for the three L00-01-02 scenes (SwanNeckFlaskScene,
 * -results, -pickle-world): flasks, Redi's jars, flies, maggots, flames, dust.
 * Not a scene: no class export. The course-wide look (palette, chips, wall,
 * microbes, confetti) lives in ../shared/StoryKit.js and is re-exported here.
 */
import { smooth } from 'simulations/base/SimMotion.js';
import {
  alpha, mix, lighten, darken, rr, ellipse, blob, drawMicrobe, mulberry32,
} from '../shared/StoryKit.js';

export * from '../shared/StoryKit.js';

// -- Characters and things ---------------------------------------------------


/** Side-view fly: violet body, red eye, fluttering glass wings. o: { landed, dir, ph } */
export function drawFly(ctx, c, x, y, s, t, o = {}) {
  const flap = o.landed ? 0.35 : 0.3 + 0.7 * Math.abs(Math.sin(t * 48 + (o.ph || 0)));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((o.dir || 1) * s, s);
  if (o.landed) {
    ctx.strokeStyle = darken(c.s5, 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const lx of [-3, 1, 4]) { ctx.moveTo(lx, 2); ctx.lineTo(lx - 1.5, 6); }
    ctx.stroke();
  }
  ellipse(ctx, -1.5, -5, 5.5, 3.2 * flap + 0.6, -0.5);
  ctx.fillStyle = alpha(lighten(c.glass, 0.55), 0.75);
  ctx.fill();
  ellipse(ctx, -3.5, -4, 5, 2.8 * flap + 0.5, -0.9);
  ctx.fill();
  ellipse(ctx, -1, 1, 6.5, 3.8);
  ctx.fillStyle = darken(c.s5, 0.35);
  ctx.fill();
  ellipse(ctx, -1, 0, 6.5, 3.4);
  ctx.fillStyle = c.s5;
  ctx.fill();
  ctx.fillStyle = darken(c.s5, 0.4);
  ctx.fillRect(-4, -2.5, 1.6, 5.5);
  ctx.fillRect(-1, -3, 1.6, 6);
  ctx.beginPath();
  ctx.arc(6, -0.5, 3.4, 0, Math.PI * 2);
  ctx.fillStyle = c.s5;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(7, -1.2, 2.3, 0, Math.PI * 2);
  ctx.fillStyle = c.s6;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(7.6, -1.9, 0.8, 0, Math.PI * 2);
  ctx.fillStyle = lighten(c.s6, 0.8);
  ctx.fill();
  ctx.restore();
}

/** Pale wriggling maggot, side view. */
export function drawMaggot(ctx, c, x, y, s, t, ph) {
  const col = lighten(c.warning, 0.5);
  const wig = Math.sin(t * 7 + ph);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wig * 0.18);
  ctx.scale(s * (1 + wig * 0.1), s * (1 - wig * 0.06));
  rr(ctx, -7, -1.5, 14, 6, 3);
  ctx.fillStyle = darken(col, 0.3);
  ctx.fill();
  rr(ctx, -7, -3, 14, 6, 3);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.strokeStyle = darken(col, 0.25);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const sx of [-3, 0, 3]) { ctx.moveTo(sx, -2); ctx.lineTo(sx, 2); }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(5, -1, 0.9, 0, Math.PI * 2);
  ctx.fillStyle = darken(col, 0.7);
  ctx.fill();
  ctx.restore();
}



/** Dust grain: small irregular two-tone blob. */
export function drawDust(ctx, c, x, y, r, ph = 0) {
  const col = mix(c.waste, c.labelMuted, 0.45);
  blob(ctx, x, y + r * 0.25, r, r * 0.8, 5, 0.25, ph);
  ctx.fillStyle = darken(col, 0.3);
  ctx.fill();
  blob(ctx, x, y, r, r * 0.8, 5, 0.25, ph);
  ctx.fillStyle = col;
  ctx.fill();
}

// -- Flasks ------------------------------------------------------------------

// Swan-neck centreline as three cubic Beziers (units of body radius R, body
// centre at 0,0): rise and arc over, dip down into the trap, rise to the mouth.
const SWAN_CP = [[0, -0.9], [0, -2.0], [0.95, -2.15], [1.02, -1.45], [1.08, -0.92], [1.62, -0.88],
  [1.74, -1.38], [1.84, -1.8], [1.98, -2.0], [2.22, -2.08]];
const STRAIGHT_CP = SWAN_CP.map((_, i) => [0, -0.9 - (1.25 * i) / 9]);
const SEG = 20;

function cubic(a, b, cc, d, t) {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * cc + t * t * t * d;
}

/** Sampled neck centreline (local px), morph 0 = straight, 1 = swan. 61 points. */
export function neckPath(R, morph) {
  const cp = SWAN_CP.map((p, i) => [
    (STRAIGHT_CP[i][0] + (p[0] - STRAIGHT_CP[i][0]) * morph) * R,
    (STRAIGHT_CP[i][1] + (p[1] - STRAIGHT_CP[i][1]) * morph) * R,
  ]);
  const out = [];
  for (let s = 0; s < 3; s++) {
    const [a, b, cc, d] = [cp[s * 3], cp[s * 3 + 1], cp[s * 3 + 2], cp[s * 3 + 3]];
    for (let i = 0; i < SEG; i++) {
      const t = i / SEG;
      out.push({ x: cubic(a[0], b[0], cc[0], d[0], t), y: cubic(a[1], b[1], cc[1], d[1], t) });
    }
  }
  const e = cp[9];
  out.push({ x: e[0], y: e[1] });
  return out;
}

/** Index of the lowest point of the trap (middle segment). */
export function dipIndex(path) {
  let best = SEG, by = -Infinity;
  for (let i = SEG; i <= SEG * 2; i++) if (path[i].y > by) { by = path[i].y; best = i; }
  return best;
}

export const SNAP_INDEX = 4;   // just above the body, before the arc

function strokePath(ctx, pts, from, to, width, col) {
  if (to - from < 1) return;
  ctx.beginPath();
  ctx.moveTo(pts[from].x, pts[from].y);
  const end = Math.min(pts.length - 1, Math.floor(to));
  for (let i = from + 1; i <= end; i++) ctx.lineTo(pts[i].x, pts[i].y);
  const frac = to - end;
  if (frac > 0 && end + 1 < pts.length) {
    const a = pts[end], b = pts[end + 1];
    ctx.lineTo(a.x + (b.x - a.x) * frac, a.y + (b.y - a.y) * frac);
  }
  ctx.lineWidth = width;
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** Point along the path at a fractional index. */
export function pathAt(pts, idx) {
  const i = Math.max(0, Math.min(pts.length - 1, Math.floor(idx)));
  const j = Math.min(pts.length - 1, i + 1);
  const f = idx - i;
  return { x: pts[i].x + (pts[j].x - pts[i].x) * f, y: pts[i].y + (pts[j].y - pts[i].y) * f };
}

/** Fresh flask state. kind: 'open' | 'sealed' | 'swan'. */
export function makeFlask(kind, x, y, R, seed) {
  const rnd = mulberry32(seed);
  const microbes = [];
  for (let i = 0; i < 18; i++) {
    microbes.push({ u: rnd() * 2 - 1, v: 0.1 + rnd() * 0.85, ph: rnd() * 6.28, r: 3.6 + rnd() * 2.2, alt: rnd() < 0.3 });
  }
  const pile = [];
  for (let i = 0; i < 16; i++) pile.push({ dx: (rnd() - 0.5) * 1.8, dy: rnd(), r: 2.6 + rnd() * 1.8, ph: rnd() * 6 });
  return {
    kind, x, y, R, morph: kind === 'swan' ? 1 : 0,
    snapped: false, snapAge: -1, tilt: 0, stream: 0,
    cloud: 0, contamDay: null, pile: 0, boil: 0, microbes, pileDots: pile,
  };
}

const LEVEL = -0.12;   // broth surface, units of R above the body centre

/** World position of the mouth (untilted); null if the neck is snapped off. */
export function flaskMouth(f) {
  const pts = neckPath(f.R, f.morph);
  const p = f.snapped ? pts[SNAP_INDEX] : pts[pts.length - 1];
  return { x: f.x + p.x, y: f.y + p.y };
}
export function flaskDip(f) {
  const pts = neckPath(f.R, f.morph);
  const p = pts[dipIndex(pts)];
  return { x: f.x + p.x, y: f.y + p.y };
}
/** World-space broth surface y (untilted). */
export function brothTop(f) { return f.y + LEVEL * f.R; }

/** Broth colour for a cloudiness 0..1. */
export function brothColor(c, cloud) {
  const clear = alpha(lighten(c.broth, 0.12), 0.6);
  const cloudy = mix(mix(c.broth, c.labelMuted, 0.55), c.waste, 0.35);
  return mix(clear, cloudy, cloud);
}

/**
 * Draws one flask. f from makeFlask(); t is the scene clock.
 * Draw order: neck outline, body outline, glass interiors, broth + microbes,
 * broth stream into the neck, dust pile in the trap, highlights, lip or cork.
 */
export function drawFlask(ctx, c, f, t, o = {}) {
  const R = f.R;
  const pts = neckPath(R, f.morph);
  const end = f.snapped ? SNAP_INDEX : pts.length - 1;
  const nw = R * 0.26;
  const edge = alpha(c.glass, 0.9);
  const inner = mix(c.bgDeep, c.glass, 0.14);

  if (!o.noStand) {
    ellipse(ctx, f.x, f.y + R * 0.98, R * 0.62, R * 0.2);
    ctx.fillStyle = darken(c.wood, 0.55);
    ctx.fill();
    ellipse(ctx, f.x, f.y + R * 0.93, R * 0.62, R * 0.18);
    ctx.fillStyle = darken(c.wood, 0.3);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.tilt || 0);

  strokePath(ctx, pts, 0, end, nw + 6, edge);
  ctx.beginPath();
  ctx.arc(0, 0, R + 3, 0, Math.PI * 2);
  ctx.fillStyle = edge;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = inner;
  ctx.fill();
  strokePath(ctx, pts, 0, end, nw, inner);

  // Broth: clipped to the body, surface kept level in world space.
  const bcol = brothColor(c, f.cloud);
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R - 1, 0, Math.PI * 2);
  ctx.clip();
  ctx.rotate(-(f.tilt || 0));
  const level = LEVEL * R;
  ctx.fillStyle = bcol;
  ctx.fillRect(-R * 1.5, level, R * 3, R * 3);
  ctx.fillStyle = lighten(bcol, 0.3);
  ctx.fillRect(-R * 1.5, level, R * 3, 3);
  if (f.cloud < 0.4) {
    ctx.fillStyle = alpha(lighten(c.broth, 0.7), 0.7 * (1 - f.cloud / 0.4));
    rr(ctx, -R * 0.55, level + R * 0.22, R * 0.34, 4, 2);
    ctx.fill();
    rr(ctx, -R * 0.4, level + R * 0.36, R * 0.16, 4, 2);
    ctx.fill();
  }
  if (f.cloud > 0.05) {
    for (let i = 0; i < 3; i++) {
      blob(ctx, Math.sin(t * 0.4 + i * 2) * R * 0.4, level + R * (0.35 + i * 0.18), R * 0.3, R * 0.14, 6, 0.3, t + i);
      ctx.fillStyle = alpha(darken(c.waste, 0.2), 0.35 * f.cloud);
      ctx.fill();
    }
  }
  const nMic = Math.floor(f.cloud * f.microbes.length + 0.001);
  for (let i = 0; i < nMic; i++) {
    const m = f.microbes[i];
    const y = level + m.v * (R - level) * 0.9 + Math.sin(t * 1.2 + m.ph) * 2;
    const half = Math.sqrt(Math.max(0, R * R - y * y)) * 0.82;
    const x = m.u * half + Math.cos(t * 0.9 + m.ph) * 2;
    const pop = Math.min(1, (f.cloud * f.microbes.length - i) * 1.5);
    drawMicrobe(ctx, x, y, m.r * pop, m.alt ? c.s5 : c.s3, t, { ph: m.ph });
  }
  if (f.boil > 0) {
    ctx.strokeStyle = alpha(lighten(c.broth, 0.6), 0.9 * f.boil);
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const u = (t * 0.9 + i * 0.137) % 1;
      const by = R * 0.85 - u * (R * 0.85 - level);
      ctx.beginPath();
      ctx.arc(Math.sin(i * 2.1) * R * 0.5, by, 2 + (i % 3), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Broth pushed into the neck (a tilt): runs from the body toward the trap.
  if (f.stream > 0) {
    const dip = dipIndex(pts);
    strokePath(ctx, pts, 0, dip * f.stream, nw - 4, bcol);
  }

  // Dust caught in the trap.
  if (f.pile > 0 && f.kind === 'swan' && (!f.snapped || dipIndex(pts) < SNAP_INDEX)) {
    const d = pts[dipIndex(pts)];
    const n = Math.round(f.pile * f.pileDots.length);
    for (let i = 0; i < n; i++) {
      const p = f.pileDots[i];
      drawDust(ctx, c, d.x + p.dx * nw * 0.45, d.y + nw * 0.28 - p.dy * nw * 0.35, p.r, p.ph);
    }
  }

  // Highlights: one lighter arc on the body, one along the neck.
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.74, Math.PI * 1.1, Math.PI * 1.38);
  ctx.strokeStyle = alpha(lighten(c.glass, 0.6), 0.85);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();
  strokePath(ctx, pts.map((p) => ({ x: p.x - nw * 0.22, y: p.y })), 1, Math.min(end, 9), 2, alpha(lighten(c.glass, 0.6), 0.6));

  if (f.snapped) {
    const p = pts[SNAP_INDEX];
    ctx.beginPath();
    ctx.moveTo(p.x - nw / 2 - 3, p.y + 2);
    for (let k = 0; k <= 4; k++) ctx.lineTo(p.x - nw / 2 - 3 + ((nw + 6) * k) / 4, p.y + (k % 2 ? -5 : 1));
    ctx.lineTo(p.x + nw / 2 + 3, p.y + 4);
    ctx.closePath();
    ctx.fillStyle = edge;
    ctx.fill();
  } else if (f.kind === 'sealed') {
    const p = pts[pts.length - 1];
    rr(ctx, p.x - nw / 2 - 3, p.y - R * 0.16 + 3, nw + 6, R * 0.34, 6);
    ctx.fillStyle = darken(c.wood, 0.45);
    ctx.fill();
    rr(ctx, p.x - nw / 2 - 3, p.y - R * 0.16, nw + 6, R * 0.34, 6);
    ctx.fillStyle = darken(c.wood, 0.15);
    ctx.fill();
  } else {
    const p = pts[pts.length - 1], q = pts[pts.length - 2];
    const a = Math.atan2(p.y - q.y, p.x - q.x) + Math.PI / 2;
    const hw = nw / 2 + 5;
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(a) * hw, p.y - Math.sin(a) * hw);
    ctx.lineTo(p.x + Math.cos(a) * hw, p.y + Math.sin(a) * hw);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.restore();
  return { pts, nw };
}

/** The piece that breaks off a snapped swan neck, falling away (age in s). */
export function drawNeckPiece(ctx, c, f, age) {
  if (age < 0 || age > 1.2) return;
  const R = f.R;
  const pts = neckPath(R, f.morph);
  const nw = R * 0.26;
  const u = age / 1.2;
  const ox = u * R * 1.1, oy = u * u * R * 2.4;
  const p0 = pts[SNAP_INDEX];
  ctx.save();
  ctx.globalAlpha *= 1 - u;
  ctx.translate(f.x + p0.x + ox, f.y + p0.y + oy);
  ctx.rotate(u * 1.4);
  ctx.translate(-p0.x, -p0.y);
  strokePath(ctx, pts, SNAP_INDEX, pts.length - 1, nw + 6, alpha(c.glass, 0.9));
  strokePath(ctx, pts, SNAP_INDEX, pts.length - 1, nw, mix(c.bgDeep, c.glass, 0.14));
  ctx.restore();
}

/** Mini flask icon for legends: clear or cloudy. */
export function drawFlaskIcon(ctx, c, x, y, cloud, t) {
  const f = makeFlask('open', x, y, 13, 7);
  f.cloud = cloud;
  drawFlask(ctx, c, f, t, { noStand: true });
}

// -- Jars (Redi) -------------------------------------------------------------

/**
 * Redi's jar: glass, meat inside, optionally a tied cloth. j: { x, y (bottom
 * centre), w, h, covered, maggots 0..1, eggs 0..1 }.
 */
export function drawJar(ctx, c, j, t) {
  const { x, y, w, h } = j;
  const edge = alpha(c.glass, 0.9);
  const inner = mix(c.bgDeep, c.glass, 0.14);
  ellipse(ctx, x, y + 2, w * 0.52, 7);
  ctx.fillStyle = alpha(darken(c.bgDeep, 0.4), 0.6);
  ctx.fill();
  rr(ctx, x - w / 2 - 3, y - h - 3, w + 6, h + 6, 11);
  ctx.fillStyle = edge;
  ctx.fill();
  rr(ctx, x - w / 2, y - h, w, h, 9);
  ctx.fillStyle = inner;
  ctx.fill();
  // Meat: a pink blob with a fat streak.
  const my = y - h * 0.2;
  blob(ctx, x, my + 4, w * 0.3, h * 0.13, 7, 0.1, 1.2);
  ctx.fillStyle = darken(c.meat, 0.35);
  ctx.fill();
  blob(ctx, x, my, w * 0.3, h * 0.13, 7, 0.1, 1.2);
  ctx.fillStyle = c.meat;
  ctx.fill();
  ctx.strokeStyle = lighten(c.meat, 0.55);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.16, my - 2);
  ctx.quadraticCurveTo(x, my - h * 0.07, x + w * 0.14, my + 1);
  ctx.stroke();
  const nMag = Math.round((j.maggots || 0) * 7);
  for (let i = 0; i < nMag; i++) {
    drawMaggot(ctx, c, x - w * 0.22 + (i % 4) * w * 0.14, my - h * 0.09 + Math.floor(i / 4) * 7, 1, t, i * 1.7);
  }
  rr(ctx, x - w / 2 + 7, y - h + 12, 6, h * 0.55, 3);
  ctx.fillStyle = alpha(lighten(c.glass, 0.6), 0.6);
  ctx.fill();
  // Rim.
  rr(ctx, x - w / 2 - 6, y - h - 9, w + 12, 12, 6);
  ctx.fillStyle = edge;
  ctx.fill();
  if (j.covered) {
    const cloth = mix(c.labelMuted, c.bgSurface, 0.25);
    rr(ctx, x - w / 2 - 10, y - h - 14, w + 20, 20, 8);
    ctx.fillStyle = darken(cloth, 0.3);
    ctx.fill();
    rr(ctx, x - w / 2 - 10, y - h - 17, w + 20, 18, 8);
    ctx.fillStyle = cloth;
    ctx.fill();
    ctx.strokeStyle = alpha(darken(cloth, 0.35), 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 1; k < 8; k++) {
      const lx = x - w / 2 - 10 + ((w + 20) * k) / 8;
      ctx.moveTo(lx, y - h - 15); ctx.lineTo(lx, y - h - 1);
    }
    ctx.stroke();
    ctx.fillStyle = cloth;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + s * (w / 2 + 10), y - h - 6);
      ctx.lineTo(x + s * (w / 2 + 2), y - h + 18);
      ctx.lineTo(x + s * (w / 2 - 6), y - h - 2);
      ctx.closePath();
      ctx.fill();
    }
    rr(ctx, x - w / 2 - 4, y - h + 1, w + 8, 5, 6);
    ctx.fillStyle = c.s6;
    ctx.fill();
    const nEgg = Math.round((j.eggs || 0) * 6);
    for (let i = 0; i < nEgg; i++) {
      ellipse(ctx, x - w * 0.3 + i * w * 0.12, y - h - 18, 3, 1.8, 0.3);
      ctx.fillStyle = lighten(c.warning, 0.65);
      ctx.fill();
    }
  }
}

// -- Flies around jars -------------------------------------------------------

export function makeFlies(homes) {
  return homes.map((home, i) => ({
    home, ph: i * 1.37, w1: 0.9 + (i % 3) * 0.23, w2: 1.3 + (i % 2) * 0.4, x: 0, y: 0, dir: 1, landed: false,
  }));
}

/**
 * Buzz each fly around its jar; with `landing` on, each one keeps dropping in
 * - onto the meat through an open mouth, onto the cloth of a covered jar.
 * Moves sideways first, then down, so a fly enters through the mouth.
 */
export function stepFlies(flies, jars, clock, landing) {
  for (const fl of flies) {
    const jar = jars[fl.home];
    const top = jar.y - jar.h;
    const bx = jar.x + jar.w * 0.56 * Math.sin(clock * fl.w1 + fl.ph);
    const by = top - 44 + 24 * Math.sin(clock * fl.w2 + fl.ph * 1.3);
    let w = 0;
    if (landing) {
      const ph = (clock * 0.31 + fl.ph) % 1;
      w = smooth(0.45, 0.6, ph) - smooth(0.85, 1, ph);
    }
    const off = (((fl.ph * 7) % 1) - 0.5) * jar.w * 0.45;
    const lx = jar.x + off;
    const ly = jar.covered ? top - 21 : jar.y - jar.h * 0.32;
    const nx = bx + (lx - bx) * smooth(0, 0.5, w);
    const ny = by + (ly - by) * smooth(0.4, 1, w);
    if (Math.abs(nx - fl.x) > 0.3) fl.dir = nx > fl.x ? 1 : -1;
    fl.x = nx;
    fl.y = ny;
    fl.landed = w > 0.95;
  }
}

