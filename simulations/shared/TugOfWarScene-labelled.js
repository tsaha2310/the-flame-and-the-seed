/**
 * TugOfWarScene (preset: born, labelled) - blk-l01-05-03-s04 (explain). What
 * really pulls: shells, ionisation energy, electron affinity, the combined score
 * (electronegativity), the trends in the table, the rule, and the honest version
 * (an electron sits lower on the Hill near the stronger puller).
 *
 * Beats (seven blocks, splitSteps() counts 7):
 *   0 Shells       - sodium's outer electron far and shielded; chlorine's close in.
 *   1 Ionisation   - cost to pull one off: low for sodium, high for chlorine.
 *   2 Affinity     - gain from taking one: chlorine a lot, sodium almost nothing.
 *   3 Score        - electronegativity; fluorine strongest; sodium and potassium barely.
 *   4 Trends       - across a row the pull rises; down a column it falls.
 *   5 Rule         - the Tug-of-War decides every bond.
 *   6 Honest       - atoms do not want; the electron just sits lower near chlorine.
 *
 * Canvas: orbiting electrons, the rope, a rolling electron; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, font, drawHillBackdrop, drawCardBox, drawMarble, arrow, ATOMS, drawShells, drawMiniTable,
  tileRect, drawTug, knotTarget, atomCol,
} from './TugKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
  [{ idx: 5, dwellMs: null }],
  [{ idx: 6, dwellMs: null }],
];
const S_SHELL = 0, S_IE = 1, S_EA = 2, S_EN = 3, S_TREND = 4, S_RULE = 5, S_HONEST = 6;
// kJ per mole: first ionisation energy and electron affinity (magnitudes).
const IE = { Na: 496, Cl: 1251 };
const EA = { Na: 53, Cl: 349 };

export class TugOfWarSceneLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'Sodium\'s outer electron is far out and shielded, so pulling it off costs little: low ionisation energy. ' +
    'Chlorine\'s are close in with 17 protons pulling, so it costs a lot, and chlorine gains a lot by taking one: high ' +
    'electron affinity. Together these give electronegativity, the pull score: highest for fluorine, rising across a ' +
    'row and falling down a column. An electron simply sits lower on the Hill near the stronger puller.';

  constructor(container, config) {
    super(container, config);
    this._k = 0;
    this._e = 0;
  }

  enter() {
    this._k = 0;
    this._e = 0;
    this._h = 0;
  }

  update(d) {
    this._k += (knotTarget('Na', 'Cl') - this._k) * Math.min(1, d * 2.5);
    if (this.stage !== S_HONEST) return;
    this._h = (this._h ?? 0) + d;
    if (this._h > 0.8) this._e = Math.min(1, this._e + d * 0.6);
    if (this._h > 4.5) { this._e = 0; this._h = 0; }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const st = this.stage;
    if (st <= S_EA) this._drawPair(ctx, c, t);
    if (st === S_EN || st === S_TREND) this._drawTable(ctx, c);
    if (st === S_RULE) {
      drawTug(ctx, c, 'Na', 'Cl', this._k, 150, 530, 230, t, { charges: true });
      const q = popAt(this.age, 0.6);
      if (q) pill(ctx, c, 'the stronger puller wins some or all', 340, 70, { bg: c.accent, size: 15, ...q });
      const q2 = popAt(this.age, 1.4);
      if (q2) pill(ctx, c, 'the Tug-of-War: every bond in the seed and the flame', 340, 420, { bg: c.s5, size: 15, ...q2 });
    }
    if (st === S_HONEST) this._drawHonest(ctx, c, t);
  }

  _drawPair(ctx, c, t) {
    const st = this.stage;
    drawShells(ctx, c, 'Na', 170, 190, t, { outerCol: c.warning });
    drawShells(ctx, c, 'Cl', 510, 190, t, { outerCol: c.warning });
    if (st === S_SHELL) {
      const q = popAt(this.age, 0.4);
      if (q) pill(ctx, c, 'far out, shielded: high on the Hill', 170, 34, { bg: c.s5, size: 14, ...q });
      const q2 = popAt(this.age, 1.2);
      if (q2) pill(ctx, c, '17 protons, close in: low', 510, 34, { bg: c.s3, size: 14, ...q2 });
      return;
    }
    const data = st === S_IE ? IE : EA;
    const title = st === S_IE ? 'ionisation energy: cost to pull one off' : 'electron affinity: gain from taking one';
    pill(ctx, c, title, 340, 34, { bg: st === S_IE ? c.bad : c.good, size: 15 });
    const max = 1300;
    ['Na', 'Cl'].forEach((s, i) => {
      const x = i ? 440 : 70, y = 380, w = 180;
      const grow = Math.min(1, this.age / 1.0);
      drawCardBox(ctx, c, x, y, w + 60, 90);
      rr(ctx, x + 14, y + 44, w * (data[s] / max) * grow + 6, 24, 8);
      ctx.fillStyle = atomCol(c, s);
      ctx.fill();
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 15);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${ATOMS[s].name}: ${data[s]} kJ/mol`, x + 14, y + 22);
    });
    const note = st === S_IE ? 'low for sodium, high for chlorine' : 'one more fills chlorine\'s shell: a fall';
    const q = popAt(this.age, 1.2);
    if (q) pill(ctx, c, note, 340, 492, { bg: c.labelMuted, size: 14, ...q });
  }

  _drawTable(ctx, c) {
    const x = 60, y = 110, s = 52;
    drawMiniTable(ctx, c, x, y, { s, heat: true, scores: true });
    const st = this.stage;
    if (st === S_EN) {
      pill(ctx, c, 'electronegativity: the pull score', 340, 34, { bg: c.accent, size: 15 });
      const f = tileRect('F', x, y, s);
      const q = popAt(this.age, 0.6);
      if (q) pill(ctx, c, 'fluorine: strongest', f.x + s + 10, f.y + s / 2, { bg: c.bad, size: 14, align: 'left', ...q });
      const k = tileRect('K', x, y, s);
      const q2 = popAt(this.age, 1.2);
      if (q2) pill(ctx, c, 'sodium, potassium: barely pull', k.x, k.y + s + 26, { bg: c.s5, size: 14, align: 'left', ...q2 });
      const o = tileRect('O', x, y, s);
      const q3 = popAt(this.age, 1.8);
      if (q3) pill(ctx, c, 'oxygen, chlorine: close behind', o.x + s, o.y - 20, { bg: c.s6, size: 14, ...q3 });
      return;
    }
    const li = tileRect('Li', x, y, s), f = tileRect('F', x, y, s), k = tileRect('K', x, y, s);
    const a = popAt(this.age, 0.3);
    if (a) {
      arrow(ctx, li.x + s + 10, li.y - 16, f.x + s / 2, f.y - 16, c.bad, 5);
      pill(ctx, c, 'across a row: smaller, pull rises', 340, 34, { bg: c.bad, size: 14, ...a });
    }
    const b = popAt(this.age, 1.2);
    if (b) {
      arrow(ctx, li.x - 18, li.y - 30 + s, li.x - 18, k.y + s, c.s1, 5);
      pill(ctx, c, 'down a column: bigger, pull falls', k.x, k.y + s + 26, { bg: c.s1, size: 14, align: 'left', ...b });
    }
  }

  /** The electron as a ball on a Hill with a shallow dip at sodium and a deep one at chlorine. */
  _drawHonest(ctx, c, t) {
    const x0 = 60, x1 = 620, base = 250;
    const xa = 180, xb = 500;
    const y = (x) => base + 60 * Math.exp(-(((x - xa) / 60) ** 2)) + 180 * Math.exp(-(((x - xb) / 70) ** 2));
    ctx.beginPath();
    ctx.moveTo(x0, y(x0));
    for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, y(x));
    ctx.lineTo(x1, 520);
    ctx.lineTo(x0, 520);
    ctx.closePath();
    ctx.fillStyle = c.raised;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x0, y(x0));
    for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, y(x));
    ctx.strokeStyle = c.s3;
    ctx.lineWidth = 7;
    ctx.stroke();
    pill(ctx, c, 'near sodium', xa, y(xa) + 30, { bg: atomCol(c, 'Na'), size: 14 });
    pill(ctx, c, 'near chlorine: lower', xb, y(xb) + 30, { bg: atomCol(c, 'Cl'), size: 14 });
    const u = this._e;
    const ex = xa + (xb - xa) * (u * u * (3 - 2 * u));
    drawMarble(ctx, c, ex, y(ex) - 14 - Math.sin(u * Math.PI) * 30, 13, c.warning, { face: true });
    pill(ctx, c, 'atoms do not want or try', 340, 40, { bg: c.labelMuted, size: 15 });
    const q = popAt(this.age, 1.2);
    if (q) pill(ctx, c, 'low is just where things end up', 340, 80, { bg: c.accent, size: 15, ...q });
  }
}
