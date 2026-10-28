// Moods for the idle rotation: the ECHO creature, focused (culture batch three, entry 31, operator 2026-10-28: "be
// creative and keep the style and theming and branding we have already developed"). Drawn from scratch in code on the
// ECHO base; a face study like mona lisa, the stillest cell in the batch, where the eyes and one thin frame of light
// carry everything.
//
// ECHO · focused: the eyes narrow, a reticle draws itself round the visor, everything holds still through one slow
// blink, then the reticle fades and the eyes open. 40 cell lattice, 12 px cells on the 480 panel, built from the
// family's 20 cell pose repeated exactly twice across and down (upscale(echoPing(ping), 2)), centred and moved 4 rows
// down; nothing of the body moves, the antenna stays dark the whole loop.
//   narrow    the lids close in from the top and then from the bottom, the slits going from four rows to three to
//             the two middle rows; in the deepest hold each slit slides a col toward the middle, a squint of effort.
//   reticle   four corner brackets in ping, a cell thick, each with a 4 cell arm along and a 3 cell arm down. They draw
//             themselves one corner at a time clockwise from the top left on a box two cells wider each way than
//             their final place (its top row clear of the head, its sides on the arms' edge), then lock on: the box
//             closes a cell a step to two cells off the band's corners and a short tick shows at the middle of its
//             top and bottom.
//   blink     one slow blink on the narrowed eyes: one row, a shut line, one row, held long, so it reads as a
//             deliberate blink and not a flicker.
//   fade      the reticle dims to a mid teal and goes, the eyes open back to the family's slits; the loop opens on the
//             plain rest.
// Loop: 21 frames, 8.1 s, the focus holds 900 ms twice; the stillness is the point.
// Palette: 0..5 the ECHO palette unchanged (4, the ping, is the reticle); 6 dim reticle (the fade). Index 6 is not
// the duplicate ping here, so no frame goes through echoGlitch. Big tier: 21 frames of 1600 cells are 33600 bytes of
// firmware table, so it ships only on boards built with SPLASH_BIG. One closure, so echoFocused is the only name it
// adds; registered at the end of this file.
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  if (typeof require !== 'undefined' && !root.BENCH_LIB) require('./anims.js');
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  const echoFocused = (() => {
    const N = 40, K = 2;                                           // lattice; the 20 cell pose repeated K times
    const EYE = 2, VISOR = 3, PING = 4, DIM = 6;
    // Constants the cell is judged on.
    const OX = 0, OY = 4;                                          // the family's 2x frame, centred, 4 rows down
    const V = {top: 12 + OY, bot: 15 + OY, l: 12 + OX, r: 29 + OX};   // the visor band on the panel
    const EYE_C = [14 + OX, 26 + OX];                              // each slit's left col, 2 wide
    const RET = {top: V.top - 2, bot: V.bot + 2, l: V.l - 2, r: V.r + 2, arm: 4, drop: 3};   // the brackets' box

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const put = (g, r, c, v) => { if (r >= 0 && r < N && c >= 0 && c < N) g[r][c] = v; return g; };

    // The creature: the family's 2x pose moved OX across and OY down, as it stands.
    function creature() {
      const src = upscale(echoPing(false), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (src[r][c]) put(g, r + OY, c + OX, src[r][c]);
      return g;
    }
    // Faces: the band plain, then each slit on the rows given, slid in toward the middle by inward cols; a single
    // row given as 'shut' is a 4 cell line, the lids met.
    function eyes(g, rows, inward = 0) {
      for (let r = V.top; r <= V.bot; r++) for (let c = V.l; c <= V.r; c++) g[r][c] = VISOR;
      if (rows === 'shut') { for (const c0 of EYE_C) for (let k = -1; k < 3; k++) g[V.top + 2][c0 + k] = EYE; return g; }
      EYE_C.forEach((c0, i) => { const c = c0 + (i ? -inward : inward); for (const r of rows) { g[V.top + r][c] = EYE; g[V.top + r][c + 1] = EYE; } });
      return g;
    }
    // The reticle: corners 0..4 drawn clockwise from the top left, ticks the two middle ticks, ink ping or dim; wide
    // pushes the whole box out that many cells each way (the lock on closes it from 2 to 0).
    function reticle(g, corners, ticks, ink, wide = 0) {
      const t = RET.top - wide, b = RET.bot + wide, l = RET.l - wide, r = RET.r + wide;
      const C = [[t, l, 1, 1], [t, r, 1, -1], [b, r, -1, -1], [b, l, -1, 1]];   // row, col, down, across
      C.slice(0, corners).forEach(([r, c, dr, dc]) => {
        for (let k = 0; k < RET.arm; k++) put(g, r, c + dc * k, ink);
        for (let k = 0; k < RET.drop; k++) put(g, r + dr * k, c, ink);
      });
      if (ticks) { const mid = Math.floor((l + r) / 2); for (const c of [mid, mid + 1]) { put(g, t, c, ink); put(g, b, c, ink); } }
      return g;
    }
    // A scene. o: eyes (rows or 'shut'), inward, corners, ticks, dim, wide.
    function scene(o) {
      const g = creature();
      eyes(g, o.eyes || [0, 1, 2, 3], o.inward || 0);
      if (o.corners) reticle(g, o.corners, !!o.ticks, o.dim ? DIM : PING, o.wide || 0);
      return g;
    }

    const NARROW = [1, 2];
    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    // 1. Rest, the loop anchor, a blink.
    F(800); F(90, {eyes: [3]}); F(600);
    // 2. The eyes narrow: the top lid, then the bottom.
    F(200, {eyes: [1, 2, 3]}); F(300, {eyes: NARROW});
    // 3. The reticle draws itself wide, a corner at a time, then locks on: it closes in a cell a step to the band and
    // the ticks appear.
    F(140, {eyes: NARROW, corners: 1, wide: 2}); F(140, {eyes: NARROW, corners: 2, wide: 2}); F(140, {eyes: NARROW, corners: 3, wide: 2});
    F(160, {eyes: NARROW, corners: 4, wide: 2}); F(140, {eyes: NARROW, corners: 4, wide: 1}); F(200, {eyes: NARROW, corners: 4, ticks: true});
    // 4. The focus: held still, the slits a col in toward the middle.
    F(900, {eyes: NARROW, inward: 1, corners: 4, ticks: true}); F(900, {eyes: NARROW, inward: 1, corners: 4, ticks: true});
    // 5. One slow blink.
    F(250, {eyes: [2], inward: 1, corners: 4, ticks: true}); F(400, {eyes: 'shut', corners: 4, ticks: true});
    F(250, {eyes: [2], inward: 1, corners: 4, ticks: true}); F(600, {eyes: NARROW, inward: 1, corners: 4, ticks: true});
    F(900, {eyes: NARROW, corners: 4, ticks: true});
    // 6. The fade: the reticle dims and goes, the eyes open.
    F(300, {eyes: NARROW, corners: 4, ticks: true, dim: true}); F(250, {eyes: [1, 2, 3]}); F(500);

    const frames = specs.map(({hold, o}) => ({hold, grid: scene(o)}));
    return {
      name: 'ECHO · focused', key: 'echo_focused', fwname: 'echo focused', category: 'Idle', size: N,
      // Big tier: 21 frames of 1600 bytes (33600 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, a mood for the idle rotation on the 40 cell lattice (12 px cells, the creature at 2x), the stillest cell in the batch: the creature rests and blinks, its eyes narrow from the top and then the bottom to two row slits, a thin reticle of four ping corner brackets draws itself round the visor one corner at a time, wide at first, then locks on, closing in to the band with a tick top and bottom, it holds dead still with the slits a col in toward the middle, blinks once slowly, holds again, then the reticle dims and goes and the eyes open; judge whether the brackets read as a reticle on the face rather than a frame on the body, whether the slow blink reads as deliberate, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes, 3 visor, 4 ping (the reticle), 5 feet, 6 dim reticle (the fade)
      palette: [...ECHO_PALETTE.slice(0, 6), '#3aa99a'],
      frames,
    };
  })();

  L.register([echoFocused]);
})(typeof window !== 'undefined' ? window : globalThis);
