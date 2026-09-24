/**
 * HillScene (preset: marble-run, rubbing) - blk-l01-02-01-s05 (what-if). Turn
 * rubbing on: each climb is lower than the last, a thin red trail marks where
 * the energy went, the marble settles in the lowest dip, and the track is a
 * fraction of a degree warmer.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - rubbing off, the marble rolls for ever; predict where it stops with rubbing.
 *   1 run   - the rubbing dial (off / low / high) and Release; climbs listed; trail; thermometer.
 *   2 nails - bars: height + speed + warmth always add to the start. Nothing was lost.
 *
 * Canvas: continuous rolling and a growing trail; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  alpha, pill, popAt, rr, darken, font, drawHillBackdrop, Track, Marble, drawMarble, drawPost,
  levelLine, drawEnergyBars, drawThermo, joules, metres,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;
const X0 = 40, X1 = 640;
const YS = [150, 320, 440, 330, 280, 350, 230, 110];
const RUB = { off: 0, low: 0.05, high: 0.16 };
const TRACK_J_PER_DEG = 1700;          // a 1 kg wooden track, about 1700 J per degree

export class HillSceneMarbleRunFriction extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'The marble track with a rubbing dial. With rubbing off the marble rolls for ever. With rubbing on, each climb ' +
    'is lower than the last, a thin red trail shows where the energy went, and the marble settles in the lowest ' +
    'dip. Height, speed and warmth always add up to the energy it started with; the track ends a fraction of a degree warmer.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Rubbing: off', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'low', label: 'Rubbing: low', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'high', label: 'Rubbing: high', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'run', label: 'Release' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._track = new Track(X0, X1, YS);
    this._marble = new Marble(this._track, X0 + 18);
    this._warm = new Array(151).fill(0);
    this._climbs = [];
    this._lastV = 0;
    this._restAge = -1;
    this._dialled = false;
    this._hold = 0;
  }

  enter(stage) {
    this.mode = stage === S_SETUP ? 'off' : stage === S_NAILS ? 'low' : 'off';
    this._dialled = false;
    this._release(stage !== S_RUN);
    if (stage === S_NAILS) { this._marble.moving = false; this._hold = 1.2; }
  }

  _release(go = true) {
    this._marble.place(X0 + 18);
    this._marble.moving = go;
    this._warm.fill(0);
    this._climbs = [];
    this._lastV = 0;
    this._restAge = -1;
  }

  isControlHidden(id) {
    if (this.stage === S_SETUP) return true;
    return this.stage === S_NAILS && id === 'off';
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (RUB[id] != null) {
      this.mode = id;
      this._dialled = true;
      this._release(true);
    } else if (id === 'run') this._release(true);
    this.requestUiUpdate?.();
  }

  update(d) {
    const m = this._marble;
    if (this._hold > 0) {
      this._hold -= d;
      if (this._hold <= 0) m.moving = true;
    }
    m.step(d, RUB[this.mode], this._warm);
    if (this._lastV !== 0 && Math.sign(m.v) !== Math.sign(this._lastV) && m.dipped && !m.rest) {
      this._climbs.push(metres(this._track.y(m.x)));
      if (this._climbs.length > 6) this._climbs.shift();
    }
    if (m.v !== 0) this._lastV = m.v;
    if (m.rest && this._restAge < 0) {
      this._restAge = 0;
      if (this.stage === S_RUN) this.celebrate(m.x, this._track.y(m.x) - 40, 20);
    }
    if (this._restAge >= 0) {
      this._restAge += d;
      if (this.stage === S_NAILS && this._restAge > 3) this._release(true);
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const tr = this._track, m = this._marble, st = this.stage;
    const startY = tr.y(X0 + 18) - m.r;
    levelLine(ctx, c, X0, X1, startY, c.warning, 0.8);
    pill(ctx, c, 'start height', 330, startY + 24, { bg: c.warning, size: 14 });
    tr.draw(ctx, c, { warm: this._warm });
    drawPost(ctx, c, X0 + 2, tr.y(X0));
    drawPost(ctx, c, X1 - 2, tr.y(X1));
    const my = tr.y(m.x) - m.r;
    drawMarble(ctx, c, m.x, my, m.r, c.s4, { spin: m.spin, face: m.rest });
    const heatJ = joules(m.heat);
    const dT = heatJ / TRACK_J_PER_DEG;
    if (st === S_SETUP) {
      pill(ctx, c, 'rubbing off: it rolls for ever', 16, 30, { bg: c.labelMuted, size: 15, align: 'left' });
      const p = popAt(this.age, 0.8);
      if (p) pill(ctx, c, 'predict: with rubbing, where does it stop?', 340, 480, { bg: c.accent, size: 15, ...p });
      return;
    }
    if (st === S_RUN) {
      if (!this._dialled) pill(ctx, c, 'turn the rubbing dial', 16, 30, { bg: c.accent, size: 15, align: 'left', scale: 1 + 0.05 * Math.sin(t * 5) });
      else this._drawClimbs(ctx, c);
      if (m.rest) {
        const p = popAt(this._restAge, 0.1);
        if (p) pill(ctx, c, tr.lowest().y - tr.y(m.x) < 12 ? 'settled in the lowest dip' : 'settled in a dip', m.x, my - 44, { bg: c.good, size: 15, ...p });
      }
    }
    if (this.mode !== 'off') {
      const tx = 600, ty = 470;
      rr(ctx, tx - 150, ty - 22, 184, 40, 20);
      ctx.fillStyle = c.bgSurface;
      ctx.fill();
      drawThermo(ctx, c, tx + 14, ty - 4, Math.min(1, dT * 2500), c.bad);
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 14);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`track +${dT.toFixed(5)} \u00b0C`, tx - 4, ty - 2);
    }
    if (st === S_NAILS) {
      const pe = m.pe(), ke = m.ke();
      const rows = [
        { label: 'height', value: pe, col: c.s1, text: `${joules(pe).toFixed(2)} J` },
        { label: 'speed', value: ke, col: c.s2, text: `${joules(ke).toFixed(2)} J` },
        { label: 'warmth', value: m.heat, col: c.bad, text: `${heatJ.toFixed(2)} J` },
        { label: 'total', value: m.e0, col: c.warning, text: `${joules(m.e0).toFixed(2)} J` },
      ];
      drawEnergyBars(ctx, c, 200, 10, 270, rows, m.e0, { labelW: 76 });
      const p = popAt(this.age, 1.2);
      if (p) pill(ctx, c, 'nothing lost: it warmed the track', 16, 250, { bg: c.good, size: 15, align: 'left', ...p });
    }
  }

  _drawClimbs(ctx, c) {
    const x = 16, y = 14, w = 176;
    const n = this._climbs.length;
    const h = 36 + Math.max(1, n) * 22;
    rr(ctx, x, y + 4, w, h, 11);
    ctx.fillStyle = darken(c.bgSurface, 0.3);
    ctx.fill();
    rr(ctx, x, y, w, h, 11);
    ctx.fillStyle = c.bgSurface;
    ctx.fill();
    ctx.strokeStyle = alpha(c.stroke, 0.8);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('each climb', x + 12, y + 18);
    this._climbs.forEach((hm, i) => {
      const ry = y + 42 + i * 22;
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 14);
      ctx.fillText(`${hm.toFixed(2)} m`, x + 12, ry);
      rr(ctx, x + 76, ry - 6, Math.max(6, hm * 16), 12, 6);
      ctx.fillStyle = i === n - 1 ? c.s4 : alpha(c.s4, 0.55);
      ctx.fill();
    });
  }
}
