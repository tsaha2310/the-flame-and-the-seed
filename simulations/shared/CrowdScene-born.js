/**
 * CrowdScene (preset: born) - blk-l02-04-01-s02 (run the machine). A box of
 * jiggling particles with two dials, temperature and stickiness. Readouts: the
 * state (from what the particles are doing) and how far one tagged particle
 * wanders. The Crowd model is born here.
 *
 * Beats (five blocks, splitSteps() counts 5):
 *   0 Lens     - balls, slowed a trillion times; walls; stickiness stands for all three pulls.
 *   1 Job      - keep the box a liquid while the rules change.
 *   2 Warm up  - start at absolute zero and raise it; the log notes where it slides and flies apart.
 *   3 Stick    - turn stickiness up, then down, and repeat.
 *   4 Find     - a gas at room temperature; a solid at a tawa's temperature.
 *
 * Canvas: many interacting particles; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import {
  pill, rr, drawHillBackdrop, drawReadout, drawBox, drawParticles, drawTempBar, ParticleBox, STICK, LADDER,
  ROOM_I, TAWA_I, tempLabel, STATE_COL, drawClockIcon,
} from './CrowdKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
  [{ idx: 3, dwellMs: null }],
  [{ idx: 4, dwellMs: null }],
];
const S_LENS = 0, S_JOB = 1, S_WARM = 2, S_STICK = 3, S_FIND = 4;
const BOX = { x0: 40, y0: 70, x1: 420, y1: 460 };

export class CrowdSceneBorn extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static LENS_STAGE = S_LENS;
  static ARIA_LABEL =
    'A box of particles with a temperature dial and a stickiness dial. Cold and sticky, the particles jiggle in place: ' +
    'a solid. Warmer, they slide past each other: a liquid. Hotter still, they fly apart and fill the box: a gas. ' +
    'Stickier stuff needs more heat to melt and to boil.';

  static CONTROLS = [
    { type: 'button', id: 'cooler', label: 'Cooler' },
    { type: 'button', id: 'hotter', label: 'Hotter' },
    { type: 'select', id: 'stick', label: 'Stickiness:', options: [
      { value: 'low', label: 'low' }, { value: 'middle', label: 'middle' }, { value: 'high', label: 'high' },
    ] },
  ];

  constructor(container, config) {
    super(container, config);
    this._ti = ROOM_I;
    this._stick = 'middle';
    this._state = { id: 'liquid', wander: 0 };
    this._stateT = 0;
    this._log = [];
    this._found = { gasRoom: false, solidTawa: false };
    this._build();
  }

  _build() {
    const b = new ParticleBox({ ...BOX, gravity: 4, stick: STICK[this._stick], temp: LADDER[this._ti], seed: 7 });
    b.fill(80, 7, 0, { x0: BOX.x0, y0: BOX.y1 - 150, x1: BOX.x1, y1: BOX.y1 });
    b.p[40].tag = true;
    this._box = b;
    this._trail = [];
    this._fresh = true;
    this._pending = null;
  }

  lensRows(c) {
    return [
      { icon: (g, x, y) => { g.beginPath(); g.arc(x, y, 10, 0, Math.PI * 2); g.fillStyle = c.s7; g.fill(); }, text: 'particles drawn as balls' },
      { icon: (g, x, y, t) => drawClockIcon(g, c, x, y, t), text: 'slowed a trillion times' },
      { icon: (g, x, y) => { rr(g, x - 17, y - 10, 34, 20, 10); g.fillStyle = c.s5; g.fill(); }, text: 'one stickiness dial', sub: 'stands in for all three pulls from II.3' },
    ];
  }

  enter(stage) {
    if (stage === S_WARM) { this._ti = 0; this._stick = 'middle'; this._log = []; this._build(); }
    else if (stage <= S_JOB) { this._ti = ROOM_I; this._stick = 'middle'; this._build(); }
    if (stage === S_FIND) this._found = { gasRoom: false, solidTawa: false };
    this._applyDials();
  }

  _applyDials() {
    this._box.temp = LADDER[this._ti];
    this._box.stick = STICK[this._stick];
  }

  isControlHidden(id) {
    if (this.stage === S_LENS) return true;
    if (id === 'stick') return this.stage < S_STICK;
    return false;
  }

  isControlDisabled(id) {
    if (id === 'cooler') return this._ti <= 0;
    if (id === 'hotter') return this._ti >= LADDER.length - 1;
    return false;
  }

  getControlValue(id) {
    return id === 'stick' ? this._stick : undefined;
  }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    if (id === 'cooler') this._ti -= 1;
    else if (id === 'hotter') this._ti += 1;
    else if (id === 'stick' && STICK[value] != null) this._stick = value;
    this._applyDials();
    this._stateT = -1.5;              // let the crowd settle before the next reading
    this.requestUiUpdate?.();
  }

  update(d) {
    const b = this._box;
    b.step(d);
    const tag = b.p.find((q) => q.tag);
    if (tag) {
      this._trail.push([tag.x, tag.y]);
      if (this._trail.length > 90) this._trail.shift();
    }
    this._stateT += d;
    if (this._stateT > 0.5) {
      this._stateT = 0;
      const prev = this._state.id;
      const now = b.state();
      // A new state has to hold for two readings in a row before it counts.
      if (now.id !== prev && this._pending !== now.id) { this._pending = now.id; this._state = { ...now, id: prev }; return; }
      this._pending = null;
      this._state = now;
      if (this._fresh) { this._fresh = false; return; }
      const C = LADDER[this._ti];
      if (prev !== this._state.id && this.stage >= S_WARM) {
        const what = { liquid: prev === 'solid' ? 'melts' : 'condenses', gas: 'boils', solid: 'freezes' }[this._state.id];
        this._log.push(`${C} \u00b0C, ${this._stick}: ${what}`);
        if (this._log.length > 4) this._log.shift();
      }
      if (this.stage === S_FIND) {
        if (!this._found.gasRoom && this._ti === ROOM_I && this._state.id === 'gas') { this._found.gasRoom = true; this.celebrate(230, 200, 22); }
        if (!this._found.solidTawa && this._ti === TAWA_I && this._state.id === 'solid') { this._found.solidTawa = true; this.celebrate(230, 200, 22); }
      }
      this.requestUiUpdate?.();
    }
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const b = this._box;
    drawBox(ctx, c, BOX);
    if (this._trail.length > 1) {
      ctx.beginPath();
      this._trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = c.bad;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    drawParticles(ctx, c, b);
    if (this.stage === S_LENS) return;
    const C = LADDER[this._ti];
    const st = this._state;
    drawTempBar(ctx, c, 452, 80, 150, C);
    pill(ctx, c, tempLabel(C), 470, 90, { bg: c.s2, size: 14, align: 'left' });
    pill(ctx, c, `stickiness: ${this._stick}`, 470, 128, { bg: c.s5, size: 14, align: 'left' });
    pill(ctx, c, st.id, 470, 180, { bg: STATE_COL(c, st.id), size: 18, align: 'left', display: true });
    const wander = st.wander < 0.45 ? 'jiggles in place' : st.wander < 2 ? 'slides a little' : 'wanders far';
    pill(ctx, c, `red one: ${wander}`, 470, 224, { bg: c.bad, size: 14, align: 'left' });
    if (this.stage >= S_WARM) {
      drawReadout(ctx, c, 440, 270, 224, this._log.length ? this._log.slice(-4).map((s) => ({ label: s, text: '' })) : [{ label: 'changes appear here', text: '' }], 'the log');
    }
    const hint = { [S_JOB]: 'a liquid: keep it one', [S_WARM]: 'raise it slowly with Hotter', [S_STICK]: 'stickier, then less sticky: repeat' }[this.stage];
    if (hint) pill(ctx, c, hint, 230, 40, { bg: c.accent, size: 14 });
    if (this.stage === S_FIND) {
      pill(ctx, c, `${this._found.gasRoom ? '\u2713' : '\u25cb'} gas at room`, 40, 40, { bg: this._found.gasRoom ? c.good : c.labelMuted, size: 14, align: 'left' });
      pill(ctx, c, `${this._found.solidTawa ? '\u2713' : '\u25cb'} solid on a tawa`, 230, 40, { bg: this._found.solidTawa ? c.good : c.labelMuted, size: 14, align: 'left' });
    }
  }
}
