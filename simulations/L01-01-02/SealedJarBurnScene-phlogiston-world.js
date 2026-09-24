/**
 * SealedJarBurnScene-phlogiston-world - blk-l01-01-02-s05 (what-if). Run
 * Lavoisier's sealed jar in a world where burning really releases phlogiston,
 * a fire-stuff with mass.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - the sealed jar of tin on the balance; predict its reading.
 *   1 run   - the learner turns the dial and runs. Phlogiston on: the tin gets lighter,
 *             the jar's air heavier by the same, the sealed total stays; opened, air
 *             rushes OUT. Every result is flagged against what was really measured.
 *   2 nails - back in the real world: the direction of one number decides. The dial
 *             stays live.
 *
 * Canvas, driving the shared Apparatus; labels are chips only.
 */
import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import {
  W, H, loadColors, alpha, font, pill, popAt, Burst,
  drawWall, drawShelf, drawCard, grams, Apparatus, METAL_G, JAR_G, AIR_G, LAYOUT,
} from './LavoisierKit.js';

const STEP_SETUP = 0;
const STEP_RUN = 1;
const STEP_NAILS = 2;

const BEAT_STEP_MAP = [
  [{ idx: STEP_SETUP, dwellMs: null }],
  [{ idx: STEP_RUN, dwellMs: null }],
  [{ idx: STEP_NAILS, dwellMs: null }],
];
const PX = 388, PW = 280;
const TOTAL = JAR_G + AIR_G + METAL_G;

export class SealedJarBurnScenePhlogistonWorld extends CanvasSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  static ARIA_LABEL =
    'A sealed jar of tin on a balance, heated. With phlogiston physics on, fire-stuff leaves the tin: the tin ' +
    'gets lighter, the air in the jar heavier by the same, the sealed total unchanged, and when the jar is opened ' +
    'air rushes out. Every real measurement went the other way: the tin got heavier and air rushed in.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Phlogiston physics: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Phlogiston physics: ON', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'run', label: 'Run the burn' },
  ];

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;
    this.colors = null;
    this.mode = 'off';                 // read by the host to highlight the active dial button
    this._step = -1;
    this._age = 0;
    this._fade = 1;
    this._clock = 0;
    this._app = new Apparatus(41);
    this._log = [];
    this._doneAge = -1;
    this._dialled = false;
    this._burst = new Burst();
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

  onBeatChange(beatIndex) {
    const b = Math.max(0, Math.min(BEAT_STEP_MAP.length - 1, beatIndex | 0));
    const step = BEAT_STEP_MAP[b][0].idx;
    if (step !== this._step) this._enterStep(step);
    this.requestUiUpdate?.();
  }

  isControlHidden() {
    return this._step === STEP_SETUP;
  }

  isControlDisabled() {
    return this._app.busy;
  }

  onControlChange(id) {
    if (this.isControlHidden(id) || this.isControlDisabled(id)) return;
    if (id === 'off' || id === 'on') {
      this.mode = id;
      this._dialled = true;
      this._app.reset();
      this._log = [];
      this._doneAge = -1;
    } else if (id === 'run') {
      this._app.physics = this.mode === 'on' ? 'phlogiston' : 'oxygen';
      this._app.run();
      this._log = [];
      this._doneAge = -1;
    }
    this.requestUiUpdate?.();
  }

  _enterStep(step) {
    this._step = step;
    this._age = 0;
    this._fade = 0;
    this.mode = 'off';
    this._app.physics = 'oxygen';
    this._app.reset();
    this._log = [];
    this._doneAge = -1;
    this.requestUiUpdate?.();
  }

  _tick(ctx, dt) {
    if (!this.colors) return;
    const d = Math.max(0, Math.min(dt, 0.05));   // the first frame can report a negative dt
    this._clock += d;
    this._age += d;
    this._fade = Math.min(1, this._fade + d / 0.35);
    const app = this._app;
    const ended = app.update(d, this._clock);
    const phlog = app.physics === 'phlogiston';
    if (ended === 'heat') this._log.push({ text: `sealed jar: ${grams(TOTAL)} \u2192 ${grams(app.mainReading())}`, real: true });
    if (ended === 'open') this._log.push({ text: phlog ? 'opened: air rushed OUT' : 'opened: air rushed in', real: !phlog });
    if (app.done && this._doneAge < 0) {
      this._log.push({ text: `tin alone: ${grams(METAL_G)} \u2192 ${grams(app.metalMass())}`, real: !phlog });
      this._doneAge = 0;
      if (!phlog) {
        const c = this.colors;
        this._burst.fire(LAYOUT.MAIN.x, LAYOUT.MAIN.py - 60, [c.s1, c.s2, c.s3, c.s4, c.s5], 24);
      }
      this.requestUiUpdate?.();
    }
    if (this._doneAge >= 0) this._doneAge += d;
    this._burst.update(d);
    this._draw(ctx);
  }

  _drawInitialFrame(ctx) {
    if (this.colors) this._draw(ctx);
  }

  _draw(ctx) {
    const c = this.colors;
    const t = this._clock;
    const on = this.mode === 'on';
    ctx.clearRect(0, 0, W, H);
    drawWall(ctx, c);
    drawShelf(ctx, c, 10, 372, LAYOUT.MAIN.py + 80);
    this._app.draw(ctx, c, t);
    pill(ctx, c, on ? 'phlogiston world' : 'our world', 16, 30, { bg: on ? c.flame : c.good, size: 16, align: 'left' });
    if (this._app.busy) {
      pill(ctx, c, { weigh: 'weigh', heat: 'heat', open: 'open the jar', alone: 'weigh the tin alone' }[this._app.phase], 190, 70, { bg: c.flame, size: 15 });
    }
    if (this._step === STEP_SETUP) {
      const p = popAt(this._age, 0.5);
      if (p) pill(ctx, c, 'sealed jar after heating: ?', 190, 70, { bg: c.warning, size: 15, ...p });
    }
    if (this._step === STEP_RUN && !this._dialled && !this._app.busy && !this._app.done) {
      pill(ctx, c, 'turn the dial, then run', 190, 70, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
    }
    if (this._step === STEP_NAILS) this._drawNails(ctx);
    else this._drawLog(ctx);
    this._burst.draw(ctx);
    if (this._fade < 1) {
      ctx.fillStyle = alpha(c.bgDeep, 1 - this._fade);
      ctx.fillRect(0, 0, W, H);
    }
  }

  _drawLog(ctx) {
    const c = this.colors;
    const x = PX, y = 52, h = 330;
    drawCard(ctx, c, x, y, PW, h);
    pill(ctx, c, 'the balance says', x + 12, y, { bg: c.labelMuted, size: 14, align: 'left' });
    this._log.forEach((r, i) => {
      const ry = y + 42 + i * 72;
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 15);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.text, x + 16, ry);
      const tag = i === 0 ? 'same in both worlds' : r.real ? 'what was measured' : 'the other way round!';
      pill(ctx, c, tag, x + 16, ry + 26, { bg: i === 0 ? c.labelMuted : r.real ? c.good : c.bad, size: 14, align: 'left' });
    });
    if (this._doneAge >= 0 && this.mode === 'on') {
      const p = popAt(this._doneAge, 0.3);
      if (p) pill(ctx, c, 'every real measurement: the other way', x + PW / 2, y + h + 40, { bg: c.bad, size: 14, ...p });
    }
  }

  _drawNails(ctx) {
    const c = this.colors;
    const a = this._age;
    const cards = [
      { head: 'tin, measured', val: 'heavier \u2191', col: c.s1, mark: '\u2713', markCol: c.good, at: 0.3 },
      { head: 'tin, phlogiston', val: 'lighter \u2193', col: c.flame, mark: '\u2717', markCol: c.bad, at: 0.8 },
    ];
    cards.forEach((k, i) => {
      const p = popAt(a, k.at);
      if (!p) return;
      const x = PX, y = 52 + i * 150, w = PW, h = 130;
      ctx.save();
      ctx.globalAlpha *= p.alpha;
      drawCard(ctx, c, x, y, w, h);
      ctx.fillStyle = c.labelMuted;
      ctx.font = font(c, 700, 16);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(k.head, x + 18, y + 30);
      ctx.fillStyle = k.col;
      ctx.font = font(c, 700, 30, true);
      ctx.fillText(k.val, x + 18, y + 78);
      ctx.restore();
      pill(ctx, c, k.mark, x + w - 20, y + 78, { bg: k.markCol, size: 18, align: 'right', ...p });
    });
    const p = popAt(a, 1.5);
    if (p) pill(ctx, c, 'one number\'s direction decides', PX + PW / 2, 380, { bg: c.accent, size: 15, ...p });
    const p2 = popAt(a, 2.0);
    if (p2) pill(ctx, c, 'every reaction: on this balance', PX + PW / 2, 430, { bg: c.labelMuted, size: 15, ...p2 });
  }
}
