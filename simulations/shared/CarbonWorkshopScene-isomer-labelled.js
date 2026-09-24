/**
 * CarbonWorkshopScene (preset: isomer, labelled) - blk-l04-02-02-s03 (explain).
 * Isomers, alkenes and alkynes with the words laid on: counts by formula, the
 * three pentanes, ethene and ethyne, the lock of a double bond, and the rule.
 *
 * Beats (five paragraphs, splitSteps() counts 5):
 *   0 Isomers  - C4H10 2, C5H12 3, C6H14 5, C10H22 75; each its own boiling point.
 *   1 Alkene   - two carbons, four hydrogens: a double bond. Ethene ripens bananas.
 *   2 Alkyne   - two hydrogens: a triple bond. Ethyne in a welding torch.
 *   3 The lock - a single bond spins; a double bond keeps its kink.
 *   4 Rule     - same atoms, different arrangements: isomers.
 *
 * Canvas: molecules, one spinning; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, font, darken, drawHillBackdrop, drawCardBox, drawFlame, drawMolAt, isomerMol, makeMol,
  spunMol,
} from './CarbonKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_ISO = 0, S_ENE = 1, S_YNE = 2, S_LOCK = 3, S_RULE = 4;
const PENTANES = [['pentane', 36], ['isopentane', 28], ['neopentane', 10]];

export class CarbonWorkshopSceneIsomerLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'C4H10 has two arrangements, C5H12 three, C6H14 five and C10H22 seventy-five; each is a different molecule, an ' +
    'isomer, with its own boiling point. Two carbons with four hydrogens need a double bond: ethene, an alkene. Two ' +
    'carbons with two hydrogens need a triple bond: ethyne, an alkyne. A single bond spins freely; a double bond locks ' +
    'a kink in place.';

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const st = this.stage;
    const say = (txt, bg, at, x = 340, y = 480) => {
      const q = popAt(this.age, at);
      if (q) pill(ctx, c, txt, x, y, { bg, size: 15, ...q });
    };
    if (st === S_ISO || st === S_RULE) {
      PENTANES.forEach(([name, bp], i) => {
        const x = 130 + i * 210;
        drawMolAt(ctx, c, isomerMol(name), x, 220, 0.95, { t, showSel: false });
        pill(ctx, c, `boils at ${bp} \u00b0C`, x, 320, { bg: c.s2, size: 14 });
      });
      pill(ctx, c, 'C5H12: three isomers', 340, 60, { bg: c.accent, size: 16 });
      if (st === S_ISO) this._counts(ctx, c);
      else {
        say('same atoms, different arrangements: isomers', c.accent, 0.3, 340, 400);
        say('double and triple bonds: two more ways to differ', c.labelMuted, 1.0);
      }
    }
    if (st === S_ENE) {
      drawMolAt(ctx, c, this._ene(), 250, 240, 1.8, { t, showSel: false });
      this._banana(ctx, c, 520, 240, t);
      say('not enough hydrogens: the carbons share two pairs', c.s1, 0.3, 340, 70);
      say('an alkene. Ethene ripens bananas', c.broth, 1.1, 340, 440);
    }
    if (st === S_YNE) {
      drawMolAt(ctx, c, makeMol('triple'), 250, 240, 1.8, { t, showSel: false });
      drawFlame(ctx, c, 520, 280, 2.4, t);
      rr(ctx, 470, 290, 110, 22, 8);
      ctx.fillStyle = darken(c.labelMuted, 0.3);
      ctx.fill();
      say('two hydrogens: three shared pairs', c.s1, 0.3, 340, 70);
      say('an alkyne. Ethyne burns in a welding torch', c.flame, 1.1, 340, 440);
    }
    if (st === S_LOCK) {
      const ph = t * 2;
      drawMolAt(ctx, c, spunMol(isomerMol('butane'), 1, ph), 180, 230, 1.4, { t, showSel: false });
      drawMolAt(ctx, c, isomerMol('butene'), 500, 230, 1.4, { t, showSel: false });
      pill(ctx, c, 'single bond: spins like beads', 180, 360, { bg: c.s1, size: 14 });
      pill(ctx, c, 'double bond: a fixed kink', 500, 360, { bg: c.s5, size: 14 });
      say('a double bond locks', c.accent, 0.5, 340, 70);
      say('tomorrow\'s module hangs on that kink', c.labelMuted, 1.3);
    }
  }

  _ene() {
    const m = makeMol('triple');
    m.setOrder(0, 2);
    return m;
  }

  _counts(ctx, c) {
    const x = 170, y = 360, w = 340;
    drawCardBox(ctx, c, x, y, w, 110);
    ctx.textBaseline = 'middle';
    [['C4H10', 2], ['C5H12', 3], ['C6H14', 5], ['C10H22', 75]].forEach(([f, n], i) => {
      const cx = x + 44 + i * 84;
      ctx.fillStyle = c.labelMuted;
      ctx.font = font(c, 800, 14);
      ctx.textAlign = 'center';
      ctx.fillText(f, cx, y + 30);
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 26, true);
      ctx.fillText(String(n), cx, y + 72);
    });
  }

  _banana(ctx, c, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.4 + Math.sin(t) * 0.05);
    ctx.beginPath();
    ctx.moveTo(-70, 0);
    ctx.quadraticCurveTo(0, 70, 70, 0);
    ctx.quadraticCurveTo(0, 40, -70, 0);
    ctx.closePath();
    ctx.fillStyle = c.broth;
    ctx.fill();
    ctx.restore();
  }
}
