/**
 * CarbonKit - the Carbon Workshop bench (Book IV.1-2): a skeleton of carbon (or
 * silicon) atoms joined by single, double or triple bonds, with hydrogens filled
 * in automatically to make up each atom's four bonds. Valency is enforced; bond
 * strengths are real averages. Not a scene. Re-exports HillKit (and StoryKit).
 */
import { alpha, mix, darken, lighten, rr, ellipse, font } from './HillKit.js';

export * from './HillKit.js';

/** Average bond energies, kJ/mol. */
export const BOND_KJ = {
  'C-C': 348, 'C=C': 614, 'C#C': 839, 'C-H': 413, 'C-O': 358, 'C=O': 799,
  'Si-Si': 222, 'Si=Si': 314, 'Si-H': 318, 'Si-O': 452,
};
export const BOND_LEN = 46;

/** A molecule under construction: heavy atoms with positions, and bonds between them. */
export class Mol {
  constructor(el = 'C') {
    this.el = el;          // 'C' or 'Si'
    this.atoms = [];       // { x, y }
    this.bonds = [];       // { a, b, n }
    this.sel = -1;
  }

  clone() {
    const m = new Mol(this.el);
    m.atoms = this.atoms.map((a) => ({ ...a }));
    m.bonds = this.bonds.map((b) => ({ ...b }));
    m.sel = this.sel;
    return m;
  }

  order(i) {
    let s = 0;
    for (const b of this.bonds) if (b.a === i || b.b === i) s += b.n;
    return s;
  }

  hydrogens(i) { return Math.max(0, 4 - this.order(i)); }

  neighbours(i) {
    const out = [];
    for (const b of this.bonds) {
      if (b.a === i) out.push(b.b);
      else if (b.b === i) out.push(b.a);
    }
    return out;
  }

  bondBetween(i, j) {
    return this.bonds.find((b) => (b.a === i && b.b === j) || (b.a === j && b.b === i));
  }

  /** Add an atom joined to atom `to` (or the first atom at (x, y)); returns its index or -1. */
  add(to = this.sel, box = { x0: 40, y0: 90, x1: 640, y1: 440 }) {
    if (!this.atoms.length) {
      this.atoms.push({ x: box.x0 + 40, y: (box.y0 + box.y1) / 2 });
      this.sel = 0;
      return 0;
    }
    if (to < 0 || this.hydrogens(to) < 1) return -1;
    const a = this.atoms[to];
    const nb = this.neighbours(to);
    // Continue away from the parent, zigzagging; else try the other directions.
    let base = 0;
    if (nb.length) {
      const p = this.atoms[nb[0]];
      base = Math.atan2(a.y - p.y, a.x - p.x);
    }
    // From a chain end, zigzag about the chain's own heading (+30 / -30 degrees in turn);
    // from a middle carbon, branch out sideways.
    let tries;
    if (nb.length === 1) {
      // A zigzag repeats the direction of the bond before last.
      const p = this.atoms[nb[0]];
      const pp = this.neighbours(nb[0]).filter((k) => k !== to)[0];
      const t0 = pp != null ? Math.atan2(p.y - this.atoms[pp].y, p.x - this.atoms[pp].x) : base - Math.PI / 3;
      tries = [t0, base - Math.PI / 3, base + Math.PI / 3, base + Math.PI / 2, base - Math.PI / 2, base];
    } else {
      tries = [Math.PI / 6, -Math.PI / 6];
      if (nb.length >= 2) {
        const A = this.atoms[nb[0]], B = this.atoms[nb[1]];
        const bis = Math.atan2(a.y - (A.y + B.y) / 2, a.x - (A.x + B.x) / 2);
        tries = [bis, bis + Math.PI / 3, bis - Math.PI / 3, bis + Math.PI / 2, bis - Math.PI / 2];
      }
    }
    for (const ang of tries) {
      const x = a.x + Math.cos(ang) * BOND_LEN, y = a.y + Math.sin(ang) * BOND_LEN;
      if (x < box.x0 + 20 || x > box.x1 - 20 || y < box.y0 + 20 || y > box.y1 - 20) continue;
      if (this.atoms.some((o) => (o.x - x) ** 2 + (o.y - y) ** 2 < 36 * 36)) continue;
      this.atoms.push({ x, y });
      const j = this.atoms.length - 1;
      this.bonds.push({ a: to, b: j, n: 1 });
      this.sel = j;
      return j;
    }
    return -1;
  }

  /** Build a straight zigzag chain of n atoms from scratch. */
  chain(n, box) {
    this.atoms = [];
    this.bonds = [];
    this.sel = -1;
    const x0 = (box.x0 + box.x1) / 2 - ((n - 1) * BOND_LEN * 0.866) / 2;
    const y0 = (box.y0 + box.y1) / 2;
    for (let i = 0; i < n; i++) {
      this.atoms.push({ x: x0 + i * BOND_LEN * 0.866, y: y0 + (i % 2 ? -BOND_LEN / 4 : BOND_LEN / 4) });
      if (i) this.bonds.push({ a: i - 1, b: i, n: 1 });
    }
    this.sel = n - 1;
    return this;
  }

  /** Close a simple chain into a ring (3..8 atoms), laid out as a regular polygon. */
  closeRing(box) {
    const n = this.atoms.length;
    if (n < 3 || n > 8 || this.bonds.length !== n - 1) return false;
    const deg = this.atoms.map((a, i) => this.neighbours(i).length);
    if (deg.some((d) => d > 2)) return false;
    const ends = deg.map((d, i) => (d === 1 ? i : -1)).filter((i) => i >= 0);
    if (ends.length !== 2 || this.hydrogens(ends[0]) < 1 || this.hydrogens(ends[1]) < 1) return false;
    // Walk the chain in order and place it on a polygon.
    const order = [ends[0]];
    while (order.length < n) {
      const last = order[order.length - 1];
      order.push(this.neighbours(last).find((j) => !order.includes(j)));
    }
    const cx = (box.x0 + box.x1) / 2 - 80, cy = (box.y0 + box.y1) / 2;
    const R = BOND_LEN / (2 * Math.sin(Math.PI / n));
    order.forEach((idx, k) => {
      const a = -Math.PI / 2 + (k / n) * Math.PI * 2;
      this.atoms[idx] = { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
    });
    this.bonds.push({ a: ends[1], b: ends[0], n: 1 });
    return true;
  }

  /** Cycle a bond's order 1 -> 2 -> 3 -> 1 as far as valency allows. */
  cycleBond(bi) {
    const b = this.bonds[bi];
    if (!b) return;
    for (const next of [b.n + 1, b.n + 2, 1]) {
      const n = next > 3 ? next - 3 : next;
      const delta = n - b.n;
      if (this.order(b.a) + delta <= 4 && this.order(b.b) + delta <= 4) { b.n = n; return; }
    }
  }

  setOrder(bi, n) {
    const b = this.bonds[bi];
    if (!b) return false;
    const delta = n - b.n;
    if (this.order(b.a) + delta > 4 || this.order(b.b) + delta > 4) return false;
    b.n = n;
    return true;
  }

  formula() {
    const nC = this.atoms.length;
    let nH = 0;
    for (let i = 0; i < nC; i++) nH += this.hydrogens(i);
    const sub = (k) => (k === 1 ? '' : String(k));
    if (!nC) return '';
    return `${this.el}${sub(nC)}${nH ? `H${sub(nH)}` : ''}`;
  }

  counts() {
    let h = 0;
    for (let i = 0; i < this.atoms.length; i++) h += this.hydrogens(i);
    return { c: this.atoms.length, h };
  }

  hasRing() { return this.atoms.length > 0 && this.bonds.length >= this.atoms.length; }

  /** Short skeleton description: 'chain', 'branched', 'ring', with ', double bond' / ', triple bond'. */
  shape() {
    if (!this.atoms.length) return 'nothing yet';
    if (this.atoms.length === 1) return 'one atom';
    let s = 'chain';
    if (this.hasRing()) s = 'ring';
    else if (this.atoms.some((a, i) => this.neighbours(i).length >= 3)) s = 'branched';
    if (this.bonds.some((b) => b.n === 3)) s += ', triple bond';
    else if (this.bonds.some((b) => b.n === 2)) s += ', double bond';
    return s;
  }

  /** The weakest bond present: { name, kJ }. */
  weakest() {
    const e = this.el;
    let best = null;
    for (const b of this.bonds) {
      const name = `${e}${['', '-', '=', '#'][b.n]}${e}`;
      const kJ = BOND_KJ[name] ?? BOND_KJ[`${e}-${e}`];
      if (!best || kJ < best.kJ) best = { name, kJ };
    }
    if (this.atoms.some((a, i) => this.hydrogens(i) > 0)) {
      const kJ = BOND_KJ[`${e}-H`];
      if (!best || kJ < best.kJ) best = { name: `${e}-H`, kJ };
    }
    return best;
  }

  /**
   * A canonical string for the skeleton (acyclic or not): rotations and flips of
   * the same arrangement give the same string. Trees use centre-rooted AHU codes
   * with bond orders; rings fall back to a sorted degree/order signature.
   */
  canonical() {
    const n = this.atoms.length;
    if (!n) return '';
    if (this.hasRing()) {
      const sig = this.atoms.map((a, i) => `${this.neighbours(i).length}:${this.hydrogens(i)}`).sort().join(',');
      return `ring|${sig}|${this.bonds.map((b) => b.n).sort().join('')}`;
    }
    // Find the centre(s) by peeling leaves.
    let alive = new Set(this.atoms.map((a, i) => i));
    let deg = this.atoms.map((a, i) => this.neighbours(i).length);
    while (alive.size > 2) {
      const leaves = [...alive].filter((i) => deg[i] <= 1);
      for (const l of leaves) {
        alive.delete(l);
        for (const j of this.neighbours(l)) deg[j] -= 1;
      }
    }
    const code = (i, parent) => {
      const kids = this.neighbours(i).filter((j) => j !== parent).map((j) => `${this.bondBetween(i, j).n}${code(j, i)}`).sort();
      return `(${kids.join('')})`;
    };
    const centres = [...alive];
    if (centres.length === 1) return code(centres[0], -1);
    const [a, b] = centres;
    const ord = this.bondBetween(a, b).n;
    const x = `${code(a, b)}`, y = `${code(b, a)}`;
    return x < y ? `${x}${ord}${y}` : `${y}${ord}${x}`;
  }

  /** Connected pieces (atom-index lists) when the bonds in `broken` are cut. */
  pieces(broken = new Set()) {
    const seen = new Set(), out = [];
    this.atoms.forEach((a, i) => {
      if (seen.has(i)) return;
      const stack = [i], comp = [];
      seen.add(i);
      while (stack.length) {
        const k = stack.pop();
        comp.push(k);
        this.bonds.forEach((b, bi) => {
          if (broken.has(bi)) return;
          const j = b.a === k ? b.b : b.b === k ? b.a : -1;
          if (j >= 0 && !seen.has(j)) { seen.add(j); stack.push(j); }
        });
      }
      out.push(comp);
    });
    return out;
  }

  /** Index of the atom near p, or -1; and index of the bond near p, or -1. */
  atomAt(p) {
    return this.atoms.findIndex((a) => (a.x - p.x) ** 2 + (a.y - p.y) ** 2 < 20 * 20);
  }

  bondAt(p) {
    let best = -1, bd = 14;
    this.bonds.forEach((b, i) => {
      const A = this.atoms[b.a], B = this.atoms[b.b];
      const vx = B.x - A.x, vy = B.y - A.y;
      const u = Math.max(0.2, Math.min(0.8, ((p.x - A.x) * vx + (p.y - A.y) * vy) / (vx * vx + vy * vy)));
      const d = Math.hypot(A.x + vx * u - p.x, A.y + vy * u - p.y);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
}

/** Atom colours: carbon dark grey, silicon lighter grey-violet, hydrogen pale, oxygen red. */
export function elCol(c, el) {
  if (el === 'C') return mix(c.waste, c.labelMuted, 0.15);
  if (el === 'Si') return mix(c.s5, c.labelMuted, 0.55);
  if (el === 'O') return c.s6;
  return lighten(c.labelMuted, 0.7);
}

/** Draw the molecule: sticks (1-3 lines), heavy atoms, filled-in hydrogens. o: { jiggle, t, hideH, broken: Set of bond idx, hotBond } */
export function drawMol(ctx, c, m, o = {}) {
  const t = o.t ?? 0;
  const jig = o.jiggle ?? 0;
  const P = m.atoms.map((a, i) => ({ x: a.x + Math.sin(t * 9 + i * 1.7) * jig, y: a.y + Math.cos(t * 8 + i * 2.3) * jig }));
  const rH = m.el === 'Si' ? 20 : 15;
  // Bonds.
  m.bonds.forEach((b, bi) => {
    if (o.broken?.has(bi)) return;
    const A = P[b.a], B = P[b.b];
    const len = Math.hypot(B.x - A.x, B.y - A.y) || 1;
    const nx = -(B.y - A.y) / len, ny = (B.x - A.x) / len;
    for (let k = 0; k < b.n; k++) {
      const off = (k - (b.n - 1) / 2) * 9;
      ctx.beginPath();
      ctx.moveTo(A.x + nx * off, A.y + ny * off);
      ctx.lineTo(B.x + nx * off, B.y + ny * off);
      ctx.strokeStyle = o.hotBond === bi ? c.accent : darken(c.label, 0.1);
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  });
  // Hydrogens in the gaps between bonds.
  if (!o.hideH) {
    m.atoms.forEach((a, i) => {
      const nh = m.hydrogens(i);
      if (!nh) return;
      const used = m.neighbours(i).map((j) => Math.atan2(P[j].y - P[i].y, P[j].x - P[i].x)).sort((x, y) => x - y);
      const angs = [];
      if (!used.length) for (let k = 0; k < nh; k++) angs.push(Math.PI / 4 + (k * Math.PI * 2) / nh);
      else {
        // Spread the hydrogens through the largest gaps.
        const gaps = used.map((u, k) => {
          const nxt = k + 1 < used.length ? used[k + 1] : used[0] + Math.PI * 2;
          return { from: u, size: nxt - u };
        }).sort((x, y) => y.size - x.size);
        const slots = gaps.map((g) => ({ ...g, k: 0 }));
        for (let h = 0; h < nh; h++) {
          // Share of the gap each would get, with a lean toward big gaps (outside a ring).
          const score = (g) => g.size / (g.k + 1) + 0.3 * g.size;
          slots.sort((x, y) => score(y) - score(x));
          slots[0].k += 1;
        }
        for (const s of slots) for (let k = 1; k <= s.k; k++) angs.push(s.from + (s.size * k) / (s.k + 1));
      }
      for (const ang of angs) {
        const hx = P[i].x + Math.cos(ang) * 32, hy = P[i].y + Math.sin(ang) * 32;
        ctx.beginPath();
        ctx.moveTo(P[i].x, P[i].y);
        ctx.lineTo(hx, hy);
        ctx.strokeStyle = alpha(c.label, 0.6);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(hx, hy, 8, 0, Math.PI * 2);
        ctx.fillStyle = elCol(c, 'H');
        ctx.fill();
      }
    });
  }
  // Heavy atoms.
  m.atoms.forEach((a, i) => {
    const col = elCol(c, m.el);
    const p = P[i];
    if (i === m.sel && o.showSel !== false) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, rH + 7, 0, Math.PI * 2);
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y + 3, rH, 0, Math.PI * 2);
    ctx.fillStyle = darken(col, 0.35);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, rH, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ellipse(ctx, p.x - rH * 0.35, p.y - rH * 0.4, rH * 0.3, rH * 0.17, -0.5);
    ctx.fillStyle = lighten(col, 0.55);
    ctx.fill();
  });
  return P;
}

/** The bench readouts card: rows [{ label, text }]. */
export function drawBenchCard(ctx, c, x, y, w, rows, title) {
  const h = 20 + rows.length * 28 + (title ? 20 : 0);
  rr(ctx, x, y + 4, w, h, 11);
  ctx.fillStyle = darken(c.bgSurface, 0.3);
  ctx.fill();
  rr(ctx, x, y, w, h, 11);
  ctx.fillStyle = c.bgSurface;
  ctx.fill();
  ctx.strokeStyle = alpha(c.stroke, 0.8);
  ctx.lineWidth = 2;
  ctx.stroke();
  let yy = y + 20;
  if (title) {
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, x + 12, yy);
    yy += 22;
  }
  rows.forEach((r, i) => {
    const ry = yy + i * 28;
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 700, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(r.label, x + 12, ry);
    ctx.fillStyle = r.col ?? c.label;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'right';
    ctx.fillText(r.text, x + w - 12, ry);
  });
  return h;
}


const GALLERY_BOX = { x0: 40, y0: 110, x1: 640, y1: 420 };

/** Ready-made skeletons for the explain slides. */
export function makeMol(kind, el = 'C', box = GALLERY_BOX) {
  const m = new Mol(el);
  if (kind === 'chain') m.chain(6, box);
  else if (kind === 'branched') { m.chain(5, box); m.add(2, box); }
  else if (kind === 'ring') { m.chain(6, box); m.closeRing(box); }
  else if (kind === 'double') { m.chain(4, box); m.setOrder(1, 2); }
  else if (kind === 'triple') { m.chain(2, box); m.setOrder(0, 3); }
  else if (kind === 'methane') { m.add(-1, box); m.atoms[0] = { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 }; }
  else if (kind === 'ten') m.chain(10, box);
  else if (kind === 'five') m.chain(5, box);
  m.sel = -1;
  return m;
}

/** Centre a molecule's atoms on (cx, cy). */
export function centreMol(m, cx, cy) {
  if (!m.atoms.length) return m;
  const mx = m.atoms.reduce((s, a) => s + a.x, 0) / m.atoms.length;
  const my = m.atoms.reduce((s, a) => s + a.y, 0) / m.atoms.length;
  for (const a of m.atoms) { a.x += cx - mx; a.y += cy - my; }
  return m;
}

/** Draw a molecule centred on (cx, cy) at k times the bench size (no text inside, so scaling is safe). */
export function drawMolAt(ctx, c, m, cx, cy, k, o = {}) {
  centreMol(m, cx, cy);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(k, k);
  ctx.translate(-cx, -cy);
  const P = drawMol(ctx, c, m, o);
  ctx.restore();
  return P.map((p) => ({ x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k }));
}

/** Named skeletons for C5H12 and C4H10 (canonical examples for the explain slides). */
export function isomerMol(name, box = GALLERY_BOX) {
  const m = new Mol('C');
  if (name === 'pentane') m.chain(5, box);
  else if (name === 'isopentane') { m.chain(4, box); m.add(1, box); }
  else if (name === 'neopentane') {
    const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2, L = BOND_LEN;
    m.atoms = [{ x: cx, y: cy }, { x: cx - L, y: cy }, { x: cx + L, y: cy }, { x: cx, y: cy - L }, { x: cx, y: cy + L }];
    m.bonds = [1, 2, 3, 4].map((j) => ({ a: 0, b: j, n: 1 }));
  }
  else if (name === 'butene') { m.chain(4, box); m.setOrder(1, 2); }
  else if (name === 'butane') m.chain(4, box);
  m.sel = -1;
  return m;
}

/**
 * Spin the atoms on one side of bond bi about the bond axis (a flat projection:
 * their offset across the bond is scaled by cos(phase)). Returns a new Mol.
 */
export function spunMol(m, bi, phase) {
  const out = m.clone();
  const b = m.bonds[bi];
  const cut = new Set([bi]);
  const side = m.pieces(cut).find((p) => p.includes(b.b)) ?? [];
  const A = m.atoms[b.a], B = m.atoms[b.b];
  const ux = (B.x - A.x), uy = (B.y - A.y);
  const L = Math.hypot(ux, uy) || 1;
  const nx = -uy / L, ny = ux / L;
  const k = Math.cos(phase);
  for (const i of side) {
    const p = m.atoms[i];
    const off = (p.x - A.x) * nx + (p.y - A.y) * ny;
    out.atoms[i] = { x: p.x - nx * off * (1 - k), y: p.y - ny * off * (1 - k) };
  }
  return out;
}
