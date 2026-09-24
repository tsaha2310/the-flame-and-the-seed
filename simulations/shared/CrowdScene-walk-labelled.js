/**
 * CrowdScene (preset: walk, labelled) - blk-l03-05-03-s03 (explain). Random
 * walks and diffusion with the words laid on them: each bounce a new direction,
 * twice the distance four times the steps, the thousand spreading with nobody
 * aiming, hotter and bigger, and the rule.
 *
 * Beats (five paragraphs, splitSteps() counts 5):
 *   0 Random walk - bounce, new direction, bounce.
 *   1 Distance    - twice as far takes about four times the steps; ink vs a smell.
 *   2 Diffusion   - more walkers on the crowded side to wander away from it.
 *   3 Speed       - hotter: faster steps; bigger: shorter steps; sugar, ion, smell.
 *   4 Rule        - diffusion is what the walks add up to.
 *
 * Canvas: looping walks and a spreading cloud; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, popAt, drawHillBackdrop, drawBox, drawNeighbours, arrow, Walker, DotCloud, walkSpeed, walkStep,
} from './CrowdKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_WALK = 0, S_DIST = 1, S_DIFF = 2, S_SPEED = 3, S_RULE = 4;

export class CrowdSceneWalkLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A tagged particle bounces from neighbour to neighbour, each bounce in a new direction: a random walk. Twice the ' +
    'distance takes about four times the steps. A thousand walkers spread from the crowded side to the empty side ' +
    'with nobody aiming: diffusion. Hotter is faster; bigger particles are slower.';

  constructor(container, config) {
    super(container, config);
    this._items = [];
  }

  enter(stage) {
    const sp = walkSpeed(25), st = walkStep('small');
    const box = (x0, y0, w, h) => ({ x0, y0, x1: x0 + w, y1: y0 + h });
    this._items = [];
    if (stage === S_WALK) this._items.push({ kind: 'walker', box: box(40, 110, 600, 300), obj: new Walker(box(40, 110, 600, 300), { step: st, speed: sp * 0.35, seed: 4 }) });
    if (stage === S_DIST) {
      this._items.push({ kind: 'walker', label: 'one width', box: box(40, 90, 300, 150), obj: new Walker(box(40, 90, 300, 150), { step: st, speed: sp, seed: 6 }) });
      this._items.push({ kind: 'walker', label: 'double width', box: box(40, 290, 600, 150), obj: new Walker(box(40, 290, 600, 150), { step: st, speed: sp, seed: 7 }) });
    }
    if (stage === S_DIFF || stage === S_RULE) this._items.push({ kind: 'cloud', box: box(40, 110, 600, 280), obj: new DotCloud(box(40, 110, 600, 280), { step: st, speed: sp, fast: 2 }) });
    if (stage === S_SPEED) {
      this._items.push({ kind: 'cloud', label: 'hot, small', box: box(40, 100, 290, 250), obj: new DotCloud(box(40, 100, 290, 250), { n: 400, step: walkStep('small'), speed: walkSpeed(100), fast: 1.5 }) });
      this._items.push({ kind: 'cloud', label: 'cold, big', box: box(350, 100, 290, 250), obj: new DotCloud(box(350, 100, 290, 250), { n: 400, step: walkStep('big'), speed: walkSpeed(0), fast: 1.5 }) });
    }
    for (const it of this._items) it.obj.running = true;
    this._t = 0;
  }

  _loopLen() { return this.stage === S_SPEED ? 30 : 16; }

  update(d) {
    this._t += d;
    for (const it of this._items) {
      it.obj.update(d);
      if (it.kind === 'walker' && it.obj.done) {
        it.hold = (it.hold ?? 0) + d;
        if (it.hold > 2) { it.last = it.obj.bumps; it.obj.reset(); it.obj.running = true; it.hold = 0; }
      }
      if (it.kind === 'cloud' && this._t > this._loopLen()) { it.obj.reset(); it.obj.running = true; }
    }
    if (this._t > this._loopLen()) this._t = 0;
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const st = this.stage;
    const say = (txt, bg, at, x = 340, y = 480) => {
      const q = popAt(this.age, at);
      if (q) pill(ctx, c, txt, x, y, { bg, size: 15, ...q });
    };
    for (const it of this._items) {
      drawBox(ctx, c, it.box);
      if (it.kind === 'walker') {
        drawNeighbours(ctx, c, it.box, t, Math.round((it.box.x1 - it.box.x0) * (it.box.y1 - it.box.y0) / 1500), 5);
        const w = it.obj;
        ctx.beginPath();
        w.path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.lineTo(w.x, w.y);
        ctx.strokeStyle = c.bad;
        ctx.lineWidth = 2;
        ctx.stroke();
        if (st === S_WALK) {
          for (const [x, y] of w.path.slice(-12)) {
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = c.warning;
            ctx.fill();
          }
        }
        ctx.beginPath();
        ctx.arc(w.x, w.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = c.bad;
        ctx.fill();
        if (it.label) pill(ctx, c, `${it.label}${it.last ? `: crossed in ${it.last} bumps` : ''}`, it.box.x0, it.box.y0 - 20, { bg: c.bad, size: 14, align: 'left' });
      } else {
        it.obj.draw(ctx, c, c.s5);
        const done = it.obj.evenAt >= 0;
        if (it.label) pill(ctx, c, done ? `${it.label}: even` : it.label, (it.box.x0 + it.box.x1) / 2, it.box.y0 - 20, { bg: done ? c.good : c.s5, size: 14 });
      }
    }
    if (st === S_WALK) {
      pill(ctx, c, 'bump, bounce, new direction', 340, 70, { bg: c.warning, size: 15 });
      say('a random walk', c.bad, 0.8);
    }
    if (st === S_DIST) say('twice as far: about four times the steps', c.accent, 0.6);
    if (st === S_DIFF) {
      const [l, r] = this._items[0].obj.halves();
      pill(ctx, c, `crowded: ${Math.max(l, r)}`, 40, 80, { bg: c.s5, size: 14, align: 'left' });
      pill(ctx, c, `emptier: ${Math.min(l, r)}`, 640, 80, { bg: c.labelMuted, size: 14, align: 'right' });
      if (Math.abs(l - r) > 80) arrow(ctx, 260, 250, 420, 250, c.warning, 6);
      say('more walkers here to wander away: nobody aims', c.warning, 0.8, 340, 420);
      say('crowded to empty: diffusion', c.accent, 1.8);
    }
    if (st === S_SPEED) {
      say('hotter: faster steps', c.bad, 0.4, 185, 390);
      say('bigger: shorter steps', c.s1, 1.0, 495, 390);
      say('sugar in a glass: an hour. An ion: minutes. A smell: seconds', c.labelMuted, 1.8, 340, 470);
    }
    if (st === S_RULE) {
      say('every particle takes a random walk', c.bad, 0.3, 340, 70);
      say('diffusion: what the walks add up to', c.accent, 1.0, 340, 440);
    }
  }
}
