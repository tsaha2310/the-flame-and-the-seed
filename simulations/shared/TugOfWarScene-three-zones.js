/**
 * TugOfWarScene (preset: three-zones) - blk-l02-01-03-s03 (explain). The three
 * places the knot can sit, with their names: shared (a covalent bond), stolen
 * (ions), in between (uneven, II.3); sugar as all shared pairs, the rule, and
 * double and triple bonds.
 *
 * Beats (seven paragraphs, splitSteps() counts 7):
 *   0 Shared   - chlorine and chlorine: the knot in the middle; each counts eight.
 *   1 Covalent - a shared pair joins exactly two atoms, tightly.
 *   2 Stolen   - sodium and chlorine: all the way across; ions.
 *   3 Between  - hydrogen and oxygen: off-centre; the reason water is water.
 *   4 Sugar    - all shared pairs: molecules float apart whole; the LED stays dark.
 *   5 Rule     - equal pulls share; a molecule is atoms held by shared pairs.
 *   6 Doubles  - O=O shares two pairs; N-N shares three.
 *
 * Canvas: ropes, orbiting shells, floating molecules; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, drawHillBackdrop, drawTug, drawShells, drawCircuit, drawMolecule, knotTarget, MOLECULES,
} from './TugKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
  [{ idx: 5, dwellMs: null }],
  [{ idx: 6, dwellMs: null }],
];
const S_SHARED = 0, S_COV = 1, S_STOLEN = 2, S_BETWEEN = 3, S_SUGAR = 4, S_RULE = 5, S_DOUBLE = 6;
const PAIR = { [S_SHARED]: ['Cl', 'Cl'], [S_COV]: ['Cl', 'Cl'], [S_STOLEN]: ['Na', 'Cl'], [S_BETWEEN]: ['H', 'O'], [S_RULE]: ['Cl', 'Cl'] };
const N2 = { label: 'nitrogen, N\u2082', atoms: [{ s: 'N', x: -100, y: 0 }, { s: 'N', x: 100, y: 0 }], bonds: [{ a: 0, b: 1, n: 3 }] };

export class TugOfWarSceneThreeZones extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'When two atoms pull almost equally the shared pair sits in the middle and belongs to both: a covalent bond, ' +
    'joining exactly two atoms tightly. When one pulls far harder the pair is stolen and ions form. In between, it is ' +
    'shared unevenly, as in water. Sugar is all shared pairs, so its solution does not conduct. Oxygen shares two ' +
    'pairs, nitrogen three.';

  constructor(container, config) {
    super(container, config);
    this._k = 0;
  }

  enter() {
    this._k = 0;
  }

  update(d) {
    const p = PAIR[this.stage];
    if (p) this._k += (knotTarget(p[0], p[1]) - this._k) * Math.min(1, d * 2.5);
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const st = this.stage;
    const say = (txt, bg, at, y = 470, x = 340) => {
      const q = popAt(this.age, at);
      if (q) pill(ctx, c, txt, x, y, { bg, size: 15, ...q });
    };
    if (PAIR[st]) {
      const [a, b] = PAIR[st];
      drawTug(ctx, c, a, b, this._k, 140, 540, 130, t, { charges: true });
    }
    if (st === S_SHARED) {
      drawShells(ctx, c, 'Cl', 292, 340, t, { r0: 18, dr: 17 });
      drawShells(ctx, c, 'Cl', 388, 340, -t, { r0: 18, dr: 17 });
      // The shared pair, in both outer shells at once.
      for (const dy of [-8, 8]) {
        ctx.beginPath();
        ctx.arc(340, 340 + dy, 7, 0, Math.PI * 2);
        ctx.fillStyle = c.warning;
        ctx.fill();
        ctx.strokeStyle = c.label;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      say('the pair belongs to both', c.good, 0.6, 30);
      say('each counts eight in its outer shell', c.s3, 1.4);
    }
    if (st === S_COV) {
      say('a covalent bond', c.good, 0.3, 30);
      say('it joins exactly two atoms, tightly', c.s3, 1.0);
    }
    if (st === S_STOLEN) {
      say('all the way across: stolen', c.bad, 0.3, 30);
      say('the steal from lesson two: ions', c.bad, 1.0);
    }
    if (st === S_BETWEEN) {
      say('in between: shared unevenly', c.warning, 0.3, 30);
      say('its own module, II.3: why water is water', c.labelMuted, 1.0);
    }
    if (st === S_SUGAR) this._drawSugar(ctx, c, t);
    if (st === S_RULE) {
      say('equal pulls: they share a pair', c.good, 0.3, 30);
      say('a molecule: atoms held by shared pairs', c.accent, 1.0);
    }
    if (st === S_DOUBLE) {
      drawMolecule(ctx, c, MOLECULES.o2, 340, 170, [0], t);
      pill(ctx, c, 'oxygen: two shared pairs, a double bond', 340, 250, { bg: c.s6, size: 15 });
      drawMolecule(ctx, c, N2, 340, 360, [0], t);
      const q = popAt(this.age, 0.8);
      if (q) pill(ctx, c, 'nitrogen: three, a triple bond', 340, 440, { bg: c.s1, size: 15, ...q });
      const q2 = popAt(this.age, 1.6);
      if (q2) pill(ctx, c, 'so the air\'s nitrogen does almost nothing', 340, 484, { bg: c.labelMuted, size: 14, ...q2 });
    }
  }

  _drawSugar(ctx, c, t) {
    drawCircuit(ctx, c, 340, 250, 0, t, {});
    for (let i = 0; i < 6; i++) {
      const x = 306 + ((i * 23 + t * 8) % 60), y = 280 + ((i * 31) % 70);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + t * 0.3 + i;
        const px = x + Math.cos(a) * 9, py = y + Math.sin(a) * 9;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = c.label;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    pill(ctx, c, 'sugar water: whole molecules, no charge', 340, 30, { bg: c.s2, size: 15 });
    pill(ctx, c, 'LED: dark', 436, 152, { bg: c.labelMuted, size: 14, align: 'left' });
    const q = popAt(this.age, 1.0);
    if (q) pill(ctx, c, 'C, H and O: none can steal from the others', 340, 470, { bg: c.labelMuted, size: 14, ...q });
  }
}
