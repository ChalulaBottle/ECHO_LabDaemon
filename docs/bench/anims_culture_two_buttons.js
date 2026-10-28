// Culture creatures, batch three: the ECHO creature plays the set pieces everyone knows. Drawn from scratch in code on
// the ECHO base; a meme lends its format only (the setting, the composition, the gesture), never its characters, its
// art or its caption, and no words appear in the picture.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  // ECHO · two buttons: the format of a sweating figure that cannot choose between two buttons. The format only: two
  // plain domed buttons, one red and one blue, on a grey console, no labels and no caption; the ECHO creature plays the
  // part. 40 cell lattice, 12 px cells on the 480 panel: the body is the family's 20 cell pose repeated exactly 2 times
  // across and down, moved 2 rows up so the console's back edge (row 26) hides the legs; the buttons sit on the console
  // in front of it, each right under one of the family's arms, so a reaching hand stays outside the body's silhouette.
  //   console   a grey top seen from above across the bottom fourteen rows, a pale back edge; each button a dark base
  //             plate 12 wide and a red or blue dome on it with a white glint.
  //   reach     the family's arm stub stays as the upper arm and a forearm runs straight down from its elbow to a fist
  //             with a finger pointing at the button, creased in the feet teal where it meets the body; reaching is
  //             two steps (half way, then hovering a row over the dome).
  //   hover     the left hand hovers over the red and pulls back, the right hovers over the blue and pulls back, the
  //             eyes follow each under worried brows; pale sweat drops run down the forehead one after another.
  //   dither    the hands swap faster and faster (380 ms, then 140, 110, 100) while the eyes dart and two drops fly off
  //             the head's corners.
  //   mash      the eyes squeeze shut, both arms swing up over the head, and both fists slam down on both buttons at
  //             once: the domes press flat, sparks burst round each in white and the button's own colour, and the
  //             creature and the buttons jolt a cell each way.
  //   relief    the fists stay down on the pressed buttons, the eyes shut happy and the antenna pings twice; then the
  //             fists lift, the buttons pop back up, a blink; the loop opens on the rest.
  // Loop: 29 frames, 6.52 s, holds 90 to 400 ms. Every element is back where frame 0 has it by the last frame, so it
  // runs into the first without a seam.
  // Palette: 0..5 the ECHO palette unchanged (2 is also the brows, the squeezed eyes and the base plates, 5 also the
  // forearm's crease); 6 button red; 7 button blue; 8 pale (the sweat, the glints, the console's back edge, the sparks'
  // cores); 9 console grey. Index 6 is not ping here, so nothing goes through echoGlitch. Big tier: 29 frames of 1600
  // cells are 46400 bytes of firmware table, so it ships only on boards built with SPLASH_BIG. One closure, so
  // echoTwoButtons is the only name it adds; registered at the end of this file.
  const echoTwoButtons = (() => {
    const N = 40, K = 2;                                           // lattice; a 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, RED = 6, BLUE = 7, PALE = 8, GREY = 9;
    // Constants the cell is judged on.
    const OX = 0, OY = -2;                                         // the family's 2x frame, 2 rows up
    const V = {top: 12 + OY, bot: 15 + OY, l: 12 + OX, r: 29 + OX};   // the visor band
    const EYE_C = [14 + OX, 26 + OX];                              // each slit's left col, 2 wide
    const DESK = 26;                                               // the console's back edge
    const ELBOW = {l: [17.5 + OY, 8 + OX], r: [17.5 + OY, 34 + OX]};   // the bottom of each arm stub
    const BTN = {l: {c: 8, ink: RED}, r: {c: 34, ink: BLUE}};      // each button's centre col, under its arm
    const CROWN = 29;                                              // a dome's top row; pressed, it is one row at 32
    const HOVER = 24.5, HALF = 21.5, PRESS = 29;     // hovering, the finger ends a row over the crown                     // the fist's centre row hovering, half way, pressed
    const FORE_R = 1.6, FIST_R = 2.0;

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
    // Faces: the family's slits slid dx; a blink; squeezed shut (a > and a <); happy arches. Worried brows go over
    // the slits, slanting up toward the middle.
    const band = g => { for (let r = V.top; r <= V.bot; r++) for (let c = V.l; c <= V.r; c++) g[r][c] = VISOR; return g; };
    const slits = (g, dx = 0) => { band(g); for (let r = V.top; r <= V.bot; r++) for (const c0 of EYE_C) for (let c = c0; c < c0 + 2; c++) g[r][c + dx] = EYE; return g; };
    const blinked = g => { band(g); for (const c0 of EYE_C) for (let c = c0 - 1; c < c0 + 3; c++) g[V.bot][c] = EYE; return g; };
    const squeezed = g => {
      band(g);
      const [a, b] = EYE_C;
      for (const [r, c] of [[0, -1], [0, 0], [1, 1], [1, 2], [2, -1], [2, 0]]) put(g, V.top + r, a + c, EYE);
      for (const [r, c] of [[0, 2], [0, 3], [1, 1], [1, 0], [2, 2], [2, 3]]) put(g, V.top + r, b + c - 1, EYE);
      return g;
    };
    const arches = g => {
      band(g);
      for (const c0 of EYE_C) { put(g, V.top + 1, c0, EYE); put(g, V.top + 1, c0 + 1, EYE); put(g, V.top + 2, c0 - 1, EYE); put(g, V.top + 2, c0 + 2, EYE); }
      return g;
    };
    function brows(g) {
      const r = V.top - 2;
      for (const [dr, c] of [[1, 12], [1, 13], [0, 14], [0, 15]]) put(g, r + dr, c + OX, EYE);
      for (const [dr, c] of [[0, 26], [0, 27], [1, 28], [1, 29]]) put(g, r + dr, c + OX, EYE);
      return g;
    }
    const look = dx => g => brows(slits(g, dx));

    // A forearm from an elbow to a fist, a finger 2 wide pointing down under the fist if asked; the stub's own hand
    // comes off, and a one cell crease in the feet teal marks it where it meets the body.
    function forearm(g, side, fist, finger) {
      const under = copy(g), elbow = ELBOW[side];
      const hand = side === 'l' ? 6 + OX : 34 + OX;
      for (let r = 20 + OY; r <= 21 + OY; r++) for (let c = hand; c <= hand + 1; c++) g[r][c] = 0;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const y = r + 0.5, x = c + 0.5;
        const d = Math.min(seg(y, x, elbow, fist) - FORE_R, Math.hypot(y - fist[0], x - fist[1]) - FIST_R);
        if (d <= 0) g[r][c] = BODY;
        else if (d <= 1 && under[r][c] === BODY) g[r][c] = FEET;
      }
      if (finger) for (let r = Math.floor(fist[0] + 2); r <= Math.floor(fist[0] + 3); r++) for (const dc of [-1, 0]) put(g, r, Math.round(fist[1]) + dc, BODY);
      return g;
    }

    // A button round its centre col c: a dark base plate 12 wide and 2 tall, and a dome on it (a crown 4 wide, two
    // rows of 8, a row of 10) or pressed down to its bottom row; a white glint on its upper left.
    function button(g, {c, ink}, pressed) {
      const L0 = c - 6;
      for (let r = 33; r <= 34; r++) for (let k = L0; k < L0 + 12; k++) put(g, r, k, EYE);
      if (!pressed) {
        for (let k = L0 + 4; k < L0 + 8; k++) put(g, CROWN, k, ink);
        for (const r of [CROWN + 1, CROWN + 2]) for (let k = L0 + 2; k < L0 + 10; k++) put(g, r, k, ink);
        put(g, CROWN + 1, L0 + 3, PALE); put(g, CROWN, L0 + 4, PALE);
      }
      for (let k = L0 + 1; k < L0 + 11; k++) put(g, 32, k, ink);
      if (pressed) put(g, 32, L0 + 2, PALE);
      return g;
    }
    // Sparks round a pressed button: seven short rays fanning up from its centre at radius 5 to 7 (big) or 7 to 8
    // (fading), white at the core and the button's colour outside; only on empty cells.
    function sparks(g, {c, ink}, big) {
      const cy = 32, cx = c - 0.5;
      for (let k = 0; k < 7; k++) {
        const a = Math.PI * (k / 6), dy = -Math.sin(a), dx = Math.cos(a) * 1.3;
        const [r0, r1] = big ? [5, 7] : [7, 8];
        for (let s = r0; s <= r1; s++) {
          const r = Math.round(cy + dy * s), q = Math.round(cx + dx * s);
          if (inside(r, q) && (!g[r][q] || g[r][q] === GREY)) g[r][q] = s === r0 ? PALE : ink;
        }
      }
      return g;
    }
    // Sweat: a drop 2 wide and 3 tall, its tip on top; on the forehead it runs down, off the corners it flies out.
    const DROP = [[0, 1], [1, 0], [1, 1], [2, 0], [2, 1]];
    const drop = (g, r, c) => { for (const [a, b] of DROP) put(g, r + a, c + b, PALE); return g; };

    // A scene. o: face, l and r (each hand: null at rest, 'half' half way down, 'hover' a row over its dome), up (both
    // arms swung up over the head), mash (both fists down on the pressed buttons), spark (2 big, 1 fading), drops
    // [[row, col], ...] on the forehead, fly [[row, col], ...] off the head, ping, jolt (the creature and the buttons
    // shifted a col).
    function scene(o) {
      const c = creature(!!o.ping);
      (o.face || look(0))(c);
      for (const [r, k] of (o.drops || [])) drop(c, r, k);
      // The legs go under the console's back edge before any arm moves, so whatever of the creature is left below the
      // edge afterwards is a hand reaching past it.
      for (let r = DESK; r < N; r++) for (let k = 0; k < N; k++) c[r][k] = 0;
      for (const side of ['l', 'r']) {
        const col = BTN[side].c;
        if (o.up) forearm(c, side, side === 'l' ? [6.5, 3.5] : [6.5, 37]);
        else if (o.mash) forearm(c, side, [PRESS, col]);
        else if (o[side]) forearm(c, side, [o[side] === 'half' ? HALF : HOVER, col], true);
      }
      // The console, the buttons, then the creature in front; a button gives up a dark one cell rim wherever the
      // creature meets it.
      const g = blank();
      for (let r = DESK; r < N; r++) for (let k = 0; k < N; k++) g[r][k] = r === DESK ? PALE : GREY;
      const btn = blank();
      for (const side of ['l', 'r']) button(btn, BTN[side], !!o.mash);
      for (let r = 0; r < N; r++) for (let k = 0; k < N; k++) {
        if (!btn[r][k]) continue;
        let near = false;
        for (let a = -1; a <= 1 && !near; a++) for (let b = -1; b <= 1; b++) if (inside(r + a, k + b) && c[r + a][k + b]) { near = true; break; }
        g[r][k] = near ? EYE : btn[r][k];
      }
      for (let r = 0; r < N; r++) for (let k = 0; k < N; k++) if (c[r][k]) g[r][k] = c[r][k];
      if (o.spark) for (const side of ['l', 'r']) sparks(g, BTN[side], o.spark === 2);
      for (const [r, k] of (o.fly || [])) { if (inside(r, k) && !g[r][k]) drop(g, r, k); }
      // The jolt: everything above the console's front rows slides a col, the console filling in behind it.
      if (o.jolt) for (let r = 0; r < 35; r++) {
        const row = g[r].slice(), ground = r < DESK ? 0 : (r === DESK ? PALE : GREY);
        for (let k = 0; k < N; k++) { const v = row[k - o.jolt]; g[r][k] = v === undefined ? ground : v; }
      }
      return g;
    }

    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    const aim = (dx, extra = {}) => Object.assign({face: look(dx)}, extra);
    const calm = dx => g => slits(g, dx);
    // 1. Rest, the loop anchor: both hands at rest, the eyes go from one button to the other, a blink, then the brows
    // knit.
    F(400, {face: calm(-2)}); F(400, {face: calm(2)}); F(90, {face: blinked}); F(300, aim(0));
    // 2. Hover: the left hand over the red and back, the right hand over the blue and back; the sweat starts to run.
    F(200, aim(-2, {l: 'half', drops: [[V.top - 5, 18]]}));
    F(380, aim(-2, {l: 'hover', drops: [[V.top - 4, 18]]}));
    F(180, aim(0, {l: 'half', drops: [[V.top - 3, 18]]}));
    F(200, aim(2, {r: 'half', drops: [[V.top - 5, 22]]}));
    F(380, aim(2, {r: 'hover', drops: [[V.top - 4, 22]]}));
    F(180, aim(0, {r: 'half', drops: [[V.top - 3, 22]]}));
    // 3. Dither: faster and faster, the eyes darting, drops flying off the corners.
    F(140, aim(-2, {l: 'hover', drops: [[V.top - 5, 16]]}));
    F(140, aim(2, {r: 'hover', drops: [[V.top - 4, 16]]}));
    F(110, aim(-2, {l: 'hover', drops: [[V.top - 3, 16]], fly: [[2, 5]]}));
    F(110, aim(2, {r: 'hover', fly: [[0, 3], [2, 34]]}));
    F(100, aim(-2, {l: 'hover', fly: [[0, 35]]}));
    F(100, aim(2, {r: 'hover'}));
    // 4. Mash: the eyes squeeze shut, both arms swing up, both fists slam down; sparks and a jolt.
    F(260, {face: squeezed});
    F(200, {up: true, face: squeezed});
    F(120, {mash: true, spark: 2, face: squeezed, jolt: 1});
    F(120, {mash: true, spark: 1, face: squeezed, jolt: -1});
    F(160, {mash: true, face: squeezed});
    // 5. Relief: held down, eyes shut happy, two pings; then the fists lift, the buttons pop up, a blink.
    F(320, {mash: true, face: arches, ping: true});
    F(320, {mash: true, face: arches});
    F(320, {mash: true, face: arches, ping: true});
    F(380, {mash: true, face: arches});
    F(200, {l: 'half', r: 'half', face: arches});
    F(300, {face: slits});
    F(90, {face: blinked});
    F(320, {face: slits});

    const frames = specs.map(({hold, o}) => ({hold, grid: scene(o)}));
    return {
      name: 'ECHO · two buttons', key: 'echo_two_buttons', fwname: 'echo two buttons', category: 'Thinking', size: N,
      // Big tier: 29 frames of 1600 bytes (46400 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, the format of a sweating figure that cannot choose between two buttons (no labels, no caption), 40 cell lattice (12 px cells, the creature at 2x behind a grey console with a red domed button under its left arm and a blue one under its right): its eyes go from one button to the other under worried brows, its left hand reaches down and hovers a finger over the red and pulls back, its right hovers over the blue and pulls back, sweat runs down its forehead, the hands swap faster and faster with drops flying off its head, then it squeezes its eyes shut, swings both arms up and slams both fists down on both buttons at once, the domes pressing flat with sparks and a jolt, holds them down with its eyes shut happy and two antenna pings, and lets go; judge whether the hovering reads as indecision, whether the double slam reads at a glance, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes (also the brows and the base plates), 3 visor, 4 ping, 5 feet (also the forearm's
      // crease), 6 button red, 7 button blue, 8 pale (sweat, glints, the console's back edge, the sparks' cores), 9 grey
      palette: [...ECHO_PALETTE.slice(0, 6), '#ff4b4b', '#3d7bff', '#c8f2ff', '#4a5662'],
      frames,
    };
  })();

  L.register([echoTwoButtons]);
})(typeof window !== 'undefined' ? window : globalThis);
