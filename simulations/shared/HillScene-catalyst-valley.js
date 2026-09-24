/**
 * HillScene (preset: catalyst-valley) - blk-l03-06-03-s03 (what-if). Unlock the
 * valley mover: the catalyst now lowers the products' valley as well as the
 * hump. Forward with the catalyst pays out more than the fall; back without it
 * costs only the original. Cycle it: the total-energy counter climbs for ever.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - the honest loop: out 98, in 98, net zero; predict.
 *   1 run   - the dial; each cycle nets energy from nowhere; the counter climbs.
 *   2 nails - a catalyst can only touch the hump.
 *
 * Canvas: one marble cycling over a changing Hill; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, drawHillBackdrop, drawHand, drawMarble, drawRunLog, ReactionHill, Marble, CATALYST, G, PX_PER_K,
} from './HillKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;
const DROP = 1000, EXTRA = 408;          // model units; 1000 = 98 kJ
const KJ = 98 / DROP;

export class HillSceneCatalystValley extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A reaction cycled forward with a catalyst and back without it. Honestly, forward pays out 98 kilojoules and ' +
    'backward costs 98, so the loop nets nothing. With the valley mover on, the catalyst also lowers the products, ' +
    'forward pays out more than backward costs, and the energy counter climbs without limit: energy from nothing.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Valley mover: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Valley mover: ON', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._hill = new ReactionHill({ hump: CATALYST.lots, drop: DROP });
    this._m = new Marble(this._hill, this._hill.xa - 60, 12);
    this._phase = 'wait';
    this._t = 0;
    this._total = 0;
    this._cycle = { out: 0, cost: 0 };
    this._log = [];
    this._handY = 0;          // 0 pressing, 1 lifted away
    this._dialled = false;
  }

  enter(stage) {
    this.mode = 'off';
    this._dialled = stage !== S_RUN;
    this._reset();
  }

  _reset() {
    this._total = 0;
    this._log = [];
    this._phase = 'wait';
    this._t = 0;
    this._catalyst(true);
    this._m.place(this._hill.xa - 60);
  }

  _catalyst(on) {
    this._cat = on;
    const extra = on && this.mode === 'on' ? EXTRA : 0;
    this._hill.set(on ? CATALYST.lots : CATALYST.none, DROP + extra);
  }

  isControlHidden() {
    return this.stage === S_SETUP;
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'on' || id === 'off') {
      this.mode = id;
      this._dialled = true;
      this._reset();
    }
    this.requestUiUpdate?.();
  }

  update(d) {
    const hill = this._hill, m = this._m;
    this._t += d;
    this._handY += ((this._cat ? 0 : 1) - this._handY) * Math.min(1, d * 6);
    if (!this._dialled) return;
    if (this._phase === 'wait' && this._t > 0.8) {
      // Forward, with the catalyst.
      this._catalyst(true);
      m.launch(hill.xa - 60, Math.sqrt(2 * G * (hill.hump + 150) * PX_PER_K));
      this._cycle = { out: hill.drop * KJ, cost: 0 };
      this._phase = 'fwd';
    } else if (this._phase === 'fwd') {
      m.step(d * 1.5);
      if (m.x > hill.xb + 50) { m.moving = false; this._phase = 'swap'; this._t = 0; }
    } else if (this._phase === 'swap' && this._t > 0.7) {
      // Take the catalyst away; the products are back where they always were.
      this._catalyst(false);
      m.place(m.x);
      this._phase = 'lift';
      this._t = 0;
    } else if (this._phase === 'lift' && this._t > 0.7) {
      // Backward without it: costs the original fall.
      m.launch(m.x, -Math.sqrt(2 * G * (hill.hump + hill.drop + 150) * PX_PER_K));
      this._cycle.cost = DROP * KJ;
      this._phase = 'back';
    } else if (this._phase === 'back') {
      m.step(d * 1.5);
      if (m.x < hill.xa - 40) {
        m.moving = false;
        const net = this._cycle.out - this._cycle.cost;
        this._total += net;
        this._log.push({ text: `out ${this._cycle.out.toFixed(0)}, in ${this._cycle.cost.toFixed(0)} kJ`, n: `${net >= 0 ? '+' : ''}${net.toFixed(0)}`, col: net > 0.5 ? this.colors.bad : this.colors.label });
        if (this._log.length > 4) this._log.shift();
        if (net > 0.5) this.celebrate(120, 240, 10);
        this._phase = 'wait';
        this._t = 0;
      }
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const hill = this._hill, m = this._m, st = this.stage;
    hill.draw(ctx, c, { ghostHump: this._cat ? CATALYST.none : null });
    if (this.mode === 'on' && this._cat) {
      pill(ctx, c, 'valley pushed down', 560, hill.yR + hill.dPx + 30, { bg: c.bad, size: 14 });
    }
    const top = hill.yR - hill.hPx;
    drawHand(ctx, c, hill.xp, top - 4 - this._handY * 160, 0.8);
    pill(ctx, c, 'reactants', 110, hill.yR - 26, { bg: c.s1, size: 14 });
    drawMarble(ctx, c, m.x, hill.y(m.x) - m.r, m.r, c.s4, { spin: m.spin, face: !m.moving });
    const phase = { fwd: 'forward, with catalyst', swap: 'forward, with catalyst', lift: 'catalyst removed', back: 'back, without catalyst' }[this._phase];
    if (phase) pill(ctx, c, phase, 664, 30, { bg: this._cat ? c.s5 : c.labelMuted, size: 14, align: 'right' });
    drawRunLog(ctx, c, 16, 14, 250, 'each loop (net)', this._log);
    const on = this._total > 0.5;
    pill(ctx, c, `total made: ${on ? '+' : ''}${this._total.toFixed(0)} kJ`, 664, 66, { bg: on ? c.bad : c.good, size: 15, align: 'right', scale: on ? 1 + 0.04 * Math.sin(t * 6) : 1 });
    if (on) pill(ctx, c, 'energy made from nothing!', 664, 102, { bg: c.bad, size: 14, align: 'right' });
    if (st === S_SETUP) {
      const p = popAt(this.age, 1.0);
      if (p) pill(ctx, c, 'predict: if a catalyst moved the valley?', 340, 490, { bg: c.accent, size: 15, ...p });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the dial', 340, 490, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_NAILS) {
      const p = popAt(this.age, 0.6);
      if (p) pill(ctx, c, 'a catalyst only touches the hump', 340, 490, { bg: c.good, size: 15, ...p });
    }
  }
}
