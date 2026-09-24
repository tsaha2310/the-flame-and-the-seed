/**
 * CrowdScene (preset: reacts) - blk-l03-06-01-s03 (observe, POE with dials). Two
 * kinds of particle in the Crowd: red ones fly about, blue ones sit as a lump or as
 * powder. A red-blue collision hard enough makes a purple one. Each run lasts 8 s
 * of sim time and logs its reactions per second, a count in the sim.
 *
 * Beats (five blocks, splitSteps() counts 5):
 *   0 Lens     - red and blue are not real colours; slowed; the counter is a sim count.
 *   1 Base     - room temperature, middle red, blue as a lump: read the rate.
 *   2 Warmth   - warmer, then fridge: read each.
 *   3 More red - double the red: read.
 *   4 Powder   - blue as powder: read.
 *
 * Canvas: reacting particles; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, rr, font, drawHillBackdrop, drawBox, drawParticles, drawCardBox, drawClockIcon, ReactionBox, REACT_TEMPS,
} from './CrowdKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_LENS = 0, S_BASE = 1, S_WARM = 2, S_RED = 3, S_POWDER = 4;
const RUN_S = 8;

export class CrowdSceneReacts extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'Red particles fly about a box with blue particles sitting as a lump or as powder. When a red one hits a blue ' +
    'one hard enough they make a purple one. Each run counts reactions per second: warmer, more red, and powder ' +
    'instead of a lump all raise the rate; the fridge lowers it.';

  static CONTROLS = [
    { type: 'select', id: 'temp', label: 'Temperature:', options: Object.keys(REACT_TEMPS).map((k) => ({ value: k, label: `${k}, ${REACT_TEMPS[k]} \u00b0C` })) },
    { type: 'select', id: 'red', label: 'Red:', options: [{ value: '40', label: 'middle' }, { value: '80', label: 'double' }] },
    { type: 'select', id: 'blue', label: 'Blue:', options: [{ value: 'lump', label: 'a lump' }, { value: 'powder', label: 'powder' }] },
    { type: 'button', id: 'run', label: 'Run' },
  ];

  constructor(container, config) {
    super(container, config);
    this._temp = 'room';
    this._red = 40;
    this._blue = 'lump';
    this._log = [];
    this._build();
  }

  _build() {
    this._rx = new ReactionBox({ temp: REACT_TEMPS[this._temp], red: this._red, powder: this._blue === 'powder', seed: 51 + this._log.length });
    this._going = false;
    this._runT = 0;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => { g.beginPath(); g.arc(x - 8, y, 8, 0, Math.PI * 2); g.fillStyle = c.s6; g.fill(); g.beginPath(); g.arc(x + 8, y, 8, 0, Math.PI * 2); g.fillStyle = c.s1; g.fill(); }, text: 'red and blue make purple', sub: 'real particles are not coloured' },
      { icon: (g, x, y, t) => drawClockIcon(g, c, x, y, t), text: 'slowed a trillion times' },
      { icon: (g, x, y) => { rr(g, x - 17, y - 10, 34, 20, 10); g.fillStyle = c.s2; g.fill(); }, text: 'reactions per second: a sim count' },
    ];
  }

  enter(stage) {
    if (stage <= S_BASE) { this._temp = 'room'; this._red = 40; this._blue = 'lump'; this._log = []; }
    this._build();
  }

  isControlHidden(id) {
    const st = this.stage;
    if (st === S_LENS) return true;
    if (id === 'temp') return st < S_WARM;
    if (id === 'red') return st < S_RED;
    if (id === 'blue') return st < S_POWDER;
    return false;
  }

  isControlDisabled(id) {
    return id !== 'run' && this._going;
  }

  getControlValue(id) {
    if (id === 'temp') return this._temp;
    if (id === 'red') return String(this._red);
    if (id === 'blue') return this._blue;
    return undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    if (id === 'temp' && REACT_TEMPS[value] != null) { this._temp = value; this._build(); }
    else if (id === 'red' && (value === '40' || value === '80')) { this._red = +value; this._build(); }
    else if (id === 'blue' && (value === 'lump' || value === 'powder')) { this._blue = value; this._build(); }
    else if (id === 'run') { this._build(); this._going = true; }
    this.requestUiUpdate?.();
  }

  update(d) {
    if (!this._going) return;
    this._rx.step(d);
    this._runT += d;
    if (this._runT >= RUN_S) {
      this._going = false;
      this._log.push({ key: `${this._temp}, ${this._red === 80 ? 'double' : 'middle'}, ${this._blue}`, r: this._rx.count / RUN_S });
      if (this._log.length > 5) this._log.shift();
      this.requestUiUpdate?.();
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const b = this._rx.box;
    drawBox(ctx, c, b);
    drawParticles(ctx, c, b);
    if (this.stage === S_LENS) return;
    pill(ctx, c, this._going ? `running: ${Math.ceil(RUN_S - this._runT)} s left` : 'press Run', 40, 60, { bg: this._going ? c.labelMuted : c.accent, size: 15, align: 'left' });
    this._drawLog(ctx, c);
  }

  _drawLog(ctx, c) {
    const x = 460, y = 100, w = 204;
    const n = this._log.length;
    drawCardBox(ctx, c, x, y, w, 40 + Math.max(1, n) * 44);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(n ? 'reactions per second' : 'runs appear here', x + 12, y + 20);
    this._log.forEach((e, i) => {
      const ry = y + 50 + i * 44;
      ctx.fillStyle = c.labelMuted;
      ctx.font = font(c, 700, 14);
      ctx.textAlign = 'left';
      ctx.fillText(e.key, x + 12, ry);
      rr(ctx, x + 12, ry + 10, Math.max(4, e.r * 45), 10, 5);
      ctx.fillStyle = c.s5;
      ctx.fill();
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 14);
      ctx.textAlign = 'right';
      ctx.fillText(e.r.toFixed(1), x + w - 12, ry + 14);
    });
  }
}
