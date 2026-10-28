// Culture creatures, batch three (operator, 2026-10-28: "be creative and keep the style and theming and branding we
// have already developed"): the ECHO creature plays every role, and a painting in the public domain is homaged by its
// composition, its setting and its gesture only. Drawn from scratch in code on the ECHO base; no traced image, no
// fetched pixels.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {echoPing, ECHO_PALETTE} = L;

  // ECHO · wanderer: Caspar David Friedrich, Wanderer above the Sea of Fog (1818). The creature stands with its back to
  // us on top of a dark crag and looks out over a sea of fog with far peaks rising out of it. 40 cell lattice, 12 px
  // cells on the 480 panel, at the painting's proportions: the figure is small against the fog, so the body is the
  // family's 20 cell pose at 1x, placed as it is on the 40 lattice (rows 6 to 21, centred), mirrored left to right
  // because we see it from behind (so its antenna, on its right, stands on our left).
  //   back      from behind there is no visor: the head is plain body teal, and the visor's two rows are deep teal,
  //             the band going round the back of the head.
  //   crag      a dark crag rising from the bottom middle of the panel to a flat top under its feet, its left face
  //             steeper than its right, ragged, with a few lit edges.
  //   sky       a pale grey sky with a light band low down, far peaks in blue grey, the big mountain on the right as
  //             in the painting.
  //   fog       five banks of fog, each a wavy pale top over a grey shade, drifting sideways at their own pace (the
  //             near ones faster, some left and some right), so the sea rolls round the crag and below the figure;
  //             two dark rocks break through it on the left, and the nearest bank rolls round the crag's foot.
  //   turn      the head turns to its right: the visor's edge comes round the side of the head with one eye slit in
  //             it, then more of the band, then far enough that both slits show (its face three quarters on), held,
  //             a blink while it looks, and it turns back the same way.
  //   ping      the antenna tip pings and a ring of ping travels out over the fog, dashed once it is wide, growing a
  //             step at a time until it leaves the panel; then a short look the other way, and the rest.
  // Loop: 29 frames, 9.0 s. Every fog bank moves a whole wave length a loop (20 or 40 cols), so the last frame runs
  // into the first without a seam, and every pose returns to the rest before the loop ends.
  // Palette: 0..5 the ECHO palette unchanged (4 is also the ring; 5 also the band round the back of the head); 6 fog
  // pale, 7 sky and fog shade, 8 far peaks and the crag's lit edges, 9 the crag and the rocks. One closure, so
  // echoWanderer is the only name it adds; registered at the end of this file.
  const echoWanderer = (() => {
    const N = 40, G = 20;                                          // the lattice; the family pose's own
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, FOG = 6, SHADE = 7, FAR = 8, CRAG = 9;
    // Constants the cell is judged on.
    const OY = 5, OX = 10;                                         // the 1x pose, mirrored, moved 5 down and 10 across
    const V = {top: 6 + OY, bot: 7 + OY, l: 4 + OX, r: 14 + OX};   // the head's visor rows and its width on the panel
    const TIP = [1.5 + OY, 4.5 + OX];                              // the antenna tip's centre once mirrored
    const CRAG_TOP = 22;                                           // the crag's flat top, under its feet
    const TAU = 2 * Math.PI;

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };

    // The creature from behind: the family pose at 1x, mirrored, moved OY down and OX across; the visor rows painted
    // deep teal across the head's width, the band seen from the back.
    function back(ping) {
      const src = echoPing(ping), g = blank();
      for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) {
        let v = src[r][G - 1 - c];
        if (v === VISOR || v === EYE) v = BODY;
        if (v) put(g, r + OY, c + OX, v);
      }
      for (let r = V.top; r <= V.bot; r++) for (let c = V.l + 1; c <= V.r - 1; c++) put(g, r, c, FEET);
      return g;
    }
    // The turn: the visor's edge comes round the right side of the head, w cells of it, an eye slit one cell in from
    // its inner end; at w 7 or more the far slit shows too, a cell in from the head's edge. side -1 turns it to its
    // left. shut: each slit only its bottom row, a blink.
    function turn(g, w, side = 1, shut = false) {
      const at = k => (side > 0 ? V.r - 1 - k : V.l + 1 + k);      // the k-th visor col in from the head's edge
      for (let k = 0; k < w; k++) for (let r = V.top; r <= V.bot; r++) put(g, r, at(k), VISOR);
      const slits = w >= 7 ? [w - 2, 1] : w >= 2 ? [w - 1] : [];
      for (const k of slits) for (let r = shut ? V.bot : V.top; r <= V.bot; r++) put(g, r, at(k), EYE);
      return g;
    }

    // The ground behind it, back to front. The sky with a paler band low down, the far peaks.
    function sky(bg) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) bg[r][c] = SHADE;
      for (let r = 9; r <= 13; r++) for (let c = 0; c < N; c++) bg[r][c] = FOG;      // the light low in the sky
      const peak = (x0, top, half) => { for (let r = top; r < N; r++) for (let c = 0; c < N; c++) if (Math.abs(c + 0.5 - x0) <= (r - top + 0.5) * half) bg[r][c] = FAR; };
      peak(32.5, 7, 1.6); peak(38.5, 9, 1.2);                      // the big mountain on the right and its shoulder
      peak(3.5, 11, 1.4); peak(10.5, 12, 1.8);                     // the low peaks on the left
      peak(22.5, 13, 2.2);
    }
    // A fog bank: [its base row, its height, wave length, waves' amplitude, cols it drifts a loop, phase]; the top
    // edge rides two waves, CREST rows of it pale and the rest shade.
    const BANKS = [
      [18, 3, 20, 1.4, 20, 0.0],                                   // far, slow, drifting right
      [23, 4, 40, 2.0, -40, 1.3],                                  // drifting left
      [28, 4, 20, 2.0, 40, 2.6],                                   // drifting right
      [33, 5, 40, 2.4, -40, 4.0],                                  // drifting left
      [39, 5, 20, 2.2, 40, 5.1],                                   // the nearest, round the crag's foot
    ];
    const CREST = 3;
    let NF = 1;
    function bank(bg, f, [base, h, lam, amp, drift, ph]) {
      const shift = drift * f / NF;
      for (let c = 0; c < N; c++) {
        const x = c - shift;
        const top = base - h - amp * (0.5 + 0.5 * Math.sin(TAU * x / lam + ph)) - 0.8 * Math.sin(TAU * 2 * x / lam + 2 * ph);
        for (let r = Math.ceil(top); r <= base; r++) if (inside(r, c)) bg[r][c] = r - Math.ceil(top) < CREST ? FOG : SHADE;
      }
    }
    function fog(bg, f) {
      BANKS.forEach((b, i) => {
        bank(bg, f, b);
        if (i === 1) {                                             // the two rocks through the fog, left, as in the painting
          for (let r = 20; r <= 24; r++) for (let c = 0; c <= 4; c++) if (c <= 1 + (r - 20) * 0.8) bg[r][c] = CRAG;
          for (let r = 25; r <= 29; r++) for (let c = 3; c <= 8; c++) if (Math.abs(c - 5.5) <= (r - 24) * 0.7) bg[r][c] = CRAG;
        }
      });
    }
    // The crag: a flat top under its feet, its sides widening down to the bottom of the panel, ragged.
    const JAG = [0, 1, 0, 2, 1, 0, 1, 2, 0, 1, 1, 0, 2, 1, 0, 1, 0, 2];
    function crag(g) {
      for (let r = CRAG_TOP; r < N; r++) {
        const k = r - CRAG_TOP;                                    // the left face steeper than the right, as a crag leans
        const l = 13 - 0.5 * k - JAG[k % JAG.length] * 0.7, rr = 26 + 0.9 * k + JAG[(k + 7) % JAG.length] * 0.7;
        for (let c = 0; c < N; c++) if (c + 0.5 >= l && c + 0.5 <= rr) g[r][c] = CRAG;
      }
      for (const [r, c] of [[CRAG_TOP, 14], [CRAG_TOP, 24], [26, 11], [29, 27], [33, 8], [35, 31]]) put(g, r, c, FAR);   // lit edges
    }
    // The ring of the ping: a circle of radius rad round the tip, dashed once it is wide, over the sky and the fog only.
    function ring(g, rad) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const dy = r + 0.5 - TIP[0], dx = c + 0.5 - TIP[1], d = Math.hypot(dy, dx);
        if (Math.abs(d - rad) > 0.55) continue;
        if (rad > 7 && Math.floor((Math.atan2(dy, dx) + Math.PI) / TAU * Math.round(rad * 2)) % 3 === 2) continue;
        if (g[r][c] !== CRAG) g[r][c] = PING;
      }
    }

    // A scene. o: turn [w, side, shut], ping (the tip lit), ring (its radius).
    function scene(f, o) {
      const g = blank();
      sky(g); fog(g, f); crag(g);                                  // the crag in front of the fog, down to the bottom edge
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
    // 2. The turn to its right: the visor's edge with one slit, more of the band, then both slits, held, a blink,
    // and back.
    F(300, {turn: [2, 1]}); F(300, {turn: [4, 1]}); F(400, {turn: [8, 1]}); F(110, {turn: [8, 1, true]}); F(400, {turn: [8, 1]});
    F(300, {turn: [4, 1]}); F(300, {turn: [2, 1]});
    F(340); F(340);
    // 3. The ping: the tip lights and the ring goes out over the fog a step at a time.
    F(260, {ping: true}); F(260, {ping: true, ring: 3}); F(260, {ring: 6.5}); F(260, {ring: 11}); F(260, {ring: 16});
    F(260, {ring: 22}); F(260, {ring: 29});
    // 4. A short look the other way, toward where the ring went, and the rest.
    F(300, {turn: [2, -1]}); F(360, {turn: [4, -1]}); F(300, {turn: [2, -1]});
    F(340); F(340); F(340); F(340); F(340);

    NF = specs.length;
    const frames = specs.map(({hold, o}, f) => ({hold, grid: scene(f, o)}));
    return {
      name: 'ECHO · wanderer', key: 'echo_wanderer', fwname: 'echo wanderer', category: 'Idle', size: N,
      // Big tier: 29 frames of 1600 cells are 46400 bytes of firmware table, so it ships only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal after Caspar David Friedrich, Wanderer above the Sea of Fog (1818), 40 cell lattice at the painting\'s proportions (12 px cells, the creature small at 1x and seen from behind, mirrored so its antenna stands on our left, a deep teal band across the back of its head) on top of a dark crag that rises from the bottom middle, with fog below and round it: five fog banks roll sideways at their own pace under a pale grey sky with far blue grey peaks and two dark rocks breaking through, the nearest rolling round the crag\'s foot; it turns its head to its right so the visor edge comes round the side, first one eye slit and then both, held, blinks and turns back, then its antenna pings and a ring of ping travels out over the fog, it glances the other way after it and settles; judge whether it reads at a glance as the painting, whether the small back view still reads as this creature, and whether the turn reads as a head turning rather than a visor sliding.',
      // 0 transparent, 1 body, 2 eyes, 3 visor, 4 ping (the antenna tip, the ring), 5 feet (the band round the back
      // of the head), 6 fog pale, 7 sky and fog shade, 8 far peaks and the crag's lit edges, 9 the crag and the rocks
      palette: [...ECHO_PALETTE.slice(0, 6), '#dde5e7', '#97a8b1', '#5f7584', '#1c2125'],
      frames,
    };
  })();

  L.register([echoWanderer]);
})(typeof window !== 'undefined' ? window : globalThis);
