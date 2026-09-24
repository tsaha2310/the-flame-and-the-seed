/**
 * HillScene (preset: marble-run, labelled) - blk-l01-02-01-s03 (explain). The
 * marble run from the builder, on a fixed track, with the words laid on it one
 * beat at a time: the ceiling, the pull of the Earth, potential and kinetic
 * energy trading places, and the rule.
 *
 * Beats (five paragraphs, splitSteps() counts 5):
 *   0 Ceiling   - the start line; the marble turns back exactly on it, never above.
 *   1 Force     - arrows: the pull of the Earth, and its push along the slope.
 *   2 Stored    - held at the start: stored = potential; let go: speed = kinetic.
 *   3 Trading   - live bars: down turns potential into kinetic, up turns it back.
 *   4 Rule      - energy changes form; the amount it started with is a ceiling.
 *
 * Canvas: continuous rolling; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, drawHillBackdrop, Track, Marble, drawMarble, drawPost, levelLine, arrow,
  drawEnergyBars, joules, metres,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_CEIL = 0, S_FORCE = 1, S_STORED = 2, S_TRADE = 3, S_RULE = 4;
const X0 = 40, X1 = 640;
const YS = [170, 330, 430, 330, 300, 400, 250, 120];

export class HillSceneMarbleRunLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A marble rolls on a fixed track with no rubbing. It turns back exactly at its start height and never climbs ' +
    'higher. The pull of the Earth pushes it down each slope. Bars show potential energy turning into kinetic ' +
    'energy on the way down and back again on the way up, with the total never changing.';

  constructor(container, config) {
    super(container, config);
    this._track = new Track(X0, X1, YS);
    this._marble = new Marble(this._track, X0 + 18);
    this._hold = 0;
    this._turns = [];
    this._lastV = 0;
    this._phaseChip = null;
  }

  enter(stage) {
    this._marble.place(X0 + 18);
    this._hold = stage === S_STORED ? 1.6 : 0.6;
    this._turns = [];
    this._lastV = 0;
  }

  update(d) {
    const m = this._marble;
    if (this._hold > 0) {
      this._hold -= d;
      if (this._hold <= 0) m.moving = true;
      return;
    }
    m.step(d);
    if (this._lastV !== 0 && Math.sign(m.v) !== Math.sign(this._lastV) && m.dipped) {
      this._turns.push({ x: m.x, y: this._track.y(m.x), age: 0 });
      if (this._turns.length > 2) this._turns.shift();
    }
    if (m.v !== 0) this._lastV = m.v;
    for (const tp of this._turns) tp.age += d;
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const tr = this._track, m = this._marble, st = this.stage;
    const startY = tr.y(X0 + 18) - m.r;
    const glow = st === S_RULE ? 0.6 + 0.4 * Math.sin(t * 4) : 0.8;
    levelLine(ctx, c, X0, X1, startY, c.warning, glow);
    pill(ctx, c, st === S_RULE ? 'the ceiling: start height' : 'start height', 330, startY + 24, { bg: c.warning, size: 14 });
    tr.draw(ctx, c);
    drawPost(ctx, c, X0 + 2, tr.y(X0));
    drawPost(ctx, c, X1 - 2, tr.y(X1));
    const my = tr.y(m.x) - m.r;
    if (st === S_CEIL || st === S_RULE) {
      for (const tp of this._turns) {
        const p = popAt(tp.age, 0);
        if (!p || tp.x < 300) continue;
        pill(ctx, c, 'turns back: exactly the start', Math.min(tp.x, 520), tp.y - 70, { bg: c.good, size: 14, ...p });
      }
    }
    drawMarble(ctx, c, m.x, my, m.r, c.s4, { spin: m.spin, face: !m.moving, glow: st === S_STORED && !m.moving ? c.s1 : null });
    if (st === S_FORCE) this._drawForces(ctx, c, m.x, my);
    if (st >= S_STORED) this._drawBars(ctx, c);
    if (st === S_STORED) {
      if (!m.moving) pill(ctx, c, 'stored: potential energy', m.x + 26, my - 30, { bg: c.s1, size: 15, align: 'left', ...(popAt(this.age, 0.3) || { alpha: 0 }) });
      else if (m.speed() > 40) pill(ctx, c, 'speed: kinetic energy', Math.min(560, Math.max(120, m.x)), my - 34, { bg: c.s2, size: 15 });
    }
    if (st === S_TRADE && m.moving) {
      const down = Math.sign(m.v) === Math.sign(tr.slope(m.x)) && m.speed() > 30;
      const near = m.speed() < 60 && m.dipped;
      const txt = near ? 'all potential again' : down ? 'potential \u2192 kinetic' : 'kinetic \u2192 potential';
      pill(ctx, c, txt, Math.min(560, Math.max(120, m.x)), my - 34, { bg: near ? c.s1 : down ? c.s2 : c.s1, size: 15 });
    }
    if (st === S_RULE) {
      const p = popAt(this.age, 0.5);
      if (p) pill(ctx, c, 'energy changes form; the total never grows', 340, 480, { bg: c.accent, size: 16, ...p });
    }
  }

  _drawForces(ctx, c, x, y) {
    const tr = this._track;
    const sl = tr.slope(this._marble.x);
    const a = popAt(this.age, 0.2);
    if (!a) return;
    ctx.save();
    ctx.globalAlpha *= a.alpha;
    arrow(ctx, x, y, x, y + 70, c.bad, 6);
    const cs = 1 / Math.sqrt(1 + sl * sl);
    const along = 60 * Math.abs(sl) * cs + 8;
    const dir = Math.sign(sl) || 1;
    arrow(ctx, x, y, x + dir * along * cs, y + dir * along * sl * cs, c.s2, 5);
    ctx.restore();
    pill(ctx, c, 'pull of the Earth', x + 14, y + 86, { bg: c.bad, size: 14, align: 'left', ...a });
    const p2 = popAt(this.age, 0.7);
    if (p2) pill(ctx, c, 'a push down the slope', Math.min(560, Math.max(120, x)), y - 40, { bg: c.s2, size: 14, ...p2 });
  }

  _drawBars(ctx, c) {
    const m = this._marble;
    const pe = m.pe(), ke = m.ke();
    const full = m.e0;
    const rows = [
      { label: 'potential', value: pe, col: c.s1, text: `${joules(pe).toFixed(2)} J` },
      { label: 'kinetic', value: ke, col: c.s2, text: `${joules(ke).toFixed(2)} J` },
      { label: 'total', value: pe + ke, col: c.warning, text: `${joules(pe + ke).toFixed(2)} J` },
    ];
    const p = popAt(this.age, this.stage === S_STORED ? 0.9 : 0);
    if (!p) return;
    ctx.save();
    ctx.globalAlpha *= p.alpha;
    drawEnergyBars(ctx, c, 200, 12, 270, rows, full, { labelW: 84, title: `20 g marble \u00b7 height ${metres(this._track.y(m.x)).toFixed(1)} m` });
    ctx.restore();
  }
}
