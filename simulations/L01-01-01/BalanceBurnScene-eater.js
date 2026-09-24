/**
 * BalanceBurnScene-eater - blk-l01-01-01-s06 (what-if). Kabir's rule, "the
 * flame eats", run on a sealed jar with a candle in it, on Ajji's balance.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - our world, candle in a sealed jar on the balance; predict the reading.
 *   1 run   - the learner turns the dial and burns: in Kabir's world every burn makes the
 *             sealed jar lighter and flags "mass left the world"; a hundred burns empty it.
 *             In our world the reading never moves.
 *   2 nails - back in our world; the Ledger gets its first rule. The dial stays live.
 *
 * Canvas: the flame, the gas filling the jar and the draining reading are
 * continuous motion; labels are chips only.
 */
import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import { clamp01 } from 'simulations/base/SimMotion.js';
import {
  W, H, loadColors, alpha, darken, font, rr, pill, popAt, sparkle, Burst,
  drawWall, drawShelf, drawCard, JAR_MASS, AIR_MASS, grams, drawBalance, drawTile,
  drawCandle, jarBox, drawJar, Air,
} from './BurnKit.js';

const STEP_SETUP = 0;
const STEP_RUN = 1;
const STEP_NAILS = 2;

const BEAT_STEP_MAP = [
  [{ idx: STEP_SETUP, dwellMs: null }],
  [{ idx: STEP_RUN, dwellMs: null }],
  [{ idx: STEP_NAILS, dwellMs: null }],
];

const BX = 230;
const PY = 380;
const JAR = jarBox(BX, PY, 210, 240);
const WAX = 19.8;                     // candle: with 1.2 g of air, 21.0 g inside the jar
const EAT = (WAX + AIR_MASS) / 100;   // Kabir's world: each burn eats this much, so 100 burns empty the jar
const BURN_S = 1.2;
const HUNDRED_S = 5;

export class BalanceBurnSceneEater extends CanvasSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  static ARIA_LABEL =
    'A candle in a sealed jar on a balance. In our world the reading stays the same however often the candle ' +
    'burns: the wax becomes gas that stays in the jar. With the "flames eat" dial on, every burn makes the sealed ' +
    'jar lighter, a hundred burns leave it empty, and each run is flagged: mass left the world.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Flames eat: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Flames eat: ON', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'burn', label: 'Burn once' },
    { type: 'button', id: 'hundred', label: 'Burn 100 times' },
  ];

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;
    this.colors = null;
    this.mode = 'off';                // read by the host to highlight the active dial button
    this._step = -1;
    this._age = 0;
    this._fade = 1;
    this._clock = 0;
    this._burst = new Burst();
    this._dialled = false;
    this._reset();
  }

  async setup() {
    await super.setup();
    this._reloadColors();
    this._enterStep(STEP_SETUP);
    this._drawInitialFrame(this._ctx);
  }

  _reloadColors() {
    this.colors = loadColors(this.container);
  }

  // -- Beats and controls ----------------------------------------------------------------

  onBeatChange(beatIndex) {
    const b = Math.max(0, Math.min(BEAT_STEP_MAP.length - 1, beatIndex | 0));
    const step = BEAT_STEP_MAP[b][0].idx;
    if (step !== this._step) this._enterStep(step);
    this.requestUiUpdate?.();
  }

  isControlHidden() {
    return this._step === STEP_SETUP;
  }

  isControlDisabled(id) {
    if (id === 'off' || id === 'on') return this._queue > 0;
    return this._queue > 0 || this._empty();
  }

  onControlChange(id) {
    if (this.isControlHidden(id) || this.isControlDisabled(id)) return;
    if (id === 'off' || id === 'on') {
      this._dialled = true;
      this.mode = id;
      this._reset();
    } else if (id === 'burn') {
      this._queue = 1;
      this._fast = false;
    } else if (id === 'hundred') {
      this._queue = 100;
      this._fast = true;
    }
    this.requestUiUpdate?.();
  }

  // -- State --------------------------------------------------------------------------------

  _enterStep(step) {
    this._step = step;
    this._age = 0;
    this._fade = 0;
    this.mode = 'off';
    this._reset();
    this.requestUiUpdate?.();
  }

  _reset() {
    this._wax = WAX;
    this._air = AIR_MASS;
    this._gas = 0;
    this._burns = 0;
    this._queue = 0;
    this._fast = false;
    this._burnAge = 0;
    this._log = [];
    this._eaten = 0;
    this._flagAge = -1;
    this._airDots = new Air(81, 24, JAR);
  }

  _empty() {
    return this.mode === 'on' && this._wax + this._air <= 1e-6;
  }

  /** Inside the jar (grams): wax + air + gas, all of which the balance weighs. */
  _reading() {
    return JAR_MASS + this._wax + this._air + this._gas;
  }

  /** One burn's bookkeeping. Our world: wax becomes gas that stays. Kabir's: it is gone. */
  _oneBurn() {
    this._burns++;
    const take = Math.min(EAT, this._wax);
    if (this.mode === 'on') {
      const rest = EAT - take;
      this._wax -= take;
      this._air = Math.max(0, this._air - rest);
      this._eaten += EAT;
      this._flagAge = 0;
      if (!this._fast) this._log.push({ n: this._burns, d: -EAT });
      // The eaten air takes its dots with it.
      const keep = Math.round(24 * (this._air / AIR_MASS));
      this._airDots.dots = this._airDots.dots.filter((q) => q.gas).concat(this._airDots.dots.filter((q) => !q.gas).slice(0, keep));
      this._airDots.dots = this._airDots.dots.filter((q) => !q.gas || Math.random() < 0.97);
    } else {
      this._wax -= take;
      this._gas += take;
      if (!this._fast) this._log.push({ n: this._burns, d: 0 });
    }
    if (this._log.length > 6) this._log.shift();
  }

  // -- Frame -----------------------------------------------------------------------------------

  _tick(ctx, dt) {
    if (!this.colors) return;
    const d = Math.max(0, Math.min(dt, 0.05));   // the first frame can report a negative dt
    this._clock += d;
    this._age += d;
    this._fade = Math.min(1, this._fade + d / 0.35);
    if (this._queue > 0) {
      this._burnAge += d;
      const per = this._fast ? HUNDRED_S / 100 : BURN_S;
      while (this._burnAge >= per && this._queue > 0 && !this._empty()) {
        this._burnAge -= per;
        this._queue--;
        this._oneBurn();
      }
      if (this._empty()) this._queue = 0;
      if (this._queue === 0) {
        this._burnAge = 0;
        if (this._fast) {
          this._log.push({ n: this._burns, d: this.mode === 'on' ? -this._eaten : 0, sum: true });
          if (this._log.length > 6) this._log.shift();
          if (this.mode === 'off') {
            const c = this.colors;
            this._burst.fire(BX, JAR.y0, [c.s1, c.s2, c.s3, c.s4, c.s5], 26);
          }
        }
        this._fast = false;
        this.requestUiUpdate?.();
      }
    }
    if (this._flagAge >= 0) this._flagAge += d;
    const lit = this._queue > 0 && this._wax > 0;
    if (lit && Math.random() < d * (this._fast ? 3 : 8) && this.mode === 'off') {
      this._airDots.emit(BX, PY - 4 - (26 + 70 * (this._wax / WAX)) - 26, 1);
    }
    this._airDots.update(d, this._clock, JAR, null);
    this._burst.update(d);
    this._draw(ctx);
  }

  _drawInitialFrame(ctx) {
    if (this.colors) this._draw(ctx);
  }

  _draw(ctx) {
    const c = this.colors;
    const t = this._clock;
    const eater = this.mode === 'on';
    ctx.clearRect(0, 0, W, H);
    drawWall(ctx, c);
    drawShelf(ctx, c, 10, 460, PY + 80);

    const flagging = eater && this._flagAge >= 0 && this._flagAge < 0.5;
    drawBalance(ctx, c, BX, PY, this._reading(), { flash: flagging ? c.bad : null });
    drawTile(ctx, c, BX, PY, 150);
    if (this._wax > 0.01) {
      drawCandle(ctx, c, BX, PY - 4, this._wax / WAX, this._queue > 0 ? 1 : 0, t);
    }
    this._airDots.draw(ctx, c);
    drawJar(ctx, c, JAR, eater ? 0 : clamp01(this._gas / WAX) * 0.8);

    pill(ctx, c, eater ? 'Kabir\'s world: flames eat' : 'our world', 20, 32, { bg: eater ? c.bad : c.good, size: 16, align: 'left' });
    pill(ctx, c, 'sealed jar', BX, JAR.y0 - 22, { bg: c.labelMuted, size: 15 });

    if (this._step === STEP_SETUP) {
      const p = popAt(this._age, 0.5);
      if (p) pill(ctx, c, 'after the burn: ?', BX, 500, { bg: c.warning, size: 16, ...p });
    }
    if (this._step === STEP_RUN && !this._dialled && this._burns === 0) {
      pill(ctx, c, 'turn the dial, then burn', BX, 500, { bg: c.accent, size: 16, scale: 1 + 0.05 * Math.sin(t * 5) });
    }
    if (eater && this._flagAge >= 0) {
      const p = popAt(this._flagAge, 0) || { scale: 1, alpha: 1 };
      pill(ctx, c, this._empty() ? 'jar empty: 21.0 g gone' : 'mass left the world!', BX, 78, { bg: c.bad, size: 17, scale: this._fast ? 1 : p.scale });
    } else if (!eater && this._burns > 0) {
      pill(ctx, c, 'no change', BX, 78, { bg: c.good, size: 17 });
    }
    if (this._fast && this._queue > 0) pill(ctx, c, `burn ${this._burns}`, 380, 32, { bg: c.flame, size: 15 });

    if (this._step === STEP_NAILS) this._drawLedger(ctx);
    else this._drawLog(ctx);
    this._burst.draw(ctx);
    if (this._fade < 1) {
      ctx.fillStyle = alpha(c.bgDeep, 1 - this._fade);
      ctx.fillRect(0, 0, W, H);
    }
  }

  _drawLog(ctx) {
    const c = this.colors;
    const x = 468, y = 52, w = 200, h = 400;
    drawCard(ctx, c, x, y, w, h);
    pill(ctx, c, 'runs', x + 12, y, { bg: c.labelMuted, size: 14, align: 'left' });
    this._log.forEach((r, i) => {
      const ry = y + 42 + i * 58;
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 15);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const label = r.sum ? `${r.n} burns` : `burn ${r.n}`;
      ctx.fillText(`${label}: ${r.d === 0 ? '\u00b10.0' : r.d.toFixed(1)} g`, x + 12, ry);
      const flag = r.d < 0;
      pill(ctx, c, flag ? 'mass left the world' : 'same mass', x + 12, ry + 24, { bg: flag ? c.bad : c.good, size: 14, align: 'left' });
    });
  }

  _drawLedger(ctx) {
    const c = this.colors;
    const x = 468, y = 70, w = 200, h = 250;
    const k = popAt(this._age, 0.4);
    if (!k) return;
    ctx.save();
    ctx.globalAlpha *= k.alpha;
    rr(ctx, x, y + 5, w, h, 11);
    ctx.fillStyle = darken(c.bgSurface, 0.35);
    ctx.fill();
    rr(ctx, x, y, w, h, 11);
    ctx.fillStyle = c.bgSurface;
    ctx.fill();
    ctx.strokeStyle = c.warning;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = alpha(c.s1, 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { ctx.moveTo(x + 12, y + 104 + i * 36); ctx.lineTo(x + w - 12, y + 104 + i * 36); }
    ctx.stroke();
    ctx.fillStyle = c.label;
    ctx.font = font(c, 700, 20, true);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('1. Mass is', x + 16, y + 56);
    ctx.fillText('conserved.', x + 36, y + 86);
    ctx.restore();
    pill(ctx, c, 'the Ledger', x + 12, y, { bg: c.warning, size: 14, align: 'left' });
    ['cooking', 'burning', 'rusting'].forEach((txt, i) => {
      const p = popAt(this._age, 1.0 + i * 0.25);
      if (p) pill(ctx, c, `${txt}: weighable`, x + w / 2, y + h + 44 + i * 42, { bg: c.good, size: 14, ...p });
    });
    const s = popAt(this._age, 0.9);
    if (s && this._age < 2) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + this._age;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - (this._age - 0.9) / 1.1);
        sparkle(ctx, x + w / 2 + Math.cos(a) * 120, y + h / 2 + Math.sin(a) * 140, 7, c.warning);
        ctx.restore();
      }
    }
  }
}
