/**
 * HillScene (preset: two-hills, labelled) - blk-l01-02-02-s04 (explain). The
 * two-marble rig running by itself, with the words laid on it: work, the energy
 * account (climb + warmth = fall), conservation, the Hill's name, and the rule.
 *
 * Beats (five paragraphs, splitSteps() counts 5):
 *   0 Work        - the heavy one falls, the thread passes it on, the light one climbs.
 *   1 Account     - runs alternate rubbing off / on; fall = climb + speed + warmth.
 *   2 Conserved   - one set of bars: height, speed, warmth; the total never moves.
 *   3 The Hill    - downhill by itself; a hump blocks; one fall lifts another ball.
 *   4 Rule        - up arrow on the light one, down arrow on the heavy one.
 *
 * Canvas: continuous coupled motion; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, drawHillBackdrop, drawEnergyBars, arrow, StringRig } from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_WORK = 0, S_ACCOUNT = 1, S_CONSERVED = 2, S_HILL = 3, S_RULE = 4;
const RUB_ON = 0.05;

export class HillSceneTwoHillsLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'The heavy marble falls and, through the thread, lifts the light marble: it does work on it. With no rubbing ' +
    'the light marble climbs exactly as much as the fall was worth; with rubbing it climbs less and the tracks warm, ' +
    'and climb plus warmth always equals the fall. Energy is never made or destroyed. This picture is the Hill.';

  constructor(container, config) {
    super(container, config);
    this._rig = new StringRig();
    this._runs = 0;
    this._wait = 0;
  }

  enter(stage) {
    const r = this._rig;
    r.string = true;
    r.start = 'high';
    r.rub = stage === S_CONSERVED ? RUB_ON : 0;
    r.setHump(stage === S_HILL ? 'medium' : 'none');
    this._runs = 0;
    this._wait = 0.5;
  }

  update(d) {
    const r = this._rig;
    if (this._wait > 0) {
      this._wait -= d;
      if (this._wait <= 0) {
        if (this.stage === S_ACCOUNT) r.rub = this._runs % 2 ? RUB_ON : 0;
        r.run();
      }
      return;
    }
    r.step(d);
    // After a full out-and-back (or settling with rubbing), hold the pose, then go again.
    if (r.done || (r.turnAge > 1.4 && r.s < 2) || r.turnAge > 5) {
      r.moving = false;
      this._runs += 1;
      this._wait = 2.2;
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const r = this._rig, st = this.stage;
    const pos = r.draw(ctx, c, t, { threadCol: st === S_WORK ? c.warning : c.label, threadW: st === S_WORK ? 4 : 2.5 });
    const j = r.joulesNow();
    if (st === S_WORK || st === S_RULE) {
      const a = popAt(this.age, 0.3);
      if (a) {
        ctx.save();
        ctx.globalAlpha *= a.alpha;
        arrow(ctx, pos.xh - 40, pos.yh - 30, pos.xh - 40, pos.yh + 30, c.s5, 6);
        arrow(ctx, pos.xl + 34, pos.yl + 30, pos.xl + 34, pos.yl - 30, c.s2, 6);
        ctx.restore();
      }
      if (st === S_WORK) {
        pill(ctx, c, 'the heavy one falls', 16, 30, { bg: c.s5, size: 15, align: 'left', ...(a || { alpha: 0 }) });
        const p2 = popAt(this.age, 1.0);
        if (p2) pill(ctx, c, 'the thread passes it on', 340, 30, { bg: c.warning, size: 15, ...p2 });
        const p3 = popAt(this.age, 1.7);
        if (p3) pill(ctx, c, 'work: a push through a distance', 664, 480, { bg: c.s2, size: 15, align: 'right', ...p3 });
      } else {
        const p2 = popAt(this.age, 0.6);
        if (p2) pill(ctx, c, 'something went up...', 664, 220, { bg: c.s2, size: 15, align: 'right', ...p2 });
        const p3 = popAt(this.age, 1.2);
        if (p3) pill(ctx, c, '...because something came down', 16, 380, { bg: c.s5, size: 15, align: 'left', ...p3 });
        const p4 = popAt(this.age, 2.0);
        if (p4) pill(ctx, c, 'nothing runs uphill on its own', 500, 492, { bg: c.accent, size: 16, ...p4 });
      }
    }
    if (st === S_ACCOUNT) {
      const mj = (v) => `${(v * 1000).toFixed(0)} mJ`;
      const rows = [
        { label: 'fall', value: j.fallJ, col: c.s5, text: mj(j.fallJ) },
        { label: 'climb', value: j.climbJ, col: c.s2, text: mj(j.climbJ) },
        { label: 'speed', value: j.speedJ, col: c.s1, text: mj(j.speedJ) },
        { label: 'warmth', value: j.heatJ, col: c.bad, text: mj(j.heatJ) },
      ];
      drawEnergyBars(ctx, c, 12, 12, 250, rows, 0.6, { labelW: 70, title: r.rub > 0 ? 'rubbing on' : 'rubbing off' });
      pill(ctx, c, 'fall = climb + speed + warmth', 500, 492, { bg: c.accent, size: 15 });
    }
    if (st === S_CONSERVED) {
      const mj = (v) => `${(v * 1000).toFixed(0)} mJ`;
      const acc = r.account();
      const rows = [
        { label: 'height', value: acc.heightJ, col: c.s1, text: mj(acc.heightJ) },
        { label: 'speed', value: acc.speedJ, col: c.s2, text: mj(acc.speedJ) },
        { label: 'warmth', value: acc.heatJ, col: c.bad, text: mj(acc.heatJ) },
        { label: 'total', value: acc.totalJ, col: c.warning, text: mj(acc.totalJ) },
      ];
      drawEnergyBars(ctx, c, 12, 12, 250, rows, acc.totalJ, { labelW: 70 });
      const p = popAt(this.age, 1.0);
      if (p) pill(ctx, c, 'never made, never destroyed', 500, 492, { bg: c.accent, size: 15, ...p });
    }
    if (st === S_HILL) {
      pill(ctx, c, 'the Hill', 16, 30, { bg: c.accent, size: 18, align: 'left', display: true });
      const p1 = popAt(this.age, 0.5);
      if (p1) pill(ctx, c, 'downhill: happens by itself', 20, 250, { bg: c.s5, size: 14, align: 'left', ...p1 });
      const p2 = popAt(this.age, 1.2);
      if (p2) pill(ctx, c, 'a hump blocks the way', 540, 300, { bg: c.bad, size: 14, ...p2 });
      const p3 = popAt(this.age, 1.9);
      if (p3) pill(ctx, c, 'one fall lifts another ball', 380, 30, { bg: c.s2, size: 14, align: 'left', ...p3 });
    }
  }
}
