/**
 * TugOfWarScene (preset: no-sharing) - blk-l02-01-03-s05 (what-if). Switch on
 * "the knot may only sit at one end": every bond is a steal. Water becomes a solid
 * lattice of ions, sugar and oil cannot exist, the air's nitrogen and oxygen turn
 * into ionic solids and fall out of the sky. The kitchen is a pile of crystals.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - our kitchen: water, sugar, oil, air; the H-O knot off-centre; predict.
 *   1 run   - the switch; the knot jumps to oxygen; everything crystallises and falls.
 *   2 nails - sharing is the grip that makes molecules.
 *
 * Canvas: a kitchen changing state; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, alpha, mix, darken, lighten, blob, drawHillBackdrop, drawTug, knotTarget, mulberry32,
} from './TugKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;
const SHELF = 400;

export class TugOfWarSceneNoSharing extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A kitchen with a glass of water, a bowl of sugar, a bottle of oil and air above. If the shared pair could only ' +
    'sit at one end, every bond would be a steal: water would be a solid lattice of ions, sugar and oil could not ' +
    'exist, and the nitrogen and oxygen of the air would become crystals and fall. The kitchen becomes a pile of crystals.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Knot only at one end: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Knot only at one end: ON', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._f = 0;
    this._k = 0;
    this._dialled = false;
    const rnd = mulberry32(9);
    this._air = Array.from({ length: 14 }, () => ({ x: 40 + rnd() * 600, y: 70 + rnd() * 40, a: rnd() * 6, n: rnd() < 0.78, v: 0.6 + rnd() }));
  }

  enter() {
    this.mode = 'off';
    this._dialled = false;
    this._f = 0;
  }

  isControlHidden() { return this.stage === S_SETUP; }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'on' || id === 'off') { this.mode = id; this._dialled = true; }
    this.requestUiUpdate?.();
  }

  update(d) {
    const on = this.mode === 'on';
    this._f += ((on ? 1 : 0) - this._f) * Math.min(1, d * 0.9);
    this._k += (knotTarget('H', 'O', { ends: on }) - this._k) * Math.min(1, d * 3);
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const f = this._f;
    // Air: dumbbells drifting, then crystals falling to the shelf.
    for (const m of this._air) {
      const x = m.x + Math.sin(t * m.v + m.a) * 12 * (1 - f);
      const y = m.y + (SHELF - 12 - m.y) * Math.min(1, f * 1.2);
      if (f < 0.5) {
        const col = m.n ? c.s1 : c.s6;
        const ang = t * m.v + m.a;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(x + Math.cos(ang) * 7 * s, y + Math.sin(ang) * 7 * s, 6, 0, Math.PI * 2);
          ctx.fillStyle = alpha(col, 1 - f * 2);
          ctx.fill();
        }
      } else {
        this._crystal(ctx, c, x, y, 8, m.n ? c.s1 : c.s6, (f - 0.5) * 2);
      }
    }
    // Shelf.
    rr(ctx, 20, SHELF, 640, 16, 7);
    ctx.fillStyle = darken(c.wood, 0.3);
    ctx.fill();
    this._glass(ctx, c, 150, t, f);
    this._bowl(ctx, c, 340, t, f);
    this._bottle(ctx, c, 530, t, f);
    drawTug(ctx, c, 'H', 'O', this._k, 200, 480, 190, t, { charges: true });
    const on = this.mode === 'on';
    pill(ctx, c, on ? 'every bond a steal' : 'our world: sharing allowed', 16, 30, { bg: on ? c.bad : c.good, size: 15, align: 'left' });
    const st = this.stage;
    if (st === S_SETUP) {
      const q = popAt(this.age, 1.0);
      if (q) pill(ctx, c, 'predict: water, sugar, the air?', 664, 30, { bg: c.accent, size: 15, align: 'right', ...q });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the dial', 664, 30, { bg: c.accent, size: 15, align: 'right', scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_RUN && on) {
      const q = popAt(this.age, 2.0);
      if (q) pill(ctx, c, 'the kitchen: a pile of crystals', 340, 480, { bg: c.bad, size: 15, ...q });
    }
    if (st === S_NAILS) {
      const q = popAt(this.age, 0.5);
      if (q) pill(ctx, c, 'sharing makes molecules: liquids, oil, the seed', 340, 480, { bg: c.good, size: 15, ...q });
    }
  }

  _crystal(ctx, c, x, y, s, col, a = 1) {
    ctx.save();
    ctx.globalAlpha *= Math.max(0, Math.min(1, a));
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.8, y);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s * 0.8, y);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = lighten(col, 0.5);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  _glass(ctx, c, x, t, f) {
    const y = SHELF - 90;
    rr(ctx, x - 34, y, 68, 90, 8);
    ctx.fillStyle = alpha(c.glass, 0.15);
    ctx.fill();
    if (f < 0.6) {
      rr(ctx, x - 30, y + 20 + Math.sin(t * 2) * 1.5, 60, 66, 6);
      ctx.fillStyle = alpha(c.water, 0.55 * (1 - f));
      ctx.fill();
    }
    if (f > 0.3) {
      for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
        ctx.beginPath();
        ctx.arc(x - 24 + i * 12, y + 34 + j * 13, 5, 0, Math.PI * 2);
        ctx.fillStyle = alpha((i + j) % 2 ? c.s6 : lighten(c.labelMuted, 0.4), Math.min(1, (f - 0.3) * 2));
        ctx.fill();
      }
    }
    ctx.strokeStyle = c.glass;
    ctx.lineWidth = 3;
    rr(ctx, x - 34, y, 68, 90, 8);
    ctx.stroke();
    pill(ctx, c, f > 0.5 ? 'water: an ionic solid' : 'water', x, SHELF + 34, { bg: f > 0.5 ? c.bad : c.water, size: 14 });
  }

  _bowl(ctx, c, x, t, f) {
    ctx.beginPath();
    ctx.moveTo(x - 50, SHELF - 40);
    ctx.quadraticCurveTo(x, SHELF + 14, x + 50, SHELF - 40);
    ctx.closePath();
    ctx.fillStyle = mix(c.raised, c.labelMuted, 0.3);
    ctx.fill();
    if (f < 0.6) {
      for (let i = 0; i < 9; i++) {
        rr(ctx, x - 30 + (i % 5) * 13, SHELF - 52 - Math.floor(i / 5) * 9, 9, 8, 2);
        ctx.fillStyle = alpha(lighten(c.label, 0.2), 1 - f * 1.6);
        ctx.fill();
      }
    } else {
      for (let i = 0; i < 6; i++) this._crystal(ctx, c, x - 25 + i * 10, SHELF - 48, 7, c.s2, (f - 0.6) * 2.5);
    }
    pill(ctx, c, f > 0.5 ? 'no sugar' : 'sugar', x, SHELF + 34, { bg: f > 0.5 ? c.bad : c.s2, size: 14 });
  }

  _bottle(ctx, c, x, t, f) {
    rr(ctx, x - 26, SHELF - 96, 52, 96, 12);
    ctx.fillStyle = alpha(c.glass, 0.15);
    ctx.fill();
    if (f < 0.6) {
      blob(ctx, x, SHELF - 34, 22, 26, 7, 0.05, t);
      ctx.fillStyle = alpha(c.broth, 0.8 * (1 - f));
      ctx.fill();
    } else {
      for (let i = 0; i < 4; i++) this._crystal(ctx, c, x - 12 + (i % 2) * 22, SHELF - 20 - Math.floor(i / 2) * 18, 8, c.broth, (f - 0.6) * 2.5);
    }
    ctx.strokeStyle = c.glass;
    ctx.lineWidth = 3;
    rr(ctx, x - 26, SHELF - 96, 52, 96, 12);
    ctx.stroke();
    pill(ctx, c, f > 0.5 ? 'no oil' : 'oil', x, SHELF + 34, { bg: f > 0.5 ? c.bad : c.broth, size: 14 });
  }
}
