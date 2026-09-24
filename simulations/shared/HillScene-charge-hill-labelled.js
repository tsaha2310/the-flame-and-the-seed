/**
 * HillScene (preset: charge-hill, labelled) - blk-l01-02-04-s03 (explain). The
 * charge board running by itself, with the words laid on it: opposites fall
 * together, likes fly apart, the name (electrical potential energy), the rule,
 * and three things it explains.
 *
 * Beats (five paragraphs, splitSteps() counts 5):
 *   0 Opposites - pulled apart: high; let go: they fall together, low.
 *   1 Likes     - pushed together: high; let go: they fly apart, downhill.
 *   2 Name      - electrical potential energy; the Earth made the marble's slope,
 *                 the charges make this one.
 *   3 Rule      - opposites near each other are low; closer is downhill.
 *   4 Keep it   - a spark, iron taking oxygen, the seed holding together.
 *
 * Canvas: continuous rolling on a live landscape; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, darken, alpha, lighten, drawHillBackdrop, drawCard, ChargeRail, RAIL, drawCharge,
  drawMarble, blob,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_OPP = 0, S_LIKE = 1, S_NAME = 2, S_RULE = 3, S_KEEP = 4;
const HOLD = 1.4, REST = 1.6, BACK = 1.0;

export class HillSceneChargeHillLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'Two opposite charges pulled apart sit high on the Hill; let go, they fall together and sit low. Two like ' +
    'charges pushed together sit high; let go, they fly apart, downhill. The stored energy is electrical potential ' +
    'energy, a slope made by the charges themselves. It explains a spark, iron taking oxygen, and the seed holding together.';

  constructor(container, config) {
    super(container, config);
    this._rail = new ChargeRail();
    this._phase = 'hold';
    this._t = 0;
    this._from = 0;
    this._to = 0;
  }

  enter(stage) {
    const r = this._rail;
    r.clear();
    if (stage === S_LIKE) { r.add(1, 280); r.add(1, 340); this._to = 340; }
    else { r.add(1, 230); r.add(-1, 500); this._to = 500; }
    this._phase = 'hold';
    this._t = 0;
  }

  update(d) {
    const r = this._rail;
    r.step(d);
    if (this.stage === S_NAME || this.stage === S_KEEP) return;
    this._t += d;
    const me = r.q[r.sel];
    if (this._phase === 'hold' && this._t > HOLD) { r.release(); this._phase = 'roll'; this._t = 0; }
    else if (this._phase === 'roll' && !r.moving && r.click && this._t > 0.2) { this._phase = 'rest'; this._t = 0; }
    else if (this._phase === 'rest' && this._t > REST) { this._phase = 'back'; this._t = 0; this._from = me.x; r.click = null; }
    else if (this._phase === 'back') {
      const u = Math.min(1, this._t / BACK);
      me.x = this._from + (this._to - this._from) * (u * u * (3 - 2 * u));
      if (u >= 1) { this._phase = 'hold'; this._t = 0; }
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const r = this._rail, st = this.stage;
    r.draw(ctx, c, t);
    const me = r.q[r.sel];
    const hy = r.hillY(me.x) - 16;
    const high = this._phase === 'hold' || this._phase === 'back';
    const low = this._phase === 'rest';
    const bx = Math.max(120, Math.min(560, me.x));
    if (st === S_OPP || st === S_RULE) {
      if (high) pill(ctx, c, 'pulled apart: high', bx, hy - 36, { bg: c.s1, size: 15 });
      if (low) pill(ctx, c, 'close together: low', bx + 40, hy - 36, { bg: c.good, size: 15 });
      if (this._phase === 'roll') pill(ctx, c, 'they fall together', bx, hy - 36, { bg: c.s2, size: 15 });
    }
    if (st === S_LIKE) {
      if (high) pill(ctx, c, 'pushed together: high', bx, Math.max(236, hy - 36), { bg: c.s6, size: 15 });
      if (this._phase === 'roll' || low) pill(ctx, c, 'they fly apart: downhill', Math.min(520, bx), hy - 36, { bg: c.s2, size: 15 });
    }
    if (st === S_NAME) {
      pill(ctx, c, 'electrical potential energy', bx, hy - 36, { bg: c.s1, size: 15 });
      this._drawSlopes(ctx, c);
    }
    if (st === S_RULE) {
      const p = popAt(this.age, 0.4);
      if (p) pill(ctx, c, 'closer is downhill: it happens by itself', 340, 30, { bg: c.accent, size: 15, ...p });
    }
    if (st === S_KEEP) this._drawKeep(ctx, c, t);
  }

  /** Two small cards: the Earth made the marble's slope; the charges make their own. */
  _drawSlopes(ctx, c) {
    const cards = [
      { x: 40, at: 0.4, head: 'the Earth made this slope' },
      { x: 350, at: 1.0, head: 'the charges make this one' },
    ];
    for (const k of cards) {
      const p = popAt(this.age, k.at);
      if (!p) continue;
      const y = 400, w = 290, h = 56;
      ctx.save();
      ctx.globalAlpha *= p.alpha;
      drawCard(ctx, c, k.x, y, w, h);
      if (k.x < 200) {
        ctx.beginPath();
        ctx.moveTo(k.x + 14, y + 44);
        ctx.lineTo(k.x + 54, y + 44);
        ctx.lineTo(k.x + 14, y + 16);
        ctx.closePath();
        ctx.fillStyle = c.s3;
        ctx.fill();
        drawMarble(ctx, c, k.x + 30, y + 20, 8, c.s4, {});
      } else {
        drawCharge(ctx, c, k.x + 22, y + 28, 10, 1);
        drawCharge(ctx, c, k.x + 46, y + 28, 10, -1);
      }
      ctx.restore();
      pill(ctx, c, k.head, k.x + 64, y + 28, { bg: c.labelMuted, size: 14, align: 'left', alpha: p.alpha });
    }
  }

  /** Three things the sentence explains. */
  _drawKeep(ctx, c, t) {
    const items = [
      { head: 'a spark jumps', at: 0.3, icon: (x, y) => this._spark(ctx, c, x, y, t) },
      { head: 'iron took oxygen', at: 0.9, icon: (x, y) => this._iron(ctx, c, x, y) },
      { head: 'the seed holds together', at: 1.5, icon: (x, y) => this._seed(ctx, c, x, y, t) },
    ];
    ctx.fillStyle = alpha(c.bgDeep, 0.55);
    ctx.fillRect(0, RAIL.HILL_TOP - 6, 680, 340);
    items.forEach((k, i) => {
      const p = popAt(this.age, k.at);
      if (!p) return;
      const x = 30 + i * 212, y = 232, w = 196, h = 200;
      ctx.save();
      ctx.globalAlpha *= p.alpha;
      drawCard(ctx, c, x, y, w, h);
      k.icon(x + w / 2, y + 82);
      ctx.restore();
      pill(ctx, c, k.head, x + w / 2, y + h - 30, { bg: [c.warning, c.s6, c.mold][i], size: 14, alpha: p.alpha });
    });
    pill(ctx, c, 'opposites pull together', 340, 30, { bg: c.accent, size: 15 });
  }

  _spark(ctx, c, x, y, t) {
    drawCharge(ctx, c, x - 50, y, 14, 1);
    drawCharge(ctx, c, x + 50, y, 14, -1);
    const f = Math.sin(t * 20) > 0;
    ctx.strokeStyle = f ? c.warning : lighten(c.warning, 0.4);
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 32, y);
    ctx.lineTo(x - 12, y - 16);
    ctx.lineTo(x - 2, y + 10);
    ctx.lineTo(x + 14, y - 12);
    ctx.lineTo(x + 32, y);
    ctx.stroke();
  }

  _iron(ctx, c, x, y) {
    const rust = darken(c.flame, 0.35);
    rr(ctx, x - 50, y - 18, 100, 40, 8);
    ctx.fillStyle = c.waste;
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(x - 38 + i * 15, y - 16 + (i % 2) * 6, 7, 0, Math.PI * 2);
      ctx.fillStyle = rust;
      ctx.fill();
    }
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x - 20 + i * 20, y - 40 - (i % 2) * 8, 6, 0, Math.PI * 2);
      ctx.fillStyle = c.s1;
      ctx.fill();
    }
  }

  _seed(ctx, c, x, y, t) {
    blob(ctx, x, y + 4, 44, 30, 8, 0.05, 1.2);
    ctx.fillStyle = darken(c.mold, 0.35);
    ctx.fill();
    blob(ctx, x, y, 44, 30, 8, 0.05, 1.2);
    ctx.fillStyle = c.mold;
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      const a = t * 0.8 + (i * Math.PI) / 2;
      drawCharge(ctx, c, x + Math.cos(a) * 20, y + Math.sin(a) * 10, 6, i % 2 ? 1 : -1);
    }
  }
}
