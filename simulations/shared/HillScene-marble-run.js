/**
 * HillScene (preset: marble-run) - blk-l01-02-01-s02 (observe, builder). Shape a
 * track from draggable points, plant a guess, release a marble. Rubbing is off,
 * so the marble always turns back exactly at its start height and never above.
 *
 * Beats (four paragraphs, splitSteps() counts 4):
 *   0 Lens    - side view, flat; speed is a number; air and rubbing off.
 *   1 Build   - drag the blue dots; the first dot is the start height.
 *   2 Predict - tap the track to plant a guess, then release; the first stop is pinned.
 *   3 Beat it - try to make it climb above the start; the best climb is logged.
 *
 * Canvas: a rolling marble on a live-edited curve is continuous motion.
 */
import { StoryScene } from './StoryScene.js';
import {
  W, alpha, pill, popAt, drawHillBackdrop, Track, Marble, drawMarble, drawPost, drawHandle,
  drawFlag, levelLine, marbleReadout, metres, PXM, rr, darken, font,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
];
const S_LENS = 0, S_BUILD = 1, S_PREDICT = 2, S_BEAT = 3;
const X0 = 40, X1 = 640;
const START_YS = [150, 300, 420, 330, 250, 380, 310, 210];
const Y_MIN = 110, Y_MAX = 452;

export class HillSceneMarbleRun extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static DRAGGABLE = true;
  static ARIA_LABEL =
    'A marble track drawn from the side, shaped by dragging its points. Release the marble and it rolls down and ' +
    'up the other slopes, turning back exactly at the height it started from, never higher, because rubbing is off.';

  static CONTROLS = [
    { type: 'button', id: 'run', label: 'Release the marble' },
    { type: 'button', id: 'reset', label: 'Reset the track' },
  ];

  constructor(container, config) {
    super(container, config);
    this._track = new Track(X0, X1, START_YS);
    this._marble = new Marble(this._track, X0 + 18);
    this._drag = -1;
    this._hot = -1;
    this._flag = null;
    this._stopAge = -1;
    this._tries = 0;
    this._best = null;         // { climb, start } of the best run in metres
    this._checked = false;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => { g.beginPath(); g.moveTo(x - 16, y + 9); g.quadraticCurveTo(x - 4, y - 18, x + 16, y + 9); g.closePath(); g.fillStyle = c.s3; g.fill(); }, text: 'a side view, flat', sub: 'like a hill in a drawing' },
      { icon: (g, x, y) => { rr(g, x - 17, y - 10, 34, 20, 10); g.fillStyle = c.s2; g.fill(); }, text: 'speed shown as a number', sub: 'no real marble wears one' },
      { icon: (g, x, y) => drawMarble(g, c, x, y, 11, c.s4), text: 'air and rubbing: off', sub: 'unless you switch them on' },
    ];
  }

  enter(stage) {
    this._marble.place(X0 + 18);
    this._stopAge = -1;
    this._flag = null;
    this._checked = false;
    if (stage === S_LENS || stage === S_BUILD) this._track.set(START_YS);
  }

  isControlHidden() {
    return this.stage === S_LENS;
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'run') this._release();
    else if (id === 'reset') {
      this._track.set(START_YS);
      this._marble.place(X0 + 18);
      this._stopAge = -1;
      this._flag = null;
    }
    this.requestUiUpdate?.();
  }

  _release() {
    this._marble.place(X0 + 18);
    this._marble.moving = true;
    this._stopAge = -1;
    this._checked = false;
    this._tries += 1;
  }

  // -- Pointer ----------------------------------------------------------------------

  _handleAt(p) {
    for (let i = 0; i < this._track.ys.length; i++) {
      if (Math.hypot(p.x - this._track.handleX(i), p.y - this._track.ys[i]) < 26) return i;
    }
    return -1;
  }

  pointerDown(p) {
    if (this.stage === S_LENS) return;
    const i = this._handleAt(p);
    if (i >= 0) {
      this._drag = i;
      this._marble.place(X0 + 18);
      this._stopAge = -1;
      return;
    }
    if (this.stage >= S_PREDICT && p.x > X0 + 30 && p.x < X1 - 10 && Math.abs(p.y - this._track.y(p.x)) < 50) {
      this._flag = { x: p.x };
      this._checked = false;
    }
  }

  pointerMove(p) {
    if (this._drag < 0) {
      const h = this.stage === S_LENS ? -1 : this._handleAt(p);
      if (h !== this._hot) this._hot = h;
      return false;
    }
    const ys = this._track.ys.slice();
    ys[this._drag] = Math.max(Y_MIN, Math.min(this._drag === 0 ? 400 : Y_MAX, p.y));
    this._track.set(ys);
    this._marble.place(X0 + 18);
    return false;
  }

  pointerUp() {
    this._drag = -1;
  }

  // -- Model ------------------------------------------------------------------------

  update(d) {
    const m = this._marble;
    m.step(d);
    if (m.firstStop && this._stopAge < 0) {
      this._stopAge = 0;
      const climb = metres(m.firstStop.y), start = metres(this._track.y(X0 + 18));
      if (!this._best || climb > this._best.climb) this._best = { climb, start };
      if (this.stage >= S_PREDICT && this._flag && !this._checked) {
        this._checked = true;
        if (Math.abs(this._flag.x - m.firstStop.x) / PXM < 0.5) this.celebrate(m.firstStop.x, m.firstStop.y - 30, 22);
      }
    }
    if (this._stopAge >= 0) this._stopAge += d;
  }

  // -- Draw -------------------------------------------------------------------------

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const tr = this._track, m = this._marble;
    const startY = tr.y(X0 + 18);
    if (this.stage >= S_BUILD) {
      levelLine(ctx, c, X0, X1, startY - m.r, c.warning, 0.8);
      pill(ctx, c, `start ${metres(startY).toFixed(1)} m`, X1 - 6, startY - m.r - 18, { bg: c.warning, size: 14, align: 'right' });
    }
    tr.draw(ctx, c);
    drawPost(ctx, c, X0 + 2, tr.y(X0));
    drawPost(ctx, c, X1 - 2, tr.y(X1));
    if (this._flag) drawFlag(ctx, c, this._flag.x, tr.y(this._flag.x) - 3, c.s4, t);
    if (m.firstStop && this._stopAge >= 0) {
      const p = popAt(this._stopAge, 0);
      if (p) pill(ctx, c, 'first stop', m.firstStop.x, m.firstStop.y - 60, { bg: c.good, size: 14, ...p });
    }
    if (this.stage >= S_BUILD) {
      for (let i = 0; i < tr.ys.length; i++) drawHandle(ctx, c, tr.handleX(i), tr.ys[i], i === this._drag || i === this._hot, t + i);
    }
    const my = tr.y(m.x) - m.r;
    drawMarble(ctx, c, m.x, my, m.r, c.s4, { spin: m.spin, face: !m.moving });
    if (m.moving) marbleReadout(ctx, c, m);
    this._drawHud(ctx, c, t);
  }

  _drawHud(ctx, c, t) {
    const st = this.stage;
    const m = this._marble;
    const pulse = 1 + 0.05 * Math.sin(t * 5);
    if (st === S_BUILD && !m.moving) pill(ctx, c, 'drag the blue dots to shape the track', 16, 30, { bg: c.accent, size: 15, align: 'left', scale: pulse });
    if (st === S_PREDICT && !m.moving) {
      pill(ctx, c, this._flag ? 'guess planted: now release' : 'tap the track: where will it stop?', 16, 30, { bg: c.accent, size: 15, align: 'left', scale: pulse });
    }
    if (st === S_PREDICT && m.moving && this._flag && this._checked) {
      const off = Math.abs(this._flag.x - m.firstStop.x) / PXM;
      pill(ctx, c, off < 0.5 ? 'your guess: spot on!' : `your guess: ${off.toFixed(1)} m off`, 16, 30, { bg: off < 0.5 ? c.good : c.warning, size: 15, align: 'left' });
    }
    if (st === S_BEAT) this._drawScore(ctx, c);
  }

  _drawScore(ctx, c) {
    const x = 16, y = 14, w = 250, h = 86;
    rr(ctx, x, y + 4, w, h, 11);
    ctx.fillStyle = darken(c.bgSurface, 0.3);
    ctx.fill();
    rr(ctx, x, y, w, h, 11);
    ctx.fillStyle = c.bgSurface;
    ctx.fill();
    ctx.strokeStyle = alpha(c.stroke, 0.8);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = c.label;
    ctx.font = font(c, 800, 15);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`runs: ${this._tries}`, x + 14, y + 22);
    const b = this._best;
    ctx.fillText(b ? `best climb ${b.climb.toFixed(1)} m` : 'best climb: none yet', x + 14, y + 48);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 700, 14);
    ctx.fillText(b ? `its start was ${b.start.toFixed(1)} m` : 'climb above the start line', x + 14, y + 70);
    if (b) {
      const higher = b.climb > b.start + 0.05;
      pill(ctx, c, higher ? 'higher!' : 'no higher', x + w - 12, y + 22, { bg: higher ? c.good : c.bad, size: 14, align: 'right' });
    }
  }
}
