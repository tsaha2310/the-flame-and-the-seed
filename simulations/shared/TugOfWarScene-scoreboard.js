/**
 * TugOfWarScene (preset: scoreboard) - blk-l03-03-03-s02 (skill game). A molecule
 * with every bond drawn as a rope. Tap a bond to hand its shared pair(s) to one
 * atom, or split them; the sim totals each atom's score. Check it: every pair
 * should go wholly to the stronger puller. Score six molecules to win.
 *
 * Beats (three paragraphs + Lens, splitSteps() counts 4):
 *   0 Lens   - ropes; handing each pair wholly to the stronger puller is bookkeeping.
 *   1 Water  - both pairs to oxygen: oxygen -2, each hydrogen +1.
 *   2 H2     - equal pulls: split the pair; neither gains.
 *   3 Six    - score water, hydrogen, oxygen, methane, carbon dioxide and salt.
 *
 * Canvas: knots slide on tap; labels are chips only. Carbon monoxide is left out:
 * its triple bond includes a pair given by oxygen, which this one-point-per-pair
 * game would mis-score (it would say +3; the real score is +2).
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, font, drawHillBackdrop, drawCardBox, drawRope, drawMolecule, MOLECULES, ATOMS, stronger, scores,
} from './TugKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
];
const S_LENS = 0, S_WATER = 1, S_H2 = 2, S_SIX = 3;
const KEYS = ['water', 'h2', 'o2', 'methane', 'co2', 'salt'];
const CX = 340, CY = 250;

export class TugOfWarSceneScoreboard extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'A scoring game on molecules drawn with ropes for bonds. Tap each bond to hand its shared electrons to one atom ' +
    'or split them. Handed to the stronger puller, water scores oxygen minus 2 and each hydrogen plus 1; in hydrogen ' +
    'gas the pair is split and both score 0. Score six molecules correctly to win.';

  static CONTROLS = [
    { type: 'select', id: 'mol', label: 'Molecule:', options: KEYS.map((k) => ({ value: k, label: MOLECULES[k].label })) },
    { type: 'button', id: 'check', label: 'Check' },
    { type: 'button', id: 'reset', label: 'Split all' },
  ];

  constructor(container, config) {
    super(container, config);
    this._mol = 'water';
    this._knots = [];
    this._shown = [];
    this._solved = {};
    this._verdict = null;
    this._vAge = 0;
    this._hot = -1;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y, t) => drawRope(g, c, x - 18, x + 18, y + 4, 0, t, { electrons: false }), text: 'bonds drawn as ropes' },
      { icon: (g, x, y) => { rr(g, x - 16, y - 10, 32, 20, 6); g.fillStyle = c.s2; g.fill(); }, text: 'each pair handed wholly to one atom', sub: 'bookkeeping, not what really happens' },
      { icon: (g, x, y) => { g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fillStyle = c.s6; g.fill(); }, text: 'pull scores are real' },
    ];
  }

  enter(stage) {
    this._mol = stage === S_H2 ? 'h2' : 'water';
    if (stage <= S_WATER) this._solved = {};
    this._load();
  }

  _load() {
    const m = MOLECULES[this._mol];
    this._knots = m.bonds.map(() => 0);
    this._shown = m.bonds.map(() => 0);
    this._verdict = null;
  }

  isControlHidden(id) {
    if (this.stage === S_LENS) return true;
    if (id === 'mol') return this.stage < S_SIX;
    return false;
  }

  getControlValue(id) {
    return id === 'mol' ? this._mol : undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    if (id === 'mol' && MOLECULES[value]) { this._mol = value; this._load(); }
    else if (id === 'reset') this._load();
    else if (id === 'check') this._check();
    this.requestUiUpdate?.();
  }

  _check() {
    const m = MOLECULES[this._mol];
    const ok = m.bonds.every((b, i) => this._knots[i] === stronger(m, b));
    this._verdict = ok;
    this._vAge = 0;
    if (ok) {
      if (!this._solved[this._mol]) this.celebrate(CX, CY - 80, 26);
      this._solved[this._mol] = true;
    }
  }

  _bondAt(p) {
    const m = MOLECULES[this._mol];
    let best = -1, bd = 26;
    m.bonds.forEach((b, i) => {
      const A = m.atoms[b.a], B = m.atoms[b.b];
      const ax = CX + A.x, ay = CY + A.y, bx = CX + B.x, by = CY + B.y;
      const vx = bx - ax, vy = by - ay;
      const u = Math.max(0.2, Math.min(0.8, ((p.x - ax) * vx + (p.y - ay) * vy) / (vx * vx + vy * vy)));
      const d = Math.hypot(ax + vx * u - p.x, ay + vy * u - p.y);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  pointerDown(p) {
    if (this.stage === S_LENS) return;
    const i = this._bondAt(p);
    if (i < 0) return;
    // Cycle: split -> to the first atom -> to the second atom -> split.
    const k = this._knots[i];
    this._knots[i] = k === 0 ? -1 : k === -1 ? 1 : 0;
    this._verdict = null;
  }

  pointerMove(p) {
    this._hot = this.stage === S_LENS ? -1 : this._bondAt(p);
    return false;
  }

  update(d) {
    this._vAge += d;
    this._shown = this._shown.map((v, i) => v + ((this._knots[i] ?? 0) - v) * Math.min(1, d * 8));
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const m = MOLECULES[this._mol];
    const sc = scores(m, this._knots);
    drawMolecule(ctx, c, m, CX, CY, this._shown, t, { scores: this.stage === S_LENS ? null : sc, hot: this._hot });
    if (this.stage === S_LENS) return;
    pill(ctx, c, m.label, 16, 30, { bg: c.s5, size: 15, align: 'left' });
    const hint = this.stage === S_WATER ? 'tap each bond: hand its pair to oxygen' : this.stage === S_H2 ? 'equal pulls: leave the pair split'
      : 'tap bonds, then Check';
    if (this._verdict == null) pill(ctx, c, hint, 340, 420, { bg: c.accent, size: 15 });
    else {
      const q = popAt(this._vAge, 0);
      pill(ctx, c, this._verdict ? 'scored!' : 'not yet: each pair to the stronger puller', 340, 420, { bg: this._verdict ? c.good : c.bad, size: 15, ...(q || {}) });
    }
    this._drawTally(ctx, c, m);
  }

  _drawTally(ctx, c, m) {
    const n = Object.keys(this._solved).length;
    const x = 420, y = 14, w = 244;
    drawCardBox(ctx, c, x, y, w, 100);
    ctx.fillStyle = c.label;
    ctx.font = font(c, 800, 15);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`molecules scored: ${n} of 6`, x + 12, y + 22);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 700, 14);
    const pulls = [...new Set(m.atoms.map((a) => a.s))].map((s) => `${s} ${ATOMS[s].en.toFixed(2)}`).join(', ');
    ctx.fillText(`pulls: ${pulls}`, x + 12, y + 52);
    if (n >= 6) pill(ctx, c, 'all six!', x + w - 12, y + 22, { bg: c.good, size: 14, align: 'right' });
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(x + 18 + i * 16, y + 84, 5, 0, Math.PI * 2);
      ctx.fillStyle = this._solved[KEYS[i]] ? c.good : c.raised;
      ctx.fill();
    }
  }
}
