/**
 * HillScene (preset: hump) - blk-l03-06-02-s02 (observe, builder). The reaction
 * Hill: reactants on the left, products lower on the right, a hump between. Set
 * the hump and the temperature, release a hundred marbles (collisions), count how
 * many cross.
 *
 * Beats (five paragraphs, splitSteps() counts 5):
 *   0 Lens      - the energy picture from Book I; a marble is one collision; not to scale.
 *   1 Low hump  - release a hundred at room temperature; count.
 *   2 Raise it  - a higher hump; count again.
 *   3 Heat/cool - room, warm, fridge, flame; count.
 *   4 Find it   - the hump where none cross at room but most cross at a flame.
 *
 * Canvas: a hundred rolling marbles; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, darken, alpha, font, drawHillBackdrop, drawMarble, ReactionHill, CrossingRun, TEMPS,
  HUMPS_K, heatCol,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_LENS = 0, S_LOW = 1, S_RAISE = 2, S_TEMP = 3, S_FIND = 4;
const DROP = 1000;
const HUMP_KEYS = ['low', 'medium', 'high'];

export class HillSceneHump extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'A reaction Hill: reactants on a plateau on the left, products lower on the right, and a hump between them. ' +
    'A hundred marbles, each one collision, roll at the hump with random strengths set by the temperature. Only ' +
    'the hard ones cross. A higher hump lets fewer cross; a higher temperature lets more.';

  static CONTROLS = [
    { type: 'select', id: 'hump', label: 'Hump:', options: HUMP_KEYS.map((k) => ({ value: k, label: k })) },
    { type: 'select', id: 'temp', label: 'Temperature:', options: Object.keys(TEMPS).map((k) => ({ value: k, label: TEMPS[k].label })) },
    { type: 'button', id: 'run', label: 'Release 100 marbles' },
  ];

  constructor(container, config) {
    super(container, config);
    this._hill = new ReactionHill({ hump: HUMPS_K.low, drop: DROP });
    this._run = new CrossingRun(this._hill, 11);
    this._hump = 'low';
    this._temp = 'room';
    this._log = [];
    this._logged = false;
    this._found = false;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => { g.beginPath(); g.moveTo(x - 17, y); g.lineTo(x - 6, y); g.quadraticCurveTo(x, y - 18, x + 6, y + 8); g.lineTo(x + 17, y + 8); g.strokeStyle = c.s3; g.lineWidth = 4; g.stroke(); }, text: 'the energy picture from Book I', sub: 'products sit lower, a hump between' },
      { icon: (g, x, y) => drawMarble(g, c, x, y, 10, heatCol(c, 0.8), {}), text: 'each marble: one collision', sub: 'its speed is how hard it hits' },
      { icon: (g, x, y) => { rr(g, x - 16, y - 10, 32, 20, 6); g.fillStyle = c.labelMuted; g.fill(); }, text: 'nothing is to scale' },
    ];
  }

  enter(stage) {
    this._run.reset();
    this._logged = false;
    if (stage <= S_LOW) { this._hump = 'low'; this._temp = 'room'; this._log = []; this._found = false; }
    this._hill.set(HUMPS_K[this._hump], DROP);
  }

  isControlHidden(id) {
    if (this.stage === S_LENS) return true;
    if (id === 'hump') return this.stage < S_RAISE;
    if (id === 'temp') return this.stage < S_TEMP;
    return false;
  }

  isControlDisabled(id) {
    return id !== 'run' && this._run.active && !this._run.done;
  }

  getControlValue(id) {
    if (id === 'hump') return this._hump;
    if (id === 'temp') return this._temp;
    return undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    if (id === 'hump' && HUMPS_K[value] != null) { this._hump = value; this._hill.set(HUMPS_K[value], DROP); this._run.reset(); }
    else if (id === 'temp' && TEMPS[value]) { this._temp = value; this._run.reset(); }
    else if (id === 'run') { this._run.start(100, TEMPS[this._temp].K); this._logged = false; }
    this.requestUiUpdate?.();
  }

  update(d) {
    const run = this._run;
    run.step(d);
    if (run.done && !this._logged) {
      this._logged = true;
      this._log.push({ hump: this._hump, temp: this._temp, n: run.crossed });
      if (this._log.length > 5) this._log.shift();
      if (this.stage === S_FIND && !this._found) {
        const k = this._hump;
        const room = this._log.find((e) => e.hump === k && e.temp === 'room' && e.n <= 1);
        const flame = this._log.find((e) => e.hump === k && e.temp === 'flame' && e.n >= 50);
        if (room && flame) { this._found = true; this.celebrate(340, 140, 30); }
      }
      this.requestUiUpdate?.();
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const hill = this._hill, run = this._run, st = this.stage;
    hill.draw(ctx, c);
    pill(ctx, c, 'reactants', 120, hill.yR - 26, { bg: c.s1, size: 14 });
    pill(ctx, c, 'products', 560, hill.yR + hill.dPx - 26, { bg: c.s3, size: 14 });
    pill(ctx, c, `${this._hump} hump`, hill.xp, hill.yR - hill.hPx - 28, { bg: c.warning, size: 14 });
    run.draw(ctx, c);
    run.drawTrays(ctx, c);
    if (st === S_LENS) return;
    pill(ctx, c, TEMPS[this._temp].label, 664, 30, { bg: this._temp === 'flame' ? c.flame : this._temp === 'fridge' ? c.s1 : c.s2, size: 15, align: 'right' });
    this._drawLog(ctx, c);
    const pulse = { scale: 1 + 0.05 * Math.sin(t * 5) };
    if (!run.active) {
      const hint = st === S_LOW ? 'low hump, room temperature: release' : st === S_RAISE ? 'raise the hump, release again'
        : st === S_TEMP ? 'change the temperature, release' : 'nothing at room, most at a flame: which hump?';
      pill(ctx, c, hint, 440, 60, { bg: c.accent, size: 15, ...pulse });
    }
    if (this._found) {
      const p = popAt(this.age, 0);
      pill(ctx, c, `found it: the ${this._hump} hump`, 440, 60, { bg: c.good, size: 15, ...(p || {}) });
    }
  }

  _drawLog(ctx, c) {
    const x = 16, y = 14, w = 214;
    const n = this._log.length;
    const h = 30 + Math.max(1, n) * 22;
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
    ctx.fillText(n ? 'crossed, of 100' : 'runs appear here', x + 12, y + 16);
    this._log.forEach((e, i) => {
      const ry = y + 38 + i * 22;
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 14);
      ctx.textAlign = 'left';
      ctx.fillText(`${e.hump} \u00b7 ${e.temp}`, x + 12, ry);
      ctx.textAlign = 'right';
      ctx.fillText(String(e.n), x + w - 12, ry);
    });
  }
}
