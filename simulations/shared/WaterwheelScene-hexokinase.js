/**
 * WaterwheelScene (preset: hexokinase) - blk-l05-05-01-s02 (builder). The
 * waterwheel with real molecules: ATP falling to ADP on one side, glucose lifted
 * to tagged glucose on the other, and hexokinase as the wheel. Side by side with
 * no enzyme, ATP breaks slowly into water and the glucose is untouched; through
 * hexokinase, the phosphate moves across and the ledger balances.
 *
 * Beats (three paragraphs + Lens, splitSteps() counts 4):
 *   0 Lens     - the stream and bucket are now molecules; the wheel is the hexokinase fold.
 *   1 Apart    - side by side, no enzyme: ATP breaks into water; no tagged glucose.
 *   2 Enzyme   - glucose first, the fold closes, ATP binds, the phosphate moves.
 *   3 One only - ATP alone in the pocket; glucose alone.
 *
 * Canvas: molecules moving into a closing pocket; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, font, drawHillBackdrop, drawCardBox, drawLedger, drawATP, drawGlucose, drawHexokinase, Hexo,
  ATP_FALL, TAG_LIFT,
} from './WaterKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
];
const S_LENS = 0, S_APART = 1, S_ENZYME = 2, S_ONE = 3;
const MODES = { none: 'side by side, no enzyme', enzyme: 'through hexokinase', atp: 'ATP alone in the pocket', glucose: 'glucose alone in the pocket' };
const EX = 250, EY = 290;

export class WaterwheelSceneHexokinase extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'ATP and glucose side by side in water: ATP breaks slowly, its energy wasted as heat, and no glucose is tagged. ' +
    'Through hexokinase, glucose binds first, the fold closes, ATP binds alongside and its end phosphate moves onto ' +
    'the glucose: ATP\'s fall of 30.5 pays for glucose\'s lift of 13.8, with 16.7 wasted. With ATP alone the ' +
    'pocket does almost nothing; with glucose alone it waits.';

  static CONTROLS = [
    { type: 'select', id: 'mode', label: 'Setup:', options: Object.keys(MODES).map((k) => ({ value: k, label: MODES[k] })) },
    { type: 'button', id: 'reset', label: 'Start again' },
  ];

  constructor(container, config) {
    super(container, config);
    this._hx = new Hexo('none');
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => { g.save(); g.translate(x, y); g.scale(0.45, 0.45); g.translate(-x, -y); drawATP(g, c, x - 10, y, 3); g.restore(); }, text: 'stream and bucket are now molecules', sub: 'ATP falls to ADP; glucose is tagged' },
      { icon: (g, x, y, t) => { g.save(); g.translate(x, y); g.scale(0.16, 0.16); g.translate(-x, -y); drawHexokinase(g, c, x, y, 0.5, t); g.restore(); }, text: 'the wheel: the hexokinase fold', sub: 'with both pockets, from V.4' },
      { icon: (g, x, y) => { rr(g, x - 17, y - 10, 34, 20, 10); g.fillStyle = c.s2; g.fill(); }, text: 'energies are real, in the sim\'s units' },
    ];
  }

  enter(stage) {
    this._hx = new Hexo(stage === S_ENZYME ? 'enzyme' : stage === S_ONE ? 'atp' : 'none');
  }

  isControlHidden() { return this.stage === S_LENS; }

  getControlValue(id) {
    return id === 'mode' ? this._hx.mode : undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    if (id === 'mode' && MODES[value]) this._hx = new Hexo(value);
    else if (id === 'reset') this._hx = new Hexo(this._hx.mode);
    this.requestUiUpdate?.();
  }

  update(d) {
    this._hx.step(d);
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const h = this._hx;
    h.draw(ctx, c, EX, EY, t);
    if (this.stage === S_LENS) return;
    pill(ctx, c, MODES[h.mode], 16, 30, { bg: c.s4, size: 15, align: 'left' });
    drawLedger(ctx, c, 440, 60, 224, { fall: h.fall, lift: h.lift, waste: h.waste }, 'kJ per mole, so far', 'kJ');
    drawCardBox(ctx, c, 440, 200, 224, 76);
    ctx.fillStyle = c.label;
    ctx.font = font(c, 800, 15);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`tagged glucose: ${h.tagged}`, 452, 224);
    ctx.fillText(`ATP left: ${h.till}`, 452, 254);
    const note = {
      enzyme: { glucose: 'glucose binds first', closing: 'the fit bends the fold', atp: 'now ATP fits alongside', transfer: 'the phosphate moves across', release: 'fall paid for the lift' },
      glucose: { bound: 'bound, closed: waiting for ATP' },
      atp: { wait: 'the fold will not close: nothing' },
    }[h.mode]?.[h.phase];
    if (note) pill(ctx, c, note, EX, 470, { bg: c.accent, size: 15 });
    if (h.mode === 'enzyme' && h.cycles > 0) {
      const q = popAt(this.age, 0.2);
      if (q) pill(ctx, c, `fall ${ATP_FALL}, lift ${TAG_LIFT}, heat ${(ATP_FALL - TAG_LIFT).toFixed(1)}`, 664, 310, { bg: c.labelMuted, size: 14, align: 'right' });
    }
  }
}
