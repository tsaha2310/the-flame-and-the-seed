/**
 * WaterwheelScene - blk-l03-08-04-s02 (builder). A stream falling past a wheel,
 * a bucket on a rope; connect the wheel to the rope and set the gear. Readouts:
 * the energy of the fall, of the lift, and the heat wasted. The sim refuses any
 * lift bigger than the fall can pay for.
 *
 * Beats (five blocks, splitSteps() counts 5):
 *   0 Lens      - machinery for a coupling that is really two reactions sharing a molecule.
 *   1 Run       - set a stream and a bucket, connect, run: read the three numbers.
 *   2 Too heavy - a bucket heavier than the fall can pay for: the wheel stalls.
 *   3 Gears     - slow and sure, then fast: compare the heat wasted.
 *   4 Unhooked  - disconnect: the whole fall becomes heat and spray.
 *
 * Canvas: a turning wheel, a falling stream and a rising bucket; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, rr, font, drawHillBackdrop, drawCardBox, Rig, drawRig, drawLedger, STREAMS, LOADS, GEARS,
} from './WaterKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_LENS = 0, S_RUN = 1, S_HEAVY = 2, S_GEAR = 3, S_OFF = 4;

export class WaterwheelScene extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'A stream falls past a waterwheel; a rope from the wheel lifts a bucket. Connected, the fall pays for the lift ' +
    'and the rest is wasted as heat. A bucket heavier than the fall can pay for stalls the wheel. A slow gear lifts ' +
    'surely but wastes more; a fast gear wastes less. Disconnected, the whole fall becomes heat and spray.';

  static CONTROLS = [
    { type: 'select', id: 'stream', label: 'Stream:', options: Object.keys(STREAMS).map((k) => ({ value: k, label: `${k}, ${STREAMS[k]} m` })) },
    { type: 'select', id: 'load', label: 'Bucket:', options: Object.keys(LOADS).map((k) => ({ value: k, label: `${k} kg` })) },
    { type: 'select', id: 'gear', label: 'Gear:', options: Object.keys(GEARS).map((k) => ({ value: k, label: k })) },
    { type: 'select', id: 'link', label: 'Wheel:', options: [{ value: 'on', label: 'connected' }, { value: 'off', label: 'disconnected' }] },
    { type: 'button', id: 'run', label: 'Run' },
  ];

  constructor(container, config) {
    super(container, config);
    this._rig = new Rig();
    this._log = [];
    this._logged = true;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => { g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.fillStyle = c.wood; g.fill(); }, text: 'drawn as machinery' },
      { icon: (g, x, y) => { g.beginPath(); g.arc(x - 7, y, 8, 0, Math.PI * 2); g.fillStyle = c.s1; g.fill(); g.beginPath(); g.arc(x + 8, y, 8, 0, Math.PI * 2); g.fillStyle = c.broth; g.fill(); }, text: 'really: two reactions sharing a molecule', sub: 'no wheel in a living thing' },
      { icon: (g, x, y) => { rr(g, x - 17, y - 10, 34, 20, 10); g.fillStyle = c.s2; g.fill(); }, text: 'the energy readouts are real ratios' },
    ];
  }

  enter(stage) {
    const r = this._rig;
    if (stage <= S_RUN) { r.stream = 'medium'; r.load = 2; r.gear = 'slow'; r.connected = true; this._log = []; }
    if (stage === S_HEAVY) { r.load = 8; r.gear = 'fast'; r.connected = true; }
    if (stage === S_GEAR) { r.load = 2; r.connected = true; }
    if (stage === S_OFF) r.connected = false;
    r.reset();
  }

  isControlHidden() { return this.stage === S_LENS; }

  isControlDisabled(id) {
    return id !== 'run' && this._rig.running;
  }

  getControlValue(id) {
    const r = this._rig;
    if (id === 'stream') return r.stream;
    if (id === 'load') return String(r.load);
    if (id === 'gear') return r.gear;
    if (id === 'link') return r.connected ? 'on' : 'off';
    return undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    const r = this._rig;
    if (id === 'stream' && STREAMS[value]) r.stream = value;
    else if (id === 'load' && LOADS[value]) r.load = +value;
    else if (id === 'gear' && GEARS[value]) r.gear = value;
    else if (id === 'link') r.connected = value === 'on';
    if (id === 'run') { r.run(); this._logged = false; } else r.reset();
    this.requestUiUpdate?.();
  }

  update(d) {
    const r = this._rig;
    r.step(d);
    if (!r.running && !this._logged && r.t > 0) {
      this._logged = true;
      const pct = r.tot.fall ? Math.round((100 * r.tot.waste) / r.tot.fall) : 0;
      this._log.push({ key: `${r.stream}, ${r.load} kg, ${r.connected ? r.gear : 'unhooked'}`, text: r.stalled ? 'stalled' : `${pct}% heat` });
      if (this._log.length > 4) this._log.shift();
      if (!r.stalled && r.connected && r.h >= 2) this.celebrate(556, 180, 18);
      this.requestUiUpdate?.();
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const r = this._rig;
    drawRig(ctx, c, r, t);
    if (this.stage === S_LENS) return;
    drawLedger(ctx, c, 190, 14, 290, r.tot);
    this._drawLog(ctx, c);
    if (!r.running && r.t === 0) {
      const hint = { [S_RUN]: 'connect, then Run', [S_HEAVY]: 'a heavy bucket: Run', [S_GEAR]: 'slow gear, then fast: Run each', [S_OFF]: 'disconnected: Run' }[this.stage];
      pill(ctx, c, hint, 340, 470, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
    }
    if (this.stage === S_OFF && r.t > 1 && !r.connected) pill(ctx, c, 'the fall all goes to heat and spray', 340, 470, { bg: c.bad, size: 15 });
  }

  _drawLog(ctx, c) {
    const n = this._log.length;
    if (!n) return;
    const x = 490, y = 14, w = 174;
    drawCardBox(ctx, c, x, y, w, 30 + n * 22);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('runs', x + 12, y + 16);
    this._log.forEach((e, i) => {
      const ry = y + 38 + i * 22;
      ctx.fillStyle = c.label;
      ctx.font = font(c, 700, 14);
      ctx.textAlign = 'left';
      ctx.fillText(e.key.split(',').slice(1).join(',').trim(), x + 12, ry);
      ctx.textAlign = 'right';
      ctx.fillText(e.text, x + w - 12, ry);
    });
  }
}
