/**
 * CarbonWorkshopScene (preset: weak-cc) - blk-l04-01-02-s05 (what-if). Kabir
 * halves the carbon-carbon bond. Chains of three or four hold; longer ones snap at
 * room temperature from ordinary jiggling; rings pop open. Nothing the size of a
 * sugar can be built.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - a ten-chain and a ring, jiggling at room temperature, holding; predict.
 *   1 run   - the switch; the chain breaks into short pieces; the ring opens.
 *   2 nails - the strength of the C-C bond makes long molecules possible.
 *
 * Canvas: jiggling molecules that snap; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, drawHillBackdrop, Mol, drawMol, BOND_KJ, mulberry32 } from './CarbonKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;

export class CarbonWorkshopSceneWeakCc extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A ten-carbon chain and a six-carbon ring jiggling at room temperature. At real strength they hold. With the ' +
    'carbon-carbon bond at half strength, the chain snaps into pieces of three or four carbons and the ring pops ' +
    'open, so nothing as big as a sugar could be built.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'C-C at real strength', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'C-C at half strength', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._dialled = false;
    this._build();
  }

  _build() {
    this._chain = new Mol('C').chain(10, { x0: 40, y0: 90, x1: 640, y1: 250 });
    this._ring = new Mol('C').chain(6, { x0: 200, y0: 280, x1: 480, y1: 440 });
    this._ring.closeRing({ x0: 280, y0: 280, x1: 560, y1: 440 });
    this._chain.sel = -1;
    this._ring.sel = -1;
    this._brokenC = new Set();
    this._brokenR = new Set();
    this._rnd = mulberry32(19);
    this._t = 0;
  }

  enter() {
    this.mode = 'off';
    this._dialled = false;
    this._build();
  }

  isControlHidden() { return this.stage === S_SETUP; }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if ((id === 'on' || id === 'off') && id !== this.mode) { this.mode = id; this._build(); }
    if (id === 'on' || id === 'off') this._dialled = true;
    this.requestUiUpdate?.();
  }

  /** Pieces of a chain between broken bonds, as atom-index lists. */
  _pieces(m, broken) {
    const seen = new Set(), out = [];
    m.atoms.forEach((a, i) => {
      if (seen.has(i)) return;
      const stack = [i], comp = [];
      seen.add(i);
      while (stack.length) {
        const k = stack.pop();
        comp.push(k);
        m.bonds.forEach((b, bi) => {
          if (broken.has(bi)) return;
          const j = b.a === k ? b.b : b.b === k ? b.a : -1;
          if (j >= 0 && !seen.has(j)) { seen.add(j); stack.push(j); }
        });
      }
      out.push(comp);
    });
    return out;
  }

  update(d) {
    this._t += d;
    if (this.mode !== 'on' || this._t < 1) return;
    // Long pieces snap: each bond in a piece longer than four has a chance to go.
    for (const piece of this._pieces(this._chain, this._brokenC)) {
      if (piece.length <= 4) continue;
      if (this._rnd() < d * 0.9) {
        const inner = this._chain.bonds.map((b, bi) => bi).filter((bi) => !this._brokenC.has(bi) && piece.includes(this._chain.bonds[bi].a) && piece.includes(this._chain.bonds[bi].b));
        const pick = inner[Math.floor(inner.length / 2 + (this._rnd() - 0.5) * 2)];
        if (pick != null) this._brokenC.add(pick);
      }
    }
    if (this._t > 2 && !this._brokenR.size) this._brokenR.add(2);
    // Pieces drift apart a little.
    for (const [m, broken] of [[this._chain, this._brokenC], [this._ring, this._brokenR]]) {
      const pieces = this._pieces(m, broken);
      if (pieces.length < 2) continue;
      pieces.forEach((p, k) => {
        const dir = (k - (pieces.length - 1) / 2) * 6;
        for (const i of p) m.atoms[i].x += dir * d;
      });
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const on = this.mode === 'on';
    drawMol(ctx, c, this._chain, { t, jiggle: 2, broken: this._brokenC });
    drawMol(ctx, c, this._ring, { t, jiggle: 2, broken: this._brokenR });
    const kJ = on ? BOND_KJ['C-C'] / 2 : BOND_KJ['C-C'];
    pill(ctx, c, `C-C bond: ${kJ} kJ/mol`, 16, 30, { bg: on ? c.bad : c.good, size: 15, align: 'left' });
    const longest = Math.max(...this._pieces(this._chain, this._brokenC).map((p) => p.length));
    pill(ctx, c, `longest chain: ${longest}`, 664, 30, { bg: c.labelMuted, size: 15, align: 'right' });
    const st = this.stage;
    if (st === S_SETUP) {
      const q = popAt(this.age, 1.0);
      if (q) pill(ctx, c, 'predict: half-strength bonds. How long a chain?', 340, 488, { bg: c.accent, size: 15, ...q });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the dial', 340, 488, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_RUN && on && this._t > 3) pill(ctx, c, 'three or four hold; longer ones snap; the ring opens', 340, 488, { bg: c.bad, size: 15 });
    if (st === S_NAILS) {
      const q = popAt(this.age, 0.5);
      if (q) pill(ctx, c, 'a strong C-C bond makes long molecules possible', 340, 488, { bg: c.good, size: 15, ...q });
    }
  }
}
