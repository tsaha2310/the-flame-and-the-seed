/**
 * LabKit - the course's shared lab bench for canvas scenes: Ajji's kitchen
 * balance (0.1 g display), a ceramic tile, the sealed glass jar (with an
 * optional stoppered neck that can open), and faint air dots that can join a
 * thing, escape from it, stay fenced in a jar, or rush through an opening.
 * "Every reaction in this course will be checked on the same balance."
 * Not a scene: no class export. Colours from StoryKit (closed palette).
 */
import { alpha, mix, lighten, darken, font, rr, ellipse, mulberry32 } from './StoryKit.js';

export function grams(v) {
  return `${(Math.round(v * 10) / 10).toFixed(1)} g`;
}

// -- Balance -----------------------------------------------------------------------

/** Kitchen balance: platform top at y, centred on x. s scales it. Returns the display box. */
export function drawBalance(ctx, c, x, y, reading, o = {}) {
  const s = o.s ?? 1;
  const steel = mix(c.labelMuted, c.bgSurface, 0.15);
  const bw = 230 * s, bh = 64 * s;
  rr(ctx, x - bw / 2, y + 14 * s + 5, bw, bh, 11);
  ctx.fillStyle = darken(steel, 0.4);
  ctx.fill();
  rr(ctx, x - bw / 2, y + 14 * s, bw, bh, 11);
  ctx.fillStyle = steel;
  ctx.fill();
  rr(ctx, x - bw / 2 + 10, y + 14 * s + 4, bw - 20, 5, 3);
  ctx.fillStyle = lighten(steel, 0.35);
  ctx.fill();
  rr(ctx, x - 104 * s, y, 208 * s, 14 * s, 7);
  ctx.fillStyle = darken(steel, 0.15);
  ctx.fill();
  rr(ctx, x - 104 * s, y, 208 * s, 5 * s, 3);
  ctx.fillStyle = lighten(steel, 0.3);
  ctx.fill();
  // LCD
  const dw = 132 * s, dh = 38 * s, dx = x - dw / 2 - 10 * s, dy = y + 26 * s;
  rr(ctx, dx, dy, dw, dh, 8);
  ctx.fillStyle = mix(c.bgDeep, c.good, 0.14);
  ctx.fill();
  // Pop by font size, not a transform, so the text stays checkable in canvas coordinates.
  const pop = o.pop ?? 0;
  ctx.fillStyle = o.flash ? o.flash : c.good;
  ctx.font = font(c, 700, Math.round(25 * s * (1 + pop * 0.15)), true);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(grams(reading), dx + dw - 12 * s, dy + dh / 2 + 1);
  ctx.beginPath();
  ctx.arc(x + 88 * s, y + 45 * s, 8 * s, 0, Math.PI * 2);
  ctx.fillStyle = darken(steel, 0.25);
  ctx.fill();
  return { x: dx, y: dy, w: dw, h: dh };
}

/** A small ceramic tile the burning thing sits on. */
export function drawTile(ctx, c, x, y, w) {
  const tile = mix(c.labelMuted, c.bgSurface, 0.45);
  ellipse(ctx, x, y + 2, w / 2, 7);
  ctx.fillStyle = darken(tile, 0.35);
  ctx.fill();
  ellipse(ctx, x, y - 2, w / 2, 7);
  ctx.fillStyle = tile;
  ctx.fill();
}

// -- Sealed jar ------------------------------------------------------------------------

/** Glass jar over the platform: bottom rim at y, centred on x. Drawn over the contents. */
export function jarBox(x, y, w = 190, h = 210) {
  return { x0: x - w / 2, x1: x + w / 2, y0: y - h, y1: y };
}
/** Where the jar's neck opening is, when drawn with { neck: true }. */
export function jarNeck(box) {
  const x = (box.x0 + box.x1) / 2;
  return { x, y: box.y0 - 20, w: 36 };
}

/**
 * o.neck: draw a short neck with a cork stopper on top.
 * o.open: 0..1 lifts the stopper off and tips it aside (the jar is open).
 */
export function drawJar(ctx, c, box, haze = 0, o = {}) {
  const { x0, x1, y0, y1 } = box;
  const w = x1 - x0, r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x0, y1);
  ctx.lineTo(x0, y0 + r);
  ctx.arc(x0 + r, y0 + r, r, Math.PI, 0);
  ctx.lineTo(x1, y1);
  ctx.closePath();
  ctx.fillStyle = alpha(c.glass, 0.1 + haze * 0.18);
  ctx.fill();
  ctx.strokeStyle = alpha(c.glass, 0.85);
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x0 + r, y0 + r, r - 16, Math.PI * 1.1, Math.PI * 1.4);
  ctx.strokeStyle = alpha(lighten(c.glass, 0.6), 0.8);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();
  rr(ctx, x0 - 6, y1 - 8, w + 12, 10, 5);
  ctx.fillStyle = alpha(c.glass, 0.9);
  ctx.fill();
  if (o.neck) {
    const n = jarNeck(box);
    rr(ctx, n.x - n.w / 2, n.y, n.w, 26, 6);
    ctx.fillStyle = alpha(c.glass, 0.18);
    ctx.fill();
    ctx.strokeStyle = alpha(c.glass, 0.85);
    ctx.lineWidth = 4;
    ctx.stroke();
    const u = o.open ?? 0;
    const cx = n.x + u * 46, cy = n.y - 6 - u * 26;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(u * 0.9);
    rr(ctx, -n.w / 2 + 2, -8 + 4, n.w - 4, 20, 6);
    ctx.fillStyle = darken(c.wood, 0.5);
    ctx.fill();
    rr(ctx, -n.w / 2 + 2, -8, n.w - 4, 20, 6);
    ctx.fillStyle = darken(c.wood, 0.2);
    ctx.fill();
    ctx.restore();
  }
}

// -- Air dots -----------------------------------------------------------------------------

/**
 * Faint air dots (the Lens draws air; real air is invisible). Each dot drifts;
 * a scene can pull dots into a point (joining), emit new ones from a point
 * (escaping gas), or fence them inside a jar.
 */
export class Air {
  constructor(seed, n, box) {
    const rnd = mulberry32(seed);
    this.box = box;
    this.dots = Array.from({ length: n }, () => ({
      x: box.x0 + rnd() * (box.x1 - box.x0), y: box.y0 + rnd() * (box.y1 - box.y0),
      vx: (rnd() - 0.5) * 20, vy: (rnd() - 0.5) * 20, gas: false, life: 0,
    }));
  }

  emit(x, y, n = 1) {
    for (let i = 0; i < n; i++) {
      this.dots.push({ x: x + (Math.random() - 0.5) * 10, y, vx: (Math.random() - 0.5) * 18, vy: -30 - Math.random() * 30, gas: true, life: 0 });
    }
  }

  /** fence: a jar box to stay inside, or null for open air. sink: {x, y, r, rate} pulls dots in. */
  update(dt, t, fence, sink) {
    const b = fence || this.box;
    for (const d of this.dots) {
      d.life += dt;
      d.vx += Math.sin(t * 1.3 + d.y * 0.05) * 6 * dt;
      d.vy += Math.cos(t * 1.1 + d.x * 0.05) * 6 * dt - (d.gas ? 6 * dt : 0);
      if (sink) {
        const dx = sink.x - d.x, dy = sink.y - d.y, dist = Math.hypot(dx, dy);
        if (dist < sink.reach) {
          d.vx += (dx / dist) * sink.pull * dt;
          d.vy += (dy / dist) * sink.pull * dt;
          if (dist < sink.r) d.dead = true;
        }
      }
      d.vx = Math.max(-60, Math.min(60, d.vx));
      d.vy = Math.max(-70, Math.min(60, d.vy));
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (fence) {
        if (d.x < b.x0 + 6) { d.x = b.x0 + 6; d.vx = Math.abs(d.vx); }
        if (d.x > b.x1 - 6) { d.x = b.x1 - 6; d.vx = -Math.abs(d.vx); }
        if (d.y < b.y0 + 6) { d.y = b.y0 + 6; d.vy = Math.abs(d.vy); }
        if (d.y > b.y1 - 6) { d.y = b.y1 - 6; d.vy = -Math.abs(d.vy); }
      } else if (!d.gas) {
        if (d.x < b.x0) d.x = b.x1; if (d.x > b.x1) d.x = b.x0;
        if (d.y < b.y0) d.y = b.y1; if (d.y > b.y1) d.y = b.y0;
      } else if (d.y < -10) d.dead = true;
    }
    this.dots = this.dots.filter((d) => !d.dead);
  }

  draw(ctx, c) {
    for (const d of this.dots) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.gas ? 3 : 2.4, 0, Math.PI * 2);
      ctx.fillStyle = d.gas ? alpha(c.labelMuted, 0.75) : alpha(c.s1, 0.45);
      ctx.fill();
    }
  }
}
