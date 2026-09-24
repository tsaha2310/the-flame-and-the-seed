/**
 * CarbonWorkshopScene (preset: silicon, labelled) - blk-l04-01-03-s04 (explain).
 * Why life is carbon: silicon is bigger and bonds weakly to itself; its bond to
 * oxygen is far stronger; its oxide is a giant web (sand) where carbon's is a
 * small molecule (a gas); a living thing must get rid of its ash; the rule.
 *
 * Beats (five paragraphs, splitSteps() counts 5):
 *   0 Bigger   - a shell further out: longer, weaker bonds; a weak link at every link.
 *   1 Oxygen   - Si-O far stronger than Si-Si: the crust is silicon and oxygen.
 *   2 Oxides   - CO2 a small molecule (gas); SiO2 a giant web (solid).
 *   3 Ash      - carbon's ash you breathe out; silicon's is a rock.
 *   4 Rule     - carbon: long strong chains, gas waste; silicon: weak chains, sand.
 *
 * Canvas: shells, bars and oxides; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, rr, font, darken, mix, drawHillBackdrop, drawCardBox, BOND_KJ, elCol } from './CarbonKit.js';
import { drawShells } from './TugKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_BIG = 0, S_OXY = 1, S_OXIDE = 2, S_ASH = 3, S_RULE = 4;

export class CarbonWorkshopSceneSiliconLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'Silicon\'s outer electrons sit a shell further out than carbon\'s, so its bonds to itself are longer and weaker. ' +
    'Its bond to oxygen is far stronger, so in a world with oxygen silicon chains fall apart; the crust is silicon and ' +
    'oxygen. Carbon dioxide is a small molecule, a gas that leaves; silicon dioxide is a giant web, a solid that ' +
    'stays. Carbon\'s ash is breathed out; silicon\'s would be rock. That is why life is carbon.';

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const st = this.stage;
    const say = (txt, bg, at, x = 340, y = 480) => {
      const q = popAt(this.age, at);
      if (q) pill(ctx, c, txt, x, y, { bg, size: 15, ...q });
    };
    if (st === S_BIG) {
      drawShells(ctx, c, 'C', 180, 220, t, { r0: 20, dr: 22 });
      drawShells(ctx, c, 'Si', 480, 220, t, { r0: 20, dr: 22 });
      say('silicon: one shell further out', c.s5, 0.4, 340, 70);
      say('longer, weaker bonds to itself: a weak link at every link', c.bad, 1.2);
    }
    if (st === S_OXY || st === S_RULE) this._bars(ctx, c, st === S_OXY ? 120 : 110);
    if (st === S_OXY) {
      this._crust(ctx, c, 40, 380, 600);
      say('in any world with oxygen, silicon chains fall apart', c.bad, 0.6, 340, 70);
      say('the crust: silicon and oxygen, locked as sand and rock', c.wood, 1.4, 340, 350);
    }
    if (st === S_OXIDE || st === S_ASH) this._oxides(ctx, c, t, say);
    if (st === S_RULE) {
      say('carbon: long, strong chains; its waste a gas', c.good, 0.4, 340, 360);
      say('silicon: weak chains; its waste sand. Life is carbon', c.bad, 1.2, 340, 410);
    }
  }

  _bars(ctx, c, y) {
    const x = 170, w = 340;
    drawCardBox(ctx, c, x, y, w, 150);
    ctx.fillStyle = c.labelMuted;
    ctx.font = font(c, 800, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('bond strength, kJ/mol', x + 12, y + 20);
    ['C-C', 'Si-Si', 'Si-O'].forEach((k, i) => {
      const ry = y + 56 + i * 32;
      ctx.fillStyle = c.label;
      ctx.font = font(c, 800, 15);
      ctx.textAlign = 'left';
      ctx.fillText(k, x + 12, ry);
      rr(ctx, x + 70, ry - 9, (BOND_KJ[k] / 460) * 200, 18, 9);
      ctx.fillStyle = k === 'Si-Si' ? c.bad : k === 'Si-O' ? c.s6 : c.good;
      ctx.fill();
      ctx.fillStyle = c.label;
      ctx.textAlign = 'right';
      ctx.fillText(String(BOND_KJ[k]), x + w - 12, ry);
    });
  }

  _crust(ctx, c, x, y, w) {
    for (let k = 0; k < 3; k++) {
      rr(ctx, x, y + k * 26, w, 24, 8);
      ctx.fillStyle = mix(darken(c.wood, 0.3 + k * 0.1), c.bgSurface, 0.2);
      ctx.fill();
    }
  }

  _oxides(ctx, c, t, say) {
    const st = this.stage;
    // CO2: small molecules drifting up and away.
    for (let k = 0; k < 5; k++) {
      const u = (t * 0.15 + k / 5) % 1;
      const x = 110 + (k % 3) * 50, y = 380 - u * 300;
      ctx.globalAlpha = Math.min(1, (1 - u) * 2);
      for (const [dx, col, r] of [[-15, c.s6, 8], [0, elCol(c, 'C'), 9], [15, c.s6, 8]]) {
        ctx.beginPath();
        ctx.arc(x + dx, y, r, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    pill(ctx, c, 'CO2: a small molecule, a gas. It leaves', 170, 430, { bg: c.s1, size: 14 });
    // SiO2: a giant web, fixed.
    const x0 = 400, y0 = 180;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const x = x0 + i * 46 + (j % 2) * 23, y = y0 + j * 40;
      if (i < 4) { ctx.strokeStyle = c.label; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 46, y); ctx.stroke(); }
      if (j < 4) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ((j % 2) ? -23 : 23), y + 40); ctx.stroke(); }
    }
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const x = x0 + i * 46 + (j % 2) * 23, y = y0 + j * 40;
      ctx.beginPath();
      ctx.arc(x, y, (i + j) % 2 ? 7 : 11, 0, Math.PI * 2);
      ctx.fillStyle = (i + j) % 2 ? c.s6 : elCol(c, 'Si');
      ctx.fill();
    }
    pill(ctx, c, 'SiO2: a giant web, a solid. It stays', 490, 430, { bg: c.wood, size: 14 });
    if (st === S_OXIDE) say('carbon\'s oxide leaves; silicon\'s stays', c.accent, 0.8, 340, 60);
    if (st === S_ASH) {
      say('a living thing must get rid of its ash', c.labelMuted, 0.3, 340, 60);
      say('carbon\'s: breathed out. Silicon\'s: a rock', c.accent, 1.0);
    }
  }
}
