/**
 * CrowdScene (preset: reacts, labelled) - blk-l03-06-01-s04 (explain). Reactions
 * through collisions, with the words laid on: only hard hits count (the rate),
 * warmer, more concentrated, powder against lump, and the rule. Pairs of live
 * boxes race side by side.
 *
 * Beats (five paragraphs, splitSteps() counts 5):
 *   0 Collisions - only hard enough hits react: gold burst for a reaction, grey for a bounce.
 *   1 Warmer     - fridge against warm; ten degrees often doubles it; the milk.
 *   2 More       - middle red against double red.
 *   3 Surface    - lump against powder; flour dust.
 *   4 Rule       - warmer, more concentrated, more surface: more collisions that count.
 *
 * Canvas: reacting particles; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, drawHillBackdrop, drawBox, drawParticles, ReactionBox, drawFlashes } from './CrowdKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_COLL = 0, S_WARM = 1, S_MORE = 2, S_SURF = 3, S_RULE = 4;
const L = { x0: 30, y0: 110, x1: 330, y1: 400 }, R = { x0: 350, y0: 110, x1: 650, y1: 400 };

export class CrowdSceneReactsLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'Red and blue particles react only when they collide hard enough; the number of successful collisions each ' +
    'second is the rate. Warmer boxes, boxes with more red, and blue as powder instead of a lump all react faster, ' +
    'because each gives more collisions that count.';

  constructor(container, config) {
    super(container, config);
    this._pair = [];
  }

  enter(stage) {
    const one = (box, o) => new ReactionBox({ ...box, red: 24, ...o });
    if (stage === S_COLL || stage === S_RULE) this._pair = [{ label: null, rx: new ReactionBox({ x0: 140, y0: 110, x1: 540, y1: 400, red: 36, ea: 1.8 }) }];
    // Same seed in both boxes: the same starting places and directions, only the jiggle differs.
    if (stage === S_WARM) this._pair = [{ label: 'fridge, 5 \u00b0C', rx: one(L, { temp: 5, ea: 2.4, red: 60, seed: 61 }) }, { label: 'warm, 60 \u00b0C', rx: one(R, { temp: 60, ea: 2.4, red: 60, seed: 61 }) }];
    if (stage === S_MORE) this._pair = [{ label: 'middle red', rx: one(L, { seed: 62 }) }, { label: 'double red', rx: one(R, { red: 48, seed: 62 }) }];
    if (stage === S_SURF) this._pair = [{ label: 'a lump', rx: one(L, { seed: 63 }) }, { label: 'powder', rx: one(R, { powder: true, seed: 63 }) }];
    this._t = 0;
  }

  update(d) {
    this._t += d;
    for (const p of this._pair) p.rx.step(d);
    if (this._t > 12) this.enter(this.stage);
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const st = this.stage;
    const say = (txt, bg, at, x = 340, y = 470) => {
      const q = popAt(this.age, at);
      if (q) pill(ctx, c, txt, x, y, { bg, size: 15, ...q });
    };
    for (const p of this._pair) {
      const b = p.rx.box;
      drawBox(ctx, c, b);
      drawParticles(ctx, c, b);
      drawFlashes(ctx, c, p.rx);
      if (p.label) pill(ctx, c, `${p.label}: ${p.rx.count} reacted`, (b.x0 + b.x1) / 2, b.y0 - 24, { bg: c.s5, size: 14 });
    }
    if (st === S_COLL) {
      pill(ctx, c, 'gold: hard enough, it reacts. Grey: a bounce', 340, 60, { bg: c.warning, size: 14 });
      say('successful collisions per second: the rate', c.accent, 1.0);
    }
    if (st === S_WARM) {
      say('faster, more often, and more hits hard enough', c.bad, 0.5, 340, 440);
      say('ten degrees warmer: often double. That is the milk', c.labelMuted, 1.4, 340, 488);
    }
    if (st === S_MORE) say('more red in the same space: blue meets red more often', c.s6, 0.5, 340, 450);
    if (st === S_SURF) {
      say('a lump\'s inside cannot be hit; powder is nearly all surface', c.s1, 0.5, 340, 440);
      say('why flour dust can explode', c.flame, 1.4, 340, 488);
    }
    if (st === S_RULE) {
      pill(ctx, c, 'reactions happen through collisions', 340, 60, { bg: c.accent, size: 15 });
      say('warmer, more concentrated, more surface: more that count', c.good, 0.8);
    }
  }
}
