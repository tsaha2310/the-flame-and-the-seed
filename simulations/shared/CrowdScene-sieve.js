/**
 * CrowdScene (preset: sieve) - blk-l03-05-04-s02 (skill game). A tank split by a
 * wall whose holes pass water but not salt (salt ions are big, wrapped in a shell
 * of water). Set the salt on each side, run, watch the levels. Then the pickle
 * bench, and the skill: plump a shrivelled raisin without bursting it.
 *
 * Beats (six paragraphs + Lens, splitSteps() counts 6):
 *   0 Lens    - holes of a set size; water small, salt big with a water shell; sped up.
 *   1 Right   - salt on the right only: its level rises.
 *   2 Left    - salt on the left: the other way.
 *   3 Equal   - equal salt: the levels stay level.
 *   4 Bench   - cucumber in strong brine, raisin in plain water, grape in syrup.
 *   5 Skill   - pick the bath that plumps a raisin without bursting it.
 *
 * Canvas: water hopping through holes, levels, swelling fruit; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, drawHillBackdrop, drawCard, drawReadout, drawClockIcon, Osmosis, drawTank, Fruit, drawFruit,
} from './CrowdKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
  [{ idx: 5, dwellMs: null }],
];
const S_LENS = 0, S_RIGHT = 1, S_LEFT = 2, S_EQUAL = 3, S_BENCH = 4, S_SKILL = 5;
const SALT = { none: 0, some: 10, lots: 20 };
const BATHS = {
  plain: { label: 'plain water', x: 1.0 },
  pinch: { label: 'a pinch of salt', x: 0.97 },
  weak: { label: 'weak salt water', x: 0.9 },
  medium: { label: 'medium salt water', x: 0.8 },
  strong: { label: 'strong salt water', x: 0.7 },
};
const TANK = { x: 40, y: 110, w: 400, h: 320 };

export class CrowdSceneSieve extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'A tank split by a wall with holes that let water through but not salt. With salt on one side, more water ' +
    'crosses toward the salty side and its level rises; with equal salt, the levels stay level. On the pickle bench ' +
    'a cucumber in brine and a grape in syrup shrivel and a raisin in plain water plumps. The skill: choose the bath ' +
    'that plumps a shrivelled raisin without bursting it.';

  static CONTROLS = [
    { type: 'select', id: 'saltL', label: 'Salt left:', options: Object.keys(SALT).map((k) => ({ value: k, label: k })) },
    { type: 'select', id: 'saltR', label: 'Salt right:', options: Object.keys(SALT).map((k) => ({ value: k, label: k })) },
    { type: 'select', id: 'holes', label: 'Holes:', options: [{ value: 'small', label: 'water only' }, { value: 'big', label: 'big: salt too' }] },
    { type: 'button', id: 'run', label: 'Run' },
    { type: 'select', id: 'bath', label: 'Raisin bath:', options: Object.keys(BATHS).map((k) => ({ value: k, label: BATHS[k].label })) },
  ];

  constructor(container, config) {
    super(container, config);
    this._saltL = 'none';
    this._saltR = 'lots';
    this._big = false;
    this._osm = new Osmosis({ saltL: 0, saltR: 20 });
    this._bath = 'plain';
    this._fruits = [];
    this._soak = 0;
    this._won = false;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => { g.strokeStyle = c.labelMuted; g.lineWidth = 5; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x, y + 14); g.stroke(); g.setLineDash([]); }, text: 'a wall with holes of a set size' },
      { icon: (g, x, y) => { g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.strokeStyle = c.s7; g.lineWidth = 3; g.stroke(); g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fillStyle = c.s2; g.fill(); }, text: 'salt: big balls in a water shell', sub: 'water: small balls' },
      { icon: (g, x, y, t) => drawClockIcon(g, c, x, y, t), text: 'time is sped up', sub: 'the fruit sieves are a cartoon of Book V' },
    ];
  }

  enter(stage) {
    const preset = { [S_RIGHT]: ['none', 'lots'], [S_LEFT]: ['lots', 'none'], [S_EQUAL]: ['some', 'some'] }[stage];
    if (preset) [this._saltL, this._saltR] = preset;
    if (stage === S_LENS) [this._saltL, this._saltR] = ['none', 'lots'];
    this._big = false;
    this._reset();
    if (stage === S_BENCH) this._benchSet();
    if (stage === S_SKILL) this._skillSet();
  }

  _reset() {
    this._osm.set(SALT[this._saltL], SALT[this._saltR], this._big);
  }

  _benchSet() {
    this._fruits = [
      { label: 'cucumber', bath: 'strong brine', f: new Fruit({ kind: 'cucumber', solute: 12, water: 88, bath: 0.8, burstAt: 9 }) },
      { label: 'raisin', bath: 'plain water', f: new Fruit({ kind: 'raisin', solute: 10, water: 20, bath: 1.0, burstAt: 9 }) },
      { label: 'grape', bath: 'strong syrup', f: new Fruit({ kind: 'grape', solute: 15, water: 85, bath: 0.6, burstAt: 9 }) },
    ];
    this._soak = 0;
    this._soaking = false;
  }

  _skillSet() {
    this._fruits = [{ label: 'shrivelled raisin', bath: BATHS[this._bath].label, f: new Fruit({ kind: 'raisin', solute: 10, water: 20, bath: BATHS[this._bath].x, burstAt: 1.15 }) }];
    this._soak = 0;
    this._soaking = false;
    this._verdict = null;
  }

  isControlHidden(id) {
    const st = this.stage;
    if (st === S_LENS) return true;
    if (id === 'bath') return st !== S_SKILL;
    if (id === 'run') return false;
    if (st >= S_BENCH) return true;
    if (id === 'holes') return st !== S_EQUAL;
    return false;
  }

  getControlValue(id) {
    if (id === 'saltL') return this._saltL;
    if (id === 'saltR') return this._saltR;
    if (id === 'holes') return this._big ? 'big' : 'small';
    if (id === 'bath') return this._bath;
    return undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    if (id === 'saltL' && SALT[value] != null) { this._saltL = value; this._reset(); }
    else if (id === 'saltR' && SALT[value] != null) { this._saltR = value; this._reset(); }
    else if (id === 'holes') { this._big = value === 'big'; this._reset(); }
    else if (id === 'bath' && BATHS[value]) { this._bath = value; this._skillSet(); }
    else if (id === 'run') {
      if (this.stage >= S_BENCH) {
        if (this.stage === S_BENCH) this._benchSet(); else this._skillSet();
        this._soaking = true;
      } else { this._reset(); this._osm.running = true; }
    }
    this.requestUiUpdate?.();
  }

  update(d) {
    this._osm.step(d * 2);
    if (this._soaking) {
      this._soak += d;
      for (const fr of this._fruits) fr.f.step(d);
      if (this._soak > 8) {
        this._soaking = false;
        if (this.stage === S_SKILL) {
          const f = this._fruits[0].f;
          this._verdict = f.burst ? 'burst' : f.size() >= 0.85 ? 'plump' : 'still shrivelled';
          this._verdictAt = this.clock;
          if (this._verdict === 'plump') { this._won = true; this.celebrate(470, 220, 30); }
          this.requestUiUpdate?.();
        }
      }
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const st = this.stage;
    if (st >= S_BENCH) { this._drawBench(ctx, c, t); return; }
    const o = this._osm;
    drawTank(ctx, c, o, TANK.x, TANK.y, TANK.w, TANK.h, t);
    pill(ctx, c, `salt: ${this._saltL}`, TANK.x + TANK.w / 4, TANK.y - 24, { bg: c.s2, size: 14 });
    pill(ctx, c, `salt: ${this._saltR}`, TANK.x + (3 * TANK.w) / 4, TANK.y - 24, { bg: c.s2, size: 14 });
    if (st === S_LENS) return;
    const lv = (i) => Math.round(o.vol(i));
    drawReadout(ctx, c, 470, 110, 194, [
      { label: 'water, left', text: String(o.W[0]) },
      { label: 'water, right', text: String(o.W[1]) },
      { label: 'level, left', text: String(lv(0)), col: c.water },
      { label: 'level, right', text: String(lv(1)), col: c.water },
    ]);
    const hint = { [S_RIGHT]: 'salt on the right only: Run', [S_LEFT]: 'now salt on the left: Run', [S_EQUAL]: 'equal salt both sides: Run' }[st];
    if (!o.running) pill(ctx, c, hint, 40, 40, { bg: c.accent, size: 15, align: 'left', scale: 1 + 0.05 * Math.sin(t * 5) });
    else {
      const diff = lv(1) - lv(0);
      const txt = Math.abs(diff) < 6 ? 'the levels stay level' : diff > 0 ? 'the salty right side rises' : 'the salty left side rises';
      if (o.t > 4) pill(ctx, c, txt, 40, 40, { bg: c.water, size: 15, align: 'left' });
    }
  }

  _drawBench(ctx, c, t) {
    const skill = this.stage === S_SKILL;
    this._fruits.forEach((fr, i) => {
      const w = skill ? 300 : 200;
      const x = skill ? 190 : 20 + i * 220, y = 90;
      drawCard(ctx, c, x, y, w, 300);
      rr(ctx, x + 20, y + 120, w - 40, 150, 14);
      ctx.fillStyle = fr.bath.includes('syrup') ? c.broth : c.water;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
      drawFruit(ctx, c, fr.f, x + w / 2, y + 190, t);
      pill(ctx, c, fr.label, x + w / 2, y + 30, { bg: c.s5, size: 15 });
      pill(ctx, c, `in ${fr.bath}`, x + w / 2, y + 70, { bg: c.labelMuted, size: 14 });
      const sz = fr.f.size();
      pill(ctx, c, fr.f.burst ? 'burst!' : sz < 0.8 ? 'shrivelled' : 'plump', x + w / 2, y + 330, { bg: fr.f.burst ? c.bad : sz < 0.8 ? c.warning : c.good, size: 14 });
    });
    if (!this._soaking && this._soak === 0) {
      pill(ctx, c, skill ? 'pick a bath, then Run: plump, not burst' : 'predict each, then Run', 340, 40, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
    }
    if (this._soaking) pill(ctx, c, `soaking: ${Math.min(8, Math.ceil(this._soak))} of 8 hours`, 340, 40, { bg: c.labelMuted, size: 15 });
    if (skill && this._verdict) {
      const q = popAt(this.clock - (this._verdictAt ?? this.clock), 0);
      pill(ctx, c, this._verdict === 'plump' ? 'plump, not burst: exactly right!' : this._verdict === 'burst' ? 'too much water went in: burst' : 'not enough went in: try less salt', 340, 470, { bg: this._verdict === 'plump' ? c.good : c.bad, size: 15, ...(q || {}) });
    }
    if (skill && this._won) pill(ctx, c, 'skill done', 640, 40, { bg: c.good, size: 14, align: 'right' });
  }
}
