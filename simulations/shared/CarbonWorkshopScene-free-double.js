/**
 * CarbonWorkshopScene (preset: free-double) - blk-l04-02-02-s05 (what-if).
 * Switch on "double bonds spin freely": the two halves turn around the double bond
 * like beads on a string, and the kink comes and goes. Preview: two fats that
 * differ only in their kink, ghee and oil, become the same fat.
 *
 * Beats (STEP ids setup / run / nails):
 *   0 setup - a chain with a double bond in the middle, its kink fixed; predict.
 *   1 run   - the switch; the halves spin; the oil's kinks smear out like the ghee's.
 *   2 nails - a double bond's stiffness gives a molecule a fixed bend.
 *
 * Canvas: a spinning or fixed molecule and two fats; labels are chips only.
 */
import { StoryScene } from './StoryScene.js';
import { pill, popAt, drawHillBackdrop, drawCardBox, Mol, drawMolAt } from './CarbonKit.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_SETUP = 0, S_RUN = 1, S_NAILS = 2;
const BOX = { x0: 40, y0: 90, x1: 640, y1: 300 };

/** Turn the atoms after `pivot` (a chain) about the pivot by `ang` radians: the kink. */
function bent(m, pivot, ang) {
  const out = m.clone();
  const P = m.atoms[pivot];
  const cs = Math.cos(ang), sn = Math.sin(ang);
  for (let i = pivot + 1; i < m.atoms.length; i++) {
    const dx = m.atoms[i].x - P.x, dy = m.atoms[i].y - P.y;
    out.atoms[i] = { x: P.x + dx * cs - dy * sn, y: P.y + dx * sn + dy * cs };
  }
  return out;
}
const KINK = Math.PI / 3;

function kinked() {
  const m = new Mol('C').chain(8, BOX);
  m.setOrder(3, 2);
  m.sel = -1;
  return m;
}

export class CarbonWorkshopSceneFreeDouble extends StoryScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A carbon chain with a double bond in the middle, bent at a fixed kink. If double bonds spun freely, the two ' +
    'halves would turn like beads on a string and the kink would come and go, so an oil whose chains are kinked would ' +
    'behave like ghee whose chains are straight: the difference between them would vanish.';

  static CONTROLS = [
    { type: 'button', id: 'off', label: 'Double bonds: locked', inactiveBg: 'var(--bg-surface)' },
    { type: 'button', id: 'on', label: 'Double bonds: spin freely', inactiveBg: 'var(--bg-surface)' },
  ];

  constructor(container, config) {
    super(container, config);
    this.mode = 'off';
    this._dialled = false;
    this._base = kinked();
    this._ph = Math.PI;
  }

  enter() {
    this.mode = 'off';
    this._dialled = false;
    this._ph = Math.PI;
  }

  isControlHidden() { return this.stage === S_SETUP; }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'on' || id === 'off') { this.mode = id; this._dialled = true; if (id === 'off') this._ph = Math.PI; }
    this.requestUiUpdate?.();
  }

  update(d) {
    if (this.mode === 'on') this._ph += d * 2.4;
  }

  draw(ctx, c, t) {
    drawHillBackdrop(ctx, c, t);
    const on = this.mode === 'on';
    drawMolAt(ctx, c, bent(this._base, 4, KINK * Math.cos(this._ph - Math.PI)), 340, 180, 1.0, { t, showSel: false });
    pill(ctx, c, on ? 'the halves spin: the kink comes and goes' : 'a double bond: the kink is fixed', 340, 40, { bg: on ? c.bad : c.s5, size: 15 });
    this._fats(ctx, c, t);
    const st = this.stage;
    if (st === S_SETUP) {
      const q = popAt(this.age, 1.0);
      if (q) pill(ctx, c, 'predict: warm it a little. What happens?', 340, 492, { bg: c.accent, size: 15, ...q });
    }
    if (st === S_RUN && !this._dialled) pill(ctx, c, 'turn the dial', 340, 492, { bg: c.accent, size: 15, scale: 1 + 0.05 * Math.sin(t * 5) });
    if (st === S_RUN && on) pill(ctx, c, 'ghee and oil: the same fat', 340, 492, { bg: c.bad, size: 15 });
    if (st === S_NAILS) {
      const q = popAt(this.age, 0.5);
      if (q) pill(ctx, c, 'a double bond\'s stiffness: a fixed bend', 340, 492, { bg: c.good, size: 15, ...q });
    }
  }

  /** Ghee: straight chains packed close. Oil: kinked chains that cannot pack. */
  _fats(ctx, c, t) {
    const on = this.mode === 'on';
    const panel = (x, title, kink) => {
      drawCardBox(ctx, c, x, 300, 300, 160);
      pill(ctx, c, title, x + 150, 300, { bg: c.broth, size: 14 });
      for (let k = 0; k < 3; k++) {
        const m = new Mol('C').chain(8, BOX);
        m.sel = -1;
        let mm = m;
        if (kink) {
          m.setOrder(3, 2);
          mm = bent(m, 4, KINK * (on ? Math.cos(this._ph + k * 1.3) : 1));
        }
        drawMolAt(ctx, c, mm, x + 150, 350 + k * 36, 0.42, { t, hideH: true, showSel: false });
      }
    };
    panel(30, 'ghee: straight, packs tight', false);
    panel(350, on ? 'oil: kinks come and go' : 'oil: kinked, cannot pack', true);
  }
}
