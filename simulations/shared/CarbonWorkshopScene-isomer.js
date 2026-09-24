/**
 * CarbonWorkshopScene (preset: isomer) - blk-l04-02-02-s02 (builder). Given a
 * formula, build every different skeleton that fits. Submit each: the bench turns
 * and flips it (a canonical form of the skeleton) before deciding it is new.
 * Readouts: found so far, total possible.
 *
 * Beats (four paragraphs + Lens, splitSteps() counts 5):
 *   0 Lens   - the duplicate check turns and flips in 3D, which paper cannot.
 *   1 C4H10  - the straight one, the branched one; try a third.
 *   2 C5H12  - find all three.
 *   3 C6H14  - find all five.
 *   4 C2H4   - only one way: a double bond. Then C2H2: a triple.
 *
 * Canvas: a tap-to-build bench and a shelf of found skeletons; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, rr, drawHillBackdrop, Mol, drawMol, drawBenchCard, centreMol } from './CarbonKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_LENS = 0, S_C4 = 1, S_C5 = 2, S_C6 = 3, S_C2 = 4;
const TARGETS = {
  C4H10: { c: 4, h: 10, n: 2 }, C5H12: { c: 5, h: 12, n: 3 }, C6H14: { c: 6, h: 14, n: 5 },
  C2H4: { c: 2, h: 4, n: 1 }, C2H2: { c: 2, h: 2, n: 1 },
};
const BENCH = { x0: 24, y0: 84, x1: 424, y1: 360 };

export class CarbonWorkshopSceneIsomer extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'An isomer hunt on the carbon bench. For each formula, build every different skeleton and submit it; the bench ' +
    'turns and flips each one before deciding whether it is new. C4H10 has two, C5H12 three, C6H14 five. C2H4 can ' +
    'only be built with a double bond, and C2H2 with a triple bond.';

  static CONTROLS = [
    { type: 'select', id: 'target', label: 'Formula:', options: Object.keys(TARGETS).map((k) => ({ value: k, label: k })) },
    { type: 'button', id: 'add', label: 'Add a carbon' },
    { type: 'button', id: 'submit', label: 'Submit' },
    { type: 'button', id: 'clear', label: 'Start again' },
  ];

  constructor(container, config) {
    super(container, config);
    this._target = 'C4H10';
    this._found = {};
    this._msg = null;
    this._fresh();
  }

  _fresh() {
    this._m = new Mol('C');
    this._m.add(-1, BENCH);
    this._bond = -1;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => { g.strokeStyle = c.label; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.stroke(); g.beginPath(); g.arc(x - 14, y, 7, 0, Math.PI * 2); g.arc(x + 14, y, 7, 0, Math.PI * 2); g.fillStyle = c.waste; g.fill(); }, text: 'the bench as before' },
      { icon: (g, x, y, t) => { g.save(); g.translate(x, y); g.rotate(t); g.strokeStyle = c.accent; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 12, 0.3, 5.5); g.stroke(); g.restore(); }, text: 'duplicates: turned and flipped in 3D', sub: 'before a skeleton counts as new' },
      { icon: (g, x, y) => { rr(g, x - 17, y - 10, 34, 20, 10); g.fillStyle = c.s2; g.fill(); }, text: 'which you cannot do by eye on paper' },
    ];
  }

  enter(stage) {
    this._target = { [S_C5]: 'C5H12', [S_C6]: 'C6H14', [S_C2]: 'C2H4' }[stage] ?? 'C4H10';
    if (stage <= S_C4) this._found = {};
    this._msg = null;
    this._fresh();
  }

  isControlHidden() { return this.stage === S_LENS; }

  isControlDisabled(id) {
    if (id === 'add') return this._m.sel >= 0 && this._m.hydrogens(this._m.sel) < 1;
    return false;
  }

  getControlValue(id) {
    return id === 'target' ? this._target : undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    const m = this._m;
    if (id === 'target' && TARGETS[value]) { this._target = value; this._fresh(); this._msg = null; }
    else if (id === 'add') { m.add(m.sel, BENCH); this._msg = null; }
    else if (id === 'clear') { this._fresh(); this._msg = null; }
    else if (id === 'submit') this._submit();
    this.requestUiUpdate?.();
  }

  _submit() {
    const m = this._m, tg = TARGETS[this._target];
    const cnt = m.counts();
    if (cnt.c !== tg.c || cnt.h !== tg.h) {
      this._msg = { ok: false, text: `that is ${m.formula()}, not ${this._target}` };
    } else {
      const key = m.canonical();
      const list = (this._found[this._target] ??= []);
      if (list.some((f) => f.key === key)) this._msg = { ok: false, text: 'the same one, turned round' };
      else {
        list.push({ key, mol: m.clone() });
        this._msg = { ok: true, text: list.length >= tg.n ? `all ${tg.n} found!` : 'a new one!' };
        this.celebrate(224, 200, list.length >= tg.n ? 34 : 16);
        this._fresh();
      }
    }
    this._msgAt = this.clock;
  }

  pointerDown(p) {
    if (this.stage === S_LENS) return;
    const m = this._m;
    const a = m.atomAt(p);
    if (a >= 0) { m.sel = a; return; }
    const b = m.bondAt(p);
    if (b >= 0) { m.cycleBond(b); this._bond = b; this._msg = null; }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    rr(ctx, BENCH.x0, BENCH.y0, BENCH.x1 - BENCH.x0, BENCH.y1 - BENCH.y0, 16);
    ctx.fillStyle = c.bgSurface;
    ctx.fill();
    drawMol(ctx, c, this._m, { t, hotBond: this._bond });
    if (this.stage === S_LENS) return;
    const tg = TARGETS[this._target];
    const list = this._found[this._target] ?? [];
    drawBenchCard(ctx, c, 436, 84, 228, [
      { label: 'target', text: this._target },
      { label: 'on the bench', text: this._m.formula() },
      { label: 'found', text: `${list.length} of ${tg.n}`, col: list.length >= tg.n ? c.good : null },
    ], 'the bench says');
    this._drawShelf(ctx, c, list, t);
    if (this._msg) {
      const q = popAt(this.clock - this._msgAt, 0);
      pill(ctx, c, this._msg.text, 224, 50, { bg: this._msg.ok ? c.good : c.bad, size: 15, ...(q || {}) });
    } else {
      const hint = this.stage === S_C2 ? 'tap the bond to share more pairs' : 'tap a carbon, add; Submit when it fits';
      pill(ctx, c, hint, 224, 50, { bg: c.accent, size: 14 });
    }
  }

  /** Found skeletons, drawn small without hydrogens. */
  _drawShelf(ctx, c, list, t) {
    rr(ctx, 24, 372, 640, 120, 14);
    ctx.fillStyle = c.bgSurface;
    ctx.fill();
    pill(ctx, c, 'found', 36, 372, { bg: c.labelMuted, size: 14, align: 'left' });
    list.forEach((f, i) => {
      const cx = 90 + i * 118, cy = 438;
      const m = centreMol(f.mol.clone(), cx, cy);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(0.42, 0.42);
      ctx.translate(-cx, -cy);
      m.sel = -1;
      drawMol(ctx, c, m, { t, hideH: true });
      ctx.restore();
    });
  }
}
