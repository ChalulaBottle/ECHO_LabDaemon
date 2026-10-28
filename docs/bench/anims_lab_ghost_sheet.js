// Lab creatures, culture batch three (operator, 2026-10-28: "produce me another 25 animations", "be creative and keep
// the style and theming and branding we have already developed"). October: drawn from scratch in code on the ECHO
// base, no words in the picture.
//
// ECHO · ghost sheet: the creature dressed as a ghost in a sheet, floating at night. 40 cell lattice, 12 px cells on the
// 480 panel: the body is the family's 20 cell pose repeated exactly twice across and down, moved 1 cell left so the
// sheet sits in the middle, and the sheet is drawn over it, so the creature is always there underneath.
//   sheet     a dome over the head that flares a little to a scalloped hem below the body; the antenna pokes out of the
//             top and keeps its ping, the feet dangle under the hem, and the two eye holes are cut exactly over the
//             visor's slits, so the holes show the teal band and the dark slits from inside: the ghost's eyes are the
//             creature's own. Shade on the right edge, along the hem and down three soft folds.
//   float     the whole figure bobs on two slow sine cycles a loop, the hem's scallops roll along it three times a
//             loop, and the shadow on the floor narrows when it rises; a blink shows through the holes.
//   peek      the hands come up to the hem's corners and lift it in three steps until the sheet is a hood over the
//             visor: the creature looks left, looks right, looks out, blinks, shuts its eyes happy with an antenna
//             ping; then it drops the sheet again in three steps.
//   night     a pale crescent moon top left and four stars that twinkle in turn.
// Loop: 26 frames, 6.09 s. The bob, the hem and the stars run whole cycles a loop on the frame index, so the last
// frame runs into the first without a seam.
// Palette: 0..5 the ECHO palette unchanged; 6 sheet white, 7 sheet shade (edge, hem, folds), 8 shadow (on the floor),
// 9 moon (the crescent, the stars). Index 6 is not ping here, so nothing goes through echoGlitch. Big tier: 26 frames
// of 1600 cells are 41600 bytes of firmware table, so it ships only on boards built with SPLASH_BIG. One closure, so
// echoGhostSheet is the only name it adds; registered at the end of this file.
(function (root) {
  if (typeof require !== 'undefined' && !root.BENCH_LIB) require('./anims.js');
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  const echoGhostSheet = (() => {
    const N = 40, K = 2;                                           // lattice; a 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, SHEET = 6, SHADE = 7, SHADOW = 8, MOON = 9;
    // Constants the cell is judged on (rows are the creature's own, before the bob moves it).
    const DX = -1;                                                 // the family's 2x frame, 1 cell left
    const CX = 20;                                                 // the sheet's centre line
    const V = {top: 12, bot: 15, l: 12 + DX, r: 29 + DX};          // the visor band
    const EYE_C = [14 + DX, 26 + DX];                              // each slit's left col, 2 wide
    const TOP = 5, CROWN = 14, W = 16;                             // the dome: its top row, the row it is widest, half width
    const HEM = 28, LIFTED = 11;                                   // the hem's row at rest and at the full lift
    const HANDS = [6 + DX, 34 + DX];                               // each hand's left col, 2 wide
    const FLOOR = 38;
    const TAU = 2 * Math.PI;

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    const rect = (g, r0, c0, r1, c1, v) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) put(g, r, c, v); return g; };

    // The creature, at the bob's offset dy; with the sheet lifted its arms go up to the hem (the upper arms stay at the
    // shoulders, the hanging hands come off and are drawn later at the hem's corners).
    function creature(dy, ping, lifted) {
      const src = upscale(echoPing(ping), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (src[r][c]) put(g, r + dy, c + DX, src[r][c]);
      if (lifted) { rect(g, 16 + dy, 6 + DX, 21 + dy, 9 + DX, 0); rect(g, 16 + dy, 32 + DX, 21 + dy, 35 + DX, 0); }
      return g;
    }
    // Faces, drawn on the creature before the sheet goes over it.
    const band = (g, dy) => rect(g, V.top + dy, V.l, V.bot + dy, V.r, VISOR);
    const slits = (sx = 0) => (g, dy) => { band(g, dy); for (const c of EYE_C) rect(g, V.top + dy, c + sx, V.bot + dy, c + sx + 1, EYE); return g; };
    const blinked = (g, dy) => { band(g, dy); for (const c of EYE_C) rect(g, V.bot - 1 + dy, c, V.bot + dy, c + 1, EYE); return g; };
    const arches = (g, dy) => { band(g, dy); for (const c of EYE_C) { rect(g, V.top + 1 + dy, c, V.top + 1 + dy, c + 1, EYE); put(g, V.top + 2 + dy, c - 1, EYE); put(g, V.top + 2 + dy, c + 2, EYE); } return g; };

    // The sheet's half width on row r: a round dome to the crown, then a slow flare.
    const halfW = r => r < TOP ? -1 : r <= CROWN ? W * Math.sqrt(Math.max(0, 1 - Math.pow((CROWN - r) / (CROWN - TOP + 0.5), 2))) : W + 0.12 * (r - CROWN);
    // The eye holes: four across and the band's four rows, centred on each slit.
    const inHole = (r, c) => r >= V.top && r <= V.bot && EYE_C.some(e => c >= e - 1 && c <= e + 2);
    // The sheet over the creature: hem is its bottom row (before the scallops), phase rolls the scallops along it.
    function sheet(g, dy, hem, phase, lifted) {
      const scallop = c => (Math.sin(TAU * (c - phase) / 6) > 0 ? 1 : 0) + (Math.sin(TAU * (c - phase) / 6) > 0.7 ? 1 : 0);
      for (let r = TOP; r <= hem + 2; r++) for (let c = 0; c < N; c++) {
        const w = halfW(r);
        if (w < 0 || Math.abs(c + 0.5 - CX) > w) continue;
        const bottom = hem + (lifted ? 0 : scallop(c));
        if (r > bottom) continue;
        if (inHole(r, c)) continue;
        let ink = SHEET;
        if (Math.abs(c + 1.5 - CX) > w || r === bottom || (lifted && r >= bottom - 1)) ink = SHADE;   // the right edge and the hem
        if (c + 0.5 > CX + w - 1) ink = SHADE;
        const fold = [CX - 8, CX + 1, CX + 9].some(x => c === Math.round(x + 0.6 * Math.sin(TAU * (r / 14) + phase / 3)));
        if (fold && r >= CROWN + 3 && r < bottom) ink = SHADE;                                        // three soft folds
        put(g, r + dy, c, ink);
      }
      // The antenna's way out: one shade cell each side of the shaft where it leaves the dome.
      for (const c of [28 + DX, 31 + DX]) if (g[TOP + 1 + dy][c] === SHEET) put(g, TOP + 1 + dy, c, SHADE);
      return g;
    }

    // The night: the crescent, four stars on in turn, the shadow narrowing as the figure rises.
    function night(g, f, dy) {
      for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
        if (Math.hypot(r + 0.5 - 5, c + 0.5 - 6) <= 3.6 && Math.hypot(r + 0.5 - 3.8, c + 0.5 - 7.6) > 3.1) put(g, r, c, MOON);
      }
      [[2, 15], [9, 37], [3, 36], [12, 2]].forEach(([r, c], i) => { if ((f + i * 2) % 8 < 5) put(g, r, c, MOON); });
      const w = 9 + dy;                                            // dy runs -3..0: higher is narrower
      for (let c = Math.round(CX - w); c <= Math.round(CX + w - 1); c++) put(g, FLOOR, c, SHADOW);
      for (let c = Math.round(CX - w + 2); c <= Math.round(CX + w - 3); c++) put(g, FLOOR - 1, c, SHADOW);
      return g;
    }

    // A scene. o: lift 0..1, face, ping; the frame index drives the bob, the hem and the stars.
    let NF = 1;
    function scene(f, o) {
      const g = blank();
      const dy = Math.round(-1.5 + 1.5 * Math.sin(TAU * 2 * f / NF));
      const lift = o.lift || 0, hem = Math.round(HEM - lift * (HEM - LIFTED));
      night(g, f, dy);
      const cr = creature(dy, !!o.ping, lift > 0);
      (o.face || slits(0))(cr, dy);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (cr[r][c]) g[r][c] = cr[r][c];
      sheet(g, dy, hem, 18 * f / NF, lift > 0);
      if (lift > 0) for (const c of HANDS) {                       // the hands on the hem's corners, the arms up to them
        const hc = c > CX ? c - 1 : c + 1;
        rect(g, hem - 1 + dy, hc, hem + 1 + dy, hc + 1, BODY);
        if (hem + 1 < 14) rect(g, hem + 2 + dy, hc, 13 + dy, hc + 1, BODY);
      }
      return g;
    }

    // The frames.
    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    // 1. Float, the loop anchor: the bob, the rolling hem, a blink through the eye holes.
    F(260); F(260); F(260); F(90, {face: blinked}); F(260); F(260); F(260); F(260);
    // 2. The peek: the hands lift the hem to a hood, the creature looks round, blinks, shuts its eyes happy, pings.
    F(150, {lift: 0.35}); F(150, {lift: 0.7}); F(170, {lift: 1});
    F(350, {lift: 1, face: slits(-2)}); F(350, {lift: 1, face: slits(2)}); F(250, {lift: 1});
    F(90, {lift: 1, face: blinked}); F(320, {lift: 1, face: arches, ping: true});
    // 3. It drops the sheet again and floats on.
    F(140, {lift: 0.6}); F(130, {lift: 0.25});
    F(260); F(260); F(260); F(260); F(260); F(260); F(260); F(260);

    NF = specs.length;
    const frames = specs.map(({hold, o}, f) => ({hold, grid: scene(f, o)}));
    return {
      name: 'ECHO · ghost sheet', key: 'echo_ghost_sheet', fwname: 'echo ghost sheet', category: 'Idle', size: N,
      // Big tier: 26 frames of 1600 bytes (41600 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, October, 40 cell lattice (12 px cells, the creature at 2x under a white sheet with a scalloped hem, its antenna poking out of the top and its feet dangling below) floating at night under a crescent moon: the two eye holes sit exactly over the visor, so the ghost\'s eyes are the teal band and the dark slits from inside, and it blinks through them; it bobs on a slow sine with the hem rolling and its shadow narrowing on the floor, then its hands come up to the hem and lift the sheet into a hood, it looks left, right and out, blinks, shuts its eyes happy with an antenna ping, and drops the sheet again; judge whether it reads at a glance as a sheet ghost, whether the eye holes read as the creature looking out, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes, 3 visor, 4 ping, 5 feet, 6 sheet white, 7 sheet shade (edge, hem, folds),
      // 8 shadow on the floor, 9 moon (the crescent, the stars)
      palette: [...ECHO_PALETTE.slice(0, 6), '#e9f5f2', '#9fbcb7', '#1d2c2c', '#f3e7b4'],
      frames,
    };
  })();

  L.register([echoGhostSheet]);
})(typeof window !== 'undefined' ? window : globalThis);
