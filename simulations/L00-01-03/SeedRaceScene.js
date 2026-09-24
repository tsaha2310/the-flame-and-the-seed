/**
 * SeedRaceScene - blk-l00-01-03-s03 (observe). Two bowls of ten moong seeds
 * race for ten days: a control bowl (not boiled, room water) and the
 * learner's bowl, set by boiling time and soak temperature.
 *
 * Beats (the slide's four paragraphs, splitSteps() counts 4):
 *   0 Lens card      - ten days in twenty seconds; seeds ten times bigger; inside not shown.
 *   1 Run the race   - boiling time dial + Run 10 days; each run lands on the tally card.
 *   2 Every time     - the tally asks for the shortest time that stops all ten;
 *                      finding it (10 s) pops a celebration.
 *   3 Soak instead   - soak temperature dial appears; warm bowl beats the control,
 *                      cold loses. Free play from here.
 *
 * Canvas: seeds swelling, cracking and growing roots and leaves over time is
 * continuous motion; labels are chips only.
 */
import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import { clamp01 } from 'simulations/base/SimMotion.js';
import {
  W, H, loadColors, alpha, darken, font, rr, pill, popAt, Burst, drawLensCard, drawClockIcon,
  drawTable, drawBowl, drawWaterTop, drawSeed, seedSpots, sproutDays, growth,
} from './SeedKit.js';

const STAGE_LENS = 0;
const STAGE_RUN = 1;
const STAGE_FIND = 2;
const STAGE_SOAK = 3;

const BEAT_STEP_MAP = [
  [{ idx: STAGE_LENS, dwellMs: null }],
  [{ idx: STAGE_RUN, dwellMs: null }],
  [{ idx: STAGE_FIND, dwellMs: null }],
  [{ idx: STAGE_SOAK, dwellMs: null }],
];

const DAYS = 10;
const SECONDS_PER_DAY = 2;      // ten days in twenty seconds (honesty card)
const BOWL_R = 98;
const BOILS = [0, 10, 60, 300];

function boilLabel(s) {
  return s === 0 ? '0 s' : s < 60 ? `${s} s` : s === 60 ? '60 s' : `${s / 60} min`;
}

export class SeedRaceScene extends CanvasSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  static ARIA_LABEL =
    'A seed race: two bowls of ten moong seeds, one not boiled and one set by a boiling time and a soak ' +
    'temperature, run for ten days. Unboiled seeds crack, grow roots and open leaves; seeds boiled for any ' +
    'time, even ten seconds, never sprout. Warm water sprouts seeds sooner than room water, cold water later. ' +
    'A tally records each run.';

  static CONTROLS = [
    { type: 'select', id: 'boil', label: 'Boiling time:', options: BOILS.map((s) => ({ value: String(s), label: boilLabel(s) })) },
    { type: 'select', id: 'soak', label: 'Soak:', options: [
      { value: 'room', label: 'room' }, { value: 'cold', label: 'cold' }, { value: 'warm', label: 'warm' },
    ] },
    { type: 'button', id: 'run', label: 'Run 10 days' },
  ];

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;
    this.colors = null;
    this._stage = -1;
    this._age = 0;
    this._fade = 1;
    this._clock = 0;
    this._boil = 0;
    this._soak = 'room';
    this._day = 0;
    this._runOn = false;
    this._runAge = 0;
    this._tally = [];
    this._foundAge = -1;
    this._resultAge = -1;
    this._burst = new Burst();
    this._left = { x: 130, y: 282, spots: seedSpots(BOWL_R, 301) };
    this._right = { x: 362, y: 282, spots: seedSpots(BOWL_R, 302) };
    this._onPointerUp = this._handlePointerUp.bind(this);
    this._resetBowls();
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

  // -- Beats and controls -------------------------------------------------------

  onBeatChange(beatIndex) {
    const b = Math.max(0, Math.min(BEAT_STEP_MAP.length - 1, beatIndex | 0));
    const stage = BEAT_STEP_MAP[b][0].idx;
    if (stage !== this._stage) this._enterStage(stage);
    this.requestUiUpdate?.();
  }

  isControlHidden(id) {
    if (this._stage === STAGE_LENS) return true;
    if (id === 'soak') return this._stage < STAGE_SOAK;
    return false;
  }

  isControlDisabled(id) {
    return id === 'run' ? this._runOn : false;
  }

  /** Lets a host that re-renders selects show the scene's own values. */
  getControlValue(id) {
    if (id === 'boil') return String(this._boil);
    if (id === 'soak') return this._soak;
    return undefined;
  }

  onControlChange(id, value) {
    if (this.isControlHidden(id)) return;
    if (id === 'boil') { this._boil = Number(value) || 0; this._resetBowls(); }
    else if (id === 'soak') { this._soak = SOAK_KEYS.includes(value) ? value : 'room'; this._resetBowls(); }
    else if (id === 'run' && !this._runOn) this._startRun();
    this.requestUiUpdate?.();
  }

  _handlePointerUp() {
    if (this._stage === STAGE_LENS || this._runOn) return;
    this._startRun();
    this.requestUiUpdate?.();
  }

  // -- State --------------------------------------------------------------------

  _enterStage(stage) {
    this._stage = stage;
    this._age = 0;
    this._fade = 0;
    this._resetBowls();
    this.requestUiUpdate?.();
  }

  _resetBowls() {
    this._runOn = false;
    this._day = 0;
    this._resultAge = -1;
    this._left.sd = sproutDays(this._left.spots, 0, 'room');
    this._right.sd = sproutDays(this._right.spots, this._boil, this._soak);
  }

  _startRun() {
    this._resetBowls();
    this._runOn = true;
    this._runAge = 0;
  }

  _count(bowl, day = this._day) {
    return bowl.sd.filter((d) => d <= day).length;
  }

  _finishRun() {
    this._runOn = false;
    this._resultAge = 0;
    const n = this._count(this._right, DAYS);
    const key = `${this._boil}|${this._soak}`;
    this._tally = this._tally.filter((r) => r.key !== key);
    this._tally.push({ key, boil: this._boil, soak: this._soak, n });
    if (this._tally.length > 7) this._tally.shift();
    const c = this.colors;
    const colors = [c.s1, c.s2, c.s3, c.s4, c.s5];
    if (this._boil === 10 && n === 0 && this._foundAge < 0 && this._stage >= STAGE_RUN) {
      this._foundAge = 0;
      this._burst.fire(586, 430, colors, 30);
    } else if (this._winner() === 'right') {
      this._burst.fire(this._right.x, 150, colors, 26);
    }
    this.requestUiUpdate?.();
  }

  /** 'left' | 'right' | 'tie' - more sprouts wins; equal counts go to the earlier average. */
  _winner() {
    const nl = this._count(this._left, DAYS), nr = this._count(this._right, DAYS);
    if (nl !== nr) return nl > nr ? 'left' : 'right';
    if (nl === 0) return 'tie';
    const mean = (b) => b.sd.filter(Number.isFinite).reduce((a, d) => a + d, 0) / nl;
    const d = mean(this._left) - mean(this._right);
    return Math.abs(d) < 0.3 ? 'tie' : d > 0 ? 'right' : 'left';
  }

  // -- Frame --------------------------------------------------------------------

  _tick(ctx, dt) {
    if (!this.colors) return;
    const d = Math.max(0, Math.min(dt, 0.05));   // the first frame can report a negative dt
    this._clock += d;
    this._age += d;
    this._fade = Math.min(1, this._fade + d / 0.35);
    if (this._runOn) {
      this._runAge += d;
      this._day = clamp01(this._runAge / (DAYS * SECONDS_PER_DAY)) * DAYS;
      if (this._day >= DAYS) this._finishRun();
    }
    if (this._resultAge >= 0) this._resultAge += d;
    if (this._foundAge >= 0) this._foundAge += d;
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
    drawTable(ctx, c);

    const lens = this._stage === STAGE_LENS;
    this._drawBowl(ctx, this._left, false);
    this._drawBowl(ctx, this._right, this._boil > 0);

    if (!lens) {
      pill(ctx, c, `Day ${Math.floor(this._day)}`, 246, 34, { bg: c.labelMuted, size: 18 });
      this._drawLane(ctx, this._left, 'control');
      this._drawLane(ctx, this._right, 'your bowl');
      pill(ctx, c, 'not boiled \u00b7 room', this._left.x, 412, { bg: c.labelMuted, size: 15 });
      const rightName = this._boil > 0 ? `boiled ${boilLabel(this._boil)} \u00b7 ${this._soak}` : `not boiled \u00b7 ${this._soak}`;
      pill(ctx, c, rightName, this._right.x, 412, { bg: this._boil > 0 ? c.bad : c.s1, size: 15 });
      this._drawTally(ctx);
      if (!this._runOn && this._resultAge < 0) {
        const pulse = 1 + 0.05 * Math.sin(t * 5);
        const hint = this._stage === STAGE_SOAK ? 'boil 0 s, pick a soak, run' : 'set a time, tap to run';
        pill(ctx, c, hint, 246, 470, { bg: c.accent, size: 16, scale: pulse });
      }
    }
    this._burst.draw(ctx);

    if (lens) {
      drawLensCard(ctx, c, {
        age: this._age, t, dim: true,
        rows: [
          { icon: (g, x, y, tt) => drawClockIcon(g, c, x, y, tt), text: '10 days pass in 20 seconds' },
          { icon: (g, x, y, tt) => drawSeed(g, c, x, y, 1, tt, { swell: 0.5, ang: -0.3 }), text: 'seeds drawn 10\u00d7 bigger' },
          { icon: (g, x, y, tt) => this._hiddenIcon(g, x, y, tt), text: 'inside the seed: not shown', sub: 'no tool to see it yet' },
        ],
      });
    }
    if (this._fade < 1) {
      ctx.fillStyle = alpha(c.bgDeep, 1 - this._fade);
      ctx.fillRect(0, 0, W, H);
    }
  }

  _hiddenIcon(ctx, x, y, t) {
    const c = this.colors;
    drawSeed(ctx, c, x, y, 1.1, t, { swell: 0.5, ang: 0.2 });
    ctx.beginPath();
    ctx.arc(x, y, 17, 0, Math.PI * 2);
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _drawBowl(ctx, bowl, boiled) {
    const c = this.colors;
    const t = this._clock;
    drawBowl(ctx, c, bowl.x, bowl.y, BOWL_R, t);
    bowl.spots.forEach((p, i) => {
      const g = growth(this._day, bowl.sd[i], boiled);
      const bob = Math.sin(t * 1.3 + i) * 1.2;
      drawSeed(ctx, c, bowl.x + p.dx, bowl.y + p.dy + bob, 1, t, { ...g, ang: p.ang });
    });
    drawWaterTop(ctx, c, bowl.x, bowl.y, BOWL_R, t);
  }

  /** Chunky ten-segment progress bar above a bowl: one segment per sprouted seed. */
  _drawLane(ctx, bowl, name) {
    const c = this.colors;
    const n = this._count(bowl);
    const segW = 13, gap = 3, total = 10 * segW + 9 * gap;
    const x0 = bowl.x - total / 2 - 8, y = 146;
    pill(ctx, c, name, bowl.x, 110, { bg: c.labelMuted, size: 14 });
    rr(ctx, x0 - 6, y - 12, total + 12, 24 + 3, 11);
    ctx.fillStyle = darken(c.bgSurface, 0.35);
    ctx.fill();
    rr(ctx, x0 - 6, y - 12, total + 12, 24, 11);
    ctx.fillStyle = c.bgSurface;
    ctx.fill();
    for (let k = 0; k < 10; k++) {
      rr(ctx, x0 + k * (segW + gap), y - 7, segW, 14, 6);
      ctx.fillStyle = k < n ? c.good : alpha(c.labelMuted, 0.3);
      ctx.fill();
    }
    ctx.fillStyle = c.label;
    ctx.font = font(c, 800, 16);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${n}/10`, x0 + total + 10, y + 1);

    if (this._resultAge >= 0) {
      const w = this._winner();
      const p = popAt(this._resultAge, 0.2);
      if (p && (w === 'tie' || (w === 'left') === (bowl === this._left))) {
        pill(ctx, c, w === 'tie' ? 'tie' : 'wins!', bowl.x + 84, 110, { bg: c.warning, size: 15, ...p });
      }
    }
  }

  _drawTally(ctx) {
    const c = this.colors;
    const x = 500, y = 60, w = 172, h = 406;
    rr(ctx, x, y + 4, w, h, 11);
    ctx.fillStyle = darken(c.bgSurface, 0.35);
    ctx.fill();
    rr(ctx, x, y, w, h, 11);
    ctx.fillStyle = c.bgSurface;
    ctx.fill();
    ctx.strokeStyle = this._stage === STAGE_FIND ? c.accent : alpha(c.stroke, 0.8);
    ctx.lineWidth = 2;
    ctx.stroke();
    pill(ctx, c, 'your runs', x + 12, y, { bg: c.labelMuted, size: 14, align: 'left' });
    this._tally.forEach((r, i) => {
      const ry = y + 42 + i * 40;
      ctx.fillStyle = c.label;
      ctx.font = font(c, 700, 14);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${boilLabel(r.boil)} \u00b7 ${r.soak}`, x + 12, ry);
      const bg = r.n === 10 ? c.good : r.n === 0 ? c.bad : c.warning;
      pill(ctx, c, `${r.n}/10`, x + w - 10, ry, { bg, size: 14, align: 'right' });
    });
    if (this._stage === STAGE_FIND && this._foundAge < 0) {
      pill(ctx, c, 'shortest that', x + w / 2, y + h - 58, { bg: c.accent, size: 14 });
      pill(ctx, c, 'stops all 10?', x + w / 2, y + h - 26, { bg: c.accent, size: 14 });
    }
    const p = this._foundAge >= 0 ? popAt(this._foundAge, 0) : null;
    if (p) pill(ctx, c, 'shortest: 10 s', x + w / 2, y + h - 26, { bg: c.good, size: 15, ...p });
  }
}

const SOAK_KEYS = ['room', 'cold', 'warm'];
