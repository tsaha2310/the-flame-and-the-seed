/**
 * SealedJarBurnScene - blk-l01-01-02-s02 (observe, history replay). Pick a
 * theory, see what it predicts, then run Lavoisier's 1774 sealed-jar burn:
 * weigh the jar, heat the metal, open the jar, weigh the metal alone.
 *
 * Beats (the slide's six paragraphs, splitSteps() counts 6):
 *   0 Lens card    - burns sped up 100x; oxygen drawn blue; a modern balance.
 *   1 Pick a side  - theory dial; the Lens shows your pick's prediction on the bench.
 *   2 Phlogiston   - its prediction: the metal loses fire-stuff, so it gets lighter.
 *   3 Oxygen       - its prediction: air joins the metal, so it gets heavier and the
 *                    sealed air loses exactly that much.
 *   4 Run it       - Run: tin in a sealed jar; the four numbers go in the log; the
 *                    verdict is checked against your pick.
 *   5 All three    - metal and jar dials: tin, mercury, iron; open or sealed.
 *
 * Canvas: sunlight through the burning lens, oxygen joining the metal and air
 * rushing in are continuous motion; labels are chips only.
 */
import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import {
  W, H, loadColors, alpha, mix, darken, font, rr, pill, popAt, Burst,
  drawWall, drawShelf, drawCard, drawLensCard, drawClockIcon, grams,
  Apparatus, METALS, METAL_G, SHIFT_G, LAYOUT,
} from './LavoisierKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
  [{ idx: 5, dwellMs: null }],
];
const S_LENS = 0, S_PICK = 1, S_PHLOG = 2, S_OXY = 3, S_RUN = 4, S_ALL = 5;
const PX = 388, PW = 280;           // right column

export class SealedJarBurnScene extends CanvasSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  static ARIA_LABEL =
    'Lavoisier\'s sealed-jar burn. Pick phlogiston or oxygen to see its prediction: phlogiston says the metal ' +
    'gets lighter; oxygen says it gets heavier and the sealed air loses the same amount. Run it: the sealed jar ' +
    'weighs the same before and after, air rushes in when it is opened, and the tin alone is 0.3 grams heavier. ' +
    'Tin, mercury and iron all do the same.';

  static CONTROLS = [
    { type: 'select', id: 'theory', label: 'Theory:', options: [
      { value: 'phlogiston', label: 'phlogiston' }, { value: 'oxygen', label: 'oxygen' },
    ] },
    { type: 'select', id: 'metal', label: 'Metal:', options: [
      { value: 'tin', label: 'tin' }, { value: 'mercury', label: 'mercury' }, { value: 'iron', label: 'iron' },
    ] },
    { type: 'select', id: 'jar', label: 'Jar:', options: [
      { value: 'sealed', label: 'sealed' }, { value: 'open', label: 'open' },
    ] },
    { type: 'button', id: 'run', label: 'Run the burn' },
  ];

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;
    this.colors = null;
    this._stage = -1;
    this._age = 0;
    this._fade = 1;
    this._clock = 0;
    this._theory = 'phlogiston';
    this._app = new Apparatus(21);
    this._log = [];
    this._metals = {};
    this._verdictAge = -1;
    this._shown = null;
    this._pop = 0;
    this._burst = new Burst();
    this._onPointerUp = this._handlePointerUp.bind(this);
  }

  async setup() {
    await super.setup();
    this._reloadColors();
    this._canvas.addEventListener('pointerup', this._onPointerUp);
    this._enterStage(S_LENS);
    this._drawInitialFrame(this._ctx);
  }

  destroy() {
    if (this._canvas) this._canvas.removeEventListener('pointerup', this._onPointerUp);
    super.destroy();
  }

  _reloadColors() {
    this.colors = loadColors(this.container);
  }

  // -- Beats and controls ----------------------------------------------------------------

  onBeatChange(beatIndex) {
    const b = Math.max(0, Math.min(BEAT_STEP_MAP.length - 1, beatIndex | 0));
    const stage = BEAT_STEP_MAP[b][0].idx;
    if (stage !== this._stage) this._enterStage(stage);
    this.requestUiUpdate?.();
  }

  isControlHidden(id) {
    if (id === 'theory') return this._stage < S_PICK;
    if (id === 'run') return this._stage < S_RUN;
    return this._stage < S_ALL;
  }

  isControlDisabled() {
    return this._app.busy;
  }

  getControlValue(id) {
    if (id === 'theory') return this._theory;
    if (id === 'metal') return this._app.metal;
    if (id === 'jar') return this._app.sealed ? 'sealed' : 'open';
    return undefined;
  }

  onControlChange(id, value) {
    if (this.isControlHidden(id) || this.isControlDisabled(id)) return;
    if (id === 'theory' && (value === 'phlogiston' || value === 'oxygen')) this._theory = value;
    else if (id === 'metal' && METALS[value]) { this._app.metal = value; this._app.reset(); this._log = []; this._verdictAge = -1; }
    else if (id === 'jar') { this._app.sealed = value !== 'open'; this._app.reset(); this._log = []; this._verdictAge = -1; }
    else if (id === 'run') this._run();
    this.requestUiUpdate?.();
  }

  _handlePointerUp() {
    if (this.isControlHidden('run') || this._app.busy) return;
    this._run();
    this.requestUiUpdate?.();
  }

  _enterStage(stage) {
    this._stage = stage;
    this._age = 0;
    this._fade = 0;
    if (stage < S_ALL) { this._app.metal = 'tin'; this._app.sealed = true; }
    this._app.reset();
    this._log = [];
    this._verdictAge = -1;
    this.requestUiUpdate?.();
  }

  _run() {
    this._app.physics = 'oxygen';        // the experiment runs in the real world
    this._app.run();
    this._log = [];
    this._verdictAge = -1;
  }

  // -- Frame ------------------------------------------------------------------------------

  _tick(ctx, dt) {
    if (!this.colors) return;
    const d = Math.max(0, Math.min(dt, 0.05));   // the first frame can report a negative dt
    this._clock += d;
    this._age += d;
    this._fade = Math.min(1, this._fade + d / 0.35);
    const app = this._app;
    const name = METALS[app.metal].name;
    const ended = app.update(d, this._clock);
    if (ended === 'weigh') this._log.push(app.sealed ? `jar before: ${grams(app.mainReading())}` : `${name} before: ${grams(METAL_G)}`);
    if (ended === 'heat' && app.sealed) this._log.push(`jar after: ${grams(app.mainReading())}`);
    if (ended === 'open') this._log.push('opened: air rushed in');
    if (app.done && this._verdictAge < 0) {
      this._log.push(`${name} alone: ${grams(METAL_G)} \u2192 ${grams(app.metalMass())}`);
      this._metals[app.metal] = SHIFT_G;
      this._verdictAge = 0;
      const c = this.colors;
      if (this._theory === 'oxygen') this._burst.fire(LAYOUT.MAIN.x, LAYOUT.MAIN.py - 60, [c.s1, c.s2, c.s3, c.s4, c.s5], 28);
      this.requestUiUpdate?.();
    }
    if (this._verdictAge >= 0) this._verdictAge += d;
    const r = Math.round(app.mainReading() * 10) / 10;
    if (this._shown != null && r !== this._shown) this._pop = 1;
    this._shown = r;
    this._pop = Math.max(0, this._pop - d * 4);
    this._burst.update(d);
    this._draw(ctx);
  }

  _drawInitialFrame(ctx) {
    if (this.colors) this._draw(ctx);
  }

  _draw(ctx) {
    const c = this.colors;
    const t = this._clock;
    ctx.clearRect(0, 0, W, H);
    drawWall(ctx, c);
    drawShelf(ctx, c, 10, 372, LAYOUT.MAIN.py + 80);
    this._app.draw(ctx, c, t, { pop: this._pop });
    const lens = this._stage === S_LENS;
    if (!lens) {
      if (!this._app.busy && !this._app.done && this._stage >= S_PICK) this._drawGhost(ctx);
      this._drawPredictions(ctx);
      this._drawLog(ctx);
      pill(ctx, c, `${METALS[this._app.metal].name} \u00b7 ${this._app.sealed ? 'sealed jar' : 'open'}`, 16, 30, { bg: c.labelMuted, size: 15, align: 'left' });
      if (this._app.busy) pill(ctx, c, { weigh: 'weigh', heat: 'heat', open: 'open the jar', alone: 'weigh it alone' }[this._app.phase], 190, 70, { bg: c.flame, size: 15 });
      else if (this._stage >= S_RUN && !this._app.done) pill(ctx, c, 'tap to run the burn', 190, 70, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
    }
    this._burst.draw(ctx);
    if (lens) {
      drawLensCard(ctx, c, {
        age: this._age, t, dim: true,
        rows: [
          { icon: (g, x, y, tt) => drawClockIcon(g, c, x, y, tt), text: 'burns: 100\u00d7 faster than life' },
          { icon: (g, x, y) => { g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fillStyle = c.s1; g.fill(); }, text: 'oxygen drawn blue', sub: 'real oxygen has no colour' },
          { icon: (g, x, y) => { rr(g, x - 17, y - 11, 34, 22, 6); g.fillStyle = mix(c.bgDeep, c.good, 0.2); g.fill(); }, text: 'the balance is a modern one' },
        ],
      });
    }
    if (this._fade < 1) {
      ctx.fillStyle = alpha(c.bgDeep, 1 - this._fade);
      ctx.fillRect(0, 0, W, H);
    }
  }

  /** The Lens drawing the picked theory's prediction on the bench (before a run). */
  _drawGhost(ctx) {
    const c = this.colors;
    const t = this._clock;
    const mx = LAYOUT.MAIN.x, my = LAYOUT.METAL_Y - 8;
    const phlog = this._theory === 'phlogiston';
    for (let k = 0; k < 5; k++) {
      const u = (t * 0.5 + k / 5) % 1;
      const ang = -Math.PI / 2 + (k - 2) * 0.45;
      const r = phlog ? 16 + u * 80 : 96 - u * 80;
      ctx.beginPath();
      ctx.arc(mx + Math.cos(ang) * r, my + Math.sin(ang) * r, 4, 0, Math.PI * 2);
      ctx.fillStyle = alpha(phlog ? c.flame : c.s1, Math.sin(u * Math.PI));
      ctx.fill();
    }
    pill(ctx, c, phlog ? 'predicted: lighter' : 'predicted: heavier', mx, 130, { bg: phlog ? c.flame : c.s1, size: 15 });
  }

  _drawPredictions(ctx) {
    const c = this.colors;
    const t = this._clock;
    const x = PX, y = 44, h = 150;
    drawCard(ctx, c, x, y, PW, h);
    pill(ctx, c, 'the Lens predicts', x + 12, y, { bg: c.labelMuted, size: 14, align: 'left' });
    const rows = [
      { id: 'phlogiston', head: 'phlogiston: fire-stuff leaves', a: 'metal lighter', col: c.flame, focus: S_PHLOG },
      { id: 'oxygen', head: 'oxygen: air joins', a: 'metal heavier', b: 'jar air lighter', col: c.s1, focus: S_OXY },
    ];
    rows.forEach((r, i) => {
      const ry = y + 22 + i * 64;
      const picked = this._theory === r.id;
      const focus = this._stage === r.focus;
      rr(ctx, x + 8, ry, PW - 16, 56, 9);
      ctx.fillStyle = picked ? mix(c.bgSurface, r.col, 0.12) : c.bgSurface;
      ctx.fill();
      if (picked || focus) {
        ctx.strokeStyle = r.col;
        ctx.lineWidth = focus ? 3 + Math.sin(t * 6) : 2;
        ctx.stroke();
      }
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 15);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.head, x + 18, ry + 16);
      ctx.fillStyle = c.labelMuted;
      ctx.font = font(c, 700, 14);
      ctx.fillText(r.b ? `${r.a} \u00b7 ${r.b}` : r.a, x + 18, ry + 39);
      if (this._verdictAge >= 0) {
        const right = r.id === 'oxygen';
        const p = popAt(this._verdictAge, 0.3);
        if (p) pill(ctx, c, right ? '\u2713' : '\u2717', x + PW - 18, ry + 16, { bg: right ? c.good : c.bad, size: 14, align: 'right', ...p });
      }
    });
  }

  _drawLog(ctx) {
    const c = this.colors;
    const x = PX, y = 212, h = 296;
    drawCard(ctx, c, x, y, PW, h);
    pill(ctx, c, 'your numbers', x + 12, y, { bg: c.labelMuted, size: 14, align: 'left' });
    this._log.forEach((line, i) => {
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 15);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(line, x + 16, y + 34 + i * 30);
    });
    if (this._verdictAge >= 0) {
      const p = popAt(this._verdictAge, 0);
      const good = this._theory === 'oxygen';
      if (p) pill(ctx, c, good ? 'heavier: your pick was right' : 'heavier: the balance disagrees', x + PW / 2, y + 170, { bg: good ? c.good : c.bad, size: 15, ...p });
    }
    if (this._stage >= S_ALL) {
      ctx.fillStyle = c.labelMuted;
      ctx.font = font(c, 700, 14);
      ctx.textAlign = 'left';
      ctx.fillText('metals tried', x + 16, y + 214);
      let px = x + 16;
      for (const m of ['tin', 'mercury', 'iron']) {
        const done = this._metals[m] != null;
        px += pill(ctx, c, done ? `${m} \u2191` : m, px, y + 246, { bg: done ? c.s1 : alpha(c.labelMuted, 0.5), size: 14, align: 'left' }).w + 8;
      }
      if (['tin', 'mercury', 'iron'].every((m) => this._metals[m] != null)) {
        pill(ctx, c, `all three: +${SHIFT_G.toFixed(1)} g`, x + PW / 2, y + 278, { bg: c.good, size: 14 });
      }
    }
  }
}

