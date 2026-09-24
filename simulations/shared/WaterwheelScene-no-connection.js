/**
 * WaterwheelScene (preset: no-connection) - blk-l03-08-04-s05 (what-if). Kabir
 * removes the wheel and leaves the stream and the bucket side by side. The water
 * falls and its energy becomes heat and spray; the bucket never moves, though the
 * fall is exactly as big as before. A fall with no wheel: that is a flame.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - the connected rig lifting the bucket; predict.
 *   1 run   - the switch; no wheel; the ledger: all fall, no lift, all heat.
 *   2 nails - proximity is not coupling; a flame is a fall with no wheel.
 *
 * Canvas: the stream and the bucket; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, drawHillBackdrop, drawFlame, Rig, drawRig, drawLedger } from './WaterKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;

export class WaterwheelSceneNoConnection extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A stream and a bucket. With the wheel connecting them, the fall lifts the bucket. With the wheel removed and ' +
    'the two side by side, the water falls, its energy becomes heat and spray, and the bucket never moves, though ' +
    'the fall is just as big. A fall with no wheel is what a flame is.';

  static CONTROLS = [
    { type: 'button', id: 'in', label: 'Wheel: in', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'out', label: 'Wheel: removed', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'in';
    this._rig = new Rig({ stream: 'high', load: 2, gear: 'fast' });
    this._dialled = false;
    this._delay = 1.2;
  }

  enter() {
    this.mode = 'in';
    this._dialled = false;
    this._restart();
  }

  _restart() {
    this._rig.connected = this.mode === 'in';
    this._rig.reset();
    this._delay = 1.2;
  }

  isControlHidden() { return this.stage === S_SETUP; }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'in' || id === 'out') { this.mode = id; this._dialled = true; this._restart(); }
    this.requestUiUpdate?.();
  }

  update(d) {
    const r = this._rig;
    if (this.stage === S_RUN && !this._dialled) { r.step(0); return; }
    if (this._delay > 0) {
      this._delay -= d;
      if (this._delay <= 0) r.run();
    }
    r.step(d);
    if (!r.running && r.t > 0) {
      this._hold = (this._hold ?? 0) + d;
      if (this._hold > 2.5) { this._hold = 0; r.run(); }
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const r = this._rig, out = this.mode === 'out';
    drawRig(ctx, c, r, t, { noWheel: out });
    drawLedger(ctx, c, 190, 14, 290, r.tot);
    const st = this.stage;
    if (st === S_SETUP) {
      const q = popAt(this.age, 1.0);
      if (q) pill(ctx, c, 'predict: no wheel. What does the fall do?', 340, 480, { bg: c.accent, size: 15, ...q });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the dial', 340, 480, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_RUN && out && r.t > 2) pill(ctx, c, 'as big a fall; nothing lifted, ever', 340, 480, { bg: c.bad, size: 15 });
    if (st === S_NAILS) {
      drawFlame(ctx, c, 600, 130, 1.4, t);
      const q = popAt(this.age, 0.5);
      if (q) pill(ctx, c, 'a flame: a fall with no wheel', 340, 480, { bg: c.flame, size: 15, ...q });
    }
  }
}
