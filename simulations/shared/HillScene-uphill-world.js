/**
 * HillScene (preset: uphill-world) - blk-l01-02-02-s06 (what-if). Kabir's machine
 * that runs on nothing: with "free climbing" on, the light marble climbs higher
 * than the heavy one's fall was worth; tie it back, lift the heavy one, repeat,
 * and the pair climbs for ever. The sim flags it: energy from nowhere.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - the real rig, looping; predict what free climbing does.
 *   1 run   - the dial; each cycle's climb vs fall; the machine's energy meter.
 *   2 nails - back to the real world: every climb is paid for by a fall.
 *
 * Canvas: continuous coupled motion; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, rr, darken, alpha, font, drawHillBackdrop, drawMarble, StringRig } from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;
const FREE = 1.8;                     // what-if: the light marble's height costs 1/1.8 of its worth
const METER = { x: 598, y: 44, w: 62, h: 250 };

export class HillSceneUphillWorld extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'The two-marble machine with a free-climbing switch. Switched on, the light marble climbs higher than the heavy ' +
    'one fell, so each cycle the pair ends up with more energy than it started with, climbing towards the roof: ' +
    'energy from nowhere. Switched off, every climb is paid for by a fall and the machine never gains.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Free climbing: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Free climbing: ON', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._rig = new StringRig();
    this._gain = 0;               // joules made from nothing so far
    this._cycles = 0;
    this._last = null;            // { fallJ, climbJ } of the last cycle
    this._lastAge = -1;
    this._wait = 0;
    this._dialled = false;
  }

  enter(stage) {
    this.mode = 'off';
    this._dialled = false;
    this._restart();
    this._wait = stage === S_RUN ? 0 : 0.6;
    if (stage === S_RUN) this._rig.moving = false;
  }

  _restart() {
    const r = this._rig;
    r.string = true;
    r.rub = 0;
    r.start = 'high';
    r.setHump('none');
    r.free = this.mode === 'on' ? FREE : 1;
    this._gain = 0;
    this._cycles = 0;
    this._last = null;
    this._lastAge = -1;
    this._wait = 0.6;
  }

  isControlHidden() {
    return this.stage === S_SETUP;
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'off' || id === 'on') {
      this.mode = id;
      this._dialled = true;
      this._restart();
    }
    this.requestUiUpdate?.();
  }

  update(d) {
    const r = this._rig;
    if (this._lastAge >= 0) this._lastAge += d;
    if (this.stage === S_RUN && !this._dialled) return;
    if (this._wait > 0) {
      this._wait -= d;
      if (this._wait <= 0) r.run();
      return;
    }
    r.step(d);
    if (r.turnAge > 0.25) {
      // Top of the climb: book the cycle, then "tie it back" and go again.
      const { fallJ, climbJ } = r.turnJ;
      this._last = { fallJ, climbJ };
      this._lastAge = 0;
      this._cycles += 1;
      if (this.mode === 'on') {
        this._gain += climbJ - fallJ;
        this.celebrate(r.xL(), r.lightTrack.y(r.xL()) - 30, 10);
      }
      r.moving = false;
      this._wait = 1.2;
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const r = this._rig, st = this.stage;
    r.draw(ctx, c, t);
    const on = this.mode === 'on';
    pill(ctx, c, on ? 'free climbing: ON' : 'our world', 16, 30, { bg: on ? c.bad : c.good, size: 15, align: 'left' });
    this._drawMeter(ctx, c, t);
    if (this._last) {
      const p = popAt(this._lastAge, 0);
      const { fallJ, climbJ } = this._last;
      const mj = (v) => `${(v * 1000).toFixed(0)} mJ`;
      if (p) {
        pill(ctx, c, `fall ${mj(fallJ)} \u2192 climb ${mj(climbJ)}`, 664, 478, { bg: climbJ > fallJ + 0.005 ? c.bad : c.s2, size: 15, align: 'right', ...p });
        if (climbJ > fallJ + 0.005) pill(ctx, c, 'energy from nowhere!', 664, 440, { bg: c.bad, size: 15, align: 'right', ...p });
      }
    }
    if (st === S_SETUP) {
      const p = popAt(this.age, 0.8);
      if (p) pill(ctx, c, 'predict: with free climbing, what happens?', 380, 110, { bg: c.accent, size: 15, ...p });
    }
    if (st === S_RUN && !this._dialled) {
      pill(ctx, c, 'turn the dial', 380, 110, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
    }
    if (st === S_NAILS) {
      const p = popAt(this.age, 0.6);
      if (p) pill(ctx, c, 'no machine runs itself', 380, 110, { bg: c.accent, size: 15, ...p });
      const p2 = popAt(this.age, 1.4);
      if (p2) pill(ctx, c, 'every climb is paid by a fall', 380, 150, { bg: c.s5, size: 15, ...p2 });
    }
  }

  /** The machine's energy: a tall tube with floors; the pair icon rides the level. */
  _drawMeter(ctx, c, t) {
    const { x, y, w, h } = METER;
    rr(ctx, x, y + 4, w, h, 12);
    ctx.fillStyle = darken(c.bgSurface, 0.3);
    ctx.fill();
    rr(ctx, x, y, w, h, 12);
    ctx.fillStyle = c.bgSurface;
    ctx.fill();
    ctx.strokeStyle = alpha(c.stroke, 0.8);
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let k = 1; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(x + 8, y + (h * k) / 6);
      ctx.lineTo(x + w - 8, y + (h * k) / 6);
      ctx.strokeStyle = alpha(c.stroke, 0.6);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const base = 0.12;
    const k = Math.max(base, Math.min(1, base + this._gain / 0.5));
    const ly = y + h - 14 - (h - 40) * k;
    drawMarble(ctx, c, x + w / 2 - 12, ly - 10, 12, c.s5, {});
    drawMarble(ctx, c, x + w / 2 + 14, ly - 6, 8, c.s2, {});
    if (k >= 1) pill(ctx, c, 'the roof!', x + w / 2, y - 2, { bg: c.bad, size: 14, scale: 1 + 0.06 * Math.sin(t * 6) });
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('energy', x + w / 2, y + h + 20);
    ctx.fillStyle = this._gain > 0.005 ? c.bad : c.label;
    ctx.fillText(`+${(this._gain * 1000).toFixed(0)} mJ`, x + w / 2, y + h + 40);
  }
}
