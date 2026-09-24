/**
 * WaterwheelScene (preset: loose-pocket) - blk-l05-05-01-s05 (what-if). Kabir's
 * loose hexokinase closes on ATP alone, without glucose. In a cell with little
 * glucose it breaks ATP into water, over and over, lifting nothing: the till of
 * coins empties in seconds.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - the real enzyme, little glucose about: the fold stays open; the till is full.
 *   1 run   - the switch; it closes on ATP alone; coins become heat; the till empties.
 *   2 nails - substrate first, coin second: induced fit is a safety catch.
 *
 * Canvas: the enzyme and a till of coins; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, font, drawHillBackdrop, drawCardBox, drawCoin, Hexo } from './WaterKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;
const EX = 240, EY = 270;

export class WaterwheelSceneLoosePocket extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'Hexokinase in a cell with little glucose. The real enzyme\'s fold only closes on ATP once glucose is in place, ' +
    'so with no glucose it does almost nothing and the cell keeps its ATP. A loose version that closed on ATP alone ' +
    'would break ATP into water over and over, lifting nothing, and empty the cell\'s till of coins in seconds.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Closes on ATP alone: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Closes on ATP alone: ON', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._hx = new Hexo('atp');
    this._dialled = false;
  }

  enter() {
    this.mode = 'off';
    this._dialled = false;
    this._hx = new Hexo('atp');
  }

  isControlHidden() { return this.stage === S_SETUP; }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if ((id === 'on' || id === 'off') && id !== this.mode) { this.mode = id; this._hx = new Hexo(id === 'on' ? 'loose' : 'atp'); }
    if (id === 'on' || id === 'off') this._dialled = true;
    this.requestUiUpdate?.();
  }

  update(d) {
    if (this.stage === S_RUN && !this._dialled) return;
    this._hx.step(d);
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const h = this._hx, on = this.mode === 'on';
    h.draw(ctx, c, EX, EY, t);
    // The till.
    const x = 440, y = 60, w = 224;
    drawCardBox(ctx, c, x, y, w, 250);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('the till: ATP coins', x + 12, y + 20);
    for (let i = 0; i < 20; i++) {
      const cx = x + 30 + (i % 5) * 40, cy = y + 60 + Math.floor(i / 5) * 40;
      drawCoin(ctx, c, cx, cy, 14, i >= h.till);
    }
    ctx.fillStyle = c.label;
    ctx.font = font(c, 800, 15);
    ctx.fillText(`heat wasted: ${Math.round(h.waste)} kJ`, x + 12, y + 228);
    pill(ctx, c, on ? 'loose: closes on ATP alone' : 'the real enzyme, little glucose', 16, 30, { bg: on ? c.bad : c.good, size: 15, align: 'left' });
    const st = this.stage;
    if (st === S_SETUP) {
      const q = popAt(this.age, 1.0);
      if (q) pill(ctx, c, 'predict: little glucose, a loose pocket?', 240, 480, { bg: c.accent, size: 15, ...q });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the dial', 240, 480, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_RUN && on) pill(ctx, c, h.till <= 0 ? 'the till is empty: nothing lifted' : 'coins into heat, over and over', 240, 480, { bg: c.bad, size: 15 });
    if (st === S_NAILS) {
      const q = popAt(this.age, 0.5);
      if (q) pill(ctx, c, 'glucose first, coin second: a safety catch', 240, 480, { bg: c.good, size: 15, ...q });
    }

  }
}
