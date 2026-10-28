// Lab creatures: the ECHO creature at the hacker and CTF life (operator, 2026-10-28, culture batch three: "be
// creative and keep the style and theming and branding we have already developed"). Drawn from scratch in code on the
// ECHO base, no words in the picture.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  // ECHO · hash cracked: a padlock hangs over the ECHO creature's head with four little windows in its face, each one
  // spinning like a slot machine reel; they stop one at a time, the last one slowest, the lock springs open and the
  // creature pumps a fist. 40 cell lattice, 12 px cells on the 480 panel: the body is the family's 20 cell pose
  // repeated exactly 2 times across and down, 6 rows down so the lock has the top of the frame.
  // The windows hold blocks, never characters: a spinning reel is a dithered scroll of teal and dark cells running
  // down the window, and a stopped one settles to a plain steel tile with a dark pip in its middle, so nothing in it
  // can be read as a letter or a digit.
  //   lock      a gold body 19 across and 8 tall with rounded corners and a darker gold edge along the bottom and the
  //             right, its four windows 3 across and 5 tall; a steel shackle 13 across on top, its legs 2 thick.
  //   spin      the loop anchor: all four reels scroll 2 rows a frame as bars of teal, some with a gap, the eyes narrowed in focus under them, a
  //             blink and a ping.
  //   stops     the reels stop left to right, each one dropping a row past its place and settling back (a one frame
  //             bounce), the eyes flicking to it; between stops the rest keep spinning.
  //   suspense  the last reel slows to a row a frame over three ever longer frames while a sweat drop runs down
  //             beside the head, then it stops.
  //   open      all four windows flash green with a ping, the shackle springs up three rows with its right leg out of
  //             the body, and sparkles pop round the lock; the eyes go to happy arches.
  //   pump      the right forearm comes up out of its stub (the family's arm stub is the upper arm) and the fist
  //             pumps twice beside the antenna, a ping on each top.
  //   reset     the shackle snaps shut, the reels start spinning again and the eyes narrow; the loop opens on the spin.
  // Loop: 28 frames, 5.7 s. A reel is a scroll of random bars with no pattern to it, so the spin on the last frame
  // runs into the spin on the first without a visible seam.
  // Palette: 0..5 the ECHO palette unchanged (2 is also the windows' dark and the tiles' pips, 3 the reels' lit
  // cells, 4 the sweat drop and the sparkles' arms, 5 the forearm's crease); 6 steel (the shackle, the stopped tiles,
  // the sparkles' cores), 7 lock gold, 8 the lock's darker gold edge, 9 unlock green. Index 6 is not ping here, so
  // nothing goes through echoGlitch. Big tier: 28 frames of 1600 cells are 44800 bytes of firmware table, so it ships
  // only on boards built with SPLASH_BIG. One closure, so echoHashCracked is the only name it adds; registered at the
  // end of this file.
  const echoHashCracked = (() => {
    const N = 40, K = 2;                                           // lattice; a 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, STEEL = 6, GOLD = 7, SHADE = 8, GREEN = 9;
    // Constants the cell is judged on.
    const DY = 6;                                                  // the family's 2x frame, 6 rows down
    const LOCK = {top: 6, bot: 13, l: 10, r: 28};                  // the lock's gold body
    const WIN = {top: 7, rows: 5, cols: [12, 16, 20, 24]};         // the four windows, 3 across
    const SHACKLE_C = 13, SHUT = 2, OPEN = -1;                     // the shackle's left col; its top row shut and open
    const ELBOW = [17.5 + DY, 33.5], FORE_R = 1.5, FIST_R = 2.1;   // the right forearm, at 2x
    const V = {top: 12 + DY, l: 12, r: 29, eyes: [14, 26]};

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    // Sprites are rows of letters: s steel; a dot leaves the cell alone.
    const stamp = (g, art, r0, c0, ink) => { art.forEach((line, dr) => [...line].forEach((ch, dc) => { if (ch !== '.') put(g, r0 + dr, c0 + dc, ink); })); return g; };
    const hash = (a, b, c, d) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + d * 19.3) * 43758.5453; return s - Math.floor(s); };
    // Distance from (y, x) to the segment p q.
    const seg = (y, x, p, q) => {
      const vy = q[0] - p[0], vx = q[1] - p[1], L2 = vy * vy + vx * vx;
      const t = L2 ? Math.max(0, Math.min(1, ((y - p[0]) * vy + (x - p[1]) * vx) / L2)) : 0;
      return Math.hypot(y - p[0] - t * vy, x - p[1] - t * vx);
    };

    // The creature, its faces: narrowed slits slid look cols, a narrowed blink, happy arches.
    function pose(ping) {
      const src = upscale(echoPing(ping), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (src[r][c]) put(g, r + DY, c, src[r][c]);
      return g;
    }
    const band = g => { for (let r = V.top; r < V.top + 4; r++) for (let c = V.l; c <= V.r; c++) g[r][c] = VISOR; };
    const narrow = (look = 0) => g => { band(g); for (let r = V.top + 1; r <= V.top + 2; r++) for (const c0 of V.eyes) for (let c = c0; c < c0 + 2; c++) g[r][c + look] = EYE; };
    const shut = g => { band(g); for (const c0 of V.eyes) for (let c = c0 - 1; c < c0 + 3; c++) g[V.top + 2][c] = EYE; };
    const arches = g => { band(g); for (const c0 of V.eyes) { g[V.top + 1][c0] = EYE; g[V.top + 1][c0 + 1] = EYE; g[V.top + 2][c0 - 1] = EYE; g[V.top + 2][c0 + 2] = EYE; } };

    // The lock: the gold body with its rounded corners and darker edge, the shackle shut or open.
    const SHACKLE = ['..sssssssss..', '.sssssssssss.', '.ss.......ss.', '.ss.......ss.'];
    function lock(g, open) {
      for (let r = LOCK.top; r <= LOCK.bot; r++) for (let c = LOCK.l; c <= LOCK.r; c++) {
        const corner = (r === LOCK.top || r === LOCK.bot) && (c === LOCK.l || c === LOCK.r);
        if (!corner) g[r][c] = r === LOCK.bot || c === LOCK.r ? SHADE : GOLD;
      }
      if (!open) stamp(g, SHACKLE, SHUT, SHACKLE_C, STEEL);
      else {
        stamp(g, SHACKLE, OPEN, SHACKLE_C, STEEL);
        for (let r = OPEN + 4; r < LOCK.top; r++) for (const c of [SHACKLE_C + 1, SHACKLE_C + 2]) put(g, r, c, STEEL);   // the left leg stays in
      }
      return g;
    }
    // A window's state: ['spin', rows a frame], ['stop', bounce] (bounce 1 drops the tile a row) or 'green'.
    function windows(g, states, f) {
      states.forEach((s, k) => {
        const c0 = WIN.cols[k];
        for (let dr = 0; dr < WIN.rows; dr++) for (let dc = 0; dc < 3; dc++) {
          const r = WIN.top + dr, c = c0 + dc;
          let v = EYE;
          if (s === 'green') v = GREEN;
          else if (s[0] === 'spin') {                              // a reel: bars scrolling down, some with a gap in the middle
            const row = dr - s[1] * f;
            v = hash(k, row, 0, 7) < 0.55 && (dc !== 1 || hash(k, row, 1, 7) < 0.6) ? VISOR : EYE;
          }
          else {
            const tr = dr - s[1];                                  // the tile's own row, a row low on the bounce
            if (tr >= 0) v = tr === 2 && dc === 1 ? EYE : STEEL;
          }
          g[r][c] = v;
        }
      });
      return g;
    }
    // A sparkle: a steel core and ping arms.
    const sparkle = (g, r, c) => { put(g, r, c, STEEL); for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(g, r + a, c + b, PING); return g; };
    // The forearm: the right hand stub comes off, a forearm from the elbow to a fist, a crease round it over the body.
    function forearm(g, fist) {
      for (let r = 20 + DY; r <= 21 + DY; r++) for (let c = 34; c <= 35; c++) put(g, r, c, 0);
      const under = g.map(row => row.slice());
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const y = r + 0.5, x = c + 0.5;
        const d = Math.min(seg(y, x, ELBOW, fist) - FORE_R, Math.hypot(y - fist[0], x - fist[1]) - FIST_R);
        if (d <= 0) g[r][c] = BODY;
        else if (d <= 1 && under[r][c] === BODY && c <= 31) g[r][c] = FEET;   // the crease on the torso only
      }
      return g;
    }

    // A scene. o: w (the four windows' states), face, ping, open, sweat (the drop's row), spark, fist ([row, col]).
    const S = n => ['spin', n], STOP = ['stop', 0], BOUNCE = ['stop', 1];
    function scene(o, f) {
      const g = pose(!!o.ping);
      (o.face || narrow())(g);
      lock(g, !!o.open);
      windows(g, o.w || [S(2), S(2), S(2), S(2)], f);
      if (o.sweat !== undefined) { put(g, o.sweat, 33, PING); put(g, o.sweat + 1, 33, PING); }
      if (o.spark) { sparkle(g, 2, 6); sparkle(g, 1, 33); sparkle(g, 15, 4); sparkle(g, 16, 35); }
      if (o.fist) forearm(g, o.fist);
      return g;
    }

    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    const spin = S(2), slow = S(1);
    // 1. Spin, the loop anchor: all four reels, the eyes narrowed, a blink, a ping.
    F(190); F(190); F(190); F(90, {face: shut}); F(190); F(190, {ping: true}); F(190);
    // 2. The stops, left to right: a bounce, then set, the eyes flicking to each.
    F(110, {w: [BOUNCE, spin, spin, spin], face: narrow(-2)});
    F(260, {w: [STOP, spin, spin, spin], face: narrow(-2)});
    F(160, {w: [STOP, spin, spin, spin]});
    F(110, {w: [STOP, BOUNCE, spin, spin], face: narrow(-1)});
    F(260, {w: [STOP, STOP, spin, spin], face: narrow(-1)});
    F(160, {w: [STOP, STOP, spin, spin]});
    F(110, {w: [STOP, STOP, BOUNCE, spin], face: narrow(1)});
    F(260, {w: [STOP, STOP, STOP, spin], face: narrow(1)});
    // 3. Suspense: the last reel slows over three ever longer frames, a sweat drop runs down, then it stops.
    F(200, {w: [STOP, STOP, STOP, slow], face: narrow(2), sweat: 17});
    F(260, {w: [STOP, STOP, STOP, slow], face: narrow(2), sweat: 19});
    F(340, {w: [STOP, STOP, STOP, slow], face: narrow(2), sweat: 21});
    F(140, {w: [STOP, STOP, STOP, BOUNCE], face: narrow(2)});
    F(360, {w: [STOP, STOP, STOP, STOP], face: narrow(0)});
    // 4. Open: the windows flash green with a ping, the shackle springs up, sparkles, happy arches.
    F(180, {w: ['green', 'green', 'green', 'green'], ping: true, face: narrow(0)});
    F(300, {w: ['green', 'green', 'green', 'green'], open: true, spark: true, face: arches});
    // 5. The pump: the fist up and down twice beside the antenna, a ping on each top.
    F(200, {w: ['green', 'green', 'green', 'green'], open: true, face: arches, fist: [12, 37], ping: true});
    F(150, {w: ['green', 'green', 'green', 'green'], open: true, face: arches, fist: [16.5, 36.5]});
    F(200, {w: ['green', 'green', 'green', 'green'], open: true, face: arches, fist: [12, 37], ping: true});
    F(300, {w: [STOP, STOP, STOP, STOP], open: true, face: arches, fist: [17, 36.5]});
    // 6. Reset: the shackle snaps shut, the reels spin again, the eyes narrow.
    F(220, {face: shut});
    F(170);

    const frames = specs.map(({hold, o}, f) => ({hold, grid: scene(o, f)}));
    return {
      name: 'ECHO · hash cracked', key: 'echo_hash_cracked', fwname: 'echo hash cracked', category: 'Thinking', size: N,
      // Big tier: 28 frames of 1600 bytes (44800 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, a hash cracking as a slot machine, 40 cell lattice (12 px cells, the creature at 2x under a gold padlock with a steel shackle and four little windows in its face): all four windows spin as dithered teal reels while the creature watches with narrowed eyes and blinks, the reels stop left to right with a one row bounce into plain steel tiles while its eyes flick to each, the last one slows over three long frames with a sweat drop running down beside its head, then all four flash green, the shackle springs open with sparkles, its eyes go to happy arches and it pumps a fist twice beside its antenna, before the shackle snaps shut and the reels spin again; judge whether the reels read as spinning and the tiles as stopped without either reading as text, whether the shackle springing reads as unlocked, and whether the fist pump reads at 12 px cells.',
      // 0 transparent, 1 body, 2 eyes (also the windows' dark, the tiles' pips), 3 visor (also the reels' lit cells),
      // 4 ping (the sweat, the sparkles' arms), 5 feet (the forearm's crease), 6 steel (the shackle, the tiles, the
      // sparkles' cores), 7 lock gold, 8 the lock's darker edge, 9 unlock green
      palette: [...ECHO_PALETTE.slice(0, 6), '#d6e2e7', '#f2b53a', '#a8741c', '#5cff8f'],
      frames,
    };
  })();

  L.register([echoHashCracked]);
})(typeof window !== 'undefined' ? window : globalThis);
