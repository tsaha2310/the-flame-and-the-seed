/**
 * WaterwheelScene (preset: hexokinase, labelled) - blk-l05-05-01-s03 (explain).
 * The hexokinase cycle with the words laid on it: two reactions side by side are
 * not coupled; the pocket takes glucose first, closes, then ATP, and the phosphate
 * moves; with ATP alone the fold stays open; the rule; the same coin for every step.
 *
 * Beats (five paragraphs, splitSteps() counts 5):
 *   0 Apart   - ATP's fall and glucose's lift, side by side in one glass: not coupled.
 *   1 Pocket  - glucose first, the fit bends the fold, ATP alongside, the phosphate moves.
 *   2 Wheel   - the enzyme is the wheel; with ATP alone it does almost nothing.
 *   3 Rule    - one enzyme holds the fall and the lift in one pocket.
 *   4 Coins   - a different enzyme for each step, the same coin for all.
 *
 * Canvas: the enzyme cycling; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, drawHillBackdrop, drawLedger, drawHexokinase, drawCoin, Hexo } from './WaterKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_APART = 0, S_POCKET = 1, S_WHEEL = 2, S_RULE = 3, S_COINS = 4;
const EX = 260, EY = 280;
const STEPS = { glucose: 'glucose binds first', closing: 'the fit bends the fold', atp: 'ATP binds alongside', transfer: 'the phosphate moves across', release: 'no free phosphate ever loose' };

export class WaterwheelSceneHexokinaseLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'ATP breaking is downhill; tagging glucose is uphill by less. Side by side in water they are not coupled: ATP ' +
    'breaks and its energy is wasted. Hexokinase takes glucose first, the fit bends the fold closed, ATP binds ' +
    'alongside and the phosphate moves across, so the fall pays for the lift. With ATP alone the fold does not ' +
    'close. Nearly every building step is paid this way: a different enzyme, the same coin.';

  constructor(container, config) {
    super(container, config);
    this._hx = new Hexo('none');
    this._alt = 0;
  }

  enter(stage) {
    this._hx = new Hexo(stage === S_APART ? 'none' : 'enzyme');
    this._alt = 0;
  }

  update(d) {
    this._hx.step(d);
    if (this.stage === S_WHEEL) {
      this._alt += d;
      if (this._alt > 6) { this._alt = 0; this._hx = new Hexo(this._hx.mode === 'enzyme' ? 'atp' : 'enzyme'); }
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const st = this.stage, h = this._hx;
    const say = (txt, bg, at, x = 340, y = 480) => {
      const q = popAt(this.age, at);
      if (q) pill(ctx, c, txt, x, y, { bg, size: 15, ...q });
    };
    if (st === S_COINS) { this._drawCoins(ctx, c, t, say); return; }
    h.draw(ctx, c, EX, EY, t);
    drawLedger(ctx, c, 440, 60, 224, { fall: h.fall, lift: h.lift, waste: h.waste }, 'kJ per mole, so far', 'kJ');
    if (st === S_APART) {
      say('ATP to ADP: downhill. Tagging glucose: uphill, by less', c.accent, 0.4, 340, 40);
      say('side by side: not coupled. The fall is wasted', c.bad, 1.2);
    }
    if (st === S_POCKET) {
      const n = STEPS[h.phase];
      if (n) pill(ctx, c, n, EX, 460, { bg: c.accent, size: 15 });
      say('hexokinase couples them', c.s4, 0.3, 340, 40);
    }
    if (st === S_WHEEL) {
      pill(ctx, c, h.mode === 'atp' ? 'ATP alone: the fold stays open, almost nothing' : 'with glucose: it closes and couples', EX + 80, 460, { bg: h.mode === 'atp' ? c.labelMuted : c.good, size: 14 });
      say('the wheel is the enzyme', c.s4, 0.3, 340, 40);
    }
    if (st === S_RULE) {
      say('one pocket holds the fall and the lift', c.s4, 0.3, 340, 40);
      say('exergonic plus endergonic, together: downhill', c.accent, 1.0, EX, 470);
    }
  }

  /** A row of different enzymes, each with the same ATP coin. */
  _drawCoins(ctx, c, t, say) {
    const cols = [c.s4, c.s1, c.s3, c.s5, c.s8, c.s7];
    for (let i = 0; i < 6; i++) {
      const x = 90 + (i % 3) * 250, y = 150 + Math.floor(i / 3) * 190;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.45, 0.45);
      ctx.translate(-x, -y);
      const save = c.s4;
      c.s4 = cols[i];
      drawHexokinase(ctx, c, x, y, 0.5 + 0.5 * Math.sin(t * 2 + i), t);
      c.s4 = save;
      ctx.restore();
      drawCoin(ctx, c, x + 60, y + 30, 13);
    }
    say('a different enzyme for each step', c.s4, 0.4, 340, 40);
    say('the same coin for all: ATP', c.warning, 1.2);
  }
}
