/**
 * CrowdScene (preset: pressure) - blk-l02-04-03-s03 (observe, POE with dials). A
 * box of gas with one movable wall (right) and a top that opens. The counter
 * really counts the hits on the movable wall; with the top open, the average
 * jiggle of the ones left behind is read out as a temperature.
 *
 * Beats (four blocks, splitSteps() counts 4):
 *   0 Lens    - one movable wall, an open top; balls, slowed; the counter is a real count.
 *   1 Closed  - watch the hits; read the counter.
 *   2 Dials   - raise the temperature, add particles, shrink the box: read each time.
 *   3 Open    - open the top: the fast ones leave; the jiggle of those left drops.
 *
 * Canvas: a gas of particles, wall flashes; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, font, alpha, drawHillBackdrop, drawBox, drawParticles, drawReadout, drawCardBox, ParticleBox,
  drawClockIcon, STICK, Evaporator,
} from './CrowdKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
];
const S_LENS = 0, S_CLOSED = 1, S_DIALS = 2, S_OPEN = 3;
const SIZES = { small: 240, medium: 330, large: 410 };
const COUNTS = { 20: 20, 40: 40, 80: 80 };
const TEMPS = { cold: 0, room: 25, hot: 150 };

export class CrowdScenePressure extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'A box of gas particles with a movable right wall and a top that can open. A counter counts the hits on the ' +
    'movable wall each second. Hotter, more particles, or a smaller box all raise the count. With the top open, the ' +
    'fastest particles escape and the average jiggle of the ones left behind drops.';

  static CONTROLS = [
    { type: 'select', id: 'temp', label: 'Temperature:', options: [
      { value: 'cold', label: 'cold, 0 \u00b0C' }, { value: 'room', label: 'room, 25 \u00b0C' }, { value: 'hot', label: 'hot, 150 \u00b0C' },
    ] },
    { type: 'select', id: 'n', label: 'Particles:', options: [{ value: '20', label: '20' }, { value: '40', label: '40' }, { value: '80', label: '80' }] },
    { type: 'select', id: 'size', label: 'Box:', options: [
      { value: 'large', label: 'large' }, { value: 'medium', label: 'medium' }, { value: 'small', label: 'small' },
    ] },
    { type: 'select', id: 'top', label: 'Top:', options: [{ value: 'closed', label: 'closed' }, { value: 'open', label: 'open' }] },
  ];

  constructor(container, config) {
    super(container, config);
    this._temp = 'room';
    this._n = 40;
    this._size = 'large';
    this._open = false;
    this._log = [];
    this._spark = [];
    this._build();
  }

  _build() {
    const w = SIZES[this._size];
    // Open top: a sticky puddle that evaporates. Closed: a gas that drums on the wall.
    const puddle = this._open;
    const b = new ParticleBox({
      x0: 40, y0: 110, x1: 40 + w, y1: 450, stick: puddle ? STICK.middle * 9 : 0, gravity: puddle ? 36 : 0,
      temp: TEMPS[this._temp], keScale: 9, seed: 21,
    });
    if (puddle) b.fill(this._n, 7, 0, { x0: 40, y0: 330, x1: 40 + w, y1: 450 });
    else b.fill(this._n, 7);
    // A puddle first settles at the set temperature with the lid on; the lid lifts after 2.5 s.
    b.topOpen = false;
    b.thermostat = true;
    this._settle = this._open ? 2.5 : 0;
    this._evap = null;
    this._box = b;
    this._spark = [];
    this._sparkT = 0;
    this._readT = 0;
    this._shownHits = 0;
    this._shownJig = null;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => { rr(g, x - 16, y - 12, 26, 24, 4); g.strokeStyle = c.glass; g.lineWidth = 3; g.stroke(); g.fillStyle = c.s5; g.fillRect(x + 12, y - 12, 5, 24); }, text: 'one movable wall, an open top' },
      { icon: (g, x, y, t) => drawClockIcon(g, c, x, y, t), text: 'balls, slowed a trillion times' },
      { icon: (g, x, y) => { rr(g, x - 17, y - 10, 34, 20, 10); g.fillStyle = c.s2; g.fill(); }, text: 'the hit counter is a real count', sub: 'in the sim, standing in for life' },
    ];
  }

  enter(stage) {
    if (stage <= S_CLOSED) { this._temp = 'room'; this._n = 40; this._size = 'large'; this._log = []; }
    this._open = stage === S_OPEN;
    if (this._open) { this._temp = 'room'; this._n = 80; this._size = 'large'; }
    this._build();
  }

  isControlHidden(id) {
    if (this.stage === S_LENS) return true;
    if (id === 'top') return this.stage < S_OPEN;
    return this.stage < S_DIALS;
  }

  getControlValue(id) {
    if (id === 'temp') return this._temp;
    if (id === 'n') return String(this._n);
    if (id === 'size') return this._size;
    if (id === 'top') return this._open ? 'open' : 'closed';
    return undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    if (id === 'temp' && TEMPS[value] != null) { this._temp = value; this._box.temp = TEMPS[value]; this._readT = 0; }
    else if (id === 'n' && COUNTS[value]) { this._n = COUNTS[value]; this._build(); }
    else if (id === 'size' && SIZES[value]) { this._size = value; this._build(); }
    else if (id === 'top') { this._open = value === 'open'; this._build(); }
    this.requestUiUpdate?.();
  }

  update(d) {
    const b = this._box;
    if (this._settle > 0) {
      this._settle -= d;
      if (this._settle <= 0) { b.topOpen = true; this._evap = new Evaporator(b, { every: 1.0, max: 10 }); }
    }
    if (this._evap && this._open) this._evap.step(d);
    b.step(d);
    // The counter's display ticks once a second, like a real counter.
    this._counterT = (this._counterT ?? 0) + d;
    if (this._counterT >= 1) { this._counterT = 0; this._shownHits = Math.round(b.hitRate()); this._shownJig = Math.round(b.temp); }
    this._readT += d;
    // Log a steady reading after the crowd has had 3 s under the new settings.
    if (!this._open && this._readT > 3 && !this._logged) {
      this._logged = true;
      const key = `${this._temp}, ${this._n}, ${this._size}`;
      if (!this._log.find((e) => e.key === key)) {
        this._log.push({ key, n: Math.round(b.hitRate()) });
        if (this._log.length > 5) this._log.shift();
      }
    }
    if (this._readT <= 3) this._logged = false;
    if (this._open && this._settle <= 0) {
      this._sparkT += d;
      if (this._sparkT > 0.5) {
        this._sparkT = 0;
        this._spark.push(b.temp);
        if (this._spark.length > 40) this._spark.shift();
      }
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const b = this._box;
    drawBox(ctx, c, b, { open: b.topOpen, rightWallCol: c.s5 });
    // Flashes where particles hit the movable wall.
    for (const h of b.hitMarks) {
      const a = 1 - (b.clock - h.t) / 0.4;
      if (a <= 0) continue;
      ctx.beginPath();
      ctx.arc(b.x1 + 5, h.y, 10 * (1.4 - a), 0, Math.PI * 2);
      ctx.strokeStyle = alpha(c.warning, a);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    drawParticles(ctx, c, b, { heat: this._open });
    if (this._open && this._settle > 0) pill(ctx, c, 'settling at 25 \u00b0C: the lid lifts soon', 245, 90, { bg: c.labelMuted, size: 14 });
    rr(ctx, b.x1 + 12, (b.y0 + b.y1) / 2 - 8, 30, 16, 6);
    ctx.fillStyle = c.s5;
    ctx.fill();
    if (this.stage === S_LENS) return;
    const rows = [
      { label: 'hits per second', text: String(this._shownHits), col: c.warning },
      { label: 'temperature', text: `${TEMPS[this._temp]} \u00b0C` },
      { label: 'particles', text: String(b.p.filter((q) => !q.gone && !q.leaving).length) },
    ];
    if (this._open) rows.push({ label: 'jiggle left', text: `${this._shownJig ?? TEMPS[this._temp]} \u00b0C`, col: c.s1 });
    drawReadout(ctx, c, 506, 110, 158, rows);
    if (this._open) this._drawSpark(ctx, c);
    else if (this.stage >= S_DIALS) this._drawLog(ctx, c);
    const hint = { [S_CLOSED]: 'top closed: read the counter', [S_DIALS]: 'hotter, more, smaller: read each', [S_OPEN]: 'top open: which ones get out?' }[this.stage];
    if (hint) pill(ctx, c, hint, 40, 60, { bg: c.accent, size: 15, align: 'left' });
    if (this.stage === S_OPEN && (this._evap?.count ?? 0) > 3) {
      const q = popAt(b.clock, 4);
      if (q) pill(ctx, c, 'the fast ones leave first', 506, 60, { bg: c.bad, size: 14, align: 'left', ...q });
    }
  }

  _drawLog(ctx, c) {
    const x = 506, y = 230, w = 158;
    const n = this._log.length;
    drawCardBox(ctx, c, x, y, w, 36 + Math.max(1, n) * 26);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('readings', x + 12, y + 18);
    this._log.forEach((e, i) => {
      const ry = y + 44 + i * 26;
      ctx.fillStyle = c.label;
      ctx.font = font(c, 700, 14);
      ctx.textAlign = 'left';
      ctx.fillText(e.key.replace('room', 'rm'), x + 12, ry);
      ctx.textAlign = 'right';
      ctx.fillText(String(e.n), x + w - 12, ry);
    });
  }

  /** Jiggle of those left, over time, since the top opened. */
  _drawSpark(ctx, c) {
    const x = 506, y = 260, w = 158, h = 120;
    drawCardBox(ctx, c, x, y, w, h);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('jiggle left behind', x + 12, y + 18);
    const s = this._spark;
    if (s.length < 2) return;
    const lo = Math.min(...s) - 10, hi = Math.max(...s) + 10;
    ctx.beginPath();
    s.forEach((v, i) => {
      const px = x + 12 + (i / 39) * (w - 24), py = y + h - 14 - ((v - lo) / (hi - lo)) * (h - 44);
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    });
    ctx.strokeStyle = c.s1;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}
