/**
 * CrowdScene (preset: slow-escape) - blk-l02-04-03-s06 (what-if). Kabir's
 * backwards world: the slowest particles escape first. The sluggish ones leave,
 * the fast ones stay, and the jiggle of those left rises: a puddle gets hotter as
 * it dries, and a matka would warm its water.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - our world: the fastest leave, the puddle cools; predict.
 *   1 run   - the switch; the slowest leave; the puddle warms.
 *   2 nails - evaporation cools because the fast ones have the jiggle to escape.
 *
 * Canvas: an evaporating puddle; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, font, drawHillBackdrop, drawBox, drawParticles, drawReadout, drawCardBox, ParticleBox, STICK,
  Evaporator,
} from './CrowdKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;

export class CrowdSceneSlowEscape extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'An evaporating puddle of particles. In our world the fastest particles escape and the ones left get cooler. ' +
    'In a world where the slowest escape first, the fast ones stay behind and the puddle gets hotter as it dries: ' +
    'sweat would give you a fever and a matka would warm its water.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Slowest escape first: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Slowest escape first: ON', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._dialled = false;
    this._build();
  }

  _build() {
    const b = new ParticleBox({ x0: 40, y0: 110, x1: 440, y1: 450, stick: STICK.middle * 9, gravity: 36, temp: 25, keScale: 9, seed: 41 });
    b.fill(80, 7, 0, { x0: 40, y0: 330, x1: 440, y1: 450 });
    this._box = b;
    this._evap = null;
    this._settle = 2;
    this._spark = [];
    this._sT = 0;
    this._shown = 25;
  }

  enter() {
    this.mode = 'off';
    this._dialled = false;
    this._build();
  }

  isControlHidden() { return this.stage === S_SETUP; }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'on' || id === 'off') { this.mode = id; this._dialled = true; this._build(); }
    this.requestUiUpdate?.();
  }

  update(d) {
    if (this.stage === S_RUN && !this._dialled) return;
    const b = this._box;
    if (this._settle > 0) {
      this._settle -= d;
      if (this._settle <= 0) this._evap = new Evaporator(b, { every: 1.0, max: 12, slowest: this.mode === 'on' });
    }
    if (this._evap) this._evap.step(d);
    b.step(d);
    this._sT += d;
    if (this._sT > 0.5) {
      this._sT = 0;
      this._shown = Math.round(b.temp);
      if (this._evap) { this._spark.push(b.temp); if (this._spark.length > 40) this._spark.shift(); }
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const b = this._box, on = this.mode === 'on';
    drawBox(ctx, c, b, { open: !!this._evap });
    drawParticles(ctx, c, b, { heat: true });
    for (const q of b.p) {
      if (!q.leaving || q.gone) continue;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = on ? c.s1 : c.bad;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    drawReadout(ctx, c, 470, 110, 194, [{ label: 'jiggle left', text: `${this._shown} \u00b0C`, col: this._shown > 25 ? c.bad : c.s1 }, { label: 'escaped', text: String(this._evap?.count ?? 0) }]);
    this._drawSpark(ctx, c);
    pill(ctx, c, on ? 'the slowest escape first' : 'our world: the fastest escape', 40, 70, { bg: on ? c.bad : c.good, size: 15, align: 'left' });
    const st = this.stage;
    if (st === S_SETUP) {
      const q = popAt(this.age, 1.0);
      if (q) pill(ctx, c, 'predict: backwards, what happens?', 567, 400, { bg: c.accent, size: 14, ...q });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the dial', 567, 400, { bg: c.accent, size: 14, scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_RUN && on && (this._evap?.count ?? 0) > 4) pill(ctx, c, 'it heats as it dries', 567, 400, { bg: c.bad, size: 14 });
    if (st === S_NAILS) {
      const q = popAt(this.age, 0.5);
      if (q) pill(ctx, c, 'the fast ones escape: cooling', 567, 400, { bg: c.good, size: 14, ...q });
    }
  }

  _drawSpark(ctx, c) {
    const x = 470, y = 200, w = 194, h = 150;
    drawCardBox(ctx, c, x, y, w, h);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('jiggle left, over time', x + 12, y + 18);
    const s = this._spark;
    if (s.length < 2) return;
    const lo = Math.min(-20, ...s), hi = Math.max(70, ...s);
    const Y = (v) => y + h - 14 - ((v - lo) / (hi - lo)) * (h - 44);
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = c.labelMuted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 12, Y(25));
    ctx.lineTo(x + w - 12, Y(25));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    s.forEach((v, i) => {
      const px = x + 12 + (i / 39) * (w - 24);
      if (i) ctx.lineTo(px, Y(v)); else ctx.moveTo(px, Y(v));
    });
    ctx.strokeStyle = this.mode === 'on' ? c.bad : c.s1;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}
