/**
 * HillScene (preset: charge-hill) - blk-l01-02-04-s02 (observe, builder). Place
 * positive and negative charges on a board; underneath, the Hill the selected
 * charge feels redraws itself. Drag it away and it sits higher; release it and it
 * rolls to where its Hill is lowest.
 *
 * Beats (six paragraphs, splitSteps() counts 6):
 *   0 Lens     - charges drawn as balls; the landscape is the Hill picture; rubbing off.
 *   1 One +    - one positive charge: its landscape is flat.
 *   2 Add -    - a negative near it: the landscape between them dips.
 *   3 Drag     - drag the negative away: the dip fills in, it sits higher.
 *   4 Release  - it rolls downhill and clicks against the positive.
 *   5 Build    - several charges; plant a guess; release any one.
 *
 * Canvas: the landscape redraws live under a drag; the charge rolls.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, drawHillBackdrop, drawFlag, ChargeRail, RAIL, drawCharge } from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
  [{ idx: 5, dwellMs: null }],
];
const S_LENS = 0, S_ONE = 1, S_ADD = 2, S_DRAG = 3, S_RELEASE = 4, S_BUILD = 5;

export class HillSceneChargeHill extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static DRAGGABLE = true;
  static ARIA_LABEL =
    'A board of electric charges with the Hill for one selected charge drawn underneath. One positive charge alone ' +
    'has a flat landscape. A negative charge near it sits in a dip; dragged away it sits higher on the Hill; released, ' +
    'it rolls back and clicks against the positive charge. Like charges make a bump instead of a dip.';

  static CONTROLS = [
    { type: 'button', id: 'plus', label: 'Add +' },
    { type: 'button', id: 'minus', label: 'Add \u2212' },
    { type: 'button', id: 'run', label: 'Release' },
    { type: 'button', id: 'clear', label: 'Clear' },
    { type: 'button', id: 'attract', label: 'Like charges attract: locked' },
  ];

  constructor(container, config) {
    super(container, config);
    this._rail = new ChargeRail();
    this._drag = -1;
    this._flag = null;
    this._farthest = 0;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => drawCharge(g, c, x, y, 12, 1), text: 'charges drawn as balls', sub: 'which they are not' },
      { icon: (g, x, y) => { g.beginPath(); g.moveTo(x - 16, y - 6); g.quadraticCurveTo(x, y + 20, x + 16, y - 6); g.strokeStyle = c.s3; g.lineWidth = 4; g.stroke(); }, text: 'the landscape is not a real slope', sub: 'it shows where a charge would roll' },
      { icon: (g, x, y) => { g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fillStyle = c.bad; g.fill(); }, text: 'rubbing: off' },
    ];
  }

  enter(stage) {
    const r = this._rail;
    r.clear();
    this._flag = null;
    this._drag = -1;
    if (stage === S_LENS || stage === S_ONE) r.add(1, 250);
    if (stage === S_ADD) r.add(1, 250);
    if (stage === S_DRAG || stage === S_RELEASE) { r.add(1, 250); r.add(-1, 300); }
    if (stage === S_RELEASE) r.dragTo(560);
    if (stage === S_BUILD) { r.add(1, 180); r.add(-1, 330); r.add(1, 470); r.add(-1, 590); }
    this._farthest = 0;
  }

  isControlHidden(id) {
    const st = this.stage;
    if (st === S_LENS) return true;
    if (id === 'plus') return st !== S_ONE && st !== S_BUILD;
    if (id === 'minus') return st !== S_ADD && st !== S_BUILD;
    if (id === 'run') return st < S_RELEASE;
    if (id === 'clear') return st !== S_BUILD;
    return false;
  }

  isControlDisabled(id) {
    if (id === 'attract') return true;
    if (id === 'run') return this._rail.moving || this._rail.q.length < 2;
    return false;
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    const r = this._rail;
    if (id === 'plus' || id === 'minus') {
      const base = r.sel >= 0 ? r.q[r.sel].x + 70 : 300;
      r.add(id === 'plus' ? 1 : -1, base);
    } else if (id === 'run') {
      r.release();
    } else if (id === 'clear') {
      r.clear();
      this._flag = null;
    }
    this.requestUiUpdate?.();
  }

  // -- Pointer ----------------------------------------------------------------------

  pointerDown(p) {
    if (this.stage === S_LENS) return;
    const r = this._rail;
    const i = r.q.findIndex((q) => Math.hypot(q.x - p.x, RAIL.BOARD_Y - p.y) < RAIL.R + 12);
    if (i >= 0) {
      r.sel = i;
      r.moving = false;
      r.click = null;
      this._drag = i;
      return;
    }
    if (this.stage === S_BUILD && p.y > RAIL.HILL_TOP && p.y < RAIL.HILL_BOT && p.x > RAIL.X0 && p.x < RAIL.X1) {
      this._flag = { x: p.x };
    }
  }

  pointerMove(p) {
    if (this._drag < 0) return false;
    this._rail.dragTo(p.x);
    return false;
  }

  pointerUp() {
    if (this._drag >= 0) this.requestUiUpdate?.();
    this._drag = -1;
  }

  // -- Model ------------------------------------------------------------------------

  update(d) {
    const r = this._rail;
    const was = r.moving;
    r.step(d);
    if (was && !r.moving && r.click) {
      const me = r.q[r.sel];
      if (this._flag && Math.abs(this._flag.x - me.x) < 40) this.celebrate(me.x, r.hillY(me.x) - 40, 20);
      else if (this.stage === S_RELEASE) this.celebrate(me.x, RAIL.BOARD_Y, 16);
      this.requestUiUpdate?.();
    }
    if (this.stage === S_DRAG && r.q[1]) this._farthest = Math.max(this._farthest, Math.abs(r.q[1].x - r.q[0].x));
  }

  // -- Draw -------------------------------------------------------------------------

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const r = this._rail, st = this.stage;
    r.draw(ctx, c, t);
    const me = r.q[r.sel];
    pill(ctx, c, me ? `the Hill for this ${me.sign > 0 ? '+' : '\u2212'} charge` : 'the Hill', RAIL.X0 - 8, RAIL.HILL_TOP + 22, { bg: c.labelMuted, size: 14, align: 'left' });
    if (this._flag) drawFlag(ctx, c, this._flag.x, r.hillY(this._flag.x) - 2, c.s4, t);
    const pulse = { scale: 1 + 0.05 * Math.sin(t * 5) };
    if (st === S_ONE) {
      if (r.q.length === 1) pill(ctx, c, 'alone: the landscape is flat', 340, RAIL.HILL_Y - 50, { bg: c.s3, size: 15 });
    }
    if (st === S_ADD) {
      if (r.q.length < 2) pill(ctx, c, 'press Add \u2212', 340, 30, { bg: c.accent, size: 15, ...pulse });
      else if (me && me.sign < 0) {
        const p = popAt(this.age, 0);
        pill(ctx, c, 'a dip under the +', r.q[0].x, RAIL.HILL_BOT - 26, { bg: c.s6, size: 14, ...(p || {}) });
      }
    }
    if (st === S_DRAG && r.q[1]) {
      const far = Math.abs(r.q[1].x - r.q[0].x) > 200;
      pill(ctx, c, far ? 'further away: higher on the Hill' : 'drag the \u2212 far away', 340, 30, { bg: far ? c.s1 : c.accent, size: 15, ...(far ? {} : pulse) });
    }
    if (st === S_RELEASE) {
      if (!r.moving && !r.click) pill(ctx, c, 'press Release: where does it roll?', 340, 30, { bg: c.accent, size: 15, ...pulse });
      if (r.click) {
        const p = popAt(r.click.age, 0);
        if (p) pill(ctx, c, 'downhill: they click together', 340, 30, { bg: c.good, size: 15, ...p });
      }
    }
    if (st === S_BUILD && !r.moving && !r.click) {
      pill(ctx, c, this._flag ? 'tap a charge, then Release' : 'tap the Hill: where will it end up?', 340, 30, { bg: c.accent, size: 15 });
    }
    if (st === S_BUILD && r.click) {
      const p = popAt(r.click.age, 0);
      const hit = this._flag && Math.abs(this._flag.x - r.q[r.sel].x) < 40;
      if (p) pill(ctx, c, this._flag ? (hit ? 'your guess: spot on!' : 'it rolled to the lowest place nearby') : 'it rolled to the lowest place nearby', 340, 30, { bg: hit ? c.good : c.s3, size: 15, ...p });
    }
  }
}
