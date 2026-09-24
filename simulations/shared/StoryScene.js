/**
 * StoryScene - the Flame and the Seed's canvas scene skeleton, shared by the
 * recurring model scenes in simulations/shared/ (Hill, Crowd, Tug-of-War,
 * Waterwheel, Carbon Workshop, Alive-o-meter). Not a scene itself: a concrete
 * scene subclasses it, declares its own BEAT_STEP_MAP and CONTROLS, and fills in
 *   enter(stage)          reset for a stage (the base resets age and fade)
 *   update(d)             advance the model by d seconds (d is clamped >= 0)
 *   draw(ctx, c, t)       paint the frame (the base clears first, then adds the
 *                         confetti, the Lens card and the fade on top)
 *   lensRows(c)           rows for the Lens card; shown on stage LENS_STAGE
 *   pointerDown/Move/Up(p) scene-coordinate pointer hooks (p = {x, y}); pointerMove
 *                         returns true when the control bar needs a refresh
 *
 * Every mount is fresh and memory-less (a block boundary remounts).
 */
import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import { W, H, loadColors, alpha, Burst, drawLensCard } from './StoryKit.js';

export class StoryScene extends CanvasSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  /** Stage whose frame carries the open Lens card (-1: none). */
  static LENS_STAGE = -1;
  /** True for scenes with drag interactions: stops the page scrolling under a finger. */
  static DRAGGABLE = false;

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;
    this.colors = null;
    this._stage = -1;
    this._age = 0;
    this._fade = 1;
    this._clock = 0;
    this._burst = new Burst();
    this._onDown = this._pointer.bind(this, 'down');
    this._onMove = this._pointer.bind(this, 'move');
    this._onUp = this._pointer.bind(this, 'up');
  }

  async setup() {
    await super.setup();
    this._reloadColors();
    const cv = this._canvas;
    if (this.constructor.DRAGGABLE) cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', this._onDown);
    cv.addEventListener('pointermove', this._onMove);
    cv.addEventListener('pointerup', this._onUp);
    cv.addEventListener('pointercancel', this._onUp);
    this._enterStage(this.constructor.BEAT_STEP_MAP[0][0].idx);
    this._drawInitialFrame(this._ctx);
  }

  destroy() {
    const cv = this._canvas;
    if (cv) {
      cv.removeEventListener('pointerdown', this._onDown);
      cv.removeEventListener('pointermove', this._onMove);
      cv.removeEventListener('pointerup', this._onUp);
      cv.removeEventListener('pointercancel', this._onUp);
    }
    super.destroy();
  }

  _reloadColors() {
    this.colors = loadColors(this.container);
  }

  get stage() { return this._stage; }
  get age() { return this._age; }
  get clock() { return this._clock; }

  // -- Beats ----------------------------------------------------------------------------

  /**
   * A scene attached to several slides with different beat counts can declare
   * static BEAT_MAPS = { [beatCount]: map }; the host passes each slide's count, so
   * the right map is used at run time (BEAT_STEP_MAP stays the default, and is the
   * one tools/beat-check reads).
   */
  _mapFor(beatCount) {
    return this.constructor.BEAT_MAPS?.[beatCount] ?? this.constructor.BEAT_STEP_MAP;
  }

  onBeatChange(beatIndex, beatCount) {
    const map = this._mapFor(beatCount);
    this.beatCount = beatCount;
    const b = Math.max(0, Math.min(map.length - 1, beatIndex | 0));
    const stage = map[b][0].idx;
    if (stage !== this._stage) this._enterStage(stage);
    this.requestUiUpdate?.();
  }

  _enterStage(stage) {
    this._stage = stage;
    this._age = 0;
    this._fade = 0;
    this.enter(stage);
    this.requestUiUpdate?.();
  }

  // -- Controls (defaults) ---------------------------------------------------------------

  isControlHidden() { return false; }
  isControlDisabled() { return false; }
  getControlValue() { return undefined; }
  onControlChange() {}

  /** Guarded dispatch for subclasses: ignores hidden/disabled controls, then refreshes the bar. */
  _guard(id) {
    return !(this.isControlHidden(id) || this.isControlDisabled(id));
  }

  // -- Frame ------------------------------------------------------------------------------

  _tick(ctx, dt) {
    if (!this.colors) return;
    const d = Math.max(0, Math.min(dt, 0.05));   // the first frame can report a negative dt
    this._clock += d;
    this._age += d;
    this._fade = Math.min(1, this._fade + d / 0.35);
    this.update(d);
    this._burst.update(d);
    this._draw(ctx);
  }

  _drawInitialFrame(ctx) {
    if (this.colors) this._draw(ctx);
  }

  _draw(ctx) {
    const c = this.colors;
    const t = this._clock;
    ctx.clearRect(0, 0, W, H);
    this.draw(ctx, c, t);
    this._burst.draw(ctx);
    if (this._stage === this.constructor.LENS_STAGE) {
      drawLensCard(ctx, c, { age: this._age, t, dim: true, rows: this.lensRows(c) });
    }
    if (this._fade < 1) {
      ctx.fillStyle = alpha(c.bgDeep, 1 - this._fade);
      ctx.fillRect(0, 0, W, H);
    }
  }

  /** Confetti from (x, y) in the series colours. */
  celebrate(x, y, n = 26) {
    const c = this.colors;
    if (c) this._burst.fire(x, y, [c.s1, c.s2, c.s3, c.s4, c.s5], n);
  }

  // -- Pointer ----------------------------------------------------------------------------

  _pointer(kind, e) {
    if (!this._canvas || !this.colors) return;
    const r = this._canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const p = { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    if (kind === 'down') {
      try { this._canvas.setPointerCapture?.(e.pointerId); } catch (_) { /* synthetic events */ }
      this.pointerDown(p);
    } else if (kind === 'move') {
      if (!this.pointerMove(p)) return;             // a move refreshes the bar only when a hook asks
    } else this.pointerUp(p);
    this.requestUiUpdate?.();
  }

  // -- Hooks ------------------------------------------------------------------------------

  enter() {}
  update() {}
  draw() {}
  lensRows() { return []; }
  pointerDown() {}
  pointerMove() {}
  pointerUp() {}
}
