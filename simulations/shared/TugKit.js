/**
 * TugKit - the Tug-of-War model's shared drawing (Book I.5 onward): atoms as
 * characters with arms pulling a rope, the shared pair as a knot, real Pauling
 * pull scores, a small periodic table, Bohr shells, molecules as ropes between
 * atoms (for the oxidation-number scoreboard), and the salt-water circuit. Not a
 * scene. Re-exports HillKit (and through it StoryKit).
 */
import { alpha, mix, darken, lighten, font, rr, ellipse, pill } from './HillKit.js';

export * from './HillKit.js';

/** Pull scores (Pauling electronegativity), table position, shells, colour key. */
export const ATOMS = {
  H: { name: 'hydrogen', en: 2.20, row: 1, col: 1, shells: [1], col8: 'h' },
  He: { name: 'helium', en: 0, row: 1, col: 18, shells: [2], col8: 'n' },
  Li: { name: 'lithium', en: 0.98, row: 2, col: 1, shells: [2, 1], col8: 's5' },
  Be: { name: 'beryllium', en: 1.57, row: 2, col: 2, shells: [2, 2], col8: 's7' },
  B: { name: 'boron', en: 2.04, row: 2, col: 13, shells: [2, 3], col8: 's8' },
  C: { name: 'carbon', en: 2.55, row: 2, col: 14, shells: [2, 4], col8: 'c' },
  N: { name: 'nitrogen', en: 3.04, row: 2, col: 15, shells: [2, 5], col8: 's1' },
  O: { name: 'oxygen', en: 3.44, row: 2, col: 16, shells: [2, 6], col8: 's6' },
  F: { name: 'fluorine', en: 3.98, row: 2, col: 17, shells: [2, 7], col8: 's3' },
  Na: { name: 'sodium', en: 0.93, row: 3, col: 1, shells: [2, 8, 1], col8: 's5' },
  Mg: { name: 'magnesium', en: 1.31, row: 3, col: 2, shells: [2, 8, 2], col8: 's7' },
  Al: { name: 'aluminium', en: 1.61, row: 3, col: 13, shells: [2, 8, 3], col8: 's8' },
  Si: { name: 'silicon', en: 1.90, row: 3, col: 14, shells: [2, 8, 4], col8: 's2' },
  P: { name: 'phosphorus', en: 2.19, row: 3, col: 15, shells: [2, 8, 5], col8: 's8' },
  S: { name: 'sulphur', en: 2.58, row: 3, col: 16, shells: [2, 8, 6], col8: 's2' },
  Cl: { name: 'chlorine', en: 3.16, row: 3, col: 17, shells: [2, 8, 7], col8: 's3' },
  K: { name: 'potassium', en: 0.82, row: 4, col: 1, shells: [2, 8, 8, 1], col8: 's5' },
  Ca: { name: 'calcium', en: 1.00, row: 4, col: 2, shells: [2, 8, 8, 2], col8: 's7' },
  Br: { name: 'bromine', en: 2.96, row: 4, col: 17, shells: [2, 8, 18, 7], col8: 's8' },
};

/** Atom fill colour from the closed palette. */
export function atomCol(c, sym) {
  const k = ATOMS[sym]?.col8 ?? 's4';
  if (k === 'h') return lighten(c.labelMuted, 0.7);
  if (k === 'c') return mix(c.waste, c.labelMuted, 0.2);
  if (k === 'n') return c.labelMuted;
  return c[k] ?? c.s4;
}

/** Atom radius on screen: bigger down a column, smaller across a row. */
export function atomR(sym) {
  const a = ATOMS[sym];
  if (!a) return 30;
  return 22 + a.row * 7 - (a.col > 2 ? (a.col - 12) * 1.6 : a.col * 0.5);
}

/** Pull difference thresholds (the classroom rule of thumb). */
export const STEAL = 1.7, EVEN = 0.4;

/** What forms between two atoms, from their pull scores. */
export function bondKind(a, b) {
  const d = Math.abs(ATOMS[a].en - ATOMS[b].en);
  if (d >= STEAL) return { id: 'ionic', text: 'stolen: ions', short: 'ions' };
  if (d < EVEN) return { id: 'even', text: 'shared evenly', short: 'shared' };
  return { id: 'polar', text: 'shared unevenly', short: 'uneven' };
}

/**
 * Where the knot settles, -1 (all the way to the left atom) .. +1 (right atom).
 * equal: the "every atom pulls the same" what-if; ends: only-at-one-end what-if.
 */
export function knotTarget(a, b, o = {}) {
  if (o.equal) return 0;
  const d = ATOMS[b].en - ATOMS[a].en;
  const ad = Math.abs(d);
  let k;
  if (ad >= STEAL) k = Math.sign(d);
  else if (ad < EVEN) k = d / EVEN * 0.12;
  else k = Math.sign(d) * (0.2 + 0.55 * (ad - EVEN) / (STEAL - EVEN));
  if (o.ends) k = ad < 1e-9 ? 1 : Math.sign(d);
  return Math.max(-1, Math.min(1, k));
}

// -- The atom character and the rope ------------------------------------------------------------

/**
 * An atom as a round character with a face and one pulling arm toward the rope.
 * o: { armTo: [x, y], armW, strain (0..1), label, face (default true), charge }
 */
export function drawAtomChar(ctx, c, sym, x, y, r, t, o = {}) {
  const col = atomCol(c, sym);
  if (o.armTo) {
    const [ax, ay] = o.armTo;
    ctx.save();
    ctx.strokeStyle = darken(col, 0.25);
    ctx.lineWidth = o.armW ?? 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const sx = x + Math.sign(ax - x) * r * 0.8;
    ctx.moveTo(sx, y + r * 0.1);
    ctx.quadraticCurveTo((sx + ax) / 2, y + r * 0.5 + 6 * (o.strain ?? 0), ax, ay);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ax, ay, (o.armW ?? 8) * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = darken(col, 0.25);
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(x, y + r * 0.1, r, 0, Math.PI * 2);
  ctx.fillStyle = darken(col, 0.35);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = col;
  ctx.fill();
  ellipse(ctx, x - r * 0.35, y - r * 0.42, r * 0.3, r * 0.17, -0.5);
  ctx.fillStyle = lighten(col, 0.6);
  ctx.fill();
  if (o.face !== false) {
    const strain = o.strain ?? 0;
    const ink = darken(col, 0.78);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      if (strain > 0.5) {
        ctx.moveTo(x + s * r * 0.42, y - r * 0.12);
        ctx.lineTo(x + s * r * 0.22, y - r * 0.02);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
      } else {
        ellipse(ctx, x + s * r * 0.3, y - r * 0.05, r * 0.1, r * 0.14);
        ctx.fillStyle = ink;
        ctx.fill();
      }
    }
    ctx.beginPath();
    if (o.mood === 'happy') ctx.arc(x, y + r * 0.22, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (o.mood === 'sad') ctx.arc(x, y + r * 0.42, r * 0.2, 1.15 * Math.PI, 1.85 * Math.PI);
    else ctx.ellipse(x, y + r * 0.3, r * 0.14, r * 0.1 + strain * r * 0.06, 0, 0, Math.PI * 2);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  // Symbol badge below.
  pill(ctx, c, o.label ?? sym, x, y + r + 22, { bg: col, size: 15 });
  if (o.charge) pill(ctx, c, o.charge, x + r * 0.8, y - r * 0.8, { bg: o.charge.includes('+') ? c.s6 : c.s1, size: 14 });
}

/**
 * The rope between two hands with the shared pair as a knot at k (-1..1).
 * Returns the knot's x.
 */
export function drawRope(ctx, c, xL, xR, y, k, t, o = {}) {
  const kx = (xL + xR) / 2 + ((xR - xL) / 2) * k * 0.92;
  const sag = 5 + 2 * Math.sin(t * 3);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = darken(c.wood, 0.25);
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(xL, y);
  ctx.quadraticCurveTo((xL + kx) / 2, y + sag, kx, y);
  ctx.quadraticCurveTo((kx + xR) / 2, y + sag, xR, y);
  ctx.stroke();
  ctx.strokeStyle = lighten(c.wood, 0.2);
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  // Knot with the two electrons.
  ctx.beginPath();
  ctx.arc(kx, y, 13, 0, Math.PI * 2);
  ctx.fillStyle = c.wood;
  ctx.fill();
  if (o.electrons !== false) {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(kx + s * 6, y - 14 + Math.sin(t * 5 + s) * 1.5, 5, 0, Math.PI * 2);
      ctx.fillStyle = c.warning;
      ctx.fill();
    }
  }
  ctx.restore();
  return kx;
}

/**
 * A whole tug: two atom characters, arms by pull score, the rope and knot.
 * o: { equal, ends, charges } returns { kx }.
 */
export function drawTug(ctx, c, a, b, k, x0, x1, y, t, o = {}) {
  const ra = atomR(a), rb = atomR(b);
  const ea = o.equal ? 2 : ATOMS[a].en, eb = o.equal ? 2 : ATOMS[b].en;
  const hL = x0 + ra + 40, hR = x1 - rb - 40;
  const lean = k * 6;
  const kx = drawRope(ctx, c, hL, hR, y, k, t);
  const stolen = Math.abs(k) > 0.97;
  const moodA = stolen ? (k < 0 ? 'happy' : 'sad') : null;
  const moodB = stolen ? (k > 0 ? 'happy' : 'sad') : null;
  drawAtomChar(ctx, c, a, x0 + lean, y, ra, t, {
    armTo: [hL, y], armW: 3 + ea * 3.2, strain: Math.min(1, ea / 3.5), mood: moodA,
    charge: o.charges && stolen ? (k < 0 ? '\u2212' : '+') : null,
  });
  drawAtomChar(ctx, c, b, x1 + lean, y, rb, t, {
    armTo: [hR, y], armW: 3 + eb * 3.2, strain: Math.min(1, eb / 3.5), mood: moodB,
    charge: o.charges && stolen ? (k > 0 ? '\u2212' : '+') : null,
  });
  return { kx };
}

// -- A small periodic table ---------------------------------------------------------------------

export const TABLE_SYMS = ['H', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'K', 'Ca', 'Br'];

/** Tile rect for a symbol in a compact table at (x, y) with tile size s. */
export function tileRect(sym, x, y, s) {
  const a = ATOMS[sym];
  const colIdx = a.col <= 2 ? a.col - 1 : a.col - 11;     // groups 1, 2 then 13..17 -> 2..6
  return { x: x + colIdx * (s + 4), y: y + (a.row - 1) * (s + 4), w: s, h: s };
}

/**
 * Compact table (groups 1, 2, 13-17; rows 1-4). o: { heat (colour tiles by pull),
 * sel: [symbols highlighted], s }
 */
export function drawMiniTable(ctx, c, x, y, o = {}) {
  const s = o.s ?? 40;
  for (const sym of TABLE_SYMS) {
    const r = tileRect(sym, x, y, s);
    const en = ATOMS[sym].en;
    const bg = o.heat ? mix(c.bgSurface, c.bad, 0.45 * Math.max(0, (en - 0.7) / 3.3)) : c.raised;
    rr(ctx, r.x, r.y + 3, r.w, r.h, 7);
    ctx.fillStyle = darken(bg, 0.3);
    ctx.fill();
    rr(ctx, r.x, r.y, r.w, r.h, 7);
    ctx.fillStyle = bg;
    ctx.fill();
    if ((o.sel ?? []).includes(sym)) {
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.fillStyle = c.label;
    ctx.font = font(c, 800, 15);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sym, r.x + r.w / 2, r.y + r.h / 2 - (o.scores ? 10 : 0));
    if (o.scores) {
      ctx.fillStyle = c.label;
      ctx.font = font(c, 700, 14);
      ctx.fillText(en.toFixed(1), r.x + r.w / 2, r.y + r.h / 2 + 12);
    }
  }
}

/** The table symbol under point p, or null. */
export function tableHit(p, x, y, s = 40) {
  for (const sym of TABLE_SYMS) {
    const r = tileRect(sym, x, y, s);
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return sym;
  }
  return null;
}

// -- Bohr shells ---------------------------------------------------------------------------------

/** Nucleus with shells of electrons; o: { outerCol, pull (draw the outer electron lifted) } */
export function drawShells(ctx, c, sym, x, y, t, o = {}) {
  const a = ATOMS[sym];
  const n = a.shells.length;
  const r0 = o.r0 ?? 22, dr = o.dr ?? 20;
  for (let i = 0; i < n; i++) {
    const rr0 = r0 + i * dr;
    ctx.beginPath();
    ctx.arc(x, y, rr0, 0, Math.PI * 2);
    ctx.strokeStyle = alpha(c.labelMuted, 0.5);
    ctx.lineWidth = 2;
    ctx.stroke();
    const m = Math.min(a.shells[i], 8);
    for (let j = 0; j < m; j++) {
      const ang = (j / m) * Math.PI * 2 + t * (0.4 - i * 0.08);
      ctx.beginPath();
      ctx.arc(x + Math.cos(ang) * rr0, y + Math.sin(ang) * rr0, 5, 0, Math.PI * 2);
      ctx.fillStyle = i === n - 1 ? (o.outerCol ?? c.warning) : c.labelMuted;
      ctx.fill();
    }
  }
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fillStyle = atomCol(c, sym);
  ctx.fill();
  pill(ctx, c, sym, x, y + r0 + (n - 1) * dr + 22, { bg: atomCol(c, sym), size: 14 });
}

// -- Molecules as ropes (for the scoreboard) ------------------------------------------------------

/**
 * Molecules laid out flat: atoms [{ s, x, y }], bonds [{ a, b, n }] (n pairs).
 * Coordinates are relative to a centre.
 */
export const MOLECULES = {
  water: { label: 'water, H\u2082O', atoms: [{ s: 'O', x: 0, y: -20 }, { s: 'H', x: -120, y: 60 }, { s: 'H', x: 120, y: 60 }], bonds: [{ a: 0, b: 1, n: 1 }, { a: 0, b: 2, n: 1 }] },
  h2: { label: 'hydrogen, H\u2082', atoms: [{ s: 'H', x: -90, y: 0 }, { s: 'H', x: 90, y: 0 }], bonds: [{ a: 0, b: 1, n: 1 }] },
  o2: { label: 'oxygen, O\u2082', atoms: [{ s: 'O', x: -100, y: 0 }, { s: 'O', x: 100, y: 0 }], bonds: [{ a: 0, b: 1, n: 2 }] },
  methane: { label: 'methane, CH\u2084', atoms: [{ s: 'C', x: 0, y: 0 }, { s: 'H', x: -140, y: 0 }, { s: 'H', x: 140, y: 0 }, { s: 'H', x: 0, y: -110 }, { s: 'H', x: 0, y: 110 }], bonds: [{ a: 0, b: 1, n: 1 }, { a: 0, b: 2, n: 1 }, { a: 0, b: 3, n: 1 }, { a: 0, b: 4, n: 1 }] },
  co2: { label: 'carbon dioxide, CO\u2082', atoms: [{ s: 'C', x: 0, y: 0 }, { s: 'O', x: -150, y: 0 }, { s: 'O', x: 150, y: 0 }], bonds: [{ a: 0, b: 1, n: 2 }, { a: 0, b: 2, n: 2 }] },
  co: { label: 'carbon monoxide, CO', atoms: [{ s: 'C', x: -100, y: 0 }, { s: 'O', x: 100, y: 0 }], bonds: [{ a: 0, b: 1, n: 3 }] },
  salt: { label: 'salt, NaCl', atoms: [{ s: 'Na', x: -100, y: 0 }, { s: 'Cl', x: 100, y: 0 }], bonds: [{ a: 0, b: 1, n: 1, ionic: true }] },
};

/** The stronger puller of a bond (-1: a, +1: b, 0: tie). */
export function stronger(mol, bond) {
  const ea = ATOMS[mol.atoms[bond.a].s].en, eb = ATOMS[mol.atoms[bond.b].s].en;
  if (Math.abs(ea - eb) < 1e-9) return 0;
  return ea > eb ? -1 : 1;
}

/**
 * Oxidation scores from knot choices: knots[i] = -1 (pairs to atom a), 0 (split),
 * +1 (to atom b). Each shared pair handed wholly moves 1 point per pair.
 */
export function scores(mol, knots) {
  const out = mol.atoms.map(() => 0);
  mol.bonds.forEach((bd, i) => {
    const k = knots[i] ?? 0;
    if (k < 0) { out[bd.a] -= bd.n; out[bd.b] += bd.n; }
    if (k > 0) { out[bd.b] -= bd.n; out[bd.a] += bd.n; }
  });
  return out;
}

export function scoreText(v) {
  return v === 0 ? '0' : v > 0 ? `+${v}` : `\u2212${Math.abs(v)}`;
}

/**
 * Draw a molecule centred at (cx, cy): ropes with knots (k per bond, -1..1 eased),
 * atoms as plain circles with symbol, optional score chips.
 */
export function drawMolecule(ctx, c, mol, cx, cy, knots, t, o = {}) {
  const sc = o.scale ?? 1;
  const pos = mol.atoms.map((a) => ({ x: cx + a.x * sc, y: cy + a.y * sc }));
  mol.bonds.forEach((bd, i) => {
    const A = pos[bd.a], B = pos[bd.b];
    const k = knots[i] ?? 0;
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    const ux = (B.x - A.x) / len, uy = (B.y - A.y) / len;
    const nx = -uy, ny = ux;
    for (let p = 0; p < bd.n; p++) {
      const off = (p - (bd.n - 1) / 2) * 16;
      const ax = A.x + nx * off, ay = A.y + ny * off, bx = B.x + nx * off, by = B.y + ny * off;
      ctx.strokeStyle = darken(c.wood, 0.25);
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      // Knot just outside the atom it is handed to.
      const fa = (atomR(mol.atoms[bd.a].s) * 0.8 * sc + 14) / len, fb = 1 - (atomR(mol.atoms[bd.b].s) * 0.8 * sc + 14) / len;
      const f = k <= 0 ? 0.5 + k * (0.5 - fa) : 0.5 + k * (fb - 0.5);
      const kx = ax + (bx - ax) * f, ky = ay + (by - ay) * f;
      ctx.beginPath();
      ctx.arc(kx, ky, 9, 0, Math.PI * 2);
      ctx.fillStyle = darken(c.wood, 0.3);
      ctx.fill();
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(kx + ux * s * 4.5, ky + uy * s * 4.5, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = c.warning;
        ctx.fill();
      }
    }
    if (o.hot === i) {
      ctx.beginPath();
      ctx.arc((A.x + B.x) / 2, (A.y + B.y) / 2, 22, 0, Math.PI * 2);
      ctx.strokeStyle = alpha(c.accent, 0.6 + 0.3 * Math.sin(t * 6));
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  });
  mol.atoms.forEach((a, i) => {
    const p = pos[i];
    const r = atomR(a.s) * 0.8 * sc;
    const col = atomCol(c, a.s);
    ctx.beginPath();
    ctx.arc(p.x, p.y + 3, r, 0, Math.PI * 2);
    ctx.fillStyle = darken(col, 0.35);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    // A plate of the atom's own colour behind the symbol (invisible; it is the text's container).
    const pw = Math.max(20, Math.min(26, r * 1.5));
    rr(ctx, p.x - pw / 2, p.y - pw / 2, pw, pw, pw / 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.fillStyle = darken(col, 0.9);
    ctx.font = font(c, 800, Math.max(14, Math.round(18 * sc)), true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(a.s, p.x, p.y + 1);
    if (o.scores) {
      const v = o.scores[i];
      const off = Math.max(r, 14);
      pill(ctx, c, scoreText(v), p.x + off + 12, p.y - off - 6, { bg: v > 0 ? c.s6 : v < 0 ? c.s1 : c.labelMuted, size: 14 });
    }
  });
  return pos;
}

// -- Salt water circuit ---------------------------------------------------------------------------

/** A battery, two wires into a glass, and an LED that lights when lit > 0. */
export function drawCircuit(ctx, c, x, y, lit, t, o = {}) {
  // Glass
  rr(ctx, x - 50, y, 100, 110, 10);
  ctx.fillStyle = alpha(c.water, 0.3);
  ctx.fill();
  ctx.strokeStyle = c.glass;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Ions drifting
  if (o.ions) {
    for (let i = 0; i < 10; i++) {
      const px = x - 38 + ((i * 29 + t * 18 * (i % 2 ? 1 : -1)) % 76 + 76) % 76;
      const py = y + 24 + ((i * 37) % 76);
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? c.s6 : c.s1;
      ctx.fill();
    }
  }
  // Electrodes and wires
  ctx.strokeStyle = c.labelMuted;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 24, y + 80); ctx.lineTo(x - 24, y - 50); ctx.lineTo(x - 80, y - 50);
  ctx.moveTo(x + 24, y + 80); ctx.lineTo(x + 24, y - 50); ctx.lineTo(x + 80, y - 50);
  ctx.stroke();
  // Battery (left)
  rr(ctx, x - 130, y - 64, 50, 28, 6);
  ctx.fillStyle = c.s8;
  ctx.fill();
  rr(ctx, x - 80, y - 56, 6, 12, 2);
  ctx.fill();
  // LED (right)
  if (lit > 0) {
    ctx.beginPath();
    ctx.arc(x + 96, y - 56, 26, 0, Math.PI * 2);
    ctx.fillStyle = alpha(c.warning, 0.3 * lit);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x + 96, y - 56, 13, Math.PI, 0);
  ctx.lineTo(x + 109, y - 44);
  ctx.lineTo(x + 83, y - 44);
  ctx.closePath();
  ctx.fillStyle = lit > 0 ? c.warning : mix(c.raised, c.labelMuted, 0.3);
  ctx.fill();
}

