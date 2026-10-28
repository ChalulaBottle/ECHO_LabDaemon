// Lab creatures, culture batch three (operator, 2026-10-28: "produce me another 25 animations", "be creative and keep
// the style and theming and branding we have already developed"). October: drawn from scratch in code on the ECHO
// base, no words in the picture.
//
// ECHO · pumpkin: the creature carves a pumpkin and lights it with its own antenna ping. 40 cell lattice, 12 px cells on
// the 480 panel: the body is the family's 20 cell pose repeated exactly twice across and down, moved 6 cells left so
// a pumpkin 14 across and 13 tall sits at its right, its right hand resting on the pumpkin's shoulder.
//   rest      the creature watches the pumpkin with its slits slid right, a blink.
//   carve     three cuts, two frames an eye and three for the grin: the elbow stays out (the family's arm stub is the
//             upper arm) and a forearm with a small ping blade at the fist works across each shape left to right, the
//             hole opening dark behind the blade; the eyes narrow while it works. A one cell dark crease keeps the
//             forearm off the orange, a teal one off the body.
//   light     the creature's own trick for a candle: the antenna pings and the spark jumps off its tip in a high arc
//             over the top of the frame and lands on the stem; the lid pops six rows off with gold flecks round the
//             opening, the spark has dropped in as a gold flame standing in the dark opening, and the lid falls back.
//             (A hand lift was tried first: at 12 px cells the forearm hid the lid and blocked the spark's way in.)
//   lit       the face glows gold and flickers (cells of each hole drop to the dark orange on a frame by frame hash),
//             a warm flicker on the floor under it, the creature's eyes shut happy, a blink.
//   next      the fist gives the lit pumpkin a push and it slides off the right edge, still glowing; a fresh plain
//             pumpkin drops in from the top and lands where the first one stood, which is the first frame.
// Loop: 30 frames, 5.59 s; the drop lands on the rest frame, so the last frame runs into the first without a seam.
// Palette: 0..5 the ECHO palette unchanged (2 is also the holes before they light, the creases and the opening; 4 also
// the blade and the spark); 6 pumpkin orange, 7 dark orange (the ridges, the shaded edge, the dim flicker, the floor
// glow), 8 stem green, 9 gold (the spark's trail, the flame, the lit face). Index 6 is not ping here, so nothing goes
// through echoGlitch. Big tier: 30 frames of 1600 cells are 48000 bytes of firmware table, so it ships only on boards
// built with SPLASH_BIG. One closure, so echoPumpkin is the only name it adds; registered at the end of this file.
(function (root) {
  if (typeof require !== 'undefined' && !root.BENCH_LIB) require('./anims.js');
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  const echoPumpkin = (() => {
    const N = 40, K = 2;                                           // lattice; a 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, ORANGE = 6, DEEP = 7, STEM = 8, GOLD = 9;
    // Constants the cell is judged on.
    const DX = -6;                                                 // the family's 2x frame, 6 cells left
    const V = {top: 12, bot: 15, l: 12 + DX, r: 29 + DX};          // the visor band on the panel
    const EYE_C = [14 + DX, 26 + DX];                              // each slit's left col, 2 wide
    const HAND = {r: [20, 21], c: [34 + DX, 35 + DX]};             // the family's right hand on the panel
    const ELBOW = [18.5, 28.5], FORE_R = 1.5, FIST_R = 1.8;        // the forearm drawn out of the stub
    const TIP = [2.5, 30.5 + DX];                                  // the antenna's ping tip
    const PK = {cy: 27.5, cx: 33, ry: 6.5, rx: 7, pw: 2.4};        // the pumpkin: a squared ellipse, rows 21..33, cols 26..39
    const LID_ROW = 23;                                            // the lid is every pumpkin row down to this one
    const FLOOR = 34;
    const TAU = 2 * Math.PI;

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const copy = g => g.map(row => row.slice());
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    const rect = (g, r0, c0, r1, c1, v) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) put(g, r, c, v); return g; };
    // Distance from (y, x) to the segment p q.
    const seg = (y, x, p, q) => {
      const vy = q[0] - p[0], vx = q[1] - p[1], L2 = vy * vy + vx * vx;
      const t = L2 ? Math.max(0, Math.min(1, ((y - p[0]) * vy + (x - p[1]) * vx) / L2)) : 0;
      return Math.hypot(y - p[0] - t * vy, x - p[1] - t * vx);
    };

    // The creature: the family pose at 2x moved DX across.
    function creature(ping) {
      const src = upscale(echoPing(ping), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (src[r][c]) put(g, r, c + DX, src[r][c]);
      return g;
    }
    // Faces: the slits slid sx; narrowed (the bottom half of each slit, the carving squint); happy arches.
    const band = g => rect(g, V.top, V.l, V.bot, V.r, VISOR);
    const slits = (sx = 0) => g => { band(g); for (const c of EYE_C) rect(g, V.top, c + sx, V.bot, c + sx + 1, EYE); return g; };
    const narrow = (sx = 0) => g => { band(g); for (const c of EYE_C) rect(g, V.bot - 1, c + sx, V.bot, c + sx + 1, EYE); return g; };
    const arches = g => { band(g); for (const c of EYE_C) { rect(g, V.top + 1, c, V.top + 1, c + 1, EYE); put(g, V.top + 2, c - 1, EYE); put(g, V.top + 2, c + 2, EYE); } return g; };

    // The pumpkin's own cells, as a map from "r,c" to an ink, its bottom left at the rest position.
    const inPumpkin = (r, c) => Math.pow(Math.abs((r + 0.5 - PK.cy) / PK.ry), PK.pw) + Math.pow(Math.abs((c + 0.5 - PK.cx) / PK.rx), PK.pw) <= 1;
    const halfW = r => PK.rx * Math.pow(Math.max(0, 1 - Math.pow(Math.abs((r + 0.5 - PK.cy) / PK.ry), PK.pw)), 1 / PK.pw);
    // The face: two triangle eyes and a grin with three teeth, each cut left to right.
    const FEATURES = [
      [[25, 30], [26, 29], [26, 30], [26, 31], [27, 28], [27, 29], [27, 30], [27, 31], [27, 32]],
      [[25, 36], [26, 35], [26, 36], [26, 37], [27, 34], [27, 35], [27, 36], [27, 37], [27, 38]],
      [[29, 28], [29, 29], [29, 31], [29, 32], [29, 34], [29, 35], [29, 37], [29, 38],
       [30, 29], [30, 30], [30, 31], [30, 32], [30, 33], [30, 34], [30, 35], [30, 36], [30, 37],
       [31, 31], [31, 32], [31, 34], [31, 35]],
    ].map(f => f.slice().sort((a, b) => a[1] - b[1] || a[0] - b[0]));
    const shown = (f, p) => FEATURES[f].slice(0, Math.ceil(p * FEATURES[f].length));
    // The pumpkin, drawn at a shift (dy rows, dx cols). o: cuts (three progress values 0..1), lit (a frame index for
    // the flicker), lid (rows the lid is lifted, null with it on), flame.
    function pumpkin(g, o, dy = 0, dx = 0) {
      const at = (r, c, v) => put(g, r + dy, c + dx, v);
      const lid = o.lid || 0, lx = o.lidx || 0;
      for (let r = 21; r <= 33; r++) for (let c = 26; c <= 39; c++) {
        if (!inPumpkin(r, c)) continue;
        const hw = halfW(r), u = (c + 0.5 - PK.cx) / Math.max(hw, 0.5);
        let ink = ORANGE;
        if (Math.abs(u - 0.45) < 0.12 || Math.abs(u + 0.45) < 0.12) ink = DEEP;   // two ridges
        if (!inPumpkin(r, c + 1) || !inPumpkin(r + 1, c)) ink = DEEP;            // the shaded right and bottom edge
        if (r <= LID_ROW) at(r - lid, c + lx, ink); else at(r, c, ink);
      }
      // The stem, on the lid.
      for (const [r, c] of [[18, 34], [19, 33], [20, 33], [21, 33], [20, 32], [21, 32]]) at(r - lid, c + lx, STEM);
      if (lid) for (let c = 27; c <= 38; c++) if (inPumpkin(LID_ROW + 1, c) && inPumpkin(LID_ROW + 1, c - 1) && inPumpkin(LID_ROW + 1, c + 1)) at(LID_ROW + 1, c, EYE);
      if (o.flame) for (const [r, c] of [[20, 33], [21, 33], [22, 32], [22, 33], [23, 32], [23, 33], [23, 34]]) at(r, c, GOLD);
      (o.cuts || [0, 0, 0]).forEach((p, f) => shown(f, p).forEach(([r, c]) => {
        let ink = EYE;
        if (o.lit !== undefined) ink = ((r * 7 + c * 13 + o.lit * 5) % 11) < 2 ? DEEP : GOLD;   // the flicker
        at(r, c, ink);
      }));
      return g;
    }
    // A warm flicker on the floor under the lit pumpkin, its spread changing frame to frame.
    function floorGlow(g, k, dx = 0) {
      const w = 6 + ((k * 5) % 3);
      for (let c = Math.round(PK.cx) - w; c <= Math.round(PK.cx) + w; c++) if ((c + k) % 2 === 0) put(g, FLOOR, c + dx, DEEP);
      return g;
    }
    // The forearm: the hand comes off the stub and a forearm runs from the elbow to a fist, creased dark over the
    // pumpkin and teal over the body; a two cell ping blade from the fist to the cut when blade is set.
    function forearm(g, fist, blade) {
      const under = copy(g);
      for (let r = HAND.r[0]; r <= HAND.r[1]; r++) for (let c = HAND.c[0]; c <= HAND.c[1]; c++) if (g[r][c] === BODY) g[r][c] = 0;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const y = r + 0.5, x = c + 0.5;
        const d = Math.min(seg(y, x, ELBOW, fist) - FORE_R, Math.hypot(y - fist[0], x - fist[1]) - FIST_R);
        if (d <= 0) g[r][c] = BODY;
        else if (d <= 1 && under[r][c]) g[r][c] = under[r][c] === BODY ? FEET : (under[r][c] === VISOR || under[r][c] === EYE ? under[r][c] : EYE);
      }
      if (blade) for (const t of [0.5, 1]) put(g, Math.floor(fist[0] + t * (blade[0] + 0.5 - fist[0])), Math.floor(fist[1] + t * (blade[1] + 0.5 - fist[1])), PING);
      return g;
    }
    // The spark, at one of four points on its arc from the antenna tip (up over the top, then down onto the stem), a
    // gold trail at the points before it; pop scatters four gold flecks round the opening as the lid jumps.
    const ARC = [[2, 24], [0, 29], [7, 33], [16, 33]];
    function spark(g, k) {
      for (let j = Math.max(0, k - 2); j < k; j++) put(g, ARC[j][0], ARC[j][1] + (j ? 0 : 1), GOLD);
      const [r, c] = ARC[k];
      for (const [a, b] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) put(g, r + a, c + b, a || b ? GOLD : PING);
      return g;
    }
    const pop = g => { for (const [r, c] of [[19, 29], [18, 31], [18, 35], [19, 37]]) put(g, r, c, GOLD); return g; };
    // A scene. o: the pumpkin's state (cuts, lit, lid, flame) and its shift (py, px, or none), a second pumpkin
    // dropping in (drop rows), the arm (fist, blade), face, ping, spark (0..1).
    function scene(o) {
      const g = blank();
      if (o.px === undefined || o.px < N) {
        pumpkin(g, o, o.py || 0, o.px || 0);
        if (o.lit !== undefined) floorGlow(g, o.lit, o.px || 0);
      }
      if (o.drop !== undefined) pumpkin(g, {}, o.drop, 0);
      const cr = creature(!!o.ping);
      (o.face || slits(1))(cr);
      for (let r = 0; r < N; r++) for (let k = 0; k < N; k++) if (cr[r][k]) g[r][k] = cr[r][k];
      if (o.fist) forearm(g, o.fist, o.blade);
      if (o.spark !== undefined) spark(g, o.spark);
      if (o.pop) pop(g);
      return g;
    }
    // Where the fist sits to cut at a cell: two up and two left of it, the blade reaching down to it.
    const cutAt = (f, p) => { const s = shown(f, p), [r, c] = s[s.length - 1]; return {fist: [r - 1.5, c - 1.5], blade: [r, c]}; };

    // The frames.
    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    const ALL = [1, 1, 1];
    // 1. Rest, the loop anchor: a plain pumpkin, the creature watching it, a blink.
    F(400); F(90, {face: narrow(1)}); F(380);
    // 2. Carve: the left eye, the right eye, then the grin, the eyes narrowed while it works.
    F(170, {cuts: [0.5, 0, 0], face: narrow(1), ...cutAt(0, 0.5)}); F(170, {cuts: [1, 0, 0], face: narrow(1), ...cutAt(0, 1)});
    F(170, {cuts: [1, 0.5, 0], face: narrow(1), ...cutAt(1, 0.5)}); F(170, {cuts: [1, 1, 0], face: narrow(1), ...cutAt(1, 1)});
    F(160, {cuts: [1, 1, 0.34], face: narrow(1), ...cutAt(2, 0.34)}); F(160, {cuts: [1, 1, 0.67], face: narrow(1), ...cutAt(2, 0.67)});
    F(160, {cuts: ALL, face: narrow(1), ...cutAt(2, 1)});
    F(320, {cuts: ALL, face: slits(0)});
    // 3. The light: a ping, the spark leaves the antenna tip in a high arc and lands on the stem, the lid pops off and
    // the spark drops in under it as a flame, the lid falls back on.
    F(140, {cuts: ALL, ping: true, face: slits(0), spark: 0});
    F(110, {cuts: ALL, face: slits(1), spark: 1}); F(110, {cuts: ALL, face: slits(1), spark: 2});
    F(120, {cuts: ALL, face: slits(1), spark: 3});
    F(200, {cuts: ALL, lid: 6, flame: true, pop: true, face: slits(0)});
    F(140, {cuts: ALL, lid: 2, face: slits(0)});
    // 5. Lit: the face glows and flickers, the creature shuts its eyes happy, a blink.
    F(250, {cuts: ALL, lit: 0, face: arches}); F(250, {cuts: ALL, lit: 1, face: arches}); F(250, {cuts: ALL, lit: 2, face: arches});
    F(90, {cuts: ALL, lit: 3, face: narrow(1)}); F(250, {cuts: ALL, lit: 4});
    // 6. Next: a push, the lit pumpkin slides off the right edge, a fresh one drops in.
    F(170, {cuts: ALL, lit: 5, fist: [26.5, 26.5], face: narrow(1)});
    F(130, {cuts: ALL, lit: 6, px: 6, py: -1}); F(120, {cuts: ALL, lit: 7, px: 13}); F(140, {px: N, face: slits(2)});
    F(110, {px: N, drop: -17, face: slits(0)}); F(110, {px: N, drop: -6, face: slits(0)});
    F(150, {face: slits(0)}); F(400);

    const frames = specs.map(({hold, o}) => ({hold, grid: scene(o)}));
    return {
      name: 'ECHO · pumpkin', key: 'echo_pumpkin', fwname: 'echo pumpkin', category: 'Active', size: N,
      // Big tier: 30 frames of 1600 bytes (48000 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, October, 40 cell lattice (12 px cells, the creature at 2x moved left, its hand resting on a pumpkin 14 cells across at its right): it watches and blinks, carves two triangle eyes and a toothy grin left to right with a small ping blade at the end of a forearm drawn out of its arm stub while its eyes narrow, pings its antenna so the spark arcs off the tip over the top and lands on the stem, the lid pops off and the spark has dropped in as the candle flame, the lid falls back on, and the face glows gold and flickers with a warm flicker on the floor while its eyes shut happy; then it pushes the lit pumpkin off the right edge and a fresh plain one drops in where the first stood; judge whether the cuts read as carving at 12 px cells, whether the spark reads as the candle, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes (also the uncut holes, the creases, the opening), 3 visor, 4 ping (the antenna
      // tip, the blade, the spark), 5 feet (the forearm's crease on the body), 6 pumpkin orange, 7 dark orange (the
      // ridges, the shaded edge, the dim flicker, the floor glow), 8 stem green, 9 gold (the spark's trail, the flame,
      // the lit face)
      palette: [...ECHO_PALETTE.slice(0, 6), '#ff8a1c', '#b5520e', '#5f8f2e', '#ffd84a'],
      frames,
    };
  })();

  L.register([echoPumpkin]);
})(typeof window !== 'undefined' ? window : globalThis);
