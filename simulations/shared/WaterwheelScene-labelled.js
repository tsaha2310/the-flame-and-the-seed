/**
 * WaterwheelScene (labelled) - blk-l03-08-04-s03 (explain). The rig running by
 * itself with the words laid on: the fall is exergonic, the lift endergonic,
 * coupling joins them, the three rules the sim enforces, the rule, and the seed.
 *
 * Beats (seven blocks, splitSteps() counts 7):
 *   0 Fall      - free energy drops; alone it ends as heat and noise.
 *   1 Lift      - free energy rises; alone it does not happen.
 *   2 Coupling  - connected: one change, downhill overall; the difference is heat.
 *   3 Rules     - three rules the sim enforces.
 *   4 The three - lift <= fall; some always wasted; they must be connected.
 *   5 Rule      - coupling joins a fall to a lift through a shared connection.
 *   6 The seed  - what falls, and what the wheel is made of: Books IV and V.
 *
 * Canvas: the rig looping; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, font, drawHillBackdrop, drawCardBox, Rig, drawRig, drawLedger } from './WaterKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
  [{ idx: 5, dwellMs: null }],
  [{ idx: 6, dwellMs: null }],
];
const S_FALL = 0, S_LIFT = 1, S_COUPLE = 2, S_RULES = 3, S_THREE = 4, S_RULE = 5, S_SEED = 6;
const RULES = ['the lift is never bigger than the fall', 'some of the fall is always wasted', 'the two must be connected'];

export class WaterwheelSceneLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A falling stream is exergonic: its free energy drops, and alone it ends as heat. A rising bucket is ' +
    'endergonic: alone it does not happen. Connected through the wheel, the fall pays for the lift and the pair runs ' +
    'downhill together, with the difference wasted as heat. The lift is never bigger than the fall, some is always ' +
    'wasted, and the two must be connected. This is coupling.';

  constructor(container, config) {
    super(container, config);
    this._rig = new Rig({ stream: 'high', load: 2, gear: 'fast' });
  }

  enter(stage) {
    const r = this._rig;
    r.connected = stage >= S_COUPLE;
    r.gear = 'fast';
    r.load = 2;
    r.reset();
    this._delay = 1.2;               // show the empty ledger for a moment, then run
    this._rules = 0;
  }

  update(d) {
    const r = this._rig;
    if (this._delay > 0) {
      this._delay -= d;
      if (this._delay <= 0) r.run();
    }
    r.step(d);
    if (!r.running && r.t > 0) {
      this._hold = (this._hold ?? 0) + d;
      if (this._hold > 2) { this._hold = 0; r.run(); }
    }
    if (this.stage === S_THREE) this._rules = Math.floor(this.age / 1.6) % 3;
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const r = this._rig, st = this.stage;
    drawRig(ctx, c, r, t);
    const say = (txt, bg, at, x = 340, y = 480) => {
      const q = popAt(this.age, at);
      if (q) pill(ctx, c, txt, x, y, { bg, size: 15, ...q });
    };
    if (st <= S_COUPLE || st === S_RULE) drawLedger(ctx, c, 190, 14, 290, r.tot);
    if (st === S_FALL) {
      say('the fall: exergonic, free energy drops', c.water, 0.4, 340, 440);
      say('alone, it ends as heat and noise', c.bad, 1.2);
    }
    if (st === S_LIFT) {
      say('the lift: endergonic, free energy rises', c.s8, 0.4, 340, 440);
      say('alone, it does not happen', c.labelMuted, 1.2);
    }
    if (st === S_COUPLE) {
      say('connected: the fall pays for the lift', c.s5, 0.4, 340, 440);
      say('one change, downhill overall: this is coupling', c.accent, 1.2);
    }
    if (st === S_RULES || st === S_THREE) this._drawRules(ctx, c);
    if (st === S_RULE) say('coupling: a fall joined to a lift, through a connection', c.accent, 0.4);
    if (st === S_SEED) {
      say('the seed couples every uphill step to a fall', c.mold, 0.4, 340, 60);
      say('what falls, and what the wheel is made of: Books IV and V', c.labelMuted, 1.2);
    }
  }

  _drawRules(ctx, c) {
    const x = 190, y = 14, w = 290;
    drawCardBox(ctx, c, x, y, w, 132);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('three rules the sim enforces', x + 12, y + 18);
    RULES.forEach((txt, i) => {
      const q = popAt(this.age, 0.3 + i * 0.5);
      if (!q) return;
      const on = this.stage === S_THREE && this._rules === i;
      ctx.fillStyle = on ? c.good : c.label;
      ctx.font = font(c, 800, 14);
      ctx.fillText(`${i + 1}. ${txt}`, x + 12, y + 48 + i * 28);
    });
  }
}
