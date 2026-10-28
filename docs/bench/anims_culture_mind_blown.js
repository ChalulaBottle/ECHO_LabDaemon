// Culture creatures, batch three: the ECHO creature plays the set pieces everyone knows. Drawn from scratch in code on
// the ECHO base; a meme lends its format only (the setting, the composition, the gesture), never its characters, its
// art or its caption, and no words appear in the picture.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  // ECHO · mind blown: the gesture of a mind blown, the hands going to the head and the top of the head going off
  // like a firework. The gesture only, no one's art and no words; the ECHO creature plays it, and nothing comes out of
  // its head but its own pixels and a few sparks. 40 cell lattice, 12 px cells on the 480 panel: the body is the
  // family's 20 cell pose repeated exactly 2 times across and down, moved 5 rows down so the top of the panel is free
  // for the spray.
  //   rest      the family's slit eyes, a blink.
  //   dawning   the eyes go wide (a dark ring round a white core), the antenna pings.
  //   hands     the family's arm stubs stay as the upper arms and forearms fold up from the elbows to fists at the
  //             temples, creased in the feet teal where they lie over the body; the head trembles a col each way.
  //   lid       the head's top four rows and the antenna lift off as one piece, a row and then three, white and gold
  //             light pouring out of the gap.
  //   blow      the lid breaks into its own 2 x 2 pixels, 25 chunks that spray up and out in a fan, each on its own
  //             line, while a ring of sparks bursts round the head and the hands fling out wide; the chunks hang at the
  //             top of their flight while sparks rise out of the open head.
  //   rain      the chunks fall back in along their lines, slow at first and fast at the end, and click home; a seam
  //             of ping light flashes where the lid joins, the hands come back to the temples and down.
  //   daze      a blink, the eyes shut happy a beat, back to the rest.
  // Loop: 31 frames, 5.69 s, holds 90 to 400 ms. The lid is home and the hands are down by the last frame, so it runs
  // into the first without a seam.
  // Palette: 0..5 the ECHO palette unchanged (5 also the forearms' crease); 6 white (the wide eyes' cores, the light
  // from the gap, the sparks' hearts); 7 gold (the light, the sparks); 8 magenta (the sparks' tips); 9 violet (the
  // outer ring of the burst). Index 6 is not ping here, so nothing goes through echoGlitch. Big tier: 31 frames of 1600
  // cells are 49600 bytes of firmware table, so it ships only on boards built with SPLASH_BIG. One closure, so
  // echoMindBlown is the only name it adds; registered at the end of this file.
  const echoMindBlown = (() => {
    const N = 40, K = 2;                                           // lattice; a 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, WHITE = 6, GOLD = 7, MAGENTA = 8, VIOLET = 9;
    // Constants the cell is judged on.
    const OX = 0, OY = 5;                                          // the family's 2x frame, 5 rows down
    const V = {top: 12 + OY, bot: 15 + OY, l: 12 + OX, r: 29 + OX};   // the visor band
    const EYE_C = [14 + OX, 26 + OX];                              // each slit's left col, 2 wide
    const LID = {top: 2 + OY, bot: 11 + OY, l: 10 + OX, r: 31 + OX};  // the head's top rows and the antenna above them
    const CENTRE = [9 + OY, 20.5 + OX];                            // where the chunks fly out from
    const ELBOW = {l: [18.5 + OY, 7.5 + OX], r: [18.5 + OY, 33.5 + OX]};   // the bottom of each arm stub
    const TEMPLE = {l: [11 + OY, 10.5 + OX], r: [11 + OY, 30.5 + OX]};  // the fists at the temples, over the head's sides
    const WIDE = {l: [9 + OY, 2], r: [9 + OY, 38]};                // the fists flung up and out
    const FORE_R = 1.6, FIST_R = 2.0;
    const TAU = 2 * Math.PI;

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const copy = g => g.map(row => row.slice());
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    const seg = (y, x, p, q) => {
      const vy = q[0] - p[0], vx = q[1] - p[1], L2 = vy * vy + vx * vx;
      const t = L2 ? Math.max(0, Math.min(1, ((y - p[0]) * vy + (x - p[1]) * vx) / L2)) : 0;
      return Math.hypot(y - p[0] - t * vy, x - p[1] - t * vx);
    };

    // The creature: the family pose at 2x moved OX across and OY down.
    function creature(ping) {
      const src = upscale(echoPing(ping), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (src[r][c]) put(g, r + OY, c + OX, src[r][c]);
      return g;
    }
    // Faces: the family's slits; a blink; wide (each eye a dark ring 4 x 4 round a white core 2 x 2); happy arches.
    const band = g => { for (let r = V.top; r <= V.bot; r++) for (let c = V.l; c <= V.r; c++) g[r][c] = VISOR; return g; };
    const slits = g => { band(g); for (let r = V.top; r <= V.bot; r++) for (const c0 of EYE_C) for (let c = c0; c < c0 + 2; c++) g[r][c] = EYE; return g; };
    const blinked = g => { band(g); for (const c0 of EYE_C) for (let c = c0 - 1; c < c0 + 3; c++) g[V.bot][c] = EYE; return g; };
    const wide = g => {
      band(g);
      for (const c0 of EYE_C) for (let r = V.top; r <= V.bot; r++) for (let c = c0 - 1; c <= c0 + 2; c++) {
        const core = r > V.top && r < V.bot && c >= c0 && c <= c0 + 1;
        g[r][c] = core ? WHITE : EYE;
      }
      return g;
    };
    const arches = g => {
      band(g);
      for (const c0 of EYE_C) { put(g, V.top + 1, c0, EYE); put(g, V.top + 1, c0 + 1, EYE); put(g, V.top + 2, c0 - 1, EYE); put(g, V.top + 2, c0 + 2, EYE); }
      return g;
    };

    // A forearm from an elbow to a fist; the stub's own hand comes off, and a one cell crease in the feet teal marks
    // it where it lies over the body.
    function forearm(g, side, fist) {
      const under = copy(g), elbow = ELBOW[side];
      const hand = side === 'l' ? 6 + OX : 34 + OX;
      for (let r = 20 + OY; r <= 21 + OY; r++) for (let c = hand; c <= hand + 1; c++) g[r][c] = 0;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const y = r + 0.5, x = c + 0.5;
        const d = Math.min(seg(y, x, elbow, fist) - FORE_R, Math.hypot(y - fist[0], x - fist[1]) - FIST_R);
        if (d <= 0) g[r][c] = BODY;
        else if (d <= 1 && under[r][c] === BODY) g[r][c] = FEET;
      }
      return g;
    }
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

    // The lid's chunks: its cells in 2 x 2 blocks (the family's own cells at 2x), each with a home and a place at the
    // top of its flight, out along a fan from CENTRE: further out the further from the middle, up first.
    const LIDSRC = creature(false);
    const CHUNKS = [];
    for (let r = LID.top; r <= LID.bot; r += 2) for (let c = LID.l; c <= LID.r; c += 2) {
      if (!LIDSRC[r][c]) continue;
      const u = (c + 1 - CENTRE[1]) / 11;                          // -1 at the left edge, 1 at the right
      const i = CHUNKS.length;
      const ang = -Math.PI / 2 + u * 1.15 + 0.18 * Math.sin(i * 2.3);   // up the middle, out to the sides
      const dist = 9 + 3 * Math.abs(Math.sin(i * 1.7)) + 4 * (r - LID.top) / (LID.bot - LID.top) * (1 - Math.abs(u) * 0.5);
      const far = [r + Math.sin(ang) * dist, c + Math.cos(ang) * dist * 1.25];
      far[0] = Math.max(0, Math.min(N - 2, far[0])); far[1] = Math.max(0, Math.min(N - 2, far[1]));
      CHUNKS.push({home: [r, c], far, cells: [[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => LIDSRC[r + a][c + b])});
    }
    // The creature without its lid: the antenna and the head's top four rows gone.
    function lidless(g) {
      for (let r = 0; r <= LID.bot; r++) for (let c = 0; c < N; c++) if (r >= LID.top && c >= LID.l - 0 && c <= LID.r) g[r][c] = 0;
      return g;
    }
    // The lid lifted d rows as one piece, the gap under it full of light (gold at the edges, white inside).
    function lifted(g, d) {
      for (const {home, cells} of CHUNKS) cells.forEach((v, k) => { if (v) put(g, home[0] - d + (k >> 1), home[1] + (k & 1), v); });
      for (let r = LID.bot + 1 - d; r <= LID.bot; r++) for (let c = LID.l + 1; c <= LID.r - 1; c++) {
        const edge = c < LID.l + 3 || c > LID.r - 3 || r === LID.bot + 1 - d;
        put(g, r, c, edge ? GOLD : WHITE);
      }
      return g;
    }
    // The chunks at t of the way out (0 home, 1 at the top of their flight); drift lifts them a little while they hang.
    function chunks(g, t, drift = 0) {
      for (const {home, far, cells} of CHUNKS) {
        const p = mix(home, far, t);
        const r0 = Math.round(p[0] - drift), c0 = Math.round(p[1]);
        cells.forEach((v, k) => { if (v) put(g, r0 + (k >> 1), c0 + (k & 1), v); });
      }
      return g;
    }
    // The burst: a ring of sparks round the head at radius rad, 16 rays 2 long, white hearts and gold or magenta tips;
    // the outer ring in violet. Only on empty cells.
    function burst(g, rad, fade) {
      for (let k = 0; k < 16; k++) {
        const a = TAU * k / 16 + (fade ? 0.2 : 0);
        for (let s = 0; s < 2; s++) {
          const r = Math.round(CENTRE[0] + 1 + Math.sin(a) * (rad + s) * 0.9), c = Math.round(CENTRE[1] + Math.cos(a) * (rad + s) * 1.2);
          if (inside(r, c) && !g[r][c]) g[r][c] = fade ? (s ? VIOLET : MAGENTA) : (s ? (k % 2 ? GOLD : MAGENTA) : WHITE);
        }
      }
      return g;
    }
    // Sparks rising out of the open head while the chunks hang: four, each a plus or a dot, f frames into the hang.
    function rising(g, f) {
      const S = [[13.5, 3, GOLD], [17.5, 1, MAGENTA], [22.5, 2, WHITE], [26.5, 4, GOLD]];
      for (const [c, off, ink] of S) {
        const r = LID.bot - 1 - off - 3 * f;
        if (!inside(r, c)) continue;
        put(g, r, Math.floor(c), ink);
        if ((off + f) % 2 === 0) { put(g, r - 1, Math.floor(c), ink); put(g, r + 1, Math.floor(c), ink); put(g, r, Math.floor(c) - 1, ink); put(g, r, Math.floor(c) + 1, ink); }
      }
      return g;
    }

    // A scene. o: face, ping, hands (null at rest, 'half' half way up, 'temple', 'wide'), shake (the head and arms a
    // col over), lift (the lid's rows up), t (the chunks' way out; null with the lid on), drift, ring (the burst: 1, 2),
    // rise (frames of rising sparks), seam (a ping line where the lid joins).
    function scene(o) {
      let c = creature(!!o.ping);
      (o.face || slits)(c);
      for (const side of ['l', 'r']) {
        if (!o.hands) continue;
        const fist = o.hands === 'half' ? mix(ELBOW[side], TEMPLE[side], 0.55) : o.hands === 'wide' ? WIDE[side] : TEMPLE[side];
        if (o.hands === 'half') fist[1] += side === 'l' ? -2 : 2;
        forearm(c, side, fist);
      }
      const opened = o.lift !== undefined || (o.t !== undefined && o.t !== null);
      if (opened) {
        // keep whatever the fists put in the lid's rows; take only the lid's own cells away
        const keep = copy(c);
        lidless(c);
        for (let r = 0; r <= LID.bot; r++) for (let k = 0; k < N; k++) if (keep[r][k] && (k < LID.l || k > LID.r)) c[r][k] = keep[r][k];
      }
      if (o.lift) lifted(c, o.lift);
      if (o.seam) for (let k = LID.l + 1; k <= LID.r - 1; k++) put(c, LID.bot, k, PING);
      if (o.shake) c = c.map(row => (o.shake > 0 ? [0, ...row.slice(0, N - 1)] : [...row.slice(1), 0]));
      const g = c;
      if (o.ring) burst(g, o.ring === 1 ? 11 : 15, o.ring === 2);
      if (o.rise !== undefined) rising(g, o.rise);
      if (o.t !== undefined && o.t !== null) chunks(g, o.t, o.drift || 0);
      return g;
    }

    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    const easeOut = x => 1 - (1 - x) * (1 - x), easeIn = x => x * x;
    // 1. Rest, the loop anchor.
    F(400); F(300); F(90, {face: blinked}); F(300);
    // 2. Dawning: the eyes go wide, a ping; the hands come up to the temples; the head trembles.
    F(260, {face: wide, ping: true}); F(200, {face: wide});
    F(140, {face: wide, hands: 'half'}); F(220, {face: wide, hands: 'temple'});
    F(100, {face: wide, hands: 'temple', shake: 1}); F(100, {face: wide, hands: 'temple', shake: -1});
    // 3. The lid lifts a row, then three, light pouring out.
    F(140, {face: wide, hands: 'temple', lift: 1}); F(140, {face: wide, hands: 'temple', lift: 3});
    // 4. Blow: the chunks spray out, the ring bursts, the hands fling wide; the chunks hang while sparks rise.
    F(100, {face: wide, hands: 'wide', t: easeOut(0.3), ring: 1});
    F(100, {face: wide, hands: 'wide', t: easeOut(0.55), ring: 2});
    F(120, {face: wide, hands: 'wide', t: easeOut(0.8)});
    F(160, {face: wide, hands: 'wide', t: 1, rise: 0});
    F(200, {face: wide, hands: 'wide', t: 1, drift: 0.6, rise: 1});
    F(200, {face: wide, hands: 'wide', t: 1, drift: 1, rise: 2});
    // 5. Rain: the chunks fall back in along their lines, slow then fast, and click home; a seam of ping light.
    F(130, {face: wide, hands: 'wide', t: 1 - easeIn(0.25), drift: 0.6});
    F(120, {face: wide, hands: 'temple', t: 1 - easeIn(0.5)});
    F(110, {face: wide, hands: 'temple', t: 1 - easeIn(0.75)});
    F(100, {face: wide, hands: 'temple', t: 1 - easeIn(0.92)});
    F(180, {face: wide, hands: 'temple', seam: true, ping: true});
    F(180, {face: wide, hands: 'temple'});
    F(140, {face: slits, hands: 'half'});
    // 6. Daze: a blink, the eyes shut happy a beat, the rest.
    F(90, {face: blinked}); F(320, {face: arches}); F(260, {face: arches}); F(90, {face: blinked}); F(300); F(400);

    const frames = specs.map(({hold, o}) => ({hold, grid: scene(o)}));
    return {
      name: 'ECHO · mind blown', key: 'echo_mind_blown', fwname: 'echo mind blown', category: 'Active', size: N,
      // Big tier: 31 frames of 1600 bytes (49600 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, the mind blown gesture (no words, no one\'s art), 40 cell lattice (12 px cells, the creature at 2x, low in the panel to leave the top free): the creature rests and blinks, its eyes go wide with an antenna ping, both hands come up to its temples and its head trembles, the top of its head with the antenna lifts off with white and gold light pouring out of the gap, then breaks into its own 2 x 2 pixels that spray up and out in a fan inside a ring of sparks while its hands fling wide, the pixels hang a beat while sparks rise from the open head, then rain back along their lines and click home with a flash of ping light at the seam, the hands come down, a blink and a happy daze; judge whether the gesture reads at a glance, whether the spray reads as the head\'s own pixels and the rain as them coming home, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes, 3 visor, 4 ping (also the seam), 5 feet (also the forearms' crease), 6 white (the
      // wide eyes' cores, the light, the sparks' hearts), 7 gold, 8 magenta, 9 violet (the burst's outer ring)
      palette: [...ECHO_PALETTE.slice(0, 6), '#eafffb', '#ffc93c', '#ff5fd2', '#9a6bff'],
      frames,
    };
  })();

  L.register([echoMindBlown]);
})(typeof window !== 'undefined' ? window : globalThis);
