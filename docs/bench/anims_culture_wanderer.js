// Culture creatures, batch three (operator, 2026-10-28: "be creative and keep the style and theming and branding we
// have already developed"): the ECHO creature plays every role, and a painting in the public domain is homaged by its
// composition, its setting and its gesture only. Drawn from scratch in code on the ECHO base; no traced image, no
// fetched pixels.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  // ECHO · wanderer: Caspar David Friedrich, Wanderer above the Sea of Fog (1818). The creature stands with its back to
  // us on a dark crag and looks out over a sea of fog with far peaks rising out of it. 40 cell lattice, 12 px cells on
  // the 480 panel: the body is the family's 20 cell pose repeated exactly 2 times across and down, mirrored left to
  // right because we see it from behind (so its antenna, on its right, stands on our left), and moved 6 rows down so
  // its feet stand on the crag along the bottom edge and the sky keeps the top of the panel.
  //   back      from behind there is no visor: the head is plain body teal, and a deep teal strap two rows tall across
  //             it is the visor's band going round the back of the head.
  //   sky       a pale grey sky over far peaks in blue grey, the big mountain on the right as in the painting.
  //   fog       four banks of fog, each a wavy pale top with a grey underside, drifting sideways at their own pace
  //             (the near banks faster, the far ones slower, some left and some right), so the sea rolls round it;
  //             two dark rocks break through the fog on the left.
  //   turn      the head turns to its right: the visor's edge comes round the side of the head with one eye slit in
  //             it, then more of the band, then far enough that both slits show (its face three quarters on), a blink
  //             while it looks, and it turns back the same way.
  //   ping      the antenna tip pings and a ring of ping travels out into the mist, dashed, growing a step at a time
  //             until it leaves the panel; then a short look the other way, and the rest.
  // Loop: 29 frames, 8.9 s. Every fog bank moves a whole wave length a loop (20 or 40 cols), so the last frame runs
  // into the first without a seam, and every pose returns to the rest before the loop ends.
  // Palette: 0..5 the ECHO palette unchanged (4 is also the ring; 5 also the strap); 6 fog pale, 7 sky and fog shade,
  // 8 far peaks, 9 the crag. One closure, so echoWanderer is the only name it adds; registered at the end of this file.
  const echoWanderer = (() => {
    const N = 40, K = 2;                                           // lattice; the 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, FOG = 6, SHADE = 7, FAR = 8, CRAG = 9;
    // Constants the cell is judged on.
    const OY = 6;                                                  // the family's 2x frame, 6 rows down
    const V = {top: 12 + OY, bot: 15 + OY, l: 10, r: 31};          // the head's visor rows on the panel, the head's width
    const TIP = [3 + OY, 9];                              // the antenna tip's centre once mirrored
    const TAU = 2 * Math.PI;

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };

    // The creature from behind: the family pose at 2x, mirrored, OY down; the visor painted over in body teal and a
    // strap row in deep teal across the back of the head.
    function back(ping) {
      const src = upscale(echoPing(ping), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        let v = src[r][N - 1 - c];
        if (v === VISOR || v === EYE) v = BODY;
        if (v) put(g, r + OY, c, v);
      }
      for (let r = V.top + 1; r <= V.top + 2; r++) for (let c = V.l; c <= V.r; c++) put(g, r, c, FEET);
      return g;
    }
    // The turn: the visor's edge comes round the right side of the head, w cells of it with an eye slit two cells in
    // from the head's edge; side -1 turns it to its left instead. shut: the slit is one row, a blink.
    function turn(g, w, side = 1, shut = false) {
      for (let k = 0; k < w; k++) {
        const c = side > 0 ? V.r - k : V.l + k;
        for (let r = V.top; r <= V.bot; r++) put(g, r, c, VISOR);
      }
      if (w >= 3) {
        const e0 = side > 0 ? V.r - w + 2 : V.l + w - 3;            // the slit sits toward the face's middle
        for (let c = e0; c < e0 + 2; c++) for (let r = shut ? V.bot : V.top; r <= V.bot; r++) put(g, r, c, EYE);
        if (w >= 9) {                                              // turned far enough that the far slit shows too
          const e1 = side > 0 ? V.r - 2 : V.l + 1;
          for (let c = e1; c < e1 + 2; c++) for (let r = shut ? V.bot : V.top; r <= V.bot; r++) put(g, r, c, EYE);
        }
      }
      return g;
    }

    // The ground behind it, back to front. The sky with a paler band low down, the far peaks.
    function sky(bg) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) bg[r][c] = SHADE;
      for (let r = 8; r <= 12; r++) for (let c = 0; c < N; c++) bg[r][c] = FOG;      // the light low in the sky
      const peak = (x0, top, half) => { for (let r = top; r < N; r++) for (let c = 0; c < N; c++) if (Math.abs(c + 0.5 - x0) <= (r - top + 0.5) * half) bg[r][c] = FAR; };
      peak(31.5, 5, 1.6); peak(37.5, 7, 1.2);                      // the big mountain on the right and its shoulder
      peak(3.5, 9, 1.4); peak(10.5, 11, 1.8);                      // the low peaks on the left
      peak(21.5, 12, 2.2);
    }
    // A fog bank: [its base row, its height, wave length, waves' amplitude, cols it drifts a loop, phase]; the top
    // edge rides two waves, its last two rows above the base are shade.
    const BANKS = [
      [19, 5, 20, 1.6, 20, 0.0],                                   // far, slow, drifting right
      [25, 5, 40, 2.4, -40, 1.3],                                  // middle, drifting left
      [31, 5, 20, 2.0, 40, 2.6],                                   // near, drifting right
      [39, 6, 40, 2.6, -40, 4.0],                                  // nearest, round the crag, drifting left
    ];
    const CREST = 4;                                               // pale rows on a bank's top; shade under them
    let NF = 1;
    function fog(bg, f) {
      BANKS.forEach(([base, h, lam, amp, drift, ph], i) => {
        const shift = drift * f / NF;
        for (let c = 0; c < N; c++) {
          const x = c - shift;
          const top = base - h - amp * (0.5 + 0.5 * Math.sin(TAU * x / lam + ph)) - 0.8 * Math.sin(TAU * 2 * x / lam + 2 * ph);
          for (let r = Math.ceil(top); r <= base; r++) if (inside(r, c)) bg[r][c] = r - Math.ceil(top) < CREST ? FOG : SHADE;
        }
        if (i === 1) {                                             // the two rocks through the fog, left, as in the painting
          for (let r = 19; r <= 23; r++) for (let c = 0; c <= 4; c++) if (c <= 1 + (r - 19) * 0.8) bg[r][c] = CRAG;
          for (let r = 24; r <= 28; r++) for (let c = 2; c <= 7; c++) if (Math.abs(c - 4.5) <= (r - 23) * 0.7) bg[r][c] = CRAG;
        }
      });
    }
    // The crag it stands on: a dark ledge across the bottom with a ragged top, higher under its feet.
    const CRAG_TOP = [39, 38, 38, 37, 37, 36, 36, 36, 37, 37, 36, 36, 37, 37, 37, 36, 36, 37, 37, 37, 36, 36, 36, 37, 37, 36, 36, 37, 37, 37, 36, 36, 36, 37, 37, 38, 38, 39, 39, 39];
    function crag(g) {
      for (let c = 0; c < N; c++) for (let r = CRAG_TOP[c]; r < N; r++) g[r][c] = CRAG;
      for (const [r, c] of [[38, 4], [38, 13], [38, 21], [38, 28], [38, 34]]) put(g, r, c, FAR);   // a few lit edges
    }
    // The ring of the ping: a dashed circle of radius rad round the tip, only on cells the creature leaves empty.
    function ring(g, rad) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const dy = r + 0.5 - TIP[0], dx = c + 0.5 - TIP[1], d = Math.hypot(dy, dx);
        if (Math.abs(d - rad) > 0.55) continue;
        if (rad > 7 && Math.floor((Math.atan2(dy, dx) + Math.PI) / TAU * Math.round(rad * 2)) % 3 === 2) continue;
        g[r][c] = PING;
      }
    }

    // A scene. o: turn [w, side, shut], ping (the tip lit), ring (its radius).
    function scene(f, o) {
      const g = blank();
      sky(g); fog(g, f); crag(g);                                  // the crag behind its feet, so it stands on it
      if (o.ring) ring(g, o.ring);
      const c = back(!!o.ping);
      if (o.turn) turn(c, ...o.turn);
      for (let r = 0; r < N; r++) for (let k = 0; k < N; k++) if (c[r][k]) g[r][k] = c[r][k];
      return g;
    }

    // The frames, listed first (the fog needs the loop's length). F(hold, o).
    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    // 1. Rest: the fog rolls, it stands still.
    F(340); F(340); F(340); F(340); F(340);
    // 2. The turn to its right: the visor's edge, then more of it with the eye, a blink, and back.
    F(300, {turn: [3, 1]}); F(300, {turn: [6, 1]}); F(400, {turn: [10, 1]}); F(110, {turn: [10, 1, true]}); F(400, {turn: [10, 1]});
    F(300, {turn: [6, 1]}); F(300, {turn: [3, 1]});
    F(340); F(340);
    // 3. The ping: the tip lights and the ring goes out into the mist a step at a time.
    F(260, {ping: true}); F(260, {ping: true, ring: 3}); F(260, {ring: 6}); F(260, {ring: 9.5}); F(260, {ring: 13.5});
    F(260, {ring: 18}); F(260, {ring: 23});
    // 4. A short look the other way, toward where the ring went, and the rest.
    F(300, {turn: [3, -1]}); F(360, {turn: [5, -1]}); F(300, {turn: [3, -1]});
    F(340); F(340); F(340); F(340); F(340);

    NF = specs.length;
    const frames = specs.map(({hold, o}, f) => ({hold, grid: scene(f, o)}));
    return {
      name: 'ECHO · wanderer', key: 'echo_wanderer', fwname: 'echo wanderer', category: 'Idle', size: N,
      // Big tier: 29 frames of 1600 cells are 46400 bytes of firmware table, so it ships only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal after Caspar David Friedrich, Wanderer above the Sea of Fog (1818), 40 cell lattice (12 px cells, the creature at 2x seen from behind, mirrored so its antenna stands on our left, a deep teal strap across the back of its head) on a dark crag over a sea of fog: four fog banks roll sideways at their own pace under a pale grey sky with far blue grey peaks and two dark rocks breaking through, it turns its head to its right so the visor edge comes round the side, first one eye slit and then both, blinks and turns back, then its antenna pings and a dashed ring of ping travels out into the mist, it glances the other way after it and settles; judge whether it reads at a glance as the painting, whether the back view still reads as this creature, and whether the turn reads as a head turning rather than a visor sliding.',
      // 0 transparent, 1 body, 2 eyes, 3 visor, 4 ping (the antenna tip, the ring), 5 feet (the strap), 6 fog pale,
      // 7 sky and fog shade, 8 far peaks and the crag's lit edges, 9 the crag and the rocks
      palette: [...ECHO_PALETTE.slice(0, 6), '#dde5e7', '#97a8b1', '#5f7584', '#1c2125'],
      frames,
    };
  })();

  L.register([echoWanderer]);
})(typeof window !== 'undefined' ? window : globalThis);
