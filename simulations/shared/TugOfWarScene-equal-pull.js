/**
 * TugOfWarScene (preset: equal-pull) - blk-l01-05-03-s06 (what-if). Kabir's
 * equal world: every atom pulls the same. The rope never moves, sodium keeps its
 * electron, chlorine never takes it, there are no ions, and the LED in the salt
 * water circuit stays dark.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - our world: the knot at chlorine, ions in the water, the LED lit; predict.
 *   1 run   - the switch; the knot slides to the middle; ions gone; the LED goes dark.
 *   2 nails - differences in pull are what make ions.
 *
 * Canvas: the rope, drifting ions and the LED; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, drawHillBackdrop, drawTug, drawCircuit, knotTarget } from './TugKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;

export class TugOfWarSceneEqualPull extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'Sodium and chlorine in a tug of war, above a glass of salt water wired to a battery and an LED. In our world ' +
    'chlorine wins the electron, the salt is made of ions and the LED lights. If every atom pulled the same, the ' +
    'rope would never move, there would be no ions, and the LED would stay dark.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Every atom pulls the same: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Every atom pulls the same: ON', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._k = 1;
    this._lit = 1;
    this._dialled = false;
  }

  enter() {
    this.mode = 'off';
    this._dialled = false;
  }

  isControlHidden() { return this.stage === S_SETUP; }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'on' || id === 'off') { this.mode = id; this._dialled = true; }
    this.requestUiUpdate?.();
  }

  update(d) {
    const eq = this.mode === 'on';
    this._k += (knotTarget('Na', 'Cl', { equal: eq }) - this._k) * Math.min(1, d * 2.5);
    const ions = Math.abs(this._k) > 0.9;
    this._lit += ((ions ? 1 : 0) - this._lit) * Math.min(1, d * 4);
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const eq = this.mode === 'on';
    drawTug(ctx, c, 'Na', 'Cl', this._k, 140, 540, 140, t, { charges: true, equal: eq });
    const ions = Math.abs(this._k) > 0.9;
    drawCircuit(ctx, c, 340, 320, this._lit > 0.5 ? this._lit : 0, t, { ions });
    pill(ctx, c, 'salt water', 340, 452, { bg: c.water, size: 14 });
    pill(ctx, c, this._lit > 0.5 ? 'LED: lit' : 'LED: dark', 436, 222, { bg: this._lit > 0.5 ? c.warning : c.labelMuted, size: 14, align: 'left' });
    pill(ctx, c, eq ? 'equal world: everything a tie' : 'our world', 16, 30, { bg: eq ? c.bad : c.good, size: 15, align: 'left' });
    const st = this.stage;
    if (st === S_SETUP) {
      const q = popAt(this.age, 1.0);
      if (q) pill(ctx, c, 'predict: equal pulls, salt water?', 664, 30, { bg: c.accent, size: 15, align: 'right', ...q });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the dial', 664, 30, { bg: c.accent, size: 15, align: 'right', scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_RUN && eq) {
      const q = popAt(this.age, 0.2);
      if (q) pill(ctx, c, 'no ions: salt does not exist', 16, 490, { bg: c.bad, size: 14, align: 'left', ...q });
      pill(ctx, c, 'no rust, no burning, no seed', 664, 490, { bg: c.labelMuted, size: 14, align: 'right' });
    }
    if (st === S_NAILS) {
      const q = popAt(this.age, 0.5);
      if (q) pill(ctx, c, 'differences in pull make ions', 340, 490, { bg: c.good, size: 15, ...q });
    }
  }
}
