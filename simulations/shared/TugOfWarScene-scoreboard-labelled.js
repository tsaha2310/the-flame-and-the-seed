/**
 * TugOfWarScene (preset: scoreboard, labelled) - blk-l03-03-03-s03 (explain). The
 * score has a name, the oxidation number: examples, the ledger it is, hydrogen
 * burning as a redox with no ions, the rule, and carbon's whole range.
 *
 * Beats (six blocks, splitSteps() counts 6):
 *   0 Name     - oxidation number: the score if every pair went to the stronger puller.
 *   1 Examples - hydrogen in water +1, oxygen in water -2, anything tied 0.
 *   2 Ledger   - bookkeeping: nobody in water has lost a whole electron.
 *   3 Burning  - H 0 -> +1 (oxidised), O 0 -> -2 (reduced): a redox with no ions.
 *   4 Rule     - a score going up is oxidation; going down, reduction.
 *   5 Carbon   - methane -4 to carbon dioxide +4: one end to the other.
 *
 * Canvas: molecules and a sliding score dial; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, font, darken, drawHillBackdrop, drawCardBox, drawMolecule, arrow, MOLECULES, scores, stronger,
} from './TugKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
  [{ idx: 5, dwellMs: null }],
];
const S_NAME = 0, S_EX = 1, S_LEDGER = 2, S_BURN = 3, S_RULE = 4, S_CARBON = 5;
const METAL = { label: 'a lump of metal', atoms: [{ s: 'Mg', x: -44, y: -30 }, { s: 'Mg', x: 44, y: -30 }, { s: 'Mg', x: -44, y: 50 }, { s: 'Mg', x: 44, y: 50 }], bonds: [] };

/** Knots for a molecule, all handed to the stronger puller. */
function fair(mol) {
  return mol.bonds.map((b) => stronger(mol, b));
}

export class TugOfWarSceneScoreboardLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'The oxidation number is the score an atom would have if every shared pair went wholly to the stronger puller: ' +
    'hydrogen in water plus 1, oxygen in water minus 2, anything in hydrogen gas, oxygen gas or a lump of metal 0. ' +
    'It is bookkeeping. When hydrogen burns, hydrogen goes from 0 to plus 1 (oxidised) and oxygen from 0 to minus 2 ' +
    '(reduced). Carbon runs from minus 4 in methane to plus 4 in carbon dioxide.';

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const st = this.stage;
    const mol = (m, x, y, sc = 0.8) => drawMolecule(ctx, c, m, x, y, fair(m), t, { scores: scores(m, fair(m)), scale: sc });
    const say = (txt, bg, at, y = 480, x = 340) => {
      const q = popAt(this.age, at);
      if (q) pill(ctx, c, txt, x, y, { bg, size: 15, ...q });
    };
    if (st === S_NAME || st === S_LEDGER) {
      mol(MOLECULES.water, st === S_LEDGER ? 220 : 340, 240, 1);
      if (st === S_NAME) {
        say('the oxidation number', c.accent, 0.3, 40);
        say('the score if every pair went to the stronger puller', c.labelMuted, 1.0, 420);
      } else this._drawLedger(ctx, c);
    }
    if (st === S_EX) {
      mol(MOLECULES.water, 140, 230, 0.7);
      mol(MOLECULES.h2, 360, 230, 0.7);
      drawMolecule(ctx, c, METAL, 560, 220, [], t, { scale: 0.7 });
      pill(ctx, c, 'all 0', 560, 150, { bg: c.labelMuted, size: 14 });
      const lines = [['lost one: +1 (hydrogen in water)', c.s6, 0.3], ['gained two: \u22122 (oxygen in water)', c.s1, 0.9], ['tied: 0 (H\u2082, O\u2082, a lump of metal)', c.labelMuted, 1.5]];
      lines.forEach(([txt, col, at], i) => say(txt, col, at, 380 + i * 40));
    }
    if (st === S_BURN || st === S_RULE) this._drawBurn(ctx, c, t, mol, say);
    if (st === S_CARBON) this._drawCarbon(ctx, c, t, mol);
  }

  _drawLedger(ctx, c) {
    const x = 400, y = 150, w = 250, h = 190;
    drawCardBox(ctx, c, x, y, w, h);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('the ledger (water)', x + 14, y + 22);
    const rows = [['oxygen', '\u22122'], ['hydrogen', '+1'], ['hydrogen', '+1'], ['total', '0']];
    rows.forEach(([a, b], i) => {
      const ry = y + 58 + i * 32;
      ctx.strokeStyle = darken(c.stroke, 0.1);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 14, ry + 14);
      ctx.lineTo(x + w - 14, ry + 14);
      ctx.stroke();
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 15);
      ctx.textAlign = 'left';
      ctx.fillText(a, x + 14, ry);
      ctx.textAlign = 'right';
      ctx.fillText(b, x + w - 14, ry);
    });
    const q = popAt(this.age, 0.8);
    if (q) pill(ctx, c, 'bookkeeping: nobody lost a whole electron', 340, 420, { bg: c.labelMuted, size: 15, ...q });
    const q2 = popAt(this.age, 1.6);
    if (q2) pill(ctx, c, 'it shows a redox where no ion forms', 340, 464, { bg: c.accent, size: 15, ...q2 });
  }

  _drawBurn(ctx, c, t, mol, say) {
    mol(MOLECULES.h2, 120, 170, 0.6);
    mol(MOLECULES.o2, 120, 300, 0.6);
    arrow(ctx, 250, 235, 330, 235, c.labelMuted, 6);
    mol(MOLECULES.water, 490, 230, 0.9);
    pill(ctx, c, 'hydrogen burning', 340, 40, { bg: c.flame, size: 15 });
    if (this.stage === S_BURN) {
      say('H: 0 \u2192 +1, up: oxidised', c.s6, 0.4, 400);
      say('O: 0 \u2192 \u22122, down: reduced', c.s1, 1.1, 440);
      say('a redox with no ions anywhere', c.labelMuted, 1.8, 484);
    } else {
      const q = popAt(this.age, 0.3);
      if (q) {
        arrow(ctx, 600, 190, 600, 110, c.s6, 6);
        pill(ctx, c, 'score up: oxidation', 590, 94, { bg: c.s6, size: 15, align: 'right', ...q });
      }
      const q2 = popAt(this.age, 1.0);
      if (q2) {
        arrow(ctx, 620, 290, 620, 370, c.s1, 6);
        pill(ctx, c, 'score down: reduction', 610, 390, { bg: c.s1, size: 15, align: 'right', ...q2 });
      }
      say('hand every pair to the stronger puller, and count', c.accent, 1.8, 484);
    }
  }

  /** Methane and carbon dioxide with carbon's score on a -4..+4 dial. */
  _drawCarbon(ctx, c, t, mol) {
    mol(MOLECULES.methane, 160, 190, 0.6);
    mol(MOLECULES.co2, 500, 190, 0.6);
    const x0 = 120, x1 = 560, y = 380;
    rr(ctx, x0, y - 8, x1 - x0, 16, 8);
    ctx.fillStyle = c.raised;
    ctx.fill();
    for (let v = -4; v <= 4; v++) {
      const x = x0 + ((v + 4) / 8) * (x1 - x0);
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 14);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(v > 0 ? `+${v}` : v < 0 ? `\u2212${-v}` : '0', x, y + 26);
    }
    const u = 0.5 - 0.5 * Math.cos(Math.min(1, Math.max(0, (this.age - 1) / 2.5)) * Math.PI);
    const mx = x0 + u * (x1 - x0);
    ctx.beginPath();
    ctx.arc(mx, y, 14, 0, Math.PI * 2);
    ctx.fillStyle = c.flame;
    ctx.fill();
    pill(ctx, c, 'carbon\'s score', mx, y - 34, { bg: c.flame, size: 14 });
    pill(ctx, c, 'methane: \u22124', 160, 300, { bg: c.s1, size: 14 });
    pill(ctx, c, 'carbon dioxide: +4', 500, 300, { bg: c.s6, size: 14 });
    const q = popAt(this.age, 3.6);
    if (q) pill(ctx, c, 'burning methane: one end to the other', 340, 480, { bg: c.accent, size: 15, ...q });
  }
}
