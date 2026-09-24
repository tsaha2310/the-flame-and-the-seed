/**
 * CrowdScene (preset: walk) - blk-l03-05-03-s02 (run the machine). One tagged
 * particle in the Crowd: count its bumps to cross the box. Then a thousand
 * released at one side spread until both halves hold the same number. Dials:
 * temperature, box width, particle size.
 *
 * Beats (five blocks, splitSteps() counts 5):
 *   0 Lens     - one particle tagged red; the walker slowed, the thousand sped up; walls.
 *   1 Tag one  - watch its path; count bumps to the right wall; run it three times.
 *   2 Double   - double the box width; count again.
 *   3 Thousand - release a thousand at the left; time until the halves are even.
 *   4 Dials    - hotter, then bigger particles: repeat.
 *
 * Canvas: a random walk and a spreading cloud; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, rr, drawHillBackdrop, drawBox, drawReadout, drawClockIcon, drawNeighbours, Walker, DotCloud, walkSpeed,
  walkStep,
} from './CrowdKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_LENS = 0, S_TAG = 1, S_DOUBLE = 2, S_THOUSAND = 3, S_DIALS = 4;
const WIDTHS = { normal: 300, double: 600 };
const TEMPS = { cold: 0, room: 25, hot: 100 };

export class CrowdSceneWalk extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'One tagged particle bumps its way across a box in a random walk; the bumps to cross are counted. Doubling the ' +
    'box width takes about four times the bumps. A thousand particles released at one side spread out until both ' +
    'halves hold the same number, faster when hotter and slower when the particles are bigger.';

  static CONTROLS = [
    { type: 'button', id: 'tag', label: 'Tag one and go' },
    { type: 'button', id: 'thousand', label: 'Release a thousand' },
    { type: 'select', id: 'width', label: 'Box:', options: [{ value: 'normal', label: 'normal' }, { value: 'double', label: 'double width' }] },
    { type: 'select', id: 'temp', label: 'Temperature:', options: [
      { value: 'cold', label: 'cold, 0 \u00b0C' }, { value: 'room', label: 'room, 25 \u00b0C' }, { value: 'hot', label: 'hot, 100 \u00b0C' },
    ] },
    { type: 'select', id: 'size', label: 'Particles:', options: [{ value: 'small', label: 'small' }, { value: 'big', label: 'big' }] },
  ];

  constructor(container, config) {
    super(container, config);
    this._width = 'normal';
    this._temp = 'room';
    this._size = 'small';
    this._runs = [];
    this._evens = [];
    this._mode = 'walk';
    this._build();
  }

  _box() {
    return { x0: 40, y0: 150, x1: 40 + WIDTHS[this._width], y1: 430 };
  }

  _build() {
    const box = this._box();
    const speed = walkSpeed(TEMPS[this._temp]), step = walkStep(this._size);
    this._walker = new Walker(box, { step, speed, seed: 3 + this._runs.length });
    this._cloud = new DotCloud(box, { step, speed, fast: 4 });
    this._logged = false;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => { g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fillStyle = c.bad; g.fill(); }, text: 'one particle tagged red', sub: 'real particles are not tagged' },
      { icon: (g, x, y, t) => drawClockIcon(g, c, x, y, t), text: 'slowed for one, sped up for a thousand' },
      { icon: (g, x, y) => { rr(g, x - 16, y - 12, 32, 24, 4); g.strokeStyle = c.glass; g.lineWidth = 3; g.stroke(); }, text: 'the box has walls; so does a jug' },
    ];
  }

  enter(stage) {
    if (stage <= S_TAG) { this._width = 'normal'; this._temp = 'room'; this._size = 'small'; this._runs = []; this._evens = []; }
    if (stage === S_DOUBLE) this._width = 'double';
    this._mode = stage >= S_THOUSAND ? 'cloud' : 'walk';
    this._build();
  }

  isControlHidden(id) {
    const st = this.stage;
    if (st === S_LENS) return true;
    if (id === 'tag') return st >= S_THOUSAND;
    if (id === 'thousand') return st < S_THOUSAND;
    if (id === 'width') return st < S_DOUBLE;
    return st < S_DIALS;
  }

  getControlValue(id) {
    if (id === 'width') return this._width;
    if (id === 'temp') return this._temp;
    if (id === 'size') return this._size;
    return undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    if (id === 'tag') { this._build(); this._walker.running = true; }
    else if (id === 'thousand') { this._build(); this._cloud.running = true; }
    else if (id === 'width' && WIDTHS[value]) { this._width = value; this._build(); }
    else if (id === 'temp' && TEMPS[value] != null) { this._temp = value; this._build(); }
    else if (id === 'size' && (value === 'small' || value === 'big')) { this._size = value; this._build(); }
    this.requestUiUpdate?.();
  }

  update(d) {
    if (this._mode === 'walk') {
      this._walker.update(d);
      if (this._walker.done && !this._logged) {
        this._logged = true;
        this._runs.push({ w: this._width, n: this._walker.bumps });
        if (this._runs.length > 5) this._runs.shift();
        this.celebrate(this._walker.x, this._walker.y, 14);
        this.requestUiUpdate?.();
      }
    } else {
      this._cloud.update(d);
      if (this._cloud.evenAt >= 0 && !this._logged) {
        this._logged = true;
        this._evens.push({ key: `${this._temp}, ${this._size}, ${this._width}`, s: this._cloud.evenAt });
        if (this._evens.length > 4) this._evens.shift();
        this.requestUiUpdate?.();
      }
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const box = this._box();
    drawBox(ctx, c, box);
    drawNeighbours(ctx, c, box, t, Math.round((WIDTHS[this._width] / 300) * 90), this._size === 'big' ? 7 : 5);
    if (this._mode === 'walk') this._drawWalk(ctx, c);
    else this._drawCloud(ctx, c);
    if (this.stage === S_LENS) return;
    if (this._mode === 'walk') {
      const rows = this._runs.length ? this._runs.map((r, i) => ({ label: `run ${i + 1} (${r.w})`, text: `${r.n} bumps` })) : [{ label: 'bumps to cross', text: '-' }];
      drawReadout(ctx, c, 380, 14, 284, rows.slice(-3), null);
      pill(ctx, c, `bumps: ${this._walker.bumps}`, 40, 110, { bg: c.bad, size: 15, align: 'left' });
    } else {
      const [l, r] = this._cloud.halves();
      pill(ctx, c, `left ${l}`, 40, 110, { bg: c.s1, size: 15, align: 'left' });
      pill(ctx, c, `right ${r}`, box.x1, 110, { bg: c.s1, size: 15, align: 'right' });
      const rows = this._evens.length ? this._evens.map((e) => ({ label: e.key, text: `${e.s.toFixed(1)} s` })) : [{ label: 'time to even out', text: '-' }];
      drawReadout(ctx, c, 380, 14, 284, rows.slice(-3));
    }
  }

  _drawWalk(ctx, c) {
    const w = this._walker;
    if (w.path.length > 1) {
      ctx.beginPath();
      w.path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.lineTo(w.x, w.y);
      ctx.strokeStyle = c.bad;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.arc(w.x, w.y, this._size === 'big' ? 9 : 7, 0, Math.PI * 2);
    ctx.fillStyle = c.bad;
    ctx.fill();
  }

  _drawCloud(ctx, c) {
    const b = this._box();
    const mid = (b.x0 + b.x1) / 2;
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = c.labelMuted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mid, b.y0);
    ctx.lineTo(mid, b.y1);
    ctx.stroke();
    ctx.setLineDash([]);
    this._cloud.draw(ctx, c, c.s5);
  }
}
