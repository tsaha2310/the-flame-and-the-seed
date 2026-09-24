/**
 * CarbonWorkshopScene (preset: silicon) - attached to two slides:
 *   blk-l04-01-03-s02 (hinge, observe; 5 beats) and blk-l04-01-03-s03 (what-if; 3 beats).
 * The bench with carbon swapped for silicon: build chains and read the bond
 * strengths, leave them in air, and burn them. The host passes each slide's beat
 * count, so each slide gets its own map (BEAT_MAPS); BEAT_STEP_MAP is the 5-beat one.
 *
 * Beats, 5-beat slide:
 *   0 Lens    - silicon as a larger grey ball; bond strengths real; the burn test from data.
 *   1 Five    - a five-silicon chain: Si-Si 222 against C-C 348 kJ/mol.
 *   2 Ten     - a ten-chain in air: it breaks up as oxygen takes each silicon.
 *   3 Silane  - SiH4 in air catches fire; methane does not.
 *   4 Burn    - carbon burns to a gas that floats away; silicon to sand.
 * Beats, 3-beat slide (STEP ids setup / run / nails):
 *   0 setup - Kabir's carbon creature holds; predict the silicon one.
 *   1 run   - the swap: it falls apart in air and burns to a heap of sand.
 *   2 nails - carbon's chains are strong and its oxide a gas; silicon's the reverse.
 *
 * Canvas: molecules breaking, burning, floating off or heaping; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, darken, lighten, mix, drawHillBackdrop, drawFlame, Mol, drawMol, drawBenchCard, BOND_KJ,
  mulberry32,
} from './CarbonKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const WHATIF_MAP = [
  [{ idx: 10, dwellMs: null }],
  [{ idx: 11, dwellMs: null }],
  [{ idx: 12, dwellMs: null }],
];
const S_LENS = 0, S_FIVE = 1, S_TEN = 2, S_SILANE = 3, S_BURN = 4, W_SETUP = 10, W_RUN = 11, W_NAILS = 12;
const BOX = { x0: 30, y0: 120, x1: 440, y1: 330 };

export class CarbonWorkshopSceneSilicon extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static BEAT_MAPS = { 5: BEAT_STEP_MAP, 3: WHATIF_MAP };
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'The carbon workbench with silicon in place of carbon. The silicon-silicon bond is about 222 kilojoules per mole, ' +
    'much weaker than carbon-carbon at 348, and silicon-oxygen at 452 is stronger than either, so silicon chains fall ' +
    'apart in air and silane catches fire. Burned, carbon gives carbon dioxide, a gas that floats away; silicon gives ' +
    'silicon dioxide, sand, solid even at a thousand degrees.';

  static CONTROLS = [
    { type: 'select', id: 'el', label: 'Element:', options: [{ value: 'Si', label: 'silicon' }, { value: 'C', label: 'carbon' }] },
    { type: 'button', id: 'air', label: 'Leave it in air' },
    { type: 'button', id: 'burn', label: 'Burn it' },
    { type: 'button', id: 'off', label: 'Carbon', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Swap in silicon', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._el = 'Si';
    this._dialled = false;
    this._rnd = mulberry32(23);
    this._build('five');
  }

  _whatif() { return this.stage >= W_SETUP; }

  _build(kind) {
    const m = new Mol(this._el);
    if (kind === 'single') { m.add(-1, BOX); m.atoms[0] = { x: 235, y: 225 }; }
    else m.chain(kind === 'ten' ? 10 : 5, BOX);
    m.sel = -1;
    this._m = m;
    this._kind = kind;
    this._air = -1;          // seconds in air (-1: not in air)
    this._burn = -1;         // seconds burning
    this._broken = new Set();
    this._oxy = [];          // oxygen atoms that have taken a silicon: { x, y }
    this._puffs = [];
  }

  enter(stage) {
    this._dialled = false;
    if (stage >= W_SETUP) { this.mode = 'off'; this._el = 'C'; this._build('ten'); return; }
    this._el = 'Si';
    this._build(stage === S_TEN ? 'ten' : stage === S_SILANE ? 'single' : 'five');
  }

  isControlHidden(id) {
    const st = this.stage;
    if (st === S_LENS) return true;
    if (id === 'off' || id === 'on') return !this._whatif() || st === W_SETUP;
    if (this._whatif()) return true;
    if (id === 'air') return st < S_TEN || st === S_BURN;
    if (id === 'burn') return st < S_BURN;
    return false;
  }

  getControlValue(id) {
    return id === 'el' ? this._el : undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    if (id === 'el' && (value === 'C' || value === 'Si')) { this._el = value; this._build(this._kind); }
    else if (id === 'air') { this._build(this._kind); this._air = 0; }
    else if (id === 'burn') { this._build(this._kind); this._burn = 0; }
    else if (id === 'on' || id === 'off') {
      this.mode = id;
      this._dialled = true;
      this._el = id === 'on' ? 'Si' : 'C';
      this._build('ten');
      this._air = 0;
    }
    this.requestUiUpdate?.();
  }

  update(d) {
    const m = this._m;
    if (this._air >= 0) {
      this._air += d;
      // In air, oxygen takes silicon: Si-Si bonds break and an O sits at each break.
      if (m.el === 'Si' && m.bonds.length > this._broken.size && this._rnd() < d * 1.4) {
        const left = m.bonds.map((b, i) => i).filter((i) => !this._broken.has(i));
        const bi = left[Math.floor(this._rnd() * left.length)];
        this._broken.add(bi);
        const b = m.bonds[bi], A = m.atoms[b.a], B = m.atoms[b.b];
        this._oxy.push({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 - 18 });
      }
      if (this._whatif() && m.el === 'Si' && this._air > 4 && this._burn < 0) this._burn = 0;
      // Broken pieces drift a little apart.
      const pieces = m.pieces(this._broken);
      if (pieces.length > 1 && this._air < 5) {
        pieces.forEach((p, k) => {
          const dx = (k - (pieces.length - 1) / 2) * 3 * d, dy = Math.sin(k * 2.1) * 4 * d;
          for (const i of p) { m.atoms[i].x += dx; m.atoms[i].y += dy; }
        });
      }
    }
    if (this._burn >= 0) {
      this._burn += d;
      if (m.el === 'C' && this._burn > 1 && this._rnd() < d * 6) this._puffs.push({ x: 60 + this._rnd() * 340, y: 280, t: 0 });
      for (const p of this._puffs) { p.t += d; p.y -= 50 * d; }
      this._puffs = this._puffs.filter((p) => p.y > -30);
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const m = this._m, st = this.stage;
    const burning = this._burn >= 0 && this._burn < 2.5;
    const gone = this._burn >= 2.5;
    if (!gone) {
      ctx.save();
      if (this._burn >= 0) ctx.globalAlpha = Math.max(0, 1 - this._burn / 2.5);
      drawMol(ctx, c, m, { t, jiggle: 1.5, broken: this._broken });
      ctx.restore();
    }
    for (const o of this._oxy) {
      if (gone) break;
      ctx.beginPath();
      ctx.arc(o.x, o.y, 11, 0, Math.PI * 2);
      ctx.fillStyle = c.s6;
      ctx.fill();
    }
    if (burning || (this._kind === 'single' && m.el === 'Si' && this._air > 0.8)) {
      for (let k = 0; k < 4; k++) drawFlame(ctx, c, 90 + k * 90, 260, 1.2, t + k);
    }
    if (gone && m.el === 'Si') this._sand(ctx, c);
    for (const p of this._puffs) this._co2(ctx, c, p.x, p.y);
    this._readouts(ctx, c);
    if (st === S_LENS) return;
    this._chips(ctx, c, t);
  }

  _readouts(ctx, c) {
    const m = this._m;
    const e = m.el;
    const longest = String(Math.max(...m.pieces(this._broken).map((p) => p.length)));
    const rows = [
      { label: `${e}-${e} bond`, text: `${BOND_KJ[`${e}-${e}`]} kJ/mol`, col: e === 'Si' ? c.bad : null },
      { label: 'C-C', text: `${BOND_KJ['C-C']} kJ/mol` },
      { label: 'Si-O bond', text: `${BOND_KJ['Si-O']} kJ/mol` },
      { label: 'longest chain', text: longest },
    ];
    if (this._burn >= 2.5) rows.push({ label: 'oxide', text: e === 'Si' ? 'SiO2: solid (sand)' : 'CO2: a gas' });
    drawBenchCard(ctx, c, 452, 70, 212, rows, 'the bench says');
  }

  _chips(ctx, c, t) {
    const st = this.stage, m = this._m;
    const say = (txt, bg, at, x = 235, y = 470) => {
      const q = popAt(this.age, at);
      if (q) pill(ctx, c, txt, x, y, { bg, size: 15, ...q });
    };
    if (st === S_FIVE) say('silicon to silicon: about half as strong', c.bad, 0.5);
    if (st === S_TEN) pill(ctx, c, this._air < 0 ? 'press Leave it in air' : m.el === 'Si' ? 'every silicon would rather hold oxygen' : 'carbon holds', 235, 470, { bg: this._air < 0 ? c.accent : m.el === 'Si' ? c.bad : c.good, size: 15 });
    if (st === S_SILANE) pill(ctx, c, this._air < 0 ? (m.el === 'Si' ? 'silane, SiH4: press Leave it in air' : 'methane, CH4: press Leave it in air') : m.el === 'Si' ? 'it catches fire on contact with air' : 'methane just sits there', 235, 470, { bg: this._air < 0 ? c.accent : m.el === 'Si' ? c.bad : c.good, size: 15 });
    if (st === S_BURN) pill(ctx, c, this._burn < 0 ? 'press Burn it' : m.el === 'Si' ? 'silicon dioxide: sand, solid at 1000 \u00b0C' : 'carbon dioxide: a gas that floats away', 235, 470, { bg: this._burn < 0 ? c.accent : m.el === 'Si' ? c.wood : c.s1, size: 15 });
    if (st === W_SETUP) {
      pill(ctx, c, 'Kabir\'s creature, built of carbon', 235, 70, { bg: c.labelMuted, size: 15 });
      say('predict: the silicon version?', c.accent, 1.0);
    }
    if (st === W_RUN && !this._dialled) pill(ctx, c, 'turn the dial', 235, 470, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === W_RUN && this.mode === 'on') pill(ctx, c, this._burn >= 2.5 ? 'it would breathe out sand' : 'it falls apart in air', 235, 470, { bg: c.bad, size: 15 });
    if (st === W_NAILS) {
      say('carbon: strong chains, a gas for waste', c.good, 0.4, 235, 430);
      say('silicon: weak chains, a rock for waste', c.bad, 1.2);
    }
  }

  _sand(ctx, c) {
    const col = darken(c.wood, 0.1);
    ctx.beginPath();
    ctx.moveTo(120, 330);
    ctx.quadraticCurveTo(235, 250, 350, 330);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    const rnd = mulberry32(3);
    for (let i = 0; i < 40; i++) {
      const x = 140 + rnd() * 190, y = 300 + rnd() * 28;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = lighten(col, 0.3);
      ctx.fill();
    }
  }

  _co2(ctx, c, x, y) {
    for (const [dx, col, r] of [[-16, c.s6, 8], [0, mix(c.waste, c.labelMuted, 0.15), 9], [16, c.s6, 8]]) {
      ctx.beginPath();
      ctx.arc(x + dx, y, r, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
    }
  }
}
