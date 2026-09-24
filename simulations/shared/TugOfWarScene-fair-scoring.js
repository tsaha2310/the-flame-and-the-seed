/**
 * TugOfWarScene (preset: fair-scoring) - blk-l03-03-03-s05 (what-if). Kabir's
 * fair scoreboard splits every shared pair evenly whatever the pull. Every atom
 * in every molecule scores zero, so hydrogen burning, methane burning and the
 * seed's slow burn all show "no change": it cannot tell a fire from a puddle.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - the real scoreboard: three burnings, each with a score that changes.
 *   1 run   - the switch; every score flattens to zero; "no change" everywhere.
 *   2 nails - handing pairs to the stronger puller is what makes the score show.
 *
 * Canvas: molecules re-scored as the knots slide; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, drawHillBackdrop, drawCardBox, drawMolecule, drawFlame, MOLECULES, stronger, scoreText } from './TugKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;
// Glucose shown by its carbon's average score: 0 (C6H12O6).
const ROWS = [
  { title: 'hydrogen burning', from: 'h2', to: 'water', atom: 'H', real: [0, 1] },
  { title: 'methane burning', from: 'methane', to: 'co2', atom: 'C', real: [-4, 4] },
  { title: 'the seed\'s slow burn', from: null, to: 'co2', atom: 'C', real: [0, 4] },
];

export class TugOfWarSceneFairScoring extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'Three burnings on the scoreboard: hydrogen, methane, and glucose in the seed. Handing each shared pair to the ' +
    'stronger puller, the burning atom\'s score goes up in each: a redox. With every pair split evenly instead, every ' +
    'atom scores zero before and after, and all three show no change, like a puddle.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Split every pair evenly: OFF', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Split every pair evenly: ON', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._f = 0;
    this._dialled = false;
  }

  enter() {
    this.mode = 'off';
    this._dialled = false;
  }

  isControlHidden() { return this.stage === S_SETUP; }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'on' || id === 'off') { this.mode = id; this._dialled = true; }
    this.requestUiUpdate?.();
  }

  update(d) {
    this._f += ((this.mode === 'on' ? 1 : 0) - this._f) * Math.min(1, d * 3);
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const fairOn = this.mode === 'on';
    const k = 1 - this._f;
    ROWS.forEach((r, i) => {
      const y = 58 + i * 130;
      drawCardBox(ctx, c, 16, y, 648, 118);
      drawFlame(ctx, c, 44, y + 72, 0.9, t + i);
      pill(ctx, c, r.title, 70, y + 22, { bg: c.flame, size: 14, align: 'left' });
      const show = (key, x) => {
        if (!key) {
          pill(ctx, c, 'glucose', x, y + 70, { bg: c.s2, size: 14 });
          return;
        }
        const m = MOLECULES[key];
        const knots = m.bonds.map((b) => stronger(m, b) * k);
        drawMolecule(ctx, c, m, x, y + 66, knots, t, { scale: 0.45 });
      };
      show(r.from, 210);
      pill(ctx, c, '\u2192', 330, y + 70, { bg: c.labelMuted, size: 14 });
      show(r.to, 450);
      const [a, b] = fairOn && this._f > 0.5 ? [0, 0] : r.real;
      const same = a === b;
      pill(ctx, c, same ? 'no change' : `${r.atom}: ${scoreText(a)} \u2192 ${scoreText(b)}`, 650, y + 22, { bg: same ? c.labelMuted : c.s6, size: 14, align: 'right' });
    });
    const st = this.stage;
    pill(ctx, c, fairOn ? 'fair scoring: every pair split' : 'the real scoreboard', 16, 26, { bg: fairOn ? c.bad : c.good, size: 14, align: 'left' });
    if (st === S_SETUP) {
      const q = popAt(this.age, 1.0);
      if (q) pill(ctx, c, 'predict: is hydrogen burning still a redox?', 340, 500, { bg: c.accent, size: 15, ...q });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the dial', 664, 26, { bg: c.accent, size: 14, align: 'right', scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_RUN && fairOn) {
      const q = popAt(this.age, 0.8);
      if (q) pill(ctx, c, 'it cannot tell a fire from a puddle', 340, 500, { bg: c.bad, size: 15, ...q });
    }
    if (st === S_NAILS) {
      const q = popAt(this.age, 0.5);
      if (q) pill(ctx, c, 'handing pairs to the stronger puller shows the redox', 340, 500, { bg: c.good, size: 15, ...q });
    }
  }
}
