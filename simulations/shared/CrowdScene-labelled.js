/**
 * CrowdScene (preset: born, labelled) - blk-l02-04-01-s03 (explain). Three live
 * boxes with the words laid on them: temperature is the jiggle, stickiness is the
 * pull, a state is the contest between them, melting and boiling points, the
 * Crowd joins the wall, the rule, and ghee on a warm roti.
 *
 * Beats (eight blocks, splitSteps() counts 8):
 *   0 Jiggle     - cold box slow, warm box fast: the average kinetic energy.
 *   1 Pull       - the pull lines between neighbours: H-bonds, dipoles, dispersion.
 *   2 Contest    - three boxes: solid, liquid, gas.
 *   3 Who wins   - each box named in turn.
 *   4 Points     - melting and boiling points; stickier stuff has higher ones.
 *   5 The wall   - the Crowd joins the Hill and the Tug-of-War.
 *   6 Rule       - state = jiggle against stickiness.
 *   7 Ghee       - dispersion only: a warm roti melts it, a draught sets it.
 *
 * Canvas: small live particle boxes; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, rr, alpha, drawHillBackdrop, drawCard, drawBox, drawParticles, ParticleBox, STICK,
  STATE_COL, drawMarble,
} from './CrowdKit.js';
import { drawRope } from './TugKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
  [{ idx: 5, dwellMs: null }],
  [{ idx: 6, dwellMs: null }],
  [{ idx: 7, dwellMs: null }],
];
const S_JIG = 0, S_PULL = 1, S_CONTEST = 2, S_WINS = 3, S_POINTS = 4, S_WALL = 5, S_RULE = 6, S_GHEE = 7;
const BOXES = [
  { id: 'solid', x0: 30, stick: 'high', temp: -150 },
  { id: 'liquid', x0: 250, stick: 'middle', temp: 25 },
  { id: 'gas', x0: 470, stick: 'low', temp: 150 },
];

function smallBox(x0, stick, temp, seed, n = 34) {
  const b = new ParticleBox({ x0, y0: 110, x1: x0 + 180, y1: 330, gravity: 4, stick: STICK[stick], temp, seed });
  b.fill(n, 7, 0, { x0, y0: 250, x1: x0 + 180, y1: 330 });
  return b;
}

export class CrowdSceneLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'Temperature is how hard particles jiggle; stickiness is how hard they pull on each other. A state is the ' +
    'contest: stickiness wins, a solid; enough jiggle to slide, a liquid; jiggle wins, a gas. Stickier stuff melts ' +
    'and boils at higher temperatures. Ghee is barely sticky, so a warm roti melts it and a cool draught sets it.';

  constructor(container, config) {
    super(container, config);
    this._boxes = [];
  }

  enter(stage) {
    if (stage === S_JIG) this._boxes = [smallBox(90, 'low', -150, 3, 24), smallBox(410, 'low', 150, 4, 24)];
    else if (stage === S_PULL) this._boxes = [smallBox(250, 'middle', 25, 5)];
    else if (stage === S_GHEE) this._boxes = [smallBox(250, 'low', 25, 6)];
    else if (stage === S_WALL || stage === S_POINTS) this._boxes = [];
    else this._boxes = BOXES.map((d, i) => smallBox(d.x0, d.stick, d.temp, 11 + i));
    this._ghee = 0;
  }

  update(d) {
    for (const b of this._boxes) b.step(d);
    if (this.stage === S_GHEE) {
      this._ghee += d;
      const warm = Math.floor(this._ghee / 5) % 2 === 1;
      this._boxes[0].temp = warm ? 60 : -60;
      this._boxes[0].stick = 3000;
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const st = this.stage;
    const say = (txt, bg, at, x = 340, y = 470) => {
      const q = popAt(this.age, at);
      if (q) pill(ctx, c, txt, x, y, { bg, size: 15, ...q });
    };
    for (const b of this._boxes) {
      drawBox(ctx, c, b);
      drawParticles(ctx, c, b, { heat: st === S_JIG });
    }
    if (st === S_JIG) {
      pill(ctx, c, 'cold: slow', 180, 80, { bg: c.s1, size: 15 });
      pill(ctx, c, 'warm: fast', 500, 80, { bg: c.bad, size: 15 });
      say('temperature = how hard they jiggle', c.accent, 0.4, 340, 400);
      say('the average kinetic energy, nothing more', c.labelMuted, 1.2);
    }
    if (st === S_PULL) {
      const b = this._boxes[0];
      ctx.strokeStyle = alpha(c.s5, 0.8);
      ctx.lineWidth = 2;
      for (let i = 0; i < b.p.length; i++) for (let j = i + 1; j < b.p.length; j++) {
        const a = b.p[i], q = b.p[j];
        if ((a.x - q.x) ** 2 + (a.y - q.y) ** 2 < 22 * 22) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
      pill(ctx, c, 'stickiness = how hard they pull', 340, 80, { bg: c.s5, size: 15 });
      say('H-bonds, dipole forces, dispersion: one dial', c.labelMuted, 0.8, 340, 400);
    }
    if (st === S_CONTEST || st === S_WINS || st === S_RULE) {
      BOXES.forEach((d, i) => {
        const on = st !== S_WINS || Math.floor(this.age / 1.6) % 3 === i;
        pill(ctx, c, d.id, d.x0 + 90, 360, { bg: STATE_COL(c, d.id), size: 16, alpha: on ? 1 : 0.35 });
      });
      if (st === S_CONTEST) say('a state is a contest: jiggle against stickiness', c.accent, 0.4, 340, 80);
      if (st === S_WINS) {
        const i = Math.floor(this.age / 1.6) % 3;
        const txt = ['stickiness wins: they jiggle in place', 'enough jiggle to slide, not escape', 'jiggle wins: they fill any box'][i];
        pill(ctx, c, txt, 340, 80, { bg: STATE_COL(c, BOXES[i].id), size: 15 });
      }
      if (st === S_RULE) {
        say('temperature is the jiggle', c.bad, 0.3, 340, 70);
        say('the pulls between molecules: the stickiness', c.s5, 0.9, 340, 420);
      }
    }
    if (st === S_POINTS) this._drawPoints(ctx, c, say);
    if (st === S_WALL) this._drawWall(ctx, c, t, say);
    if (st === S_GHEE) {
      const warm = Math.floor(this._ghee / 5) % 2 === 1;
      pill(ctx, c, 'ghee: dispersion only, barely sticky', 340, 70, { bg: c.broth, size: 15 });
      pill(ctx, c, warm ? 'on a warm roti: it slides' : 'a cool draught: it sets', 340, 400, { bg: warm ? c.flame : c.s1, size: 15 });
    }
  }

  /** Temperature axis with melting and boiling marks for two stickinesses (read off the sim). */
  _drawPoints(ctx, c, say) {
    const x0 = 80, x1 = 600;
    const X = (C) => x0 + ((C + 273) / 473) * (x1 - x0);
    const rows = [{ label: 'middle stickiness', melt: -170, boil: 180, y: 290 }, { label: 'high stickiness', y: 400 }];
    rows.forEach((r) => {
      rr(ctx, x0, r.y - 7, x1 - x0, 14, 7);
      ctx.fillStyle = c.raised;
      ctx.fill();
      pill(ctx, c, r.label, x0, r.y + 26, { bg: c.s5, size: 14, align: 'left' });
      if (r.melt == null) {
        pill(ctx, c, 'melts above 200 \u00b0C', x1, r.y - 26, { bg: c.water, size: 14, align: 'right' });
        return;
      }
      for (const [C, txt, col] of [[r.melt, 'melts', c.water], [r.boil, 'boils', c.s2]]) {
        ctx.beginPath();
        ctx.arc(X(C), r.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
        pill(ctx, c, `${txt} ~${C} \u00b0C`, X(C), r.y - 26, { bg: col, size: 14 });
      }
    });
    say('melting point: the solid loses the contest', c.water, 0.4, 340, 70);
    say('boiling point: the liquid loses', c.s2, 1.0, 340, 108);
    say('stickier stuff: higher ones', c.s5, 1.6, 340, 146);
  }

  /** The wall of models: the Hill, the Tug-of-War, and now the Crowd. */
  _drawWall(ctx, c, t, say) {
    const frames = [
      { x: 60, title: 'the Hill', draw: (x, y) => { ctx.beginPath(); ctx.moveTo(x - 60, y + 30); ctx.quadraticCurveTo(x - 10, y - 50, x + 60, y + 30); ctx.strokeStyle = c.s3; ctx.lineWidth = 6; ctx.stroke(); drawMarble(ctx, c, x - 30 + Math.sin(t) * 20, y - 6, 10, c.s4, {}); } },
      { x: 260, title: 'the Tug-of-War', draw: (x, y) => drawRope(ctx, c, x - 60, x + 60, y, Math.sin(t) * 0.5, t) },
      { x: 460, title: 'the Crowd', draw: (x, y) => { for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(x - 40 + (i % 3) * 40 + Math.sin(t * 3 + i) * 6, y - 30 + Math.floor(i / 3) * 30 + Math.cos(t * 2 + i) * 6, 8, 0, Math.PI * 2); ctx.fillStyle = c.s7; ctx.fill(); } } },
    ];
    frames.forEach((f, i) => {
      const p = popAt(this.age, 0.2 + i * 0.5);
      if (!p) return;
      ctx.save();
      ctx.globalAlpha *= p.alpha;
      drawCard(ctx, c, f.x, 120, 170, 170);
      f.draw(f.x + 85, 200);
      ctx.restore();
      pill(ctx, c, f.title, f.x + 85, 312, { bg: i === 2 ? c.s7 : c.labelMuted, size: 15, alpha: p.alpha });
    });
    say('the Crowd joins the wall', c.accent, 1.6, 340, 80);
  }
}
