// Culture creatures, batch three: the ECHO creature plays the set pieces everyone knows. Drawn from scratch in code on
// the ECHO base; a meme lends its format only (the setting, the composition, the gesture), never its characters, its
// art or its caption, and no words appear in the picture.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  // ECHO · facepalm: the gesture of a hand brought slowly up over the face. The gesture only, no one's art and no
  // words; the ECHO creature plays it. 40 cell lattice, 12 px cells on the 480 panel: the body is the family's 20 cell
  // pose repeated exactly 2 times across and down, moved 3 rows down so the slump has room.
  //   rest      the family's slit eyes, a blink.
  //   unimpressed  the eyes go flat (each a bar 4 wide and 2 tall on the band's bottom), a long beat.
  //   palm      the family's right arm stub, with its hand cells, stays as the upper arm, and a forearm rises from its
  //             end diagonally up to an open hand seen flat: a solid block 7 wide and 8 tall with four short finger
  //             strokes along its top split by one cell dark gaps and a thumb nub on its left side, outlined in the
  //             eyes' dark wherever it lies over the body. It rises from the chest in three slow steps and lands over
  //             the right of the visor, covering that eye, a sliver of the band showing at its far right end; three
  //             pale strokes flick up over the fingers as it lands.
  //   slump     the whole body drops a row and the antenna droops over to the left, its tip dimmed.
  //   hold      the long hold, most of two seconds: one slow sigh (the body rises back a row and drops again) and a small
  //             pale puff drifting out from under the hand.
  //   slide     the hand slides down the face, showing the eyes shut flat, drops away to the arm stub, and the head
  //             comes back up with the eyes flat; a slow blink, the rest.
  // Loop: 27 frames, 8.71 s, holds 90 to 400 ms. The hand is down, the torso and the antenna are back up by the last
  // frame, so it runs into the first without a seam.
  // Palette: 0..5 the ECHO palette unchanged (2 is also the shut and flat eyes and the hand's outline, 4 the tip only
  // when it is not dimmed); 6 pale (the sigh puff, the marks where the hand lands). Index 6
  // is not ping here, so nothing goes through echoGlitch. Big tier: 27 frames of 1600 cells are 43200 bytes of
  // firmware table, so it ships only on boards built with SPLASH_BIG. One closure, so echoFacepalm is the only name it
  // adds; registered at the end of this file.
  const echoFacepalm = (() => {
    const N = 40, K = 2;                                           // lattice; a 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, PALE = 6;
    // Constants the cell is judged on.
    const OX = 0, OY = 3;                                          // the family's 2x frame, 3 rows down
    const V = {top: 12 + OY, bot: 15 + OY, l: 12 + OX, r: 29 + OX};   // the visor band before any slump
    const EYE_C = [14 + OX, 26 + OX];                              // each slit's left col, 2 wide
    const HIPS = 27 + OY;                                          // the body's last row; the legs hang below it
    const ANT_C = 30 + OX;                                         // the antenna's left col
    const ELBOW = [23.5 + OY, 34.5 + OX];                          // the end of the right arm stub, its hand cells
    const PALM = {w: 7, h: 8, l: 21 + OX};                         // over the visor: cols 21..27, rows top-3..bot+1
    const FORE_R = 1.6;

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
    // Faces: the family's slits; a blink; flat (a bar 4 wide and 2 tall on the band's bottom); shut flat (a line 4 wide).
    const band = g => { for (let r = V.top; r <= V.bot; r++) for (let c = V.l; c <= V.r; c++) g[r][c] = VISOR; return g; };
    const slits = g => { band(g); for (let r = V.top; r <= V.bot; r++) for (const c0 of EYE_C) for (let c = c0; c < c0 + 2; c++) g[r][c] = EYE; return g; };
    const blinked = g => { band(g); for (const c0 of EYE_C) for (let c = c0 - 1; c < c0 + 3; c++) g[V.bot][c] = EYE; return g; };
    const flat = g => {
      band(g);
      for (const c0 of EYE_C) for (let r = V.bot - 1; r <= V.bot; r++) for (let c = c0 - 1; c < c0 + 3; c++) g[r][c] = EYE;
      return g;
    };
    const shut = g => { band(g); for (const c0 of EYE_C) for (let c = c0 - 1; c < c0 + 3; c++) g[V.bot - 1][c] = EYE; return g; };

    // The drooping antenna: the family's stalk erased and redrawn leaning left (1) or bent right over with its tip
    // hanging down (2), the tip dimmed to body. Cells as [row, first col, last col] in the family's unshifted frame.
    const DROOP = {
      1: [[6, 30, 31], [7, 30, 31], [4, 29, 30], [5, 29, 30], [2, 28, 29], [3, 28, 29]],
      2: [[6, 30, 31], [7, 30, 31], [5, 29, 31], [4, 27, 30], [5, 26, 27], [6, 26, 27]],
    };
    function droop(g, amount) {
      for (let r = 0; r < 8 + OY; r++) for (let c = ANT_C; c <= ANT_C + 1; c++) g[r][c] = 0;
      for (const [r, a, b] of DROOP[amount]) for (let c = a; c <= b; c++) put(g, r + OY, c + OX, BODY);
      return g;
    }
    // The open hand, seen flat: a solid block 7 wide and 8 tall with its top left at (r0, c0), its top two rows cut
    // into four finger strokes 1 wide by one cell dark gaps, and a thumb nub 2 tall off its left side. The forearm
    // rises from the end of the family's right arm stub (the stub and its hand cells are the upper arm) diagonally up
    // to the wrist at the palm's lower right. A one cell dark outline goes round hand and forearm wherever they lie
    // over the creature.
    function hand(g, r0, c0) {
      const under = copy(g);
      const mine = blank();
      for (let r = r0; r < r0 + PALM.h; r++) for (let c = c0; c < c0 + PALM.w; c++) {
        const gap = r < r0 + 2 && (c - c0) % 2 === 1;
        if (!gap) put(mine, r, c, 1);
      }
      for (let r = r0 + 4; r <= r0 + 5; r++) put(mine, r, c0 - 1, 1);                   // the thumb nub
      const wrist = [r0 + PALM.h - 0.5, c0 + PALM.w - 0.5];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (seg(r + 0.5, c + 0.5, ELBOW, wrist) <= FORE_R) mine[r][c] = 1;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (mine[r][c]) { g[r][c] = BODY; continue; }
        let near = false;
        for (let a = -1; a <= 1 && !near; a++) for (let b = -1; b <= 1; b++) if (inside(r + a, c + b) && mine[r + a][c + b]) { near = true; break; }
        // the finger gaps are dark wherever they are, so the four strokes always read
        const fingerGap = r >= r0 && r < r0 + 2 && c > c0 && c < c0 + PALM.w - 1;
        if ((near && under[r][c]) || fingerGap) g[r][c] = EYE;
      }
      return g;
    }
    // The slump: the whole creature down d rows (0 or 1).
    function sink(g, d) {
      if (!d) return g;
      const out = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c]) put(out, r + d, c, g[r][c]);
      return out;
    }
    // Pale marks: three short strokes flicking up over the fingers when the hand lands.
    function marks(g) {
      const r0 = V.top - 3, c0 = PALM.l;
      for (const [r, c] of [[r0 - 2, c0 - 1], [r0 - 3, c0 - 1], [r0 - 3, c0 + 3], [r0 - 4, c0 + 3], [r0 - 2, c0 + 7], [r0 - 3, c0 + 7]]) if (inside(r, c) && !g[r][c]) g[r][c] = PALE;
      return g;
    }    // The sigh: a small puff of three to five cells drifting left from under the hand, step 0..2.
    function puff(g, step) {
      const r = V.bot + 4 - step, c = 8 - 2 * step;
      const cells = step === 2 ? [[0, 0], [0, 1]] : [[0, 0], [0, 1], [-1, 0], [-1, 1], [0, -1]];
      for (const [a, b] of cells) if (inside(r + a, c + b) && !g[r + a][c + b]) g[r + a][c + b] = PALE;
      return g;
    }

    // A scene. o: face, ping, at (the palm's offset from its place over the visor, [rows, cols]; null with the hand
    // down), sink (rows), droop (0, 1 leaning, 2 hanging), mark, puff (0..2).
    function scene(o) {
      let c = creature(!!o.ping && !o.droop);
      (o.face || slits)(c);
      if (o.droop) droop(c, o.droop);
      if (o.at) hand(c, V.top - 3 + o.at[0], PALM.l + o.at[1]);
      c = sink(c, o.sink || 0);
      if (o.mark) marks(c);
      if (o.puff !== undefined) puff(c, o.puff);
      return c;
    }

    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    const ON = [0, 0];
    // 1. Rest, the loop anchor, then the eyes go flat.
    F(400); F(400); F(90, {face: blinked}); F(400);
    F(400, {face: flat}); F(400, {face: flat});
    // 2. The palm rises in three slow steps and lands over the visor; marks flick out.
    F(260, {face: flat, at: [11, 5]}); F(260, {face: flat, at: [6, 3]}); F(240, {face: flat, at: [2, 1]});
    F(140, {face: shut, at: ON, mark: true});
    // 3. Slump: the whole body drops a row, the antenna droops.
    F(260, {face: shut, at: ON, sink: 1, droop: 1});
    F(400, {face: shut, at: ON, sink: 1, droop: 2});
    // 4. The long hold: a slow sigh and a puff.
    F(400, {face: shut, at: ON, sink: 1, droop: 2});
    F(400, {face: shut, at: ON, sink: 0, droop: 2});
    F(400, {face: shut, at: ON, sink: 1, droop: 2, puff: 0});
    F(400, {face: shut, at: ON, sink: 1, droop: 2, puff: 1});
    F(400, {face: shut, at: ON, sink: 1, droop: 2, puff: 2});
    F(400, {face: shut, at: ON, sink: 1, droop: 2});
    // 5. Slide: the hand drags down the face, the eyes shut flat behind it, then drops away and the head comes up.
    F(300, {face: shut, at: [3, 0], sink: 1, droop: 2});
    F(300, {face: shut, at: [6, 1], sink: 1, droop: 1});
    F(240, {face: flat, at: [10, 4], droop: 1});
    F(300, {face: flat});
    F(400, {face: flat});
    F(160, {face: blinked}); F(400, {face: flat});
    F(160, {face: blinked}); F(400);

    const frames = specs.map(({hold, o}) => ({hold, grid: scene(o)}));
    return {
      name: 'ECHO · facepalm', key: 'echo_facepalm', fwname: 'echo facepalm', category: 'Idle', size: N,
      // Big tier: 27 frames of 1600 bytes (43200 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, the facepalm gesture (no words, no one\'s art), 40 cell lattice (12 px cells, the creature at 2x): the creature rests and blinks, its eyes go flat and unimpressed, then its right forearm rises diagonally from the arm stub in three slow steps to an open palm seen flat, four short fingers and a thumb nub, that lands over the right of its visor with three small strokes flicking up, a sliver of the band showing past it; its whole body drops a row and its antenna droops over, it holds there most of two seconds with one slow sigh and a small puff, then the hand drags down its face over eyes shut flat, drops away, and the head comes back up still unimpressed, a slow blink, the rest; judge whether the open hand reads as a hand over the face, whether the hold reads as weary rather than still, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes (also the hand's outline), 3 visor, 4 ping, 5 feet, 6 pale
      // (the sigh puff, the marks)
      palette: [...ECHO_PALETTE.slice(0, 6), '#cfeee8'],
      frames,
    };
  })();

  L.register([echoFacepalm]);
})(typeof window !== 'undefined' ? window : globalThis);
