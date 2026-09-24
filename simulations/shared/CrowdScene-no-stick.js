/**
 * CrowdScene (preset: no-stick) - blk-l02-04-01-s05 (what-if). Stickiness to
 * zero, then cool the box to nothing: the particles slow down and stop but never
 * clump. No liquid, no solid: a gas at every temperature, and at zero a gas of
 * particles standing still.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - our world: cooling the box, the particles clump into a liquid, then a solid.
 *   1 run   - the dial to zero; cool again: they stop where they are, apart.
 *   2 nails - a liquid exists only because of the pulls between molecules.
 *
 * Canvas: a cooling particle box; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, drawHillBackdrop, drawBox, drawParticles, drawTempBar, ParticleBox, STICK, STATE_COL, tempLabel,
} from './CrowdKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;
const BOX = { x0: 40, y0: 70, x1: 440, y1: 460 };
const RAMP = 12;                          // seconds from room temperature to absolute zero

export class CrowdSceneNoStick extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A box of particles cooled from room temperature to absolute zero. With stickiness, they clump into a liquid and ' +
    'then a solid. With stickiness at zero, they slow down and stop wherever they are, never clumping: a gas at every ' +
    'temperature, and at zero a gas standing still.';

  static CONTROLS = [
    { type: 'button', id: 'middle', label: 'Stickiness: middle', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'zero', label: 'Stickiness: zero', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'cool', label: 'Cool it again' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'middle';
    this._dialled = false;
    this._build();
  }

  _build() {
    const b = new ParticleBox({ ...BOX, gravity: 4, stick: STICK[this.mode], temp: 25, seed: 12 });
    b.fill(80, 7, 0, { x0: BOX.x0, y0: BOX.y1 - 150, x1: BOX.x1, y1: BOX.y1 });
    this._box = b;
    this._t = 0;
    this._state = { id: 'gas' };
    this._st = 0;
  }

  enter() {
    this.mode = 'middle';
    this._dialled = false;
    this._build();
  }

  isControlHidden() { return this.stage === S_SETUP; }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'middle' || id === 'zero') { this.mode = id; this._dialled = true; this._build(); }
    else if (id === 'cool') this._build();
    this.requestUiUpdate?.();
  }

  /** Holds at room temperature for a moment, then ramps down in 10-degree steps. */
  _C() {
    const u = Math.max(0, Math.min(1, (this._t - 1.2) / RAMP));
    if (u <= 0) return 25;
    if (u >= 1) return -273;
    return Math.round((25 - 298 * u) / 10) * 10 || 0;
  }

  update(d) {
    if (this.stage === S_RUN && !this._dialled) return;
    this._t += d;
    this._box.temp = this._C();
    this._box.step(d);
    this._st += d;
    if (this._st > 0.5) { this._st = 0; this._state = this._box.state(); }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    drawBox(ctx, c, BOX);
    drawParticles(ctx, c, this._box);
    const C = this._C();
    drawTempBar(ctx, c, 462, 80, 150, C);
    pill(ctx, c, tempLabel(C), 480, 90, { bg: c.s2, size: 14, align: 'left' });
    const zero = this.mode === 'zero';
    pill(ctx, c, zero ? 'stickiness: zero' : 'stickiness: middle', 480, 128, { bg: zero ? c.bad : c.s5, size: 14, align: 'left' });
    const still = this._box.meanKE() < 20;
    const shown = zero ? (still ? 'gas, standing still' : 'gas') : this._state.id;
    pill(ctx, c, shown, 480, 176, { bg: STATE_COL(c, zero ? 'gas' : this._state.id), size: 15, align: 'left' });
    const st = this.stage;
    if (st === S_SETUP) {
      const q = popAt(this.age, 1.0);
      if (q) pill(ctx, c, 'predict: no stickiness, cooled to zero?', 240, 40, { bg: c.accent, size: 15, ...q });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the dial', 240, 40, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_RUN && zero && C < -250) pill(ctx, c, 'they stop, but never clump', 240, 40, { bg: c.bad, size: 15 });
    if (st === S_NAILS) {
      const q = popAt(this.age, 0.5);
      if (q) pill(ctx, c, 'a liquid needs the pulls', 552, 260, { bg: c.good, size: 14, ...q });
      const q2 = popAt(this.age, 1.2);
      if (q2) pill(ctx, c, 'straight water: boils at \u221280', 552, 300, { bg: c.labelMuted, size: 14, ...q2 });
    }
  }
}
