// Culture creatures, batch three (operator, 2026-10-28: "be creative and keep the style and theming and branding we
// have already developed"): the ECHO creature plays every role, and a painting in the public domain is homaged by its
// composition, its setting and its gesture only. Drawn from scratch in code on the ECHO base; no traced image, no
// fetched pixels.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {echoPing, ECHO_PALETTE} = L;

  // ECHO · napoleon: Jacques-Louis David, Napoleon Crossing the Alps (1801). A rider on a rearing horse on a rocky
  // slope under a storm, its cape streaming in the wind, one arm pointing up the pass. 40 cell lattice, 12 px cells on
  // the 480 panel. Two ECHO creatures play it:
  //   horse     a bigger creature in deep teal, built as a long body on four legs (the family's four feet) with a
  //             neck and a head that is an ECHO head: a visor band with one eye slit (we see it side on) and an
  //             antenna for an ear, its tip pinging. It is drawn in its own frame and turned about its hind hooves,
  //             so it rears: the front lifts, the front legs fold and kick. Its mane and tail stream right in ping.
  //   rider     the family's own 20 cell pose at 1x (so it reads as the small one), sitting upright on the horse's
  //             back where the turn carries the saddle, one leg hanging down the flank. Its arm on our right lifts
  //             from the family's stub to point straight up the pass, a bright glove at its tip, against the gold of
  //             the cape (the painting's pointing arm is on our left, but there the rearing neck would hide it).
  //   cape      a gold cape from behind its shoulders billowing up and out to the right edge of the panel, its edges
  //             rippling on the wind.
  //   storm     a grey sky with dark cloud banks that slide right with the wind, a whole wave length a loop, and the
  //             dark rock of the slope rising to the left under the horse.
  // The beat: the horse stands half reared with the arm down; it rears higher while the arm comes up to point, both
  // antennas ping, the rider's eyes shut happy at the top, the front legs kick twice, then it all eases back down.
  // Loop: 28 frames, 7.6 s. The rear's angle and the arm ease back to the opening pose, and every ripple runs a whole
  // number of cycles a loop, so the last frame runs into the first without a seam.
  // Palette: 0..5 the ECHO palette unchanged (3 is also the glove; 4 also the mane and the tail; 5 is the horse); 6 cape gold, 7 the
  // storm sky, 8 dark cloud, 9 the rock. One closure, so echoNapoleon is the only name it adds; registered at the end
  // of this file.
  const echoNapoleon = (() => {
    const N = 40;
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, HORSE = 5, CAPE = 6, SKY = 7, CLOUD = 8, ROCK = 9;
    // Constants the cell is judged on.
    const PIVOT = [37.5, 31];                                      // the hind hooves on the panel: the turn's centre
    const REST = 16, TOPA = 27;                                    // the rear's angle in degrees: half reared, and the top
    const TAU = 2 * Math.PI;
    const ground = c => 30 + (c / N) * 9;                          // the slope's top row at col c, rising to the left

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    // Distance from (y, x) to the segment p q.
    const seg = (y, x, p, q) => {
      const vy = q[0] - p[0], vx = q[1] - p[1], L2 = vy * vy + vx * vx;
      const t = L2 ? Math.max(0, Math.min(1, ((y - p[0]) * vy + (x - p[1]) * vx) / L2)) : 0;
      return Math.hypot(y - p[0] - t * vy, x - p[1] - t * vx);
    };
    const box = (y, x, y0, y1, x0, x1) => y >= y0 && y <= y1 && x >= x0 && x <= x1;

    // The horse in its own frame: [row, col] from the hind hooves, rows up negative, the head to the left. kick 0..1
    // folds the front legs up under the chest. Returns the ink at a point, or 0.
    function horseAt(y, x, kick, f) {
      // the head: an ECHO head side on, its visor band and one eye slit, an antenna for an ear
      if (box(y, x, -24, -19, -31, -24)) {
        if (box(y, x, -22, -21, -31, -25)) return box(y, x, -22, -21, -29, -28) ? EYE : VISOR;
        return HORSE;
      }
      if (box(y, x, -27.5, -23.5, -25.6, -24.2)) return HORSE;     // the ear's stalk; its tip is drawn on its own
      if (seg(y, x, [-12, -17], [-20, -25]) <= 2.4) return HORSE;  // the neck, reaching forward
      if (box(y, x, -14, -6, -20, -1)) return HORSE;               // the body
      for (const x0 of [-5, -2]) if (box(y, x, -6, 0, x0, x0 + 1.4)) return HORSE;   // the hind legs, on the ground
      // the front legs: straight down at kick 0, at kick 1 the knees forward and the hooves hanging from them
      for (const x0 of [-19, -15.5]) {
        const knee = [-4 - kick, x0 - 4 * kick], hoof = [-kick, x0 - 3 * kick];   // the knee comes forward, the hoof hangs
        if (seg(y, x, [-7, x0 + 0.7], knee) <= 0.8 || seg(y, x, knee, hoof) <= 0.8) return HORSE;
      }
      // the mane, streaming right off the top of the neck, and the tail off the rump
      // the mane: a band behind the neck, its outer edge rippling
      const nd = seg(y, x, [-12, -17], [-20, -25]), back = -8 * (x + 17) + 8 * (y + 12) < 0;
      if (back && y < -12.5 && nd > 2.4 && nd <= 3.6 + 0.9 * Math.sin(TAU * (2 * f / NF) + y * 0.9)) return PING;
      if (x > -1 && x < 7 && Math.abs(y - (-13 + (x + 1) * 0.6 + 0.9 * Math.sin(TAU * (3 * f / NF) - x * 0.8))) <= 0.7) return PING;
      return 0;
    }
    let NF = 1;
    // The horse on the panel, turned by deg about the hooves; also returns where its saddle and ear tip land.
    function horse(g, deg, kick, f, ping) {
      const th = deg * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th);
      const toPanel = ([y, x]) => [PIVOT[0] + x * sn + y * cs, PIVOT[1] + x * cs - y * sn];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const dy = r + 0.5 - PIVOT[0], dx = c + 0.5 - PIVOT[1];
        const x = dx * cs + dy * sn, y = -dx * sn + dy * cs;          // the panel point back in the horse's frame
        const v = horseAt(y, x, kick, f);
        if (v) g[r][c] = v;
      }
      const tip = toPanel([-28.4, -24.9]);
      put(g, Math.floor(tip[0]), Math.floor(tip[1]), ping ? PING : HORSE);
      return {saddle: toPanel([-14, -9]), tip};
    }

    // The rider: the family's 20 cell pose at 1x, its body's bottom row on the saddle, its legs off but one hanging
    // down the flank. point 0..1 lifts its arm on our right from the stub to pointing straight up.
    function rider(g, saddle, point, ping, happy) {
      const src = echoPing(ping), r0 = Math.round(saddle[0]) - 13, c0 = Math.round(saddle[1]) - 10;
      for (let r = 0; r <= 13; r++) for (let c = 0; c < 20; c++) {
        if (!src[r][c]) continue;
        if (point > 0 && c >= 15 && r >= 7 && r <= 10) continue;   // the stub on our right comes off when it lifts
        put(g, r0 + r, c0 + c, src[r][c]);
      }
      if (happy) for (const c of [7, 13]) { put(g, r0 + 6, c0 + c, VISOR); put(g, r0 + 7, c0 + c, VISOR); put(g, r0 + 6, c0 + c - 1, EYE); put(g, r0 + 6, c0 + c + 1, EYE); }
      for (let r = 14; r <= 16; r++) put(g, r0 + r, c0 + 8, 5);   // the leg down the flank, its foot in deep teal
      put(g, r0 + 16, c0 + 7, 5);
      if (point > 0) {                                             // the arm from the shoulder straight up
        // a dark rim wherever it crosses the horse; a bright glove at its tip
        const sh = [r0 + 8, c0 + 16.5], hand = [r0 + 8 - 11 * point, c0 + 17.5 + 1 * point];   // a col clear of the antenna
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const d = seg(r + 0.5, c + 0.5, sh, hand);
          if (d <= 0.75) put(g, r, c, BODY);
          else if (d <= 1.6 && g[r][c] === HORSE) put(g, r, c, EYE);
        }
        if (point > 0.6) for (const [dr, dc] of [[0, 0], [0, 1], [1, 0], [1, 1]]) put(g, Math.floor(hand[0] - 0.5) + dr, Math.floor(hand[1] - 0.5) + dc, VISOR);
      }
      return [r0, c0];
    }
    // The cape: from behind the shoulders up and out to the panel's right edge, a gold sheet whose edges ripple; it takes
    // only cells the horse and the rider leave empty, so it hangs behind them.
    function cape(g, at, f) {
      const [r0, c0] = at, sr = r0 + 6, sc = c0 + 8;
      for (let c = sc; c < N; c++) {
        const t = c - sc, w = Math.sin(TAU * (3 * f / NF) - t * 0.7);
        const top = sr - 0.7 * t + 0.9 * w, bot = sr + 5 + 0.25 * t + 0.9 * Math.sin(TAU * (3 * f / NF) - t * 0.7 + 1.3);
        for (let r = Math.ceil(top); r <= bot; r++) if (inside(r, c) && !g[r][c]) g[r][c] = CAPE;
      }
    }

    // The storm and the slope.
    const BANKS = [[3, 2.5, 40, 0.0], [11, 2.0, 20, 1.7], [20, 2.5, 40, 3.1]];   // [centre row, half height, wave length, phase]
    function storm(g, f) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) g[r][c] = SKY;
      for (const [row, hh, lam, ph] of BANKS) for (let c = 0; c < N; c++) {
        const x = c - 40 * f / NF, top = row - hh * (0.6 + 0.4 * Math.sin(TAU * x / lam + ph)), bot = row + hh * (0.5 + 0.5 * Math.sin(TAU * x / lam * 2 + ph));
        for (let r = Math.ceil(top); r <= bot; r++) if (inside(r, c)) g[r][c] = CLOUD;
      }
      for (let c = 0; c < N; c++) for (let r = Math.ceil(ground(c)); r < N; r++) g[r][c] = ROCK;
      for (const [r, c] of [[33, 4], [35, 12], [37, 20], [38, 34]]) put(g, r, c, CLOUD);   // a few cracks in the rock
    }

    // A scene. o: deg (the rear), kick (the front legs folded), point (the arm), ping, happy.
    function scene(f, o) {
      const g = blank();
      storm(g, f);
      const fg = blank();
      const h = horse(fg, o.deg, o.kick, f, !!o.ping);
      const at = rider(fg, h.saddle, o.point, !!o.ping, !!o.happy);
      cape(fg, at, f);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (fg[r][c]) g[r][c] = fg[r][c];
      return g;
    }

    // The frames, listed first (the ripples need the loop's length). F(hold, o).
    const specs = [];
    const F = (hold, deg, kick, point, o = {}) => specs.push({hold, o: Object.assign({deg, kick, point}, o)});
    const ease = t => 0.5 - 0.5 * Math.cos(Math.PI * t);
    // 1. Half reared, the arm down: the cape and the mane stream.
    F(300, REST, 0.4, 0); F(300, REST, 0.4, 0); F(300, REST, 0.4, 0); F(300, REST, 0.4, 0);
    // 2. The rear: the front lifts and the legs fold while the arm comes up to point; both antennas ping.
    for (let k = 1; k <= 4; k++) F(220, REST + (TOPA - REST) * ease(k / 4), 0.4 + 0.6 * ease(k / 4), ease(k / 4), {ping: k >= 3});
    // 3. The top: eyes shut happy, the front legs kick twice.
    F(300, TOPA, 1, 1, {happy: true}); F(240, TOPA + 1, 0.5, 1, {happy: true}); F(240, TOPA, 1, 1, {happy: true}); F(240, TOPA + 1, 0.5, 1);
    F(240, TOPA, 1, 1); F(300, TOPA, 1, 1); F(300, TOPA, 1, 1, {ping: true}); F(300, TOPA, 1, 1);
    // 4. Down again to the half rear, the arm lowering.
    for (let k = 1; k <= 4; k++) F(240, TOPA - (TOPA - REST) * ease(k / 4), 1 - 0.6 * ease(k / 4), 1 - ease(k / 4));
    F(300, REST, 0.4, 0); F(300, REST, 0.4, 0); F(300, REST, 0.4, 0); F(300, REST, 0.4, 0);
    F(300, REST, 0.4, 0); F(300, REST, 0.4, 0); F(300, REST, 0.4, 0); F(300, REST, 0.4, 0);

    NF = specs.length;
    const frames = specs.map(({hold, o}, f) => ({hold, grid: scene(f, o)}));
    return {
      name: 'ECHO · napoleon', key: 'echo_napoleon', fwname: 'echo napoleon', category: 'Active', size: N,
      // Big tier: 28 frames of 1600 cells are 44800 bytes of firmware table, so it ships only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal after Jacques-Louis David, Napoleon Crossing the Alps (1801), 40 cell lattice (12 px cells): a bigger creature in deep teal plays the rearing horse, a long body on four legs with an ECHO head side on (a visor band, one eye slit, an antenna for an ear) and a mane and tail streaming in ping, and the family creature at 1x rides it upright with a gold cape billowing out to the right on the wind, under a grey storm sky with dark cloud banks sliding right, over a dark rock slope; the horse stands half reared with the arm down, rears higher with its front legs folding while the rider\'s arm on our right comes up to point straight up the pass with a bright glove, both antennas ping, the rider\'s eyes shut happy at the top while the front legs kick, and it eases back down; judge whether it reads at a glance as the painting, whether the bigger creature reads as a horse and still as ECHO, and whether the pointing arm reads at 12 px cells.',
      // 0 transparent, 1 body (the rider), 2 eyes (also the arm's rim), 3 visor (also the glove), 4 ping (the antenna tips, the mane and the tail), 5 feet
      // (the horse, the rider's leg), 6 cape gold, 7 the storm sky, 8 dark cloud (also cracks in the rock), 9 the rock
      palette: [...ECHO_PALETTE.slice(0, 6), '#e6a93a', '#8796a3', '#454f5b', '#3a2e25'],
      frames,
    };
  })();

  L.register([echoNapoleon]);
})(typeof window !== 'undefined' ? window : globalThis);
