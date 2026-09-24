/**
 * CrowdScene (preset: big-holes) - blk-l03-05-04-s05 (what-if). Widen the holes
 * until salt fits: salt walks through and spreads evenly, water has no side to
 * prefer, the levels stay equal. Osmosis vanishes; the cucumber stays crisp and
 * the raisin stays a raisin.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - small holes, salt on the right: its level rises; predict.
 *   1 run   - the dial; salt crosses; the levels come back level; the bench stops working.
 *   2 nails - osmosis exists only because the wall chooses.
 *
 * Canvas: the tank and two fruit; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, rr, drawHillBackdrop, drawCardBox, Osmosis, drawTank, Fruit, drawFruit } from './CrowdKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;
const TANK = { x: 30, y: 110, w: 380, h: 320 };

export class CrowdSceneBigHoles extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A tank split by a wall with holes, salt on the right. With small holes, water crosses toward the salt and its ' +
    'level rises. With holes big enough for salt, the salt spreads evenly, the levels stay equal and osmosis ' +
    'vanishes: a cucumber in brine stays crisp and a raisin in water stays a raisin.';

  static CONTROLS = [
    { type: 'button', id: 'small', label: 'Holes: water only', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'big', label: 'Holes: big enough for salt', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'small';
    this._osm = new Osmosis({ saltL: 0, saltR: 20 });
    this._dialled = false;
    this._set();
  }

  _set() {
    const big = this.mode === 'big';
    this._osm.set(0, 20, big);
    this._osm.running = true;
    // With salt able to pass the fruit's skin too, the bath and the inside even out: no pull on water.
    this._fruits = [
      { label: 'cucumber, brine', f: new Fruit({ kind: 'cucumber', solute: 12, water: 88, bath: big ? 0.88 : 0.8, burstAt: 9 }) },
      { label: 'raisin, water', f: new Fruit({ kind: 'raisin', solute: 10, water: 20, bath: big ? 0.667 : 1.0, burstAt: 9 }) },
    ];
    this._t = 0;
    this._lv = [Math.round(this._osm.vol(0)), Math.round(this._osm.vol(1))];
  }

  enter() {
    this.mode = 'small';
    this._dialled = false;
    this._set();
  }

  isControlHidden() { return this.stage === S_SETUP; }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'small' || id === 'big') { this.mode = id; this._dialled = true; this._set(); }
    this.requestUiUpdate?.();
  }

  update(d) {
    if (this.stage === S_RUN && !this._dialled) return;
    this._t += d;
    this._osm.step(d * 2);
    this._lvT = (this._lvT ?? 0) + d;
    if (this._lvT >= 1) { this._lvT = 0; this._lv = [Math.round(this._osm.vol(0)), Math.round(this._osm.vol(1))]; }
    if (this._t < 8) for (const fr of this._fruits) fr.f.step(d);
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const o = this._osm, big = this.mode === 'big';
    drawTank(ctx, c, o, TANK.x, TANK.y, TANK.w, TANK.h, t);
    pill(ctx, c, big ? 'big holes: salt passes too' : 'small holes: water only', 30, 60, { bg: big ? c.bad : c.good, size: 15, align: 'left' });
    pill(ctx, c, `levels ${this._lv[0]} | ${this._lv[1]}`, TANK.x + TANK.w / 2, 90, { bg: c.water, size: 14 });
    this._fruits.forEach((fr, i) => {
      const x = 440, y = 40 + i * 200;
      drawCardBox(ctx, c, x, y, 224, 180);
      rr(ctx, x + 16, y + 50, 192, 110, 12);
      ctx.fillStyle = c.water;
      ctx.globalAlpha = 0.28;
      ctx.fill();
      ctx.globalAlpha = 1;
      drawFruit(ctx, c, fr.f, x + 112, y + 105, t);
      const sz = fr.f.size();
      const start = i === 0 ? 1.0 : 0.3;
      const same = Math.abs(sz - start) < 0.08;
      pill(ctx, c, `${fr.label}: ${same ? 'unchanged' : sz < start ? 'shrivels' : 'plumps'}`, x + 112, y + 22, { bg: same ? c.labelMuted : c.s5, size: 14 });
    });
    const st = this.stage;
    if (st === S_SETUP) {
      const q = popAt(this.age, 1.2);
      if (q) pill(ctx, c, 'predict: salt can cross. The levels?', 220, 470, { bg: c.accent, size: 15, ...q });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the dial', 220, 470, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_RUN && big && this._t > 6) pill(ctx, c, 'osmosis vanishes', 220, 470, { bg: c.bad, size: 15 });
    if (st === S_NAILS) {
      const q = popAt(this.age, 0.5);
      if (q) pill(ctx, c, 'the choosing is the whole thing', 220, 470, { bg: c.good, size: 15, ...q });
    }
  }
}
