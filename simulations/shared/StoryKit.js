/**
 * StoryKit - the Flame and the Seed's shared canvas look, for every scene in
 * this course: closed-palette colours (readSimColors) and colour maths on the
 * resolved tokens, bold Duolingo-style chips, the warm kitchen wall, shelf,
 * cards, microbes, stink lines and a confetti burst. Not a scene: no class.
 *
 * Canvas scenes import from here directly (or through a lesson helper that
 * re-exports it, e.g. L00-01-02/FlaskKit.js). Flat fills, one darker cushion
 * shade under each thing, one lighter highlight (docs/simulation-authoring.md 4.5).
 */
import { readSimColors } from 'simulations/base/SimTheme.js';

export const W = 680;
export const H = 520;

export const COLOR_TOKEN_MAP = {
  bgDeep:      ['--sim-bg-deep',        '#0d0a22'],
  bgSurface:   ['--sim-bg-surface',     '#181134'],
  raised:      ['--sim-surface-raised', '#22184a'],
  label:       ['--sim-label',          '#fdfaff'],
  labelMuted:  ['--sim-label-muted',    '#b6abd8'],
  stroke:      ['--sim-stroke',         '#5b4f86'],
  accent:      ['--sim-accent',         '#57ccff'],
  good:        ['--sim-good',           '#54e6a5'],
  bad:         ['--sim-bad',            '#ff8f7a'],
  warning:     ['--sim-warning',        '#ffcf5c'],
  glass:       ['--sim-glass',          '#a8d8ff'],
  broth:       ['--sim-glucose',        '#fbbf24'],
  waste:       ['--sim-waste',          '#78716c'],
  flame:       ['--sim-flame',          '#ff8f3f'],
  meat:        ['--sim-protein',        '#f472b6'],
  mold:        ['--sim-chloro',         '#22c55e'],
  wood:        ['--sim-wedge',          '#ffcf5c'],
  s1:          ['--sim-series-1',       '#38bdf8'],
  s2:          ['--sim-series-2',       '#fbbf24'],
  s3:          ['--sim-series-3',       '#34d399'],
  s4:          ['--sim-series-4',       '#f472b6'],
  s5:          ['--sim-series-5',       '#a78bfa'],
  s6:          ['--sim-series-6',       '#f87171'],
  s7:          ['--sim-series-7',       '#22d3ee'],
  s8:          ['--sim-series-8',       '#fb923c'],
  water:       ['--sim-water',          '#38bdf8'],
  fontBody:    ['--sim-font',           "'Nunito', system-ui, sans-serif"],
  fontDisplay: ['--sim-font-display',   "'Fredoka', 'Nunito', system-ui, sans-serif"],
};

export function loadColors(container) {
  return readSimColors(container, COLOR_TOKEN_MAP);
}

// -- Colour maths on resolved tokens -----------------------------------------

function parseColor(col) {
  const s = String(col || '').trim();
  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((ch) => ch + ch).join('');
    return {
      r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(s);
  if (m) {
    let a = 1;
    if (m[4]) a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  return { r: 128, g: 128, b: 128, a: 1 };
}

function toStr({ r, g, b, a }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgba(${c(r)},${c(g)},${c(b)},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

/** Linear mix of two resolved colours, t = 0 gives c1. */
export function mix(c1, c2, t) {
  const a = parseColor(c1), b = parseColor(c2);
  return toStr({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t, a: a.a + (b.a - a.a) * t });
}
export function alpha(col, k) {
  const p = parseColor(col);
  return toStr({ ...p, a: p.a * k });
}
/** Toward full brightness by t (0..1): a highlight that stays lighter than its fill in both themes. */
export function lighten(col, t) {
  const p = parseColor(col);
  return toStr({ r: p.r + (255 - p.r) * t, g: p.g + (255 - p.g) * t, b: p.b + (255 - p.b) * t, a: p.a });
}
/** Toward black by t (0..1): the flat two-tone cushion shade. */
export function darken(col, t) {
  const p = parseColor(col);
  return toStr({ r: p.r * (1 - t), g: p.g * (1 - t), b: p.b * (1 - t), a: p.a });
}

export function font(c, weight, px, display = false) {
  return `${weight} ${px}px ${display ? c.fontDisplay : c.fontBody}`;
}

export function mulberry32(seed) {
  return function rnd() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function outBack(t) {
  const u = Math.max(0, Math.min(1, t));
  const s = 1.70158, x = u - 1;
  return 1 + (s + 1) * x * x * x + s * x * x;
}

// -- Primitives --------------------------------------------------------------

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/** Full-stadium path from arcs (used for chip lifts: a shadow, not a container). */
export function stadium(ctx, x, y, w, h) {
  const r = h / 2;
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.closePath();
}

export function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}

/** Low-control-point wobbly blob: quadratic curves through the midpoints of n wobbled points. */
export function blob(ctx, x, y, rx, ry, n, wob, phase) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + wob * Math.sin(phase + i * 2.3);
    pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
  }
  ctx.beginPath();
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const m0 = mid(pts[n - 1], pts[0]);
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i], m = mid(p, pts[(i + 1) % n]);
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  ctx.closePath();
}

export function sparkle(ctx, x, y, r, col) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fillStyle = col;
  ctx.fill();
}

/**
 * Bold Duolingo-style chip: solid fill, 3px darker lift, dark ink. The ink is
 * --sim-bg-deep, which is always the opposite polarity of a --sim-series /
 * state colour (bright fills in dark theme, deep fills in light theme).
 * o: { bg, ink, size, align, scale, alpha, display }
 */
export function pill(ctx, c, text, x, y, o = {}) {
  const size = o.size ?? 15;
  const bg = o.bg ?? c.accent;
  const ink = o.ink ?? c.bgDeep;
  ctx.save();
  ctx.font = font(c, 800, size, o.display);
  const tw = ctx.measureText(text).width;
  const h = size + 13;
  const w = tw + 24;
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  const y0 = y - h / 2;
  const s = o.scale ?? 1;
  if (s !== 1) {
    ctx.translate(x0 + w / 2, y);
    ctx.scale(s, s);
    ctx.translate(-(x0 + w / 2), -y);
  }
  ctx.globalAlpha *= o.alpha ?? 1;
  stadium(ctx, x0, y0 + 3, w, h);
  ctx.fillStyle = darken(bg, 0.35);
  ctx.fill();
  rr(ctx, x0, y0, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x0 + w / 2, y + 1);
  ctx.restore();
  return { x0, y0, w, h };
}

/** Pop-in helper: chip scale/alpha for a chip that appears `age` seconds after `at`. */
export function popAt(age, at) {
  const u = (age - at) / 0.35;
  if (u <= 0) return null;
  return { scale: outBack(u), alpha: Math.min(1, u * 2) };
}

/** Dashed leader from a chip to the thing it names, ending in a dot. */
export function leader(ctx, x1, y1, x2, y2, col, a = 1) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x2, y2, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.restore();
}

// -- Backdrop ----------------------------------------------------------------

/** Warm kitchen wall: deep base plus a faint amber diamond tile. */
export function drawWall(ctx, c) {
  ctx.fillStyle = c.bgDeep;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = alpha(c.s2, 0.07);
  for (let row = 0; row * 34 < H; row++) {
    for (let col = 0; col * 34 < W + 34; col++) {
      const x = col * 34 + (row % 2) * 17, y = row * 34 + 10;
      ctx.beginPath();
      ctx.moveTo(x, y - 5); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 5, y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** A sunbeam is literal light, so it earns a soft gradient (house style 4.5). */
export function drawSunbeam(ctx, c, x0, x1, bx0, bx1, yTop, yBot, k = 1) {
  const g = ctx.createLinearGradient(0, yTop, 0, yBot);
  g.addColorStop(0, alpha(c.warning, 0.16 * k));
  g.addColorStop(1, alpha(c.warning, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0, yTop); ctx.lineTo(x1, yTop); ctx.lineTo(bx1, yBot); ctx.lineTo(bx0, yBot);
  ctx.closePath();
  ctx.fill();
}

export function drawShelf(ctx, c, x0, x1, y) {
  const wood = darken(c.wood, 0.3);
  rr(ctx, x0, y + 4, x1 - x0, 14, 7);
  ctx.fillStyle = darken(wood, 0.35);
  ctx.fill();
  rr(ctx, x0, y, x1 - x0, 14, 7);
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.fillStyle = lighten(wood, 0.25);
  ctx.fillRect(x0 + 8, y + 2, x1 - x0 - 16, 3);
}

/** Panel card with the 3px lift, for split layouts. */
export function drawCard(ctx, c, x, y, w, h, a = 1) {
  ctx.save();
  ctx.globalAlpha *= a;
  rr(ctx, x, y + 4, w, h, 11);
  ctx.fillStyle = darken(c.bgSurface, 0.3);
  ctx.fill();
  rr(ctx, x, y, w, h, 11);
  ctx.fillStyle = c.bgSurface;
  ctx.fill();
  ctx.strokeStyle = alpha(c.stroke, 0.8);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

// -- Shared characters -------------------------------------------------------

/** A microbe: flat blob, cushion shade, highlight; big ones get a face. */
export function drawMicrobe(ctx, x, y, r, col, t, o = {}) {
  const ph = o.ph ?? 0;
  const wob = 0.12 + 0.05 * Math.sin(t * 3 + ph);
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  blob(ctx, x, y + r * 0.2, r, r * 0.9, 6, wob, ph + t * 2);
  ctx.fillStyle = darken(col, 0.35);
  ctx.fill();
  blob(ctx, x, y, r, r * 0.9, 6, wob, ph + t * 2);
  ctx.fillStyle = col;
  ctx.fill();
  if (r >= 5) {
    ellipse(ctx, x - r * 0.35, y - r * 0.38, r * 0.28, r * 0.18, -0.5);
    ctx.fillStyle = lighten(col, 0.6);
    ctx.fill();
  }
  if (o.face && r >= 10) {
    const blink = Math.sin(t * 1.3 + ph * 3) > 0.97 ? 0.15 : 1;
    const ex = r * 0.3, ey = -r * 0.05, er = r * 0.2;
    for (const s of [-1, 1]) {
      ellipse(ctx, x + s * ex, y + ey, er, er * 1.15 * blink);
      ctx.fillStyle = lighten(col, 0.9);
      ctx.fill();
      ellipse(ctx, x + s * ex + er * 0.25, y + ey + er * 0.15, er * 0.55, er * 0.62 * blink);
      ctx.fillStyle = darken(col, 0.8);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y + r * 0.28, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = darken(col, 0.7);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    for (const s of [-1, 1]) {
      ellipse(ctx, x + s * r * 0.58, y + r * 0.22, r * 0.14, r * 0.08);
      ctx.fillStyle = alpha(lighten(col, 0.3), 0.5);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Wavy "stink" lines rising from (x, y). */
export function drawStink(ctx, x, y, t, col, a = 1) {
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const u = (t * 0.5 + i / 3) % 1;
    ctx.globalAlpha = a * Math.sin(u * Math.PI) * 0.85;
    const bx = x + (i - 1) * 12, by = y - u * 34;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + 6, by - 6, bx, by - 12);
    ctx.quadraticCurveTo(bx - 6, by - 18, bx, by - 24);
    ctx.stroke();
  }
  ctx.restore();
}

// -- Confetti burst ----------------------------------------------------------

export class Burst {
  constructor() { this.parts = []; }

  fire(x, y, colors, n = 24, spread = 1) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3 * spread;
      const sp = 140 + Math.random() * 230;
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
        life: 0, max: 1.1 + Math.random() * 0.6, col: colors[i % colors.length], shape: i % 3,
      });
    }
  }

  update(dt) {
    for (const p of this.parts) {
      p.life += dt;
      p.vy += 480 * dt;
      p.vx *= 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.parts = this.parts.filter((p) => p.life < p.max);
  }

  draw(ctx) {
    for (const p of this.parts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.shape === 0) {
        ctx.fillStyle = p.col;
        ctx.fillRect(-5, -2.5, 10, 5);
      } else if (p.shape === 1) {
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = p.col;
        ctx.fill();
      } else {
        sparkle(ctx, 0, 0, 6, p.col);
      }
      ctx.restore();
    }
  }
}

/** Two-tone flame (literal light; flat tones plus one faint halo). */
export function drawFlame(ctx, c, x, y, s, t) {
  const f = 1 + 0.08 * Math.sin(t * 23) + 0.05 * Math.sin(t * 37);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s * f);
  ctx.beginPath();
  ctx.arc(0, -8, 16, 0, Math.PI * 2);
  ctx.fillStyle = alpha(c.flame, 0.16);
  ctx.fill();
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

// -- The Lens honesty card -------------------------------------------------------

/** Small spinning clock icon for "time runs fast" rows. */
export function drawClockIcon(ctx, c, x, y, t) {
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fillStyle = c.s2;
  ctx.fill();
  ctx.strokeStyle = c.bgDeep;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(t * 6) * 10, y + Math.sin(t * 6) * 10);
  ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(t * 0.5) * 6, y + Math.sin(t * 0.5) * 6);
  ctx.stroke();
}

/**
 * The Lens honesty card each scene opens with. o: {
 *   age   seconds since the beat began (drives the pop-in and row stagger)
 *   t     scene clock
 *   rows  [{ icon(ctx, x, y, t), text, sub? }]
 *   fold  0..1 - shrinks the card into a corner "THE LENS" chip (1 = chip only)
 *   dim   true to darken the scene behind the open card }
 * Labels only: short lines, as written on the slide's own Lens line.
 */
export function drawLensCard(ctx, c, o) {
  const rows = o.rows || [];
  const fold = o.fold ?? 0;
  const cw = 440;
  const ch = 64 + rows.length * 56;
  const cx = (W - cw) / 2;
  const cy = Math.max(40, (H - ch) / 2);
  if (fold >= 1) {
    pill(ctx, c, 'THE LENS', 16, H - 26, { bg: c.accent, size: 14, align: 'left' });
    return;
  }
  if (o.dim) {
    ctx.fillStyle = alpha(c.bgDeep, 0.6 * (1 - fold));
    ctx.fillRect(0, 0, W, H);
  }
  const s = outBack(((o.age ?? 1) - 0.1) / 0.45) * (1 - 0.7 * fold);
  if (s <= 0) return;
  ctx.save();
  ctx.globalAlpha *= 1 - fold;
  const ox = W / 2 + (60 - W / 2) * fold, oy = cy + ch / 2 + (H - 26 - cy - ch / 2) * fold;
  ctx.translate(ox, oy);
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
  rows.forEach((row, i) => {
    const ra = Math.max(0, Math.min(1, ((o.age ?? 1) - 0.45 - i * 0.2) / 0.3));
    if (ra <= 0) return;
    const ry = cy + 58 + i * 56;
    const ix = cx + 50;
    ctx.save();
    ctx.globalAlpha *= ra;
    row.icon?.(ctx, ix, ry, o.t ?? 0);
    ctx.fillStyle = c.label;
    ctx.font = font(c, 800, 18);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(row.text, ix + 36, row.sub ? ry - 9 : ry);
    if (row.sub) {
      ctx.fillStyle = c.labelMuted;
      ctx.font = font(c, 700, 15);
      ctx.fillText(row.sub, ix + 36, ry + 12);
    }
    ctx.restore();
  });
  ctx.restore();
}
