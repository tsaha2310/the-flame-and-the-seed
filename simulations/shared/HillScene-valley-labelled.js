/**
 * HillScene (preset: valley, labelled) - blk-l03-08-03-s04 (explain). The valley
 * Hill running through short scenes with the words laid on them: exergonic and
 * endergonic, the same reaction both ways, the floor as dynamic equilibrium,
 * burning and gas dissolving, the rule, and exothermic against exergonic.
 *
 * Beats (six paragraphs, splitSteps() counts 6):
 *   0 Ex/endergonic - from the left it falls and runs; from the right it runs backwards.
 *   1 Either        - water splitting at 25 C does not run; at 5000 C it does.
 *   2 The floor     - forward and backward at equal rates: dynamic equilibrium.
 *   3 Two floors    - burning: at the products' wall; gas: in the middle, sliding when warmed.
 *   4 Rule          - every reaction runs downhill to its floor and stops there.
 *   5 Two words     - ice at +10 C: takes in heat (endothermic) yet runs (exergonic).
 *
 * Canvas: a looping sequence of releases; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, arrow, drawHillBackdrop, drawMarble, drawValley, valleyCurve, valleyAt, ValleyBall, REACTIONS,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
  [{ idx: 5, dwellMs: null }],
];
const BOX = { x: 70, y: 110, w: 540, h: 286 };
const SHOTS = [
  [
    { rx: 'gas', C: 25, xi: 0.02, say: 'free energy falls: exergonic, it runs', col: 'good' },
    { rx: 'gas', C: 25, xi: 0.98, say: 'would rise: endergonic. It runs backwards', col: 's1' },
  ],
  [
    { rx: 'split', C: 25, xi: 0.0, say: 'water splitting, 25 \u00b0C: endergonic', col: 'bad' },
    { rx: 'split', C: 5000, xi: 0.0, say: 'at 5000 \u00b0C: exergonic from the water side', col: 'good' },
  ],
  [{ rx: 'gas', C: 25, xi: 0.5, say: 'the floor: forward = backward', col: 'warning', hold: true }],
  [
    { rx: 'methane', C: 25, xi: 0.02, say: 'burning: the floor is at the products', col: 'flame' },
    { rx: 'gas', C: 5, xi: 0.5, say: 'gas dissolving, 5 \u00b0C', col: 's1' },
    { rx: 'gas', C: 60, xi: 0.5, say: 'warmer: the floor slides toward the gas', col: 's2' },
  ],
  [
    { rx: 'gas', C: 25, xi: 0.02, say: 'downhill to the floor, then it stops', col: 'accent' },
    { rx: 'gas', C: 25, xi: 0.98, say: 'from either side', col: 'accent' },
  ],
  [{ rx: 'ice', C: 10, xi: 0.02, say: 'ice at +10 \u00b0C', col: 's1' }],
];

export class HillSceneValleyLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'The valley Hill labelled. Where free energy falls the reaction is exergonic and runs; where it would rise it is ' +
    'endergonic and runs backwards instead, toward the valley. Water splitting only runs at enormous temperatures. ' +
    'At the valley floor forward and backward balance: dynamic equilibrium. Burning\'s floor is at the products wall; ' +
    'gas dissolving\'s floor sits in the middle and slides toward the gas when warmed.';

  constructor(container, config) {
    super(container, config);
    this._ball = new ValleyBall();
    this._i = 0;
    this._t = 0;
  }

  enter() {
    this._i = 0;
    this._shot();
  }

  _cur() {
    const list = SHOTS[this.stage] ?? SHOTS[0];
    return list[this._i % list.length];
  }

  _shot() {
    this._t = 0;
    this._ball.place(this._cur().xi);
  }

  update(d) {
    this._t += d;
    const s = this._cur();
    const curve = valleyCurve(REACTIONS[s.rx], s.C, BOX);
    if (this._t > 0.8 && !this._ball.moving && !this._ball.settled && !s.hold) this._ball.release();
    this._ball.step(d, curve);
    if (this._t > 4.4 && (SHOTS[this.stage] ?? []).length > 1) { this._i += 1; this._shot(); }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const s = this._cur();
    const rx = REACTIONS[s.rx];
    const curve = valleyCurve(rx, s.C, BOX);
    drawValley(ctx, c, curve, BOX, rx);
    const b = this._ball;
    const bx = curve.x(b.xi), by = curve.y(b.xi) - 17;
    drawMarble(ctx, c, bx, by, 16, c.s4, { face: !b.moving });
    pill(ctx, c, rx.label, 16, 30, { bg: c.s5, size: 15, align: 'left' });
    pill(ctx, c, `${s.C} \u00b0C`, 664, 30, { bg: s.C > 500 ? c.flame : c.s2, size: 15, align: 'right' });
    pill(ctx, c, s.say, 340, 76, { bg: c[s.col] ?? c.accent, size: 15 });
    const st = this.stage;
    if (st === 2) {
      const vx = valleyAt(rx, s.C);
      const fx = curve.x(vx), fy = curve.y(vx) - 44;
      const w = Math.sin(t * 4) * 4;
      arrow(ctx, fx - 40 + w, fy, fx + 40 + w, fy, c.good, 5);
      arrow(ctx, fx + 40 - w, fy - 22, fx - 40 - w, fy - 22, c.s1, 5);
      const q = popAt(this.age, 1.0);
      if (q) pill(ctx, c, 'dynamic equilibrium', 340, 112, { bg: c.labelMuted, size: 14, ...q });
    }
    if (st === 1 && b.settled && b.xi < 0.01) pill(ctx, c, 'does not run', bx + 30, by - 30, { bg: c.bad, size: 14, align: 'left' });
    if (st === 4) {
      const q = popAt(this.age, 1.0);
      if (q) pill(ctx, c, 'exergonic: falls, runs  \u00b7  endergonic: rises, does not', 340, 112, { bg: c.labelMuted, size: 14, ...q });
    }
    if (st === 5) {
      const q = popAt(this.age, 0.8);
      if (q) pill(ctx, c, 'takes in heat: endothermic', 340, 112, { bg: c.flame, size: 14, ...q });
      const q2 = popAt(this.age, 1.6);
      if (q2) pill(ctx, c, 'runs by itself: exergonic', 340, 148, { bg: c.good, size: 14, ...q2 });
    }
  }
}
