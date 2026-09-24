/**
 * HillScene (preset: free-energy, labelled) - blk-l03-08-02-s03 (explain). The
 * two-layer Hill running through its cases with the words laid on it: the two
 * pushes, their weighted sum (free energy), ice at three temperatures, the
 * candle, the rule, and the upgrade from the heat-only Hill.
 *
 * Beats (six paragraphs, splitSteps() counts 6):
 *   0 Pushes   - heat out spreads into the surroundings; ways inside; T sets their weight.
 *   1 Sum      - one number: free energy. It falls: the change runs by itself.
 *   2 Ice      - -10, 0, +10 C in turn: stays, balances, melts.
 *   3 Candle   - both forward: downhill at every temperature.
 *   4 Rule     - the true height is free energy.
 *   5 Upgrade  - the heat-only Hill (dashed) against the full one.
 *
 * Canvas: the Hill re-shapes as the temperature steps; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, drawHillBackdrop, drawPushCard, drawStepHill, drawChangeThing, changeNames, pushes, verdict,
  FE_HEAT, FE_WAYS, FE_TEMPS,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
  [{ idx: 5, dwellMs: null }],
];
const S_PUSH = 0, S_SUM = 1, S_ICE = 2, S_CANDLE = 3, S_RULE = 4, S_UP = 5;
const X0 = 40, X1 = 640, YB = 340;
const CYCLE = {
  [S_PUSH]: ['zero', 'p25', 'p100'],
  [S_SUM]: ['p10'],
  [S_ICE]: ['m10', 'zero', 'p10'],
  [S_CANDLE]: ['m10', 'p25', 'p100'],
  [S_RULE]: ['m10', 'zero', 'p10'],
  [S_UP]: ['p10'],
};

export class HillSceneFreeEnergyLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'The free-energy Hill labelled. Heat given out pushes a change forward; ways gained push it forward too, more ' +
    'strongly at higher temperature. Their weighted sum is the free energy. Ice melting stays ice at minus 10, ' +
    'balances at 0 and melts at plus 10. A candle is downhill at every temperature. The heat-only Hill was the start.';

  constructor(container, config) {
    super(container, config);
    this._ti = 0;
    this._t = 0;
    this._ball = 0;
  }

  enter() {
    this._ti = 0;
    this._t = 0;
    this._ball = 0;
  }

  _case() {
    const st = this.stage;
    const candle = st === S_CANDLE;
    const heat = candle ? 'out600' : 'in6', ways = candle ? 'gain60' : 'gain22';
    const temps = CYCLE[st];
    const temp = temps[this._ti % temps.length];
    return { heat, ways, temp, p: pushes(FE_HEAT[heat].v, FE_WAYS[ways].v, FE_TEMPS[temp].C) };
  }

  update(d) {
    this._t += d;
    const temps = CYCLE[this.stage];
    if (temps.length > 1 && this._t > 3.2) { this._t = 0; this._ti += 1; this._ball = 0; }
    const { p } = this._case();
    const v = verdict(p.net);
    const target = v === 'forward' ? 1 : v === 'balanced' ? 0.5 : 0;
    if (this._t > 0.6) this._ball += (target - this._ball) * Math.min(1, d * 1.8);
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const st = this.stage;
    const { heat, ways, temp, p } = this._case();
    const scale = Math.max(1, Math.abs(p.heat), Math.abs(p.ways));
    const v = verdict(p.net);
    const dropOf = (net) => (verdict(net) === 'balanced' ? 0 : Math.sign(net) * Math.max(24, Math.min(120, (Math.abs(net) / scale) * 120)));
    if (st === S_UP) {
      // The heat-only Hill, dashed, for comparison.
      const ho = pushes(FE_HEAT[heat].v, FE_WAYS[ways].v, FE_TEMPS[temp].C, false);
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([8, 8]);
      drawStepHill(ctx, c, X0, X1, YB, dropOf(ho.net), { col: c.labelMuted });
      ctx.restore();
    }
    const drop = dropOf(p.net);
    const y = drawStepHill(ctx, c, X0, X1, YB, drop);
    const n = changeNames(heat, ways);
    pill(ctx, c, n.a, X0 + 90, YB + 40, { bg: c.s1, size: 14 });
    pill(ctx, c, n.b, X1 - 90, YB + drop + 40, { bg: c.s3, size: 14 });
    const bx = X0 + 90 + (X1 - X0 - 180) * this._ball;
    drawChangeThing(ctx, c, n.kind, bx, y(bx) - 22, this._ball, t);
    drawPushCard(ctx, c, 16, 14, 396, p, { scale });
    pill(ctx, c, FE_TEMPS[temp].label, 664, 30, { bg: temp === 'm10' ? c.s1 : c.s2, size: 15, align: 'right' });
    const say = (txt, bg, at, yy = 70) => {
      const q = popAt(this.age, at);
      if (q) pill(ctx, c, txt, 664, yy, { bg, size: 14, align: 'right', ...q });
    };
    if (st === S_PUSH) {
      say('heat out: spreads outside', c.flame, 0.4, 70);
      say('ways gained: inside', c.s5, 1.2, 106);
      say('temperature: weight of ways', c.s2, 2.0, 142);
    }
    if (st === S_SUM) {
      say('net: fall in free energy', c.good, 0.4, 70);
      say('it falls: runs by itself', c.accent, 1.2, 106);
    }
    if (st === S_ICE || st === S_RULE) {
      const txt = v === 'forward' ? 'ways win: ice melts' : v === 'balanced' ? 'balanced: ice and water' : 'heat wins: ice stays ice';
      pill(ctx, c, txt, 664, 70, { bg: v === 'forward' ? c.good : v === 'balanced' ? c.warning : c.bad, size: 14, align: 'right' });
    }
    if (st === S_CANDLE) pill(ctx, c, 'both forward: always downhill', 664, 70, { bg: c.flame, size: 14, align: 'right' });
    if (st === S_RULE) say('height = heat + ways \u00d7 T', c.accent, 0.6, 106);
    if (st === S_UP) {
      pill(ctx, c, 'heat-only Hill: uphill', 664, 70, { bg: c.labelMuted, size: 14, align: 'right' });
      say('full Hill: downhill, melts', c.good, 0.8, 106);
    }
  }
}
