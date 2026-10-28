// Culture creatures, batch three (operator, 2026-10-28: "be creative and keep the style and theming and branding we
// have already developed"): the ECHO creature plays every role, and a painting in the public domain is homaged by its
// composition, its setting and its gesture only. Drawn from scratch in code on the ECHO base; no traced image, no
// fetched pixels.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  // ECHO · water lilies: Claude Monet, Bridge over a Pond of Water Lilies (1899). The arched footbridge crosses the top
  // of the panel in front of dense green foliage, the pond below is dark green with pale streaks of reflected light and
  // lily pads with pink flowers, and the creature sits on the biggest pad as the pond's frog. 40 cell lattice, 12 px
  // cells on the 480 panel: the body is the family's 20 cell pose repeated exactly 2 times across and down, moved 6
  // rows down, its legs folded to their top 2 rows while it sits (a frog's crouch) and let out to their full 6 in the
  // air.
  //   bridge    a pale green arch from edge to edge, its deck two rows thick, a top rail three rows above it and posts
  //             between them every three cols, as Monet painted it; foliage in two greens fills the sky behind it.
  //   pond      the deep green water with short pale streaks that drift slowly right a whole period a loop, lily pads
  //             (flat ellipses with a notch) and three pink flowers, one on the creature's own pad.
  //   drop      a drop falls from under the bridge into the water on the left; rings spread from it as flat ellipses,
  //             two wide for one tall (the pond seen at a slant), and fade. A second drop lands on the right later.
  //   hop       the frog hop: it sinks a row to gather, springs up with its legs out and its eyes wide, hangs at the
  //             top, comes down, and the pad dips a row as it lands; rings spread round the pad and its eyes shut
  //             happy.
  //   watch     its eyes follow each drop as it lands; a blink at rest.
  // Loop: 30 frames, 7.3 s. The streaks drift a whole period a loop and every ring has faded and every pose is the
  // rest again by the last frame, so it runs into the first without a seam.
  // Palette: 0..5 the ECHO palette unchanged (4 is also the drops and the rings); 6 pale green (the bridge, the
  // streaks, the flowers' hearts), 7 pad green (the pads, the foliage), 8 deep pond green (the water, the foliage's
  // shade), 9 lily pink. One closure, so echoWaterLilies is the only name it adds; registered at the end of this file.
  const echoWaterLilies = (() => {
    const N = 40, K = 2;                                           // lattice; the 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, PALE = 6, PAD = 7, POND = 8, PINK = 9;
    // Constants the cell is judged on.
    const OY = 6;                                                  // the family's 2x frame, 6 rows down while it sits
    const CROUCH = 2;                                              // leg rows kept while it sits (of 6)
    const BIG = {r: 36.5, c: 20, rx: 17, ry: 2.6};                 // the creature's pad
    const EYE_C = [14, 26];                                        // each slit's left col, 2 wide
    const TAU = 2 * Math.PI;

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };

    // The frog: the family pose at 2x, oy down, its legs cut to legs rows; faces on the visor rows.
    function frog(ping, oy, legs, face, dx = 0) {
      const src = upscale(echoPing(ping), K), g = blank();
      for (let r = 0; r < 28 + legs; r++) for (let c = 0; c < N; c++) if (src[r][c]) put(g, r + oy, c, src[r][c]);
      const top = 12 + oy, bot = 15 + oy;
      for (let r = top; r <= bot; r++) for (let c = 12; c <= 29; c++) put(g, r, c, VISOR);
      for (const c0 of EYE_C) {
        if (face === 'blink') { put(g, bot, c0, EYE); put(g, bot, c0 + 1, EYE); }
        else if (face === 'happy') { put(g, top + 2, c0 - 1, EYE); put(g, top + 1, c0, EYE); put(g, top + 1, c0 + 1, EYE); put(g, top + 2, c0 + 2, EYE); }
        else if (face === 'wide') { for (let r = top; r <= bot; r++) for (let c = c0 - 1; c <= c0 + 2; c++) put(g, r, c, EYE); put(g, top + 1, c0, PING); }   // a round eye, a glint
        else for (let r = top; r <= bot; r++) { put(g, r, c0 + dx, EYE); put(g, r, c0 + 1 + dx, EYE); }
      }
      return g;
    }

    // The bridge and the foliage behind it. The deck's top row at col c; the rail three rows over it.
    const deck = c => Math.round(9 - 4.2 * Math.sin(Math.PI * (c + 0.5) / N));
    function bridge(g) {
      for (let c = 0; c < N; c++) {
        const d = deck(c);
        for (let r = 0; r < d; r++) g[r][c] = ((r >> 1) * 3 + (c >> 1) * 5) % 7 < 2 ? POND : PAD;   // foliage in dabs two cells square
        g[d][c] = PALE; g[d + 1][c] = PALE;                        // the deck
        put(g, d - 3, c, PALE);                                    // the top rail
        if (c % 3 === 1) { put(g, d - 2, c, PALE); put(g, d - 1, c, PALE); }   // the posts
      }
    }
    // The pond under the bridge: deep green with drifting pale streaks.
    let NF = 1;
    const STREAKS = [[13, 0, 3], [18, 6, 2], [23, 2, 3], [28, 7, 2], [33, 4, 3]];   // [row, offset, length], period 10
    function pond(g, f) {
      const drift = 10 * f / NF;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (r > deck(c) + 1) g[r][c] = POND;
      for (const [r, o, len] of STREAKS) for (let c = 0; c < N; c++) {
        const p = ((c - o - Math.floor(drift)) % 10 + 10) % 10;
        if (p < len && g[r][c] === POND) g[r][c] = PALE;
      }
    }
    // A lily pad: a flat ellipse with a notch cut toward the viewer; a pink flower on it, pale at the heart.
    function pad(g, {r: cy, c: cx, rx, ry}, notch = true) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const u = (c + 0.5 - cx) / rx, v = (r + 0.5 - cy) / ry;
        if (u * u + v * v > 1) continue;
        if (notch && v > 0 && Math.abs(c + 0.5 - cx - rx * 0.3) < v * 1.2) continue;
        g[r][c] = PAD;
      }
    }
    const flowerAt = (g, r, c) => { put(g, r, c, PINK); put(g, r, c + 1, PINK); put(g, r, c + 2, PINK); put(g, r - 1, c + 1, PINK); put(g, r, c + 1, PALE); };
    const PADS = [{r: 14.5, c: 4, rx: 4, ry: 1.2}, {r: 18.5, c: 36, rx: 4, ry: 1.3}, {r: 31.5, c: 3, rx: 4.5, ry: 1.5}, {r: 33.5, c: 37, rx: 4, ry: 1.4}, {r: 12.5, c: 31, rx: 3, ry: 1}];
    // A ring: a flat ellipse round (cy, cx), rad across the half width, half as tall; only on open water.
    function ring(g, cy, cx, rad) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const d = Math.hypot((c + 0.5 - cx) / rad, (r + 0.5 - cy) / (rad / 2));
        if (Math.abs(d - 1) * rad < 0.55 && (g[r][c] === POND || g[r][c] === PALE)) g[r][c] = PING;
      }
    }

    // A scene. o: oy (the frog's rows down), legs, face, dx (the eyes' slide), ping, drops [[row, col]], rings
    // [[row, col, radius]], dip (the big pad a row down).
    function scene(f, o) {
      const g = blank();
      bridge(g); pond(g, f);
      for (const p of PADS) pad(g, p);
      flowerAt(g, 31, 1); flowerAt(g, 18, 36);
      for (const [r, c, rad] of o.rings || []) ring(g, r, c, rad);
      for (const [r, c] of o.drops || []) { put(g, r, c, PING); put(g, r - 1, c, PING); }
      const big = Object.assign({}, BIG, {r: BIG.r + (o.dip ? 1 : 0)});
      pad(g, big, false);
      flowerAt(g, Math.round(big.r) + 1, 31);
      const fr = frog(!!o.ping, o.oy === undefined ? OY : o.oy, o.legs === undefined ? CROUCH : o.legs, o.face, o.dx || 0);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (fr[r][c]) g[r][c] = fr[r][c];
      return g;
    }

    // The frames, listed first (the streaks need the loop's length). F(hold, o).
    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    const A = [23, 3.5], B = [26, 35.5];                           // where the two drops land
    // 1. Rest, and the first drop: it falls from under the bridge on the left, the eyes follow, the rings spread.
    F(300); F(300); F(90, {face: 'blink'}); F(300);
    F(220, {drops: [[12, 3]], dx: -2}); F(220, {drops: [[17, 3]], dx: -2}); F(220, {drops: [[22, 3]], dx: -2});
    F(260, {rings: [[...A, 1.5]], dx: -2}); F(260, {rings: [[...A, 3]], dx: -2}); F(260, {rings: [[...A, 4.5]]}); F(260, {rings: [[...A, 6]]});
    // 2. The hop: gather, spring with the legs out and the eyes wide, hang, come down, land with a dip, rings, happy.
    F(240, {oy: 7, legs: 1}); F(160, {oy: 3, legs: 6, face: 'wide'}); F(200, {oy: 0, legs: 6, face: 'wide', ping: true}); F(260, {oy: -1, legs: 6, face: 'wide', ping: true});
    F(200, {oy: 0, legs: 6, face: 'wide'}); F(160, {oy: 3, legs: 4}); F(220, {oy: 7, legs: 1, dip: true, rings: [[37, 20, 18]]});
    F(280, {face: 'happy', rings: [[37, 20, 19.5]]}); F(300, {face: 'happy', rings: [[37, 20, 21]]}); F(280);
    // 3. The second drop, on the right: the eyes slide after it.
    F(220, {drops: [[13, 35]], dx: 2}); F(220, {drops: [[19, 35]], dx: 2}); F(220, {drops: [[25, 35]], dx: 2});
    F(260, {rings: [[...B, 1.5]], dx: 2}); F(260, {rings: [[...B, 3]], dx: 2}); F(260, {rings: [[...B, 4.5]]}); F(260, {rings: [[...B, 6]]});
    F(300); F(300);

    NF = specs.length;
    const frames = specs.map(({hold, o}, f) => ({hold, grid: scene(f, o)}));
    return {
      name: 'ECHO · water lilies', key: 'echo_water_lilies', fwname: 'echo water lilies', category: 'Idle', size: N,
      // Big tier: 30 frames of 1600 cells are 48000 bytes of firmware table, so it ships only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal after Claude Monet, Bridge over a Pond of Water Lilies (1899), 40 cell lattice (12 px cells, the creature at 2x as the pond\'s frog, sitting on the biggest lily pad with its legs folded), under a pale green arched footbridge with posts and a top rail in front of dense green foliage, the dark green pond streaked with drifting pale light, lily pads and pink flowers: a drop falls from under the bridge on the left and flat rings spread while its eyes follow, it sinks to gather and hops straight up with its legs out and its eyes wide, lands with the pad dipping and rings spreading round it and its eyes shut happy, then a second drop lands on the right; judge whether it reads at a glance as the painting, whether the hop reads as a frog\'s, and whether the rings read as water at 12 px cells.',
      // 0 transparent, 1 body, 2 eyes, 3 visor, 4 ping (the antenna tip, the drops, the rings), 5 feet, 6 pale green
      // (the bridge, the streaks, the flowers' hearts), 7 pad green (pads, foliage), 8 deep pond green, 9 lily pink
      palette: [...ECHO_PALETTE.slice(0, 6), '#d5ecb0', '#7db53b', '#1c3f33', '#f39ac2'],
      frames,
    };
  })();

  L.register([echoWaterLilies]);
})(typeof window !== 'undefined' ? window : globalThis);
