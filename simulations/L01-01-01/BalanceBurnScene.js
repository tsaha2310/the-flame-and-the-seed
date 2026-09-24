/**
 * BalanceBurnScene - blk-l01-01-01-s03 (observe). Ajji's kitchen balance:
 * burn steel wool, a candle or a strip of paper, in open air or inside a
 * sealed jar, and read the balance before and after.
 *
 * Beats (the slide's four paragraphs, splitSteps() counts 4):
 *   0 Lens card   - the glow is slowed 10x; the display reads to 0.1 g; air is drawn as dots.
 *   1 Steel wool  - Burn it: the glow crawls through, air dots join the wool, 5.0 g -> 5.4 g.
 *   2 Candle, paper - what-to-burn dial: both get lighter in open air; gas rises and leaves.
 *   3 Sealed jar  - open/sealed dial: inside the jar every reading stays the same.
 * Every run is written into the notebook column.
 *
 * Canvas: the glow front, flames, and air dots joining or escaping are
 * continuous motion; labels are chips only.
 */
import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import { clamp01 } from 'simulations/base/SimMotion.js';
import {
  W, H, loadColors, alpha, mix, darken, font, rr, pill, popAt, sparkle, Burst,
  drawWall, drawShelf, drawLensCard, drawClockIcon,
  MATERIALS, JAR_MASS, AIR_MASS, grams, drawBalance, drawTile, makeWool, drawWool,
  drawCandle, drawPaper, jarBox, drawJar, Air,
} from './BurnKit.js';

const STAGE_LENS = 0;
const STAGE_WOOL = 1;
const STAGE_WHAT = 2;
const STAGE_JAR = 3;

const BEAT_STEP_MAP = [
  [{ idx: STAGE_LENS, dwellMs: null }],
  [{ idx: STAGE_WOOL, dwellMs: null }],
  [{ idx: STAGE_WHAT, dwellMs: null }],
  [{ idx: STAGE_JAR, dwellMs: null }],
];

const BX = 230;              // balance centre
const PY = 380;              // platform top
const BURN_S = 6;            // one burn, slowed ten times (honesty card)
const OPEN_BOX = { x0: 16, x1: 444, y0: 60, y1: 440 };
const JAR = jarBox(BX, PY, 200, 232);

export class BalanceBurnScene extends CanvasSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  static ARIA_LABEL =
    'A kitchen balance reading to a tenth of a gram. Burned in open air, steel wool gets heavier, 5.0 to 5.4 grams, ' +
    'as air joins it; a candle and a strip of paper get lighter as gas rises away. Inside a sealed jar, every ' +
    'reading stays the same. Each run is written in a notebook.';

  static CONTROLS = [
    { type: 'select', id: 'what', label: 'Burn:', options: [
      { value: 'wool', label: 'steel wool' }, { value: 'candle', label: 'candle' }, { value: 'paper', label: 'paper' },
    ] },
    { type: 'select', id: 'where', label: 'Where:', options: [
      { value: 'open', label: 'open air' }, { value: 'sealed', label: 'sealed jar' },
    ] },
    { type: 'button', id: 'burn', label: 'Burn it' },
  ];

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;
    this.colors = null;
    this._stage = -1;
    this._age = 0;
    this._fade = 1;
    this._clock = 0;
    this._what = 'wool';
    this._where = 'open';
    this._burn = 0;
    this._burning = false;
    this._done = false;
    this._log = [];
    this._pop = 0;
    this._shown = null;
    this._firstWool = -1;
    this._firstSealed = -1;
    this._resultAge = -1;
    this._wool = makeWool(11);
    this._burst = new Burst();
    this._openAir = new Air(71, 40, OPEN_BOX);
    this._jarAir = new Air(72, 26, JAR);
    this._onPointerUp = this._handlePointerUp.bind(this);
  }

  async setup() {
    await super.setup();
    this._reloadColors();
    this._canvas.addEventListener('pointerup', this._onPointerUp);
    this._enterStage(STAGE_LENS);
    this._drawInitialFrame(this._ctx);
  }

  destroy() {
    if (this._canvas) this._canvas.removeEventListener('pointerup', this._onPointerUp);
    super.destroy();
  }

  _reloadColors() {
    this.colors = loadColors(this.container);
  }

  // -- Beats and controls ---------------------------------------------------------------

  onBeatChange(beatIndex) {
    const b = Math.max(0, Math.min(BEAT_STEP_MAP.length - 1, beatIndex | 0));
    const stage = BEAT_STEP_MAP[b][0].idx;
    if (stage !== this._stage) this._enterStage(stage);
    this.requestUiUpdate?.();
  }

  isControlHidden(id) {
    if (id === 'burn') return this._stage < STAGE_WOOL;
    if (id === 'what') return this._stage < STAGE_WHAT;
    if (id === 'where') return this._stage < STAGE_JAR;
    return true;
  }

  isControlDisabled() {
    return this._burning;
  }

  getControlValue(id) {
    return id === 'what' ? this._what : id === 'where' ? this._where : undefined;
  }

  onControlChange(id, value) {
    if (this.isControlHidden(id) || this.isControlDisabled(id)) return;
    if (id === 'what' && MATERIALS[value]) { this._what = value; this._fresh(); }
    else if (id === 'where' && (value === 'open' || value === 'sealed')) { this._where = value; this._fresh(); }
    else if (id === 'burn') this._startBurn();
    this.requestUiUpdate?.();
  }

  _handlePointerUp() {
    if (this.isControlHidden('burn') || this._burning) return;
    this._startBurn();
    this.requestUiUpdate?.();
  }

  // -- State ------------------------------------------------------------------------------

  _enterStage(stage) {
    this._stage = stage;
    this._age = 0;
    this._fade = 0;
    if (stage <= STAGE_WOOL) { this._what = 'wool'; this._where = 'open'; }
    if (stage === STAGE_WHAT) this._where = 'open';
    this._fresh();
    this.requestUiUpdate?.();
  }

  _fresh() {
    this._burn = 0;
    this._burning = false;
    this._done = false;
    this._jarAir = new Air(72, 26, JAR);
  }

  _startBurn() {
    this._fresh();
    this._burning = true;
    this._before = this._reading();
  }

  _limit() {
    return this._where === 'sealed' ? MATERIALS[this._what].sealedBurn : 1;
  }

  /** What the display shows right now. */
  _reading() {
    const m = MATERIALS[this._what];
    if (this._where === 'sealed') return JAR_MASS + AIR_MASS + m.start;
    return m.start + m.open * this._burn;
  }

  _finish() {
    this._burning = false;
    this._done = true;
    this._resultAge = 0;
    const after = this._reading();
    this._log.push({ what: this._what, where: this._where, before: this._before, after });
    if (this._log.length > 7) this._log.shift();
    const c = this.colors;
    if (this._what === 'wool' && this._where === 'open' && this._firstWool < 0) {
      this._firstWool = 0;
      this._burst.fire(BX - 10, PY + 44, [c.s1, c.s2, c.s3, c.s4, c.s5], 28);
    }
    if (this._where === 'sealed' && this._firstSealed < 0) this._firstSealed = 0;
    this.requestUiUpdate?.();
  }

  // -- Frame ------------------------------------------------------------------------------

  _tick(ctx, dt) {
    if (!this.colors) return;
    const d = Math.max(0, Math.min(dt, 0.05));   // the first frame can report a negative dt
    this._clock += d;
    this._age += d;
    this._fade = Math.min(1, this._fade + d / 0.35);
    if (this._burning) {
      this._burn = Math.min(this._limit(), this._burn + d / BURN_S);
      if (this._burn >= this._limit()) this._finish();
    }
    if (this._firstWool >= 0) this._firstWool += d;
    if (this._firstSealed >= 0) this._firstSealed += d;
    if (this._resultAge >= 0) this._resultAge += d;
    this._updateAir(d);
    const r = this._reading();
    if (this._shown != null && Math.abs(r - this._shown) >= 0.05) this._pop = 1;
    this._shown = Math.round(r * 10) / 10;
    this._pop = Math.max(0, this._pop - d * 4);
    this._burst.update(d);
    this._draw(ctx);
  }

  _drawInitialFrame(ctx) {
    if (this.colors) this._draw(ctx);
  }

  _flamePoint() {
    if (this._what === 'wool') return { x: BX - 68 + this._burn * 136, y: PY - 40 };
    if (this._what === 'candle') return { x: BX, y: PY - 26 - 70 * (1 - this._burn * 0.25) - 18 };
    return { x: 170 + 120 * this._burn, y: PY - 20 };
  }

  _updateAir(dt) {
    const t = this._clock;
    const sealed = this._where === 'sealed';
    const air = sealed ? this._jarAir : this._openAir;
    const p = this._flamePoint();
    let sink = null;
    if (this._burning) {
      sink = this._what === 'wool'
        ? { x: p.x, y: p.y, reach: sealed ? 200 : 150, pull: 90, r: 14 }
        : { x: p.x, y: p.y + 8, reach: 60, pull: 50, r: 8 };
      if (this._what !== 'wool' && Math.random() < dt * 9) air.emit(p.x, p.y - 20, 1);
    }
    air.update(dt, t, sealed ? JAR : null, sink);
    if (!sealed) {
      while (this._openAir.dots.filter((q) => !q.gas).length < 40) {
        this._openAir.dots.push({ x: OPEN_BOX.x0 + 4, y: OPEN_BOX.y0 + Math.random() * 300, vx: 12, vy: 0, gas: false, life: 0 });
      }
    }
  }

  _draw(ctx) {
    const c = this.colors;
    const t = this._clock;
    ctx.clearRect(0, 0, W, H);
    drawWall(ctx, c);
    drawShelf(ctx, c, 10, 460, PY + 80);
    const sealed = this._where === 'sealed';
    if (!sealed) this._openAir.draw(ctx, c);

    drawBalance(ctx, c, BX, PY, this._reading(), { pop: this._pop });
    this._drawItem(ctx);
    if (sealed) {
      this._jarAir.draw(ctx, c);
      drawJar(ctx, c, JAR, this._what === 'wool' ? 0 : this._burn);
    }

    const lens = this._stage === STAGE_LENS;
    if (!lens) {
      pill(ctx, c, `${MATERIALS[this._what].name} \u00b7 ${sealed ? 'sealed jar' : 'open air'}`, 20, 32, { bg: c.labelMuted, size: 16, align: 'left' });
      if (this._burning) pill(ctx, c, 'burning', BX, 110, { bg: c.flame, size: 15, scale: 1 + 0.05 * Math.sin(t * 8) });
      this._drawNotebook(ctx);
      this._drawResult(ctx);
      if (!this._burning && !this._done) {
        const hint = this._stage === STAGE_JAR ? 'try the sealed jar' : this._stage === STAGE_WHAT ? 'try a candle, then paper' : 'tap to burn';
        pill(ctx, c, hint, BX, 500, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
      }
    }
    this._burst.draw(ctx);
    if (lens) {
      drawLensCard(ctx, c, {
        age: this._age, t, dim: true,
        rows: [
          { icon: (g, x, y, tt) => drawClockIcon(g, c, x, y, tt), text: 'the glow: 10\u00d7 slower than life' },
          { icon: (g, x, y) => this._lcdIcon(g, x, y), text: 'this balance reads to 0.1 g', sub: 'Ajji\'s does not' },
          { icon: (g, x, y) => this._dotsIcon(g, x, y), text: 'air drawn as faint dots', sub: 'real air is invisible' },
        ],
      });
    }
    if (this._fade < 1) {
      ctx.fillStyle = alpha(c.bgDeep, 1 - this._fade);
      ctx.fillRect(0, 0, W, H);
    }
  }

  _drawItem(ctx) {
    const c = this.colors;
    const t = this._clock;
    drawTile(ctx, c, BX, PY, 150);
    if (this._what === 'wool') drawWool(ctx, c, this._wool, BX, PY - 40, 74, 42, this._burn, t);
    else if (this._what === 'candle') {
      const flame = this._burning ? 1 - (this._where === 'sealed' ? Math.max(0, (this._burn / this._limit() - 0.7) / 0.3) : 0) : 0;
      drawCandle(ctx, c, BX, PY - 4, 1 - this._burn * 0.25, flame, t);
    } else drawPaper(ctx, c, 170, 290, PY - 8, this._burning || this._done ? this._burn : 0, t, this._burning);
  }

  _drawResult(ctx) {
    const c = this.colors;
    if (!this._done) return;
    const last = this._log[this._log.length - 1];
    if (!last) return;
    const diff = Math.round((last.after - last.before) * 10) / 10;
    const txt = diff > 0 ? `heavier: +${diff.toFixed(1)} g` : diff < 0 ? `lighter: ${diff.toFixed(1)} g` : 'no change';
    const bg = diff > 0 ? c.s1 : diff < 0 ? c.s8 : c.good;
    const p = popAt(this._resultAge, 0) || { scale: 0.01, alpha: 0 };
    pill(ctx, c, txt, BX, 116, { bg, size: 17, ...p });
    if (last.where === 'sealed' && this._firstSealed >= 0 && this._firstSealed < 1.6) {
      const u = this._firstSealed / 1.6;
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2 + u * 2;
        ctx.save();
        ctx.globalAlpha = Math.sin(u * Math.PI);
        sparkle(ctx, BX + Math.cos(ang) * (110 + u * 30), PY - 110 + Math.sin(ang) * (130 + u * 30), 7, k % 2 ? c.good : c.warning);
        ctx.restore();
      }
    }
  }

  _drawNotebook(ctx) {
    const c = this.colors;
    const x = 468, y = 52, w = 200, h = 440;
    rr(ctx, x, y + 4, w, h, 11);
    ctx.fillStyle = darken(c.bgSurface, 0.35);
    ctx.fill();
    rr(ctx, x, y, w, h, 11);
    ctx.fillStyle = c.bgSurface;
    ctx.fill();
    ctx.strokeStyle = alpha(c.s1, 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const ly = y + 73 + i * 50; ctx.moveTo(x + 10, ly); ctx.lineTo(x + w - 10, ly); }
    ctx.stroke();
    pill(ctx, c, 'notebook', x + 12, y, { bg: c.labelMuted, size: 14, align: 'left' });
    this._log.forEach((r, i) => {
      const ry = y + 40 + i * 50;
      ctx.fillStyle = c.labelMuted;
      ctx.font = font(c, 700, 14);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${MATERIALS[r.what].name}, ${r.where === 'sealed' ? 'jar' : 'open'}`, x + 12, ry);
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 15);
      ctx.fillText(`${grams(r.before)} \u2192 ${grams(r.after)}`.replace(' g \u2192', ' \u2192'), x + 12, ry + 20);
    });
  }

  _lcdIcon(ctx, x, y) {
    const c = this.colors;
    rr(ctx, x - 17, y - 11, 34, 22, 6);
    ctx.fillStyle = mix(c.bgDeep, c.good, 0.2);
    ctx.fill();
    ctx.fillStyle = c.good;
    ctx.font = font(c, 700, 14, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0.1', x, y + 1);
  }

  _dotsIcon(ctx, x, y) {
    const c = this.colors;
    for (const [dx, dy] of [[-10, -8], [6, -10], [-4, 4], [10, 6], [-12, 10], [2, 14]]) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, 3, 0, Math.PI * 2);
      ctx.fillStyle = alpha(c.s1, 0.7);
      ctx.fill();
    }
  }
}
