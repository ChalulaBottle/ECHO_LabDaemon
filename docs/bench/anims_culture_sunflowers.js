// Culture creatures, batch three (operator, 2026-10-28: "be creative and keep the style and theming and branding we
// have already developed"): the ECHO creature plays every role, and a painting in the public domain is homaged by its
// composition, its setting and its gesture only. Drawn from scratch in code on the ECHO base; no traced image, no
// fetched pixels.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  // ECHO · sunflowers: Vincent van Gogh, Sunflowers (1888). The creature is the vase: it stands on a dark wooden table
  // against the painting's yellow wall with five sunflowers rising out of the top of its head, and a small sun crosses
  // the top of the frame. 40 cell lattice, 12 px cells on the 480 panel: the body is the family's 20 cell pose
  // repeated exactly 2 times across and down, moved 6 rows down so it stands on the table with its feet on the top.
  //   bunch     five flowers on green stems that start at the top of its head: four upright at different heights and
  //             one drooping off to the right over its arm, as the painting's bunch spills. Each head is a ring of
  //             gold petals with ragged tips round a brown seed disc.
  //   sun       a small gold sun with four short rays comes in off the left, crosses the top of the panel and goes out
  //             on the right; the loop opens and closes with it off the panel.
  //   follow    every flower turns to the sun: its seed disc slides inside the petals toward the sun's side and its
  //             stem leans a cell that way, and the creature's eyes track it too; when the sun is gone they all face
  //             front again.
  //   ping      the antenna pings as the sun comes up; the eyes shut happy while it stands overhead.
  //   petal     one petal comes off the drooping flower and falls in a zigzag past the arm and off the bottom of the
  //             panel; that flower's ring has a gap until the sun has gone, then it is whole for the loop's start.
  // Loop: 28 frames, 8.1 s. The sun is off the panel on the first and last frames and every flower faces front there,
  // so the last frame runs into the first without a seam.
  // Palette: 0..5 the ECHO palette unchanged; 6 the yellow wall, 7 petal and sun gold, 8 seed brown (also the table),
  // 9 stem green. One closure, so echoSunflowers is the only name it adds; registered at the end of this file.
  const echoSunflowers = (() => {
    const N = 40, K = 2;                                           // lattice; the 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, WALL = 6, GOLD = 7, SEED = 8, STEM = 9;
    // Constants the cell is judged on.
    const OY = 6;                                                  // the family's 2x frame, 6 rows down
    const TABLE = 34;                                              // the table's top row; its feet stand on it
    const HEAD_TOP = 14;                                           // the creature's top row, where the stems start
    const V = {top: 12 + OY, bot: 15 + OY, l: 12, r: 29};          // the visor band on the panel
    const EYE_C = [14, 26];                                        // each slit's left col, 2 wide
    const SUN_ROW = 1.5, SUN_R = 1.6;                              // the sun's path and its disc
    const TAU = 2 * Math.PI;

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    // Distance from (y, x) to the segment p q.
    const seg = (y, x, p, q) => {
      const vy = q[0] - p[0], vx = q[1] - p[1], L2 = vy * vy + vx * vx;
      const t = L2 ? Math.max(0, Math.min(1, ((y - p[0]) * vy + (x - p[1]) * vx) / L2)) : 0;
      return Math.hypot(y - p[0] - t * vy, x - p[1] - t * vx);
    };

    // The vase: the family pose at 2x, OY down. Faces: slits slid dx; a blink (the slit's bottom row); happy arches.
    function vase(ping) {
      const src = upscale(echoPing(ping), K), g = blank();
      for (let r = 0; r + OY < N; r++) for (let c = 0; c < N; c++) if (src[r][c]) g[r + OY][c] = src[r][c];
      return g;
    }
    const band = g => { for (let r = V.top; r <= V.bot; r++) for (let c = V.l; c <= V.r; c++) g[r][c] = VISOR; return g; };
    const slits = (g, dx = 0) => { band(g); for (let r = V.top; r <= V.bot; r++) for (const c0 of EYE_C) for (let c = c0; c < c0 + 2; c++) g[r][c + dx] = EYE; return g; };
    const blinked = g => { band(g); for (const c0 of EYE_C) for (let c = c0; c < c0 + 2; c++) g[V.bot][c] = EYE; return g; };
    const arches = g => { band(g); for (const c0 of EYE_C) { put(g, V.top + 2, c0 - 1, EYE); put(g, V.top + 1, c0, EYE); put(g, V.top + 1, c0 + 1, EYE); put(g, V.top + 2, c0 + 2, EYE); } return g; };

    // The bunch: [head centre row, col, petal radius, stem foot col, the stem's bend (cols at its middle)].
    const FLOWERS = [
      [9.5, 6.5, 3.3, 13.5, -1.5],
      [7.5, 15.5, 3.4, 17.5, 0.5],
      [11.0, 22.0, 2.8, 20.5, 0.0],
      [8.0, 27.5, 3.1, 24.5, 0.5],
      [13.0, 35.5, 2.9, 27.5, 2.0],                                // the drooping one, over the right arm
    ];
    const DROOP = 4;                                               // the flower that drops a petal
    // One flower: the stem first (a bent line from the head top to the head), then the petals, the seed disc slid by
    // face cells toward the sun, and the stem and head leaned by lean cells.
    function flower(g, [cy, cx, R, foot, bend], face, lean, lost) {
      const hx = cx + lean, mid = [(HEAD_TOP + cy) / 2, (foot + hx) / 2 + bend];
      for (let r = 0; r < HEAD_TOP; r++) for (let c = 0; c < N; c++) {
        const y = r + 0.5, x = c + 0.5;
        if (Math.min(seg(y, x, [HEAD_TOP, foot], mid), seg(y, x, mid, [cy, hx])) <= 0.6) g[r][c] = STEM;
      }
      let low = null;                                              // its lowest petal cell, the one that falls
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const dy = r + 0.5 - cy, dx = c + 0.5 - hx, d = Math.hypot(dy, dx), th = Math.atan2(dy, dx);
        const sd = Math.hypot(dy, dx - face);
        if (sd <= R * 0.48) g[r][c] = SEED;
        else if (d <= R * (0.82 + 0.18 * Math.cos(9 * th + cx))) { g[r][c] = GOLD; if (!low || 2 * r + c >= 2 * low[0] + low[1]) low = [r, c]; }
      }
      if (lost && low) g[low[0]][low[1]] = WALL;
    }
    // The sun: a gold disc with four short rays, centred on col x of its path.
    function sun(g, x) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const dy = r + 0.5 - SUN_ROW, dx = c + 0.5 - x, d = Math.hypot(dy, dx);
        const ray = (Math.abs(dy) < 0.5 || Math.abs(dx) < 0.5) && d <= SUN_R + 1.7 && d > SUN_R + 0.5;
        if (d <= SUN_R || ray) g[r][c] = GOLD;
      }
    }
    // The table: dark wood from TABLE down, its front edge a row lower.
    function table(g) { for (let r = TABLE; r < N; r++) for (let c = 0; c < N; c++) g[r][c] = SEED; }

    // A scene. o: sun (its col, or null when it is off the panel), face (a function of the pose, given the gaze),
    // ping, lost (the drooping flower's gap), petal ([row, col] of the falling petal).
    function scene(o) {
      const g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) g[r][c] = WALL;
      table(g);
      if (o.sun !== null) sun(g, o.sun);
      FLOWERS.forEach((fl, i) => {
        // turn toward the sun: a cell and a bit at most, none while it is off the panel
        const t = o.sun === null ? 0 : Math.max(-1.3, Math.min(1.3, (o.sun - fl[1]) / 7));
        flower(g, fl, t, Math.round(t * 0.8), i === DROOP && o.lost);
      });
      const v = vase(!!o.ping);
      const gaze = o.sun === null ? 0 : Math.max(-2, Math.min(2, Math.round((o.sun - 20.5) / 8)));
      (o.face || slits)(v, gaze);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (v[r][c]) g[r][c] = v[r][c];
      if (o.petal) put(g, o.petal[0], o.petal[1], GOLD);
      return g;
    }

    // The frames. The sun crosses on frames 2 to 23, a cell and three quarters a step.
    const specs = [];
    const F = (hold, sunAt, o = {}) => specs.push({hold, o: Object.assign({sun: sunAt}, o)});
    const S = k => -3.5 + 2.1 * k;                                 // the sun's col on the k-th step of its crossing
    // 1. Rest: no sun, every flower facing front.
    F(320, null); F(320, null);
    // 2. Sunrise: the sun comes in on the left; the antenna pings and everything turns to it.
    F(300, S(0)); F(300, S(1), {ping: true}); F(300, S(2), {ping: true}); F(300, S(3)); F(300, S(4)); F(300, S(5));
    F(300, S(6)); F(300, S(7));
    // 3. Overhead: the eyes shut happy.
    F(320, S(8), {face: arches}); F(320, S(9), {face: arches}); F(320, S(10), {face: arches}); F(300, S(11));
    // 4. The petal: it comes off the drooping flower and zigzags down past the arm and off the panel.
    F(260, S(12), {lost: true, petal: [16, 36]}); F(260, S(13), {lost: true, petal: [19, 37]}); F(260, S(14), {lost: true, petal: [23, 36]});
    F(260, S(15), {lost: true, petal: [27, 37]}); F(260, S(16), {lost: true, petal: [31, 36]}); F(260, S(17), {lost: true, petal: [35, 37]});
    F(260, S(18), {lost: true, petal: [39, 36]});
    // 5. Sunset: the sun goes out on the right, a blink, the flowers face front again and the gap fills.
    F(300, S(19), {lost: true}); F(100, S(20), {lost: true, face: blinked}); F(300, S(21), {lost: true}); F(300, S(22), {lost: true});
    F(320, null, {lost: true}); F(320, null); F(320, null);

    const frames = specs.map(({hold, o}) => ({hold, grid: scene(o)}));
    return {
      name: 'ECHO · sunflowers', key: 'echo_sunflowers', fwname: 'echo sunflowers', category: 'Idle', size: N,
      // Big tier: 28 frames of 1600 cells are 44800 bytes of firmware table, so it ships only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal after Vincent van Gogh, Sunflowers (1888), 40 cell lattice (12 px cells, the creature at 2x as the vase, standing on a dark wooden table against a yellow wall with five sunflowers on green stems rising out of the top of its head, one drooping over its right arm): a small gold sun comes in on the left and crosses the top of the panel, the antenna pings, every seed disc slides toward the sun and every stem leans after it while the creature\'s eyes track it, the eyes shut happy while it stands overhead, one petal comes off the drooping flower and zigzags down and off the panel, a blink, and the sun goes out on the right and the flowers face front again; judge whether it reads at a glance as the painting with the creature as the vase, and whether the heads turning to the sun reads at 12 px cells.',
      // 0 transparent, 1 body, 2 eyes, 3 visor, 4 ping, 5 feet, 6 the yellow wall, 7 petal and sun gold, 8 seed brown
      // (also the table), 9 stem green
      palette: [...ECHO_PALETTE.slice(0, 6), '#f3dc8a', '#f0a21c', '#6a3b13', '#5f8a2b'],
      frames,
    };
  })();

  L.register([echoSunflowers]);
})(typeof window !== 'undefined' ? window : globalThis);
