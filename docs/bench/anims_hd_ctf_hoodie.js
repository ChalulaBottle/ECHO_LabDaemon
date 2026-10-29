// HD takes of the 20 cell creatures: the same story on the 60 cell lattice (8 px cells on the 480 panel), built the
// way mushroom HD is built: the body is the family's 20 cell pose repeated exactly 3 times across and down, and the
// fine detail is painted on top of it cell by cell.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  // ECHO · CTF hoodie HD: the reworked 20 cell ctf hoodie (anims.js, HACK_PALETTE) told again at 3x.
  //   suit up   it stands as itself in teal; a black hoodie drops in from above, the hood settling round its head,
  //             and the black spreads down the body in four steps; a tug on the drawstrings narrows the hood's
  //             opening for one frame.
  //   hoodie    a rounded hood with a teal lining round the face opening, the teal visor and the creature's own
  //             teal face showing through it; two drawstrings out of eyelets under the opening with teal aglets;
  //             a kangaroo pocket seam; ribbed cuffs with the teal hands out of them; a ribbed waistband; the
  //             antenna pokes up through the hood.
  //   rain      matrix rain behind it: 1 cell columns, 3 to 6 cell trails under a bright head, falling only on empty
  //             cells off a one cell rim round everything in front, so the rain always reads as behind the body.
  //   404       a 5 by 7 pixel font 404 flashes on the chest like a print, the drawstrings hanging in its gaps.
  //   alerts    alert windows pop in the top corners (magenta frame and title bar, a light pane, a dark bang), the
  //             eyes glancing at each.
  //   portal    a magenta ellipse opens on the floor (a bright rim, a dark ring, a near black centre), the creature
  //             sinks through it, clipped at the portal's top edge row by row, the portal pulses and closes.
  //   drop in   it falls back in from the top as itself in teal (the hoodie stayed in the portal) and lands with a
  //             flash; the loop opens on it standing there.
  // Palette: 0..5 the ECHO palette unchanged (1 the teal self, face and hands; 2 eyes, the bang, the portal's centre;
  // 3 the visor and the aglets; 4 ping, the drawstrings, the alert pane, the landing flash; 5 the hood lining, the
  // seams, the ribbing); 6 hoodie black; 7 rain head; 8 rain trail; 9 magenta (the portal, the 404, the alert frame).
  // Big tier: 36 frames of 3600 cells are 129600 bytes of firmware table, SPLASH_BIG boards only. One closure, so
  // echoCtfHoodieHd is the only name it adds; registered at the end of this file.
  const echoCtfHoodieHd = (() => {
    const N = 60, K = 3;
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, SEAM = 5, HOOD = 6, HEAD = 7, TRAIL = 8, MAG = 9;
    // Constants the cell is judged on (panel rows and cols).
    const V = {top: 18, bot: 23, l: 18, r: 44};                    // the visor band, the family's at 3x
    const EYE_C = [21, 39];                                        // each eye's left col, 3 wide
    const CX = 31.5;                                               // the body's centre line (cols 15..47)
    const HOOD_TOP = 7, HOOD_BOT = 29, HOOD_HW = 20.5, HOOD_SHOULDER = 21;   // hood outline: top row, last row, half width
    const OPEN = {cy: 21.5, rx: 16.2, ry: 6.2};                    // the face opening, an ellipse round the visor
    const LINING = 1.5;                                            // the lining band's width past the opening
    const STRINGS = [27, 35];                                      // drawstring cols, centred in the 404's two gaps
    const D404 = {r: 31, c: 21, step: 8};                          // the 404 print's top left; 3 digits 5 wide, 3 apart
    const POCKET = {top: 32, bot: 37, l: 22, r: 40, flare: 3};     // kangaroo pocket seam
    const HANDS = [[30, 32, 9, 11], [30, 32, 51, 53]];             // rows and cols of the hands out of the cuffs
    const PORTAL = {cy: 55, rx: 22, ry: 4};                        // the portal at its widest, centred under the body
    const CLIP = PORTAL.cy - PORTAL.ry;                            // nothing at or below this row is drawn while sinking

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const copy = g => g.map(row => row.slice());
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    const stamp = (g, art, r0, c0, ink) => { art.forEach((line, dr) => [...line].forEach((ch, dc) => { if (ch !== '.') put(g, r0 + dr, c0 + dc, ink); })); return g; };

    // The creature as itself: the family pose at 3x, body teal.
    const self = (ping = false) => upscale(echoPing(ping), K);
    // The hood's outline: a rounded crown (a superellipse) over straight sides down to the shoulders.
    function inHood(r, c) {
      if (r < HOOD_TOP || r > HOOD_BOT) return false;
      const y = r + 0.5, x = c + 0.5, dx = Math.abs(x - CX) / HOOD_HW;
      if (dx > 1) return false;
      if (y >= HOOD_SHOULDER) return true;
      const dy = (HOOD_SHOULDER - y) / (HOOD_SHOULDER - HOOD_TOP);
      return Math.pow(dx, 2.4) + Math.pow(dy, 2.4) <= 1;
    }
    const inOpen = (r, c, t) => { const x = (c + 0.5 - CX) / (OPEN.rx - t), y = (r + 0.5 - OPEN.cy) / (OPEN.ry - t); return x * x + y * y <= 1; };
    const isHand = (r, c) => HANDS.some(([r0, r1, c0, c1]) => r >= r0 && r <= r1 && c >= c0 && c <= c1);

    // The face: the visor band, eyes slid dx, or shut (the bottom two rows of each eye).
    function face(g, dx = 0, shut = false) {
      for (let r = V.top; r <= V.bot; r++) for (let c = V.l; c <= V.r; c++) g[r][c] = VISOR;
      for (let r = shut ? V.bot - 1 : V.top; r <= V.bot; r++) for (const c0 of EYE_C) for (let c = c0; c < c0 + 3; c++) g[r][c + dx] = EYE;
      return g;
    }
    // The hoodie over the self, its rows down to thr (the rest still teal). tug narrows the opening by one cell and
    // pulls the strings two rows longer.
    function hoodie(o = {}) {
      const src = self(!!o.ping), g = copy(src), thr = o.thr === undefined ? N : o.thr, t = o.tug ? 1 : 0;
      const dyH = o.hoodDy || 0;                                   // the hood alone, dyH rows above its seat
      const hoodOnly = o.hoodDy !== undefined;
      // hood and body to black
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const hr = r + dyH;                                        // this cell in the hood's own frame
        const hood = inHood(hr, c) && !inOpen(hr, c, t);
        if (hoodOnly) { if (hood) g[r][c] = HOOD; continue; }
        if (r > thr) continue;
        if (hood || (src[r][c] === BODY && !isHand(r, c) && !inOpen(r, c, t))) g[r][c] = HOOD;
      }
      // the lining: the hood's turned edge, a band one to two cells wide round the opening, wherever the hood is
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const hr = r + dyH;
        if (!inHood(hr, c) || inOpen(hr, c, t) || (!hoodOnly && r > thr)) continue;
        if (inOpen(hr, c, t - LINING)) g[r][c] = SEAM;
      }
      // the antenna pokes up through the hood
      for (let r = 0; r < 12; r++) for (let c = 45; c <= 47; c++) if (src[r][c]) g[r][c] = src[r][c];
      face(g, o.dx || 0, !!o.shut);
      if (hoodOnly || thr < HOOD_BOT) return g;
      // the print goes on under the strings
      if (o.print) print404(g);
      // drawstrings out of eyelets under the opening, teal aglets
      const sLen = 3 + 2 * t;
      for (const c of STRINGS) {
        const eyelet = HOOD_BOT - 1;
        put(g, eyelet, c, EYE);
        for (let r = eyelet + 1; r <= eyelet + sLen; r++) put(g, r, c, PING);
        put(g, eyelet + sLen + 1, c, VISOR); put(g, eyelet + sLen + 2, c, VISOR);
      }
      if (thr < 33) return g;
      // the kangaroo pocket: a top seam and two slanted openings down to the waistband
      if (!o.print) {
        for (let c = POCKET.l + POCKET.flare; c <= POCKET.r - POCKET.flare; c++) if (g[POCKET.top][c] === HOOD) g[POCKET.top][c] = SEAM;
        for (let r = POCKET.top; r <= POCKET.bot; r++) {
          const k = Math.round((r - POCKET.top) * POCKET.flare / (POCKET.bot - POCKET.top));
          put(g, r, POCKET.l + POCKET.flare - k, SEAM); put(g, r, POCKET.r - POCKET.flare + k, SEAM);
        }
      }
      // cuffs: the sleeve's last two rows ribbed
      for (const [c0, c1] of [[9, 14], [48, 53]]) for (let r = 28; r <= 29; r++) for (let c = c0; c <= c1; c++) g[r][c] = (c % 2) ? SEAM : HOOD;
      if (thr < 41) return g;
      // the waistband: a seam row, then ribs
      for (let c = 15; c <= 47; c++) { g[38][c] = SEAM; for (let r = 39; r <= 41; r++) g[r][c] = (c % 2) ? SEAM : HOOD; }
      return g;
    }

    // The 404, a 5 by 7 pixel font, magenta.
    const GLYPH = {
      4: ['...1.', '..11.', '.1.1.', '1..1.', '11111', '...1.', '...1.'],
      0: ['.111.', '1...1', '1...1', '1...1', '1...1', '1...1', '.111.'],
    };
    function print404(g) { [4, 0, 4].forEach((d, i) => stamp(g, GLYPH[d], D404.r, D404.c + D404.step * i, MAG)); return g; }

    // An alert window in a top corner: magenta frame and title bar, a light pane, a dark bang.
    const ALERT = [
      'mmmmmmmmmm', 'mmmmmmmmmm', 'mppppppppm', 'mppppppppm', 'mpppkkpppm', 'mpppkkpppm', 'mpppkkpppm',
      'mpppkkpppm', 'mppppppppm', 'mpppkkpppm', 'mppppppppm', 'mmmmmmmmmm'];
    const AINK = {m: MAG, p: PING, k: EYE};
    function alertBox(g, right) {
      const c0 = right ? N - 11 : 1;
      ALERT.forEach((line, r) => [...line].forEach((ch, c) => put(g, 1 + r, c0 + c, AINK[ch])));
      return g;
    }

    // The portal, w from 0 to 1 of its widest: a magenta rim, a dark ring inside it, a near black centre.
    function portal(g, w) {
      const rx = PORTAL.rx * w, ry = Math.max(1, PORTAL.ry * Math.min(1, 0.4 + w));
      const e = (r, c, a, b) => { const x = (c + 0.5 - CX) / a, y = (r + 0.5 - PORTAL.cy) / b; return x * x + y * y; };
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (e(r, c, rx + 0.6, ry + 0.6) > 1) continue;
        const inner = e(r, c, rx - 1.4, ry - 1) <= 1, core = e(r, c, rx - 3.6, ry - 2) <= 1;
        g[r][c] = core ? EYE : inner ? HOOD : MAG;
      }
      return g;
    }
    // The creature d rows down, nothing drawn at or below the portal's top edge.
    function sunk(src, d) {
      const g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (src[r][c] && r + d < CLIP && r + d >= 0) g[r + d][c] = src[r][c];
      return g;
    }
    // The creature d rows shifted (negative: still above the panel), nothing clipped.
    function shifted(src, d) {
      const g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (src[r][c] && inside(r + d, c)) g[r + d][c] = src[r][c];
      return g;
    }

    // Matrix rain behind everything: 1 cell columns, a bright head over a 3 to 6 cell trail, on empty cells only and
    // never next to anything in front, so the rain always passes behind.
    const RAIN = [1, 4, 7, 10, 13, 17, 20, 24, 27, 30, 33, 36, 39, 42, 45, 49, 52, 55, 58].map((c, i) => ({
      c, v: 2 + (i * 7) % 3, len: 3 + (i * 5) % 4, o: (i * 23) % 70,
    }));
    function rain(fg, k) {
      const g = copy(fg);
      const near = (r, c) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (inside(r + a, c + b) && fg[r + a][c + b]) return true; return false; };
      for (const {c, v, len, o} of RAIN) {
        for (const half of [0, 36]) {                              // two drops a column, half a lap apart
          const head = (o + half + v * k) % (N + 12) - 6;
          for (let t = 0; t <= len; t++) { const r = head - t; if (inside(r, c) && !near(r, c)) g[r][c] = t === 0 ? HEAD : TRAIL; }
        }
      }
      return g;
    }

    // The frames.
    const frames = [];
    const F = (hold, grid) => frames.push({hold, grid});
    let k = 0;                                                     // rain clock: one step a rain frame
    const R = (hold, grid) => F(hold, rain(grid, k++));
    // The landing flash: the body and feet in ping, a one cell visor teal halo round the whole silhouette.
    const flash = () => {
      const s = self(), g = copy(s);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (s[r][c] === BODY || s[r][c] === SEAM) g[r][c] = PING;
        else if (!s[r][c]) for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (inside(r + a, c + b) && s[r + a][c + b]) { g[r][c] = VISOR; break; }
      }
      return g;
    };
    // 1. Suit up: itself in teal, the hood drops in, the black spreads down, a tug.
    F(500, self());
    F(170, hoodie({hoodDy: 9})); F(140, hoodie({hoodDy: 3}));
    for (const thr of [29, 33, 37, 41]) F(110, hoodie({thr}));
    F(220, hoodie({tug: true}));
    // 2. At work in the rain: a blink, an antenna ping.
    R(260, hoodie()); R(90, hoodie({shut: true})); R(260, hoodie({ping: true})); R(260, hoodie());
    // 3. The 404 flashes on the chest.
    R(260, hoodie({print: true})); R(160, hoodie()); R(300, hoodie({print: true}));
    // 4. Alerts: one top left, the eyes glance at it; one top right, the eyes follow.
    R(280, alertBox(hoodie({dx: -3}), false)); R(280, alertBox(hoodie({dx: -3}), false));
    R(280, alertBox(hoodie({dx: 3}), true)); R(300, alertBox(alertBox(hoodie({dx: 3, print: true}), true), false));
    // 5. The portal opens on the floor.
    for (const w of [0.25, 0.55, 0.85, 1]) R(130, portal(hoodie(), w));
    // 6. It sinks through, clipped at the portal's top edge.
    const at = hoodie();
    for (const d of [3, 9, 17, 27, 38, 49]) R(120, portal(sunk(at, d), 1));
    // 7. The portal pulses and closes, the rain alone.
    R(200, portal(blank(), 0.9)); R(120, portal(blank(), 0.55)); R(110, portal(blank(), 0.25));
    R(500, blank());
    // 8. Drop in as itself, the hoodie left in the portal, and land with a flash.
    // The rain keeps falling behind it on the way down; the flash wipes it, and the loop opens clear.
    R(100, shifted(self(), -34)); R(100, shifted(self(), -12)); F(140, flash());

    return {
      name: 'ECHO · CTF hoodie HD', key: 'ctf_hoodie_hd', fwname: 'ctf hoodie hd', category: 'Idle', size: N,
      // Big tier, like the other HD cells: 36 frames of 3600 bytes (129600 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, the HD take of the reworked ctf hoodie on the 60 cell lattice (8 px cells, the creature at 3x as in mushroom HD): it stands as itself in teal, a black hoodie drops over its head (a rounded hood with a teal lining round the face, the visor showing) and the black spreads down the body, a tug on the drawstrings; matrix rain falls behind it on empty cells only, a pixel font 404 flashes on the chest like a print, alert windows with a bang pop in the top corners while its eyes glance at each, then a magenta portal opens on the floor, it sinks through clipped at the rim, the portal closes, and it drops back in as itself and lands with a flash; judge whether the hoodie reads as a hoodie, whether the rain stays behind it, and whether the sink reads.',
      // 0 transparent, 1 body (the teal self, face, hands, antenna), 2 eyes (also the bang, the eyelets, the portal's
      // centre), 3 visor (also the aglets), 4 ping (the drawstrings, the alert pane, the landing flash), 5 feet (also the
      // hood lining, the pocket seam, the ribbing), 6 hoodie black (also the portal's dark ring), 7 rain head, 8 rain
      // trail, 9 magenta (the portal rim, the 404, the alert frame)
      palette: [...ECHO_PALETTE.slice(0, 6), '#1b2326', '#39ff6a', '#1a9b4a', '#ff5fd2'],
      frames,
    };
  })();

  L.register([echoCtfHoodieHd]);
})(typeof window !== 'undefined' ? window : globalThis);
