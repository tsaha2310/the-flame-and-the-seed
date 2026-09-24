/**
 * HillScene (preset: catalyst) - blk-l03-06-03-s02 (hinge, observe). The reaction
 * Hill with a catalyst dial, drawn as a hand pressing the hump down. Count the
 * crossings and read the energy out per crossing; then run it backwards.
 *
 * Beats (five paragraphs, splitSteps() counts 5):
 *   0 Lens     - the hand is a cartoon; the real thing offers a different route.
 *   1 None     - no catalyst, room temperature: count; energy out per crossing.
 *   2 Some     - add some: count; read.
 *   3 Lots     - add lots: count; read (the same every time).
 *   4 Reverse  - products back to reactants, with and without the catalyst.
 *
 * Canvas: rolling marbles; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, rr, drawHillBackdrop, drawHand, drawRunLog, drawMarble, ReactionHill, CrossingRun, TEMPS, CATALYST,
  heatCol,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_LENS = 0, S_NONE = 1, S_SOME = 2, S_LOTS = 3, S_REV = 4;
const DROP = 1000;
const OUT_KJ = 98;                     // hydrogen peroxide to water and oxygen, per mole of peroxide

export class HillSceneCatalyst extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'The reaction Hill for hydrogen peroxide with a catalyst dial, drawn as a hand pressing the hump down. More ' +
    'catalyst, a lower hump, more collisions cross at room temperature. The energy out per crossing stays 98 ' +
    'kilojoules per mole every time. Run backwards, the catalyst speeds the reverse reaction too.';

  static CONTROLS = [
    { type: 'select', id: 'cat', label: 'Catalyst:', options: [
      { value: 'none', label: 'none' }, { value: 'some', label: 'some' }, { value: 'lots', label: 'lots' },
    ] },
    { type: 'select', id: 'temp', label: 'Temperature:', options: Object.keys(TEMPS).map((k) => ({ value: k, label: TEMPS[k].label })) },
    { type: 'select', id: 'dir', label: 'Direction:', options: [
      { value: 'forward', label: 'forward' }, { value: 'reverse', label: 'reverse' },
    ] },
    { type: 'button', id: 'run', label: 'Release 100 marbles' },
    { type: 'button', id: 'valley', label: 'Valley mover: locked' },
  ];

  constructor(container, config) {
    super(container, config);
    this._hill = new ReactionHill({ hump: CATALYST.none, drop: DROP });
    this._run = new CrossingRun(this._hill, 17);
    this._cat = 'none';
    this._temp = 'room';
    this._dir = 'forward';
    this._log = [];
    this._logged = true;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => drawHand(g, c, x, y + 14, 0.32), text: 'the hand is a cartoon', sub: 'a catalyst offers a lower route' },
      { icon: (g, x, y) => { rr(g, x - 17, y - 10, 34, 20, 10); g.fillStyle = c.s2; g.fill(); }, text: 'rate and energy readouts', sub: 'calculated, not measured' },
      { icon: (g, x, y) => drawMarble(g, c, x, y, 10, heatCol(c, 0.7), {}), text: 'each marble: one collision' },
    ];
  }

  enter(stage) {
    this._cat = stage === S_SOME ? 'some' : stage === S_LOTS ? 'lots' : 'none';
    this._dir = stage === S_REV ? 'reverse' : 'forward';
    this._temp = 'room';
    if (stage <= S_NONE) this._log = [];
    this._apply();
  }

  _apply() {
    this._hill.set(CATALYST[this._cat], DROP);
    this._run.reset();
  }

  isControlHidden(id) {
    if (this.stage === S_LENS) return true;
    if (id === 'dir') return this.stage < S_REV;
    return false;
  }

  isControlDisabled(id) {
    if (id === 'valley') return true;
    return id !== 'run' && this._run.active && !this._run.done;
  }

  getControlValue(id) {
    if (id === 'cat') return this._cat;
    if (id === 'temp') return this._temp;
    if (id === 'dir') return this._dir;
    return undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    if (id === 'cat' && CATALYST[value] != null) { this._cat = value; this._apply(); }
    else if (id === 'temp' && TEMPS[value]) { this._temp = value; this._run.reset(); }
    else if (id === 'dir' && (value === 'forward' || value === 'reverse')) { this._dir = value; this._run.reset(); }
    else if (id === 'run') {
      this._run.start(100, TEMPS[this._temp].K, this._dir === 'forward' ? 1 : -1);
      this._logged = false;
    }
    this.requestUiUpdate?.();
  }

  update(d) {
    const run = this._run;
    run.step(d);
    if (run.done && !this._logged) {
      this._logged = true;
      this._log.push({ text: `${this._dir === 'reverse' ? 'back' : 'fwd'} \u00b7 ${this._cat} \u00b7 ${this._temp}`, n: run.crossed });
      if (this._log.length > 5) this._log.shift();
      this.requestUiUpdate?.();
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const hill = this._hill, run = this._run, st = this.stage;
    hill.draw(ctx, c, { ghostHump: CATALYST.none });
    const top = hill.yR - hill.hPx;
    if (this._cat !== 'none') {
      const press = Math.sin(t * 3) * 2;
      drawHand(ctx, c, hill.xp, top - 4 + press, 0.9);
      pill(ctx, c, `catalyst: ${this._cat}`, hill.xp + 40, top - 70, { bg: c.s5, size: 14, align: 'left' });
    }
    pill(ctx, c, 'peroxide', 120, hill.yR - 26, { bg: c.s1, size: 14 });
    pill(ctx, c, 'water + oxygen', 560, hill.yR + hill.dPx - 26, { bg: c.s3, size: 14 });
    run.draw(ctx, c);
    run.drawTrays(ctx, c, this._dir === 'reverse' ? { leftLabel: 'crossed back', rightLabel: 'stayed' } : {});
    if (st === S_LENS) return;
    drawRunLog(ctx, c, 16, 14, 226, 'crossed, of 100', this._log);
    const rev = this._dir === 'reverse';
    pill(ctx, c, `energy ${rev ? 'in' : 'out'} per crossing: ${OUT_KJ} kJ`, 664, 30, { bg: c.warning, size: 14, align: 'right' });
    pill(ctx, c, TEMPS[this._temp].label, 664, 66, { bg: this._temp === 'flame' ? c.flame : c.s2, size: 14, align: 'right' });
    if (!run.active) {
      const hint = st === S_NONE ? 'no catalyst: release' : st === S_SOME ? 'some catalyst: release'
        : st === S_LOTS ? 'lots of catalyst: release' : 'backwards: with and without catalyst';
      pill(ctx, c, hint, 664, 102, { bg: c.accent, size: 14, align: 'right', scale: 1 + 0.05 * Math.sin(t * 5) });
    }
  }
}
