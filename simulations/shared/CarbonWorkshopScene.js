/**
 * CarbonWorkshopScene - blk-l04-01-02-s02 (builder). A workbench with carbon and
 * hydrogen only. Add carbons to the selected one; hydrogens fill every free bond
 * by themselves (carbon takes four, hydrogen one). Tap a carbon-carbon bond to make
 * it double or triple; close a chain into a ring. Readouts: formula, skeleton,
 * weakest bond.
 *
 * Beats (four paragraphs + Lens, splitSteps() counts 5):
 *   0 Lens     - balls and sticks at a hundred million times; valency enforced; real averages.
 *   1 Chains   - methane, then two, three, ten carbons in a row.
 *   2 Shapes   - a branch; a six-chain bent round into a ring.
 *   3 Pairs    - two carbons sharing two pairs, then three.
 *   4 Weakest  - read the weakest bond of each build.
 *
 * Canvas: a tap-to-build bench; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, rr, drawHillBackdrop, Mol, drawMol, drawBenchCard, BOND_KJ } from './CarbonKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_LENS = 0, S_CHAIN = 1, S_SHAPE = 2, S_PAIRS = 3, S_WEAK = 4;
const BENCH = { x0: 24, y0: 84, x1: 424, y1: 470 };
const GOALS = {
  [S_CHAIN]: [['methane', (m) => m.atoms.length === 1], ['two carbons', (m) => m.atoms.length === 2], ['three', (m) => m.atoms.length === 3], ['ten in a row', (m) => m.atoms.length >= 10 && m.shape().startsWith('chain')]],
  [S_SHAPE]: [['a branch', (m) => m.shape().startsWith('branched')], ['a ring', (m) => m.hasRing()]],
  [S_PAIRS]: [['a double bond', (m) => m.bonds.some((b) => b.n === 2)], ['a triple bond', (m) => m.bonds.some((b) => b.n === 3)]],
};

export class CarbonWorkshopScene extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'A workbench for carbon and hydrogen. Each carbon takes four bonds and each hydrogen one; hydrogens fill every ' +
    'free bond automatically. Build methane, chains of two, three and ten carbons, a branch, a ring, and double and ' +
    'triple bonds. The readouts give the formula, the shape of the skeleton, and the weakest bond.';

  static CONTROLS = [
    { type: 'button', id: 'add', label: 'Add a carbon' },
    { type: 'button', id: 'ring', label: 'Close a ring' },
    { type: 'select', id: 'bond', label: 'Selected bond:', options: [
      { value: '1', label: 'single' }, { value: '2', label: 'double' }, { value: '3', label: 'triple' },
    ] },
    { type: 'button', id: 'clear', label: 'Start again' },
  ];

  constructor(container, config) {
    super(container, config);
    this._m = new Mol('C');
    this._bond = -1;
    this._done = {};
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => { g.strokeStyle = c.label; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.stroke(); g.beginPath(); g.arc(x - 14, y, 8, 0, Math.PI * 2); g.arc(x + 14, y, 8, 0, Math.PI * 2); g.fillStyle = c.waste; g.fill(); }, text: 'atoms as balls, bonds as sticks', sub: 'a hundred million times bigger; neither is real' },
      { icon: (g, x, y) => { rr(g, x - 16, y - 12, 32, 24, 6); g.fillStyle = c.accent; g.fill(); }, text: 'the bench enforces valency', sub: 'carbon four bonds, hydrogen one' },
      { icon: (g, x, y) => { rr(g, x - 17, y - 10, 34, 20, 10); g.fillStyle = c.s2; g.fill(); }, text: 'bond strengths: real averages' },
    ];
  }

  enter(stage) {
    if (stage <= S_CHAIN) { this._m = new Mol('C'); this._m.add(); this._done = {}; }
    if (stage === S_SHAPE && this._m.atoms.length < 6) this._m.chain(6, BENCH);
    if (stage === S_PAIRS) { this._m = new Mol('C'); this._m.chain(2, BENCH); this._bond = 0; }
    this._check();
  }

  _check() {
    const g = GOALS[this.stage];
    if (!g) return;
    for (const [name, test] of g) {
      if (!this._done[name] && test(this._m)) { this._done[name] = true; this.celebrate(230, 200, 18); }
    }
  }

  isControlHidden(id) {
    const st = this.stage;
    if (st === S_LENS) return true;
    if (id === 'ring') return st < S_SHAPE;
    if (id === 'bond') return st < S_PAIRS;
    return false;
  }

  isControlDisabled(id) {
    if (id === 'bond') return this._bond < 0;
    if (id === 'add') return this._m.sel >= 0 && this._m.hydrogens(this._m.sel) < 1;
    return false;
  }

  getControlValue(id) {
    if (id === 'bond') return String(this._m.bonds[this._bond]?.n ?? 1);
    return undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    const m = this._m;
    if (id === 'add') { if (m.add(m.sel, BENCH) >= 0) this._bond = m.bonds.length - 1; }
    else if (id === 'ring') m.closeRing(BENCH);
    else if (id === 'bond') m.setOrder(this._bond, +value);
    else if (id === 'clear') { this._m = new Mol('C'); this._m.add(); this._bond = -1; }
    this._check();
    this.requestUiUpdate?.();
  }

  pointerDown(p) {
    if (this.stage === S_LENS) return;
    const m = this._m;
    const a = m.atomAt(p);
    if (a >= 0) { m.sel = a; return; }
    const b = m.bondAt(p);
    if (b >= 0) {
      if (this._bond === b && this.stage >= S_PAIRS) m.cycleBond(b);
      this._bond = b;
      this._check();
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    rr(ctx, BENCH.x0, BENCH.y0, BENCH.x1 - BENCH.x0, BENCH.y1 - BENCH.y0, 16);
    ctx.fillStyle = c.bgSurface;
    ctx.fill();
    const m = this._m;
    drawMol(ctx, c, m, { t, hotBond: this._bond });
    if (this.stage === S_LENS) return;
    const w = m.weakest();
    const rows = [
      { label: 'formula', text: m.formula() || '-' },
      { label: 'skeleton', text: m.shape() },
      { label: 'weakest bond', text: w ? `${w.name} ${w.kJ} kJ` : '-', col: this.stage === S_WEAK ? c.bad : null },
    ];
    drawBenchCard(ctx, c, 436, 84, 228, rows, 'the bench says');
    const g = GOALS[this.stage];
    if (g) {
      g.forEach(([name], i) => {
        const ok = this._done[name];
        pill(ctx, c, `${ok ? '\u2713' : '\u25cb'} ${name}`, 452, 230 + i * 36, { bg: ok ? c.good : c.labelMuted, size: 14, align: 'left' });
      });
    }
    if (this.stage === S_WEAK) {
      ['C-C', 'C-H', 'C-O'].forEach((k, i) => pill(ctx, c, `${k}: ${BOND_KJ[k]} kJ`, 436, 236 + i * 36, { bg: c.labelMuted, size: 14, align: 'left' }));
    }
    const hint = { [S_CHAIN]: 'tap a carbon, then Add a carbon', [S_SHAPE]: 'tap a middle carbon and add: a branch', [S_PAIRS]: 'tap the bond, then tap it again' }[this.stage];
    if (hint) pill(ctx, c, hint, 232, 50, { bg: c.accent, size: 14 });
  }
}

