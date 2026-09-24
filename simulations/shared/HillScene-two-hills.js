/**
 * HillScene (preset: two-hills) - blk-l01-02-02-s03 (observe, POE with dials).
 * A heavy marble and a light one joined by a thread over a pulley: the heavy one
 * falls and lifts the light one. Dials: the heavy one's start height, the hump on
 * the light one's slope, rubbing, and the thread itself.
 *
 * Beats (four paragraphs, splitSteps() counts 4):
 *   0 Lens     - side view, flat; the thread's weight ignored; rubbing is a dial.
 *   1 Measure  - release with rubbing off; the light marble's best climb is marked.
 *   2 Hump     - raise the hump until it stops getting over; each try is logged.
 *   3 Rubbing  - rubbing on: it climbs less, and a warm glow shows where the height went.
 *
 * Canvas: the coupled marbles and the thread are continuous motion.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, darken, alpha, font, drawHillBackdrop, levelLine, StringRig, RIG, PXM,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
];
const S_LENS = 0, S_MEASURE = 1, S_HUMP = 2, S_RUB = 3;

export class HillSceneTwoHills extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'A heavy marble and a light marble joined by a thread over a pulley. The heavy one rolls down its slope and ' +
    'lifts the light one up the other. A hump on the light one\'s slope can stop it getting over. With rubbing on, ' +
    'the light marble climbs less and the tracks glow warm where the missing height went.';

  static CONTROLS = [
    { type: 'button', id: 'run', label: 'Release' },
    { type: 'select', id: 'start', label: 'Heavy starts:', options: [
      { value: 'high', label: 'high' }, { value: 'middle', label: 'middle' }, { value: 'low', label: 'low' },
    ] },
    { type: 'select', id: 'hump', label: 'Hump:', options: [
      { value: 'none', label: 'none' }, { value: 'low', label: 'low' }, { value: 'medium', label: 'medium' }, { value: 'high', label: 'high' },
    ] },
    { type: 'select', id: 'rub', label: 'Rubbing:', options: [{ value: 'off', label: 'off' }, { value: 'on', label: 'on' }] },
    { type: 'select', id: 'string', label: 'Thread:', options: [{ value: 'on', label: 'on' }, { value: 'off', label: 'off' }] },
  ];

  constructor(container, config) {
    super(container, config);
    this._rig = new StringRig();
    this._log = [];
    this._logged = false;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => { g.beginPath(); g.moveTo(x - 16, y + 9); g.quadraticCurveTo(x - 4, y - 18, x + 16, y + 9); g.closePath(); g.fillStyle = c.s3; g.fill(); }, text: 'a side view, flat' },
      { icon: (g, x, y) => { g.strokeStyle = c.label; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 16, y + 8); g.quadraticCurveTo(x, y - 16, x + 16, y + 8); g.stroke(); }, text: 'the thread weighs nothing', sub: 'its own weight is ignored' },
      { icon: (g, x, y) => { rr(g, x - 17, y - 10, 34, 20, 10); g.fillStyle = c.bad; g.fill(); }, text: 'rubbing is a dial, not a fact' },
    ];
  }

  enter(stage) {
    const r = this._rig;
    r.start = 'high';
    r.string = true;
    r.rub = 0;
    r.setHump('none');
    this._log = [];
    this._logged = false;
    if (stage === S_LENS) r.run();
  }

  isControlHidden(id) {
    const st = this.stage;
    if (st === S_LENS) return true;
    if (id === 'hump') return st < S_HUMP;
    if (id === 'rub') return st < S_RUB;
    return false;
  }

  isControlDisabled(id) {
    return id !== 'run' && this._rig.moving && this._rig.rub > 0;
  }

  getControlValue(id) {
    const r = this._rig;
    if (id === 'start') return r.start;
    if (id === 'hump') return r.hump;
    if (id === 'rub') return r.rub > 0 ? 'on' : 'off';
    if (id === 'string') return r.string ? 'on' : 'off';
    return undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    const r = this._rig;
    if (id === 'run') { r.run(); this._logged = false; }
    else if (id === 'start' && RIG.HEAVY_STARTS[value] != null) { r.start = value; r.reset(); }
    else if (id === 'hump' && RIG.HUMPS[value] != null) r.setHump(value);
    else if (id === 'rub') { r.rub = value === 'on' ? 0.06 : 0; r.reset(); }
    else if (id === 'string') { r.string = value !== 'off'; r.reset(); }
    this.requestUiUpdate?.();
  }

  update(d) {
    const r = this._rig;
    r.step(d);
    if (!this._logged && r.string && (r.turnAge > 0.2 || r.done)) {
      this._logged = true;
      if (this.stage === S_HUMP && RIG.HUMPS[r.hump] > 0) {
        this._log.push({ hump: r.hump, over: !r.blocked });
        if (this._log.length > 4) this._log.shift();
        if (!r.blocked) this.celebrate(r.xL(), r.lightTrack.y(r.xL()) - 30, 16);
      }
      this.requestUiUpdate?.();
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const r = this._rig, st = this.stage;
    const baseL = r.lightTrack.y(r.xL0);
    r.draw(ctx, c, t);
    if (st === S_LENS) return;
    // Best climb mark on the light side.
    if (r.maxClimb > 4) {
      const y = baseL - r.maxClimb - 13;
      levelLine(ctx, c, 380, 640, y, c.s2, 0.9);
      pill(ctx, c, `light climbed ${(r.maxClimb / PXM).toFixed(2)} m`, 636, y - 20, { bg: c.s2, size: 14, align: 'right' });
    }
    const fallM = r.fall() / PXM;
    if (r.moving || r.done || r.s > 0) pill(ctx, c, `heavy fell ${fallM.toFixed(2)} m`, 16, 30, { bg: c.s5, size: 14, align: 'left' });
    else pill(ctx, c, 'press Release', 16, 30, { bg: c.accent, size: 15, align: 'left', scale: 1 + 0.05 * Math.sin(t * 5) });
    if (r.blocked && RIG.HUMPS[r.hump] > 0) {
      const p = popAt(r.turnAge, 0);
      if (p) pill(ctx, c, 'did not get over', 540, 150, { bg: c.bad, size: 15, ...p });
    }
    if (st === S_HUMP) this._drawLog(ctx, c);
    if (st === S_RUB && r.rub > 0) {
      const { heatJ } = r.joulesNow();
      pill(ctx, c, `warmth made: ${(heatJ * 1000).toFixed(0)} mJ`, 16, 64, { bg: c.bad, size: 14, align: 'left' });
      if (r.done) {
        const p = popAt(this.age, 0);
        if (p) pill(ctx, c, 'the missing height: warm tracks', 340, 490, { bg: c.bad, size: 15 });
      }
    }
  }

  _drawLog(ctx, c) {
    const x = 16, y = 58, w = 190;
    const n = this._log.length;
    const h = 34 + Math.max(1, n) * 24;
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
    ctx.fillText(n ? 'hump tries' : 'raise the hump, release', x + 12, y + 18);
    this._log.forEach((e, i) => {
      const ry = y + 42 + i * 24;
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 14);
      ctx.fillText(`${e.hump} hump`, x + 12, ry);
      ctx.fillStyle = e.over ? c.good : c.bad;
      ctx.textAlign = 'right';
      ctx.fillText(e.over ? 'over' : 'stuck', x + w - 12, ry);
      ctx.textAlign = 'left';
    });
  }
}
