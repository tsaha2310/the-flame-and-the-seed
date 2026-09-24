/**
 * CarbonWorkshopScene (labelled) - blk-l04-01-02-s03 (explain). The bench with
 * the words laid on: chains, branches, rings, double and triple bonds; the carbon
 * skeleton; the two facts (four directions, a strong bond to itself); the rule;
 * and a grain of rice.
 *
 * Beats (five paragraphs, splitSteps() counts 5):
 *   0 Shapes    - chain, branched chain, ring, double bond, triple bond, in turn.
 *   1 Skeleton  - hide the hydrogens: the carbon skeleton.
 *   2 Two facts - four directions; C-C about as strong as C-H and C-O: no weak link.
 *   3 Rule      - four directions and strong bonds to itself.
 *   4 Rice      - chains thousands long with sugar rings hung along them.
 *
 * Canvas: molecules; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, rr, font, drawHillBackdrop, drawCardBox, drawMolAt, makeMol, BOND_KJ } from './CarbonKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_SHAPES = 0, S_SKEL = 1, S_FACTS = 2, S_RULE = 3, S_RICE = 4;
const KINDS = [['chain', 'a chain'], ['branched', 'a branched chain'], ['ring', 'a ring'], ['double', 'a double bond'], ['triple', 'a triple bond']];

export class CarbonWorkshopSceneLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'Carbon joins to carbon in chains, branched chains and rings, and can share two or three pairs with a neighbour. ' +
    'The carbon framework without its hydrogens is the carbon skeleton. Carbon builds because it bonds in four ' +
    'directions and its bond to itself is about as strong as its bonds to hydrogen and oxygen, so a chain has no ' +
    'weak link and can be as long as you like.';

  constructor(container, config) {
    super(container, config);
    this._i = 0;
  }

  enter() { this._i = 0; this._t = 0; }

  update(d) {
    this._t += d;
    if (this.stage === S_SHAPES && this._t > 2.4) { this._t = 0; this._i = (this._i + 1) % KINDS.length; }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const st = this.stage;
    const say = (txt, bg, at, x = 340, y = 470) => {
      const q = popAt(this.age, at);
      if (q) pill(ctx, c, txt, x, y, { bg, size: 15, ...q });
    };
    if (st === S_SHAPES) {
      const [kind, name] = KINDS[this._i];
      drawMolAt(ctx, c, makeMol(kind), 340, 260, 1.5, { t, jiggle: 1 });
      pill(ctx, c, name, 340, 60, { bg: c.accent, size: 16 });
      say('every carbon: four bonds, four corners', c.labelMuted, 0.4);
    }
    if (st === S_SKEL) {
      drawMolAt(ctx, c, makeMol('branched'), 340, 250, 1.5, { t, hideH: Math.floor(this.age / 2) % 2 === 1 });
      pill(ctx, c, Math.floor(this.age / 2) % 2 === 1 ? 'the carbon skeleton' : 'with its hydrogens', 340, 60, { bg: c.accent, size: 16 });
      say('everything from here: a skeleton with things hung on it', c.labelMuted, 0.8);
    }
    if (st === S_FACTS || st === S_RULE) {
      this._drawDirections(ctx, c, 170, 240, t);
      this._drawStrengths(ctx, c, 330, 150);
      if (st === S_FACTS) say('no weak link: as strong in the middle as at the ends', c.good, 1.2);
      else {
        say('four directions, and strong bonds to itself', c.accent, 0.3, 340, 60);
        say('chains, branches and rings follow', c.good, 1.0);
      }
    }
    if (st === S_RICE) this._drawRice(ctx, c, t, say);
  }

  _drawDirections(ctx, c, x, y, t) {
    const a = t * 0.6;
    const dirs = [[0, -1, 0], [0.94, 0.33, 0], [-0.47, 0.33, 0.82], [-0.47, 0.33, -0.82]];
    for (const [dx, dy, dz] of dirs) {
      const rx = dx * Math.cos(a) + dz * Math.sin(a);
      const z = -dx * Math.sin(a) + dz * Math.cos(a);
      const ex = x + rx * 80, ey = y + dy * 80;
      ctx.strokeStyle = c.label;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, ey, 11 + z * 3, 0, Math.PI * 2);
      ctx.fillStyle = c.s1;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fillStyle = c.waste;
    ctx.fill();
    pill(ctx, c, 'four directions, in 3D', x, y + 110, { bg: c.s1, size: 14 });
  }

  _drawStrengths(ctx, c, x, y) {
    drawCardBox(ctx, c, x, y, 320, 170);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('average bond strength, kJ/mol', x + 12, y + 20);
    ['C-C', 'C-H', 'C-O'].forEach((k, i) => {
      const ry = y + 58 + i * 38;
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 15);
      ctx.textAlign = 'left';
      ctx.fillText(k, x + 12, ry);
      rr(ctx, x + 60, ry - 9, (BOND_KJ[k] / 450) * 200, 18, 9);
      ctx.fillStyle = k === 'C-C' ? c.good : c.labelMuted;
      ctx.fill();
      ctx.fillStyle = c.label;
      ctx.textAlign = 'right';
      ctx.fillText(String(BOND_KJ[k]), x + 308, ry);
    });
  }

  _drawRice(ctx, c, t, say) {
    // A long wavy chain with sugar rings hung along it, running off both edges.
    ctx.strokeStyle = c.label;
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = -20; x <= 700; x += 6) {
      const y = 250 + Math.sin(x * 0.02 + t * 0.4) * 40;
      if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let k = 0; k < 9; k++) {
      const x = 20 + k * 80, y = 250 + Math.sin(x * 0.02 + t * 0.4) * 40;
      ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2;
        const px = x + Math.cos(a) * 16, py = y - 34 + Math.sin(a) * 16;
        if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = c.broth;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 18);
      ctx.stroke();
    }
    pill(ctx, c, 'a grain of rice', 340, 80, { bg: c.broth, size: 16 });
    say('chains thousands of carbons long, sugar rings along them', c.labelMuted, 0.6, 340, 420);
    say('there is no upper limit', c.accent, 1.4);
  }
}
