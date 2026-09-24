/**
 * CrowdScene (preset: sieve, labelled) - blk-l03-05-04-s03 (explain). The sieve
 * tank running by itself with the words laid on it: water walks through both
 * ways, salt cannot; fewer water bumps from the salty side; osmosis and
 * semi-permeable; the pickle bench explained; the rule; nobody pumps.
 *
 * Beats (six paragraphs, splitSteps() counts 6):
 *   0 Both ways - water hops through the holes in both directions; salt bounces off.
 *   1 Crowding  - salt takes up room near the wall; more water crosses toward it.
 *   2 Names     - osmosis; a semi-permeable wall.
 *   3 Bench     - cucumber loses water, raisin gains, grape loses.
 *   4 Rule      - osmosis is diffusion of water through a sieve that stops the solute.
 *   5 No pump   - the random walk, with a wall only some can pass.
 *
 * Canvas: the tank and the bench, looping; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, rr, drawHillBackdrop, drawCard, Osmosis, drawTank, Fruit, drawFruit, arrow } from './CrowdKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
  [{ idx: 5, dwellMs: null }],
];
const S_BOTH = 0, S_CROWD = 1, S_NAMES = 2, S_BENCH = 3, S_RULE = 4, S_PUMP = 5;
const TANK = { x: 140, y: 110, w: 400, h: 300 };

export class CrowdSceneSieveLabelled extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'Water hops through the holes both ways; salt, big with its water shell, cannot. On the salty side salt takes ' +
    'up room by the wall, so fewer water particles bump into the holes from that side and more water crosses toward ' +
    'the salt: osmosis, through a semi-permeable wall. A cucumber in brine loses water, a raisin in plain water gains ' +
    'it, a grape in syrup loses it. Nobody pumps.';

  constructor(container, config) {
    super(container, config);
    this._osm = new Osmosis({ saltL: 0, saltR: 20 });
    this._fruits = [];
  }

  enter(stage) {
    this._osm.set(0, stage === S_BOTH ? 0 : 20, false);
    this._osm.running = true;
    this._t = 0;
    if (stage === S_BENCH) this._bench();
  }

  _bench() {
    this._fruits = [
      { label: 'cucumber, brine', out: true, f: new Fruit({ kind: 'cucumber', solute: 12, water: 88, bath: 0.8, burstAt: 9 }) },
      { label: 'raisin, plain water', out: false, f: new Fruit({ kind: 'raisin', solute: 10, water: 20, bath: 1.0, burstAt: 9 }) },
      { label: 'grape, syrup', out: true, f: new Fruit({ kind: 'grape', solute: 15, water: 85, bath: 0.6, burstAt: 9 }) },
    ];
  }

  update(d) {
    this._t += d;
    this._osm.step(d * 2);
    if (this._t > 14 && this.stage !== S_BENCH) { this.enter(this.stage); }
    if (this.stage === S_BENCH) {
      for (const fr of this._fruits) fr.f.step(d * 0.7);
      if (this._t > 10) { this._t = 0; this._bench(); }
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const st = this.stage;
    const say = (txt, bg, at, x = 340, y = 470) => {
      const q = popAt(this.age, at);
      if (q) pill(ctx, c, txt, x, y, { bg, size: 15, ...q });
    };
    if (st === S_BENCH) { this._drawBench(ctx, c, t, say); return; }
    drawTank(ctx, c, this._osm, TANK.x, TANK.y, TANK.w, TANK.h, t);
    if (st === S_BOTH) {
      arrow(ctx, 300, 90, 380, 90, c.s7, 5);
      arrow(ctx, 380, 70, 300, 70, c.s7, 5);
      say('water walks through, both ways', c.s7, 0.4, 340, 40);
      say('salt, big in its water shell, cannot', c.s2, 1.2);
    }
    if (st === S_CROWD) {
      say('salt takes up room by the wall', c.s2, 0.4, 340, 40);
      say('fewer water bumps from the salty side: more crosses to it', c.water, 1.2);
    }
    if (st === S_NAMES) {
      say('osmosis', c.accent, 0.3, 340, 40);
      say('the wall is semi-permeable: partly passable', c.labelMuted, 1.0);
    }
    if (st === S_RULE) {
      say('osmosis: diffusion of water through a sieve', c.accent, 0.3, 340, 40);
      say('water goes toward more dissolved stuff', c.water, 1.0);
    }
    if (st === S_PUMP) {
      say('nobody pumps', c.labelMuted, 0.3, 340, 40);
      say('the random walk, with a wall only some can pass', c.s7, 1.0);
    }
  }

  _drawBench(ctx, c, t, say) {
    this._fruits.forEach((fr, i) => {
      const x = 20 + i * 220, y = 80;
      drawCard(ctx, c, x, y, 200, 290);
      rr(ctx, x + 20, y + 100, 160, 150, 14);
      ctx.fillStyle = fr.label.includes('syrup') ? c.broth : c.water;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
      drawFruit(ctx, c, fr.f, x + 100, y + 175, t);
      pill(ctx, c, fr.label, x + 100, y + 34, { bg: c.s5, size: 14 });
      pill(ctx, c, fr.out ? 'water leaves' : 'water enters', x + 100, y + 72, { bg: fr.out ? c.bad : c.good, size: 14 });
    });
    say('water goes toward the side with more dissolved', c.accent, 0.8, 340, 420);
  }
}
