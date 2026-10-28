// Culture creatures, batch three: the ECHO creature plays the set pieces everyone knows. Drawn from scratch in code on
// the ECHO base; a meme lends its format only (the setting, the composition, the gesture), never its characters, its
// art or its caption, and no words appear in the picture.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  // ECHO · mic drop: the gesture of a microphone held out at arm's length and let go, then walking away. The gesture
  // only: a plain handheld microphone with no brand and no words; the ECHO creature plays it. 40 cell lattice, 12 px
  // cells on the 480 panel: the body is the family's 20 cell pose repeated exactly 2 times across and down, moved 5
  // cells left and a row down so the arm and the microphone have the right of the stage.
  //   stage     a plank floor across the bottom five rows, its seams in a darker brown, and a warm pool of
  //             spotlight on it.
  //   iris      the loop opens and closes on an iris: a circle of light that opens on the creature and closes on the
  //             dropped microphone, everything outside it black, so the walk off and the walk back never have to meet.
  //   hold      the microphone (a round silver grille with a dark mesh, a dark collar, a silver handle) starts in the
  //             hand at its side; the family's arm stub stays as the upper arm and a forearm swings out to arm's length,
  //             fist up, the microphone over it. The eyes go flat and cool, a ping.
  //   drop      the fist opens into three spread fingers and the microphone falls, faster each frame; it lands on its
  //             handle with warm impact strokes and an antenna ping, bounces up turning, comes down on its side and
  //             gives one small bounce more.
  //   walk off  the creature glances down at it, turns its face left (the band slides to the left edge, the eyes with
  //             it) and walks off the left edge in the family's walk, 5 cells a step; the microphone lies in the light.
  // Loop: 30 frames, 5.66 s, holds 90 to 400 ms. The last frame is the iris shut, all black, and the first is the iris
  // opening on the creature, so the loop runs through black without a seam.
  // Palette: 0..5 the ECHO palette unchanged (2 is also the grille's mesh, the collar and the fingers' gaps); 6 silver
  // (the microphone); 7 warm light (the spotlight pool, the impact strokes, the glint); 8 plank brown; 9 seam brown.
  // Index 6 is not ping here, so nothing goes through echoGlitch. Big tier: 30 frames of 1600 cells are 48000 bytes of
  // firmware table, so it ships only on boards built with SPLASH_BIG. One closure, so echoMicDrop is the only name it
  // adds; registered at the end of this file.
  const echoMicDrop = (() => {
    const N = 40, K = 2;                                           // lattice; a 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, SILVER = 6, WARM = 7, PLANK = 8, SEAM = 9;
    // Constants the cell is judged on.
    const OY = 1, OX0 = -5;                                        // a row down; 5 cells left where it stands
    const FLOOR = 35;                                              // the stage's top row
    const ELBOW = [19.5 + OY, 33.5];                               // the right stub's bottom, unshifted across
    const SIDE = [23.5 + OY, 34.5], OUT = [13.5 + OY, 36.5], HALF = [18.5 + OY, 37];   // the fist, unshifted across
    const FORE_R = 1.6, FIST_R = 2.0;
    const POOL = {r: 36, c: 21, rx: 17, ry: 2.2};                  // the spotlight's pool on the floor
    const MIC_X = 31.5;                                            // where the microphone falls (its centre col)

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const copy = g => g.map(row => row.slice());
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    const seg = (y, x, p, q) => {
      const vy = q[0] - p[0], vx = q[1] - p[1], L2 = vy * vy + vx * vx;
      const t = L2 ? Math.max(0, Math.min(1, ((y - p[0]) * vy + (x - p[1]) * vx) / L2)) : 0;
      return Math.hypot(y - p[0] - t * vy, x - p[1] - t * vx);
    };

    // The microphone upright, 4 wide and 11 tall: a round grille (s silver with a sparse g mesh), a dark collar k a
    // full row wide, and a silver handle 2 wide.
    const MIC = ['.ss.', 'sgss', 'ssgs', 'sgss', '.ss.', 'kkkk', '.ss.', '.ss.', '.ss.', '.ss.', '.ss.'];
    const INK = {s: SILVER, g: EYE, k: EYE};
    const MIC_C = [5, 1.5];                                        // its pivot: the middle of the handle's top
    // The microphone turned deg degrees clockwise about its pivot, as [row, col, ink] offsets (nearest neighbour,
    // sampled back into the upright sprite so no holes open).
    function micCells(deg) {
      const a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), out = [];
      for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) {
        const sy = ca * dy + sa * dx, sx = -sa * dy + ca * dx;     // back into the sprite's frame
        const r = Math.round(sy + MIC_C[0]), c = Math.round(sx + MIC_C[1] - 0.5);
        if (r < 0 || r >= MIC.length || c < 0 || c >= 4) continue;
        const ch = MIC[r][c];
        if (ch !== '.') out.push([dy, dx, INK[ch]]);
      }
      return out;
    }
    const drawMic = (g, at, deg) => { for (const [dy, dx, v] of micCells(deg)) put(g, Math.round(at[0] + dy), Math.round(at[1] + dx), v); return g; };

    // The creature: the family pose at 2x moved ox across and OY down; step 1 lifts the body a row and the first and
    // third legs off the floor (the family's walk at 2x).
    function creature(ox, ping, step = 0) {
      const src = upscale(echoPing(ping), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (!src[r][c]) continue;
        const leg = r >= 28;
        if (step && leg && r === 33 && (c === 10 || c === 11 || c === 24 || c === 25)) continue;
        put(g, r + OY - (step && !leg ? 1 : 0), c + ox, src[r][c]);
      }
      if (step) for (let c = 10; c <= 31; c++) put(g, 27 + OY, c + ox, BODY);   // the lifted hip row stays body
      return g;
    }
    // Faces, on a creature moved ox and lifted lift rows by its step: the band (slid by turn to face left), slits
    // slid dx, a blink, flat and cool.
    const V = {top: 12 + OY, bot: 15 + OY};
    function face(g, ox, kind, dx = 0, turn = 0, lift = 0) {
      const V = {top: 12 + OY - lift, bot: 15 + OY - lift};
      for (let r = V.top; r <= V.bot; r++) for (let c = 12 + ox - turn; c <= 29 + ox - turn; c++) put(g, r, c, VISOR);
      if (turn) for (let r = V.top; r <= V.bot; r++) for (let c = 30 + ox - turn; c <= 29 + ox; c++) put(g, r, c, BODY);
      for (const c0 of [14 + ox + dx - turn, 26 + ox + dx - turn]) {
        if (kind === 'blink') for (let c = c0 - 1; c < c0 + 3; c++) put(g, V.bot, c, EYE);
        else if (kind === 'flat') for (let r = V.bot - 1; r <= V.bot; r++) for (let c = c0 - 1; c < c0 + 3; c++) put(g, r, c, EYE);
        else for (let r = V.top; r <= V.bot; r++) for (let c = c0; c < c0 + 2; c++) put(g, r, c, EYE);
      }
      return g;
    }
    // The right forearm from the elbow to a fist (or, open, a palm with three spread fingers hanging from it); the
    // stub's own hand comes off and a crease in the feet teal marks the forearm where it lies over the body.
    function forearm(g, ox, fist, open) {
      const under = copy(g), elbow = [ELBOW[0], ELBOW[1] + ox], f = [fist[0], fist[1] + ox];
      for (let r = 20 + OY; r <= 21 + OY; r++) for (let c = 34 + ox; c <= 35 + ox; c++) g[r][c] = 0;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const y = r + 0.5, x = c + 0.5;
        const d = Math.min(seg(y, x, elbow, f) - FORE_R, open ? 9 : Math.hypot(y - f[0], x - f[1]) - FIST_R);
        if (d <= 0) g[r][c] = BODY;
        else if (d <= 1 && under[r][c] === BODY) g[r][c] = FEET;
      }
      if (open) {
        const r0 = Math.round(f[0] - 1), c0 = Math.round(f[1] - 2);
        for (let r = r0; r < r0 + 3; r++) for (let c = c0; c < c0 + 4; c++) put(g, r, c, BODY);
        for (const [dc, len] of [[-1, 2], [1, 3], [3, 2]]) for (let k = 0; k < len; k++) put(g, r0 + 3 + k, c0 + dc + (dc < 0 ? 0 : 0), BODY);
      }
      return g;
    }

    // The stage: plank floor, seams, and the spotlight's warm pool.
    function stage(g) {
      for (let r = FLOOR; r < N; r++) for (let c = 0; c < N; c++) {
        const lit = ((r - POOL.r) / POOL.ry) ** 2 + ((c + 0.5 - POOL.c) / POOL.rx) ** 2 <= 1;
        const seam = (r === FLOOR + 2) || ((c + (r % 2 ? 6 : 0)) % 12 === 0 && r > FLOOR);
        g[r][c] = lit && r < FLOOR + 3 && !seam ? WARM : (seam ? SEAM : PLANK);
      }
      return g;
    }
    // Impact strokes round a point on the floor: two short strokes each side, angled up.
    function impact(g, c, big) {
      const S = big ? [[-1, -3], [-2, -4], [-3, -2], [-4, -2], [-1, 3], [-2, 4], [-3, 2], [-4, 2]] : [[-1, -3], [-2, -4], [-1, 3], [-2, 4]];
      for (const [dr, dc] of S) put(g, FLOOR + dr, Math.round(c) + dc, WARM);
      return g;
    }
    // The iris: everything outside a circle of radius rad round ctr goes black.
    function iris(g, ctr, rad) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (Math.hypot(r + 0.5 - ctr[0], (c + 0.5 - ctr[1]) * 0.95) > rad) g[r][c] = 0;
      return g;
    }

    // A scene. o: ox (the creature's offset; null when it has gone), step, face ['kind', dx, turn], ping, arm ('side',
    // 'half', 'out', 'open' or null for the stub), mic ([row, col, degrees] when loose; held with the arm otherwise),
    // hit (impact strokes: 2 big, 1 small), iris ([row, col, radius]).
    function scene(o) {
      const g = stage(blank());
      if (o.ox !== null) {
        const ox = o.ox, c = creature(ox, !!o.ping, o.step || 0);
        const [kind, dx, turn] = o.face || ['slit', 0, 0];
        face(c, ox, kind, dx, turn, o.step || 0);
        const held = !o.mic && o.arm && o.arm !== 'open';
        const fist = {side: SIDE, half: HALF, out: OUT, open: OUT}[o.arm];
        if (fist) forearm(c, ox, fist, o.arm === 'open');
        for (let r = 0; r < N; r++) for (let k = 0; k < N; k++) if (c[r][k]) g[r][k] = c[r][k];
        // Held: the microphone stands on the fist, its handle hidden in it, the grille over the top; at the side the
        // fist hides the collar and the grille shows over it.
        if (held) {
          const top = Math.round(fist[0] - 7.5), col = Math.round(fist[1] + ox - 2);
          for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) if (MIC[r][k] !== '.') put(g, top + r, col + k, INK[MIC[r][k]]);
          for (let r = 9; r < 11; r++) for (let k = 1; k < 3; k++) put(g, top + r + 1, col + k, SILVER);   // the handle's end under the fist
        }
      }
      if (o.mic) drawMic(g, [o.mic[0], o.mic[1]], o.mic[2]);
      if (o.hit) impact(g, MIC_X, o.hit === 2);
      if (o.glint) put(g, o.glint[0], o.glint[1], WARM);
      if (o.iris) iris(g, [o.iris[0], o.iris[1]], o.iris[2]);
      return g;
    }

    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    const base = {ox: OX0};
    const at = extra => Object.assign({}, base, extra);
    const LIE = [FLOOR - 2.5, MIC_X - 2, 90];                      // the microphone on its side on the floor
    const HEAD = [16 + OY, 16 + OX0];                              // the iris opens on the head
    // 1. The iris opens on the creature, the microphone in the hand at its side; a blink.
    F(120, at({arm: 'side', iris: [...HEAD, 7]})); F(120, at({arm: 'side', iris: [...HEAD, 15]}));
    F(300, at({arm: 'side'})); F(90, at({arm: 'side', face: ['blink', 0, 0]}));
    // 2. The arm swings out to arm's length; the eyes go flat and cool; a ping.
    F(160, at({arm: 'half', face: ['flat', 1, 0]}));
    F(400, at({arm: 'out', face: ['flat', 1, 0]}));
    F(400, at({arm: 'out', face: ['flat', 1, 0], ping: true}));
    F(300, at({arm: 'out', face: ['flat', 1, 0]}));
    // 3. The drop: the hand opens, the microphone falls faster each frame, lands on its handle, bounces turning and
    // comes down on its side.
    F(140, at({arm: 'open', face: ['flat', 1, 0], mic: [OUT[0] - 5 + 3, MIC_X, 0]}));
    F(100, at({arm: 'open', face: ['flat', 2, 0], mic: [OUT[0] - 2 + 4, MIC_X, 0]}));
    F(90, at({arm: 'open', face: ['flat', 2, 0], mic: [OUT[0] + 5 + 4, MIC_X, 4]}));
    F(120, at({arm: 'open', face: ['flat', 2, 0], mic: [FLOOR - 6, MIC_X, 8], hit: 2, ping: true}));
    F(110, at({face: ['flat', 2, 0], mic: [FLOOR - 10, MIC_X - 1, 50], hit: 1}));
    F(110, at({face: ['flat', 2, 0], mic: [...LIE], hit: 1}));
    F(100, at({face: ['flat', 2, 0], mic: [LIE[0] - 1, LIE[1], 88]}));
    F(300, at({face: ['flat', 2, 0], mic: [...LIE]}));
    // 4. A glance down at it, the face turns left, and it walks off the left edge.
    F(300, at({face: ['slit', 2, 0], mic: [...LIE]}));
    F(240, at({face: ['flat', -2, 3], mic: [...LIE]}));
    for (let k = 1; k <= 6; k++) F(140, {ox: OX0 - 5 * k, step: k % 2, face: ['slit', -2, 3], mic: [...LIE]});
    // 5. The empty stage, the microphone in the light; a glint; the iris closes on it.
    F(400, {ox: null, mic: [...LIE]});
    F(300, {ox: null, mic: [...LIE], glint: [FLOOR - 4, MIC_X + 3]});
    const ON = [FLOOR - 3, MIC_X];
    F(140, {ox: null, mic: [...LIE], iris: [...ON, 13]});
    F(140, {ox: null, mic: [...LIE], iris: [...ON, 8]});
    F(140, {ox: null, mic: [...LIE], iris: [...ON, 3.5]});
    F(200, {ox: null, iris: [...ON, 0]});

    const frames = specs.map(({hold, o}) => ({hold, grid: scene(o)}));
    return {
      name: 'ECHO · mic drop', key: 'echo_mic_drop', fwname: 'echo mic drop', category: 'Active', size: N,
      // Big tier: 30 frames of 1600 bytes (48000 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, the mic drop gesture (a plain microphone, no brand, no words), 40 cell lattice (12 px cells, the creature at 2x on a plank stage in a warm spotlight): an iris opens on the creature holding a silver microphone at its side, it blinks, swings its arm out to arm\'s length with the microphone up and its eyes gone flat and cool, an antenna ping, then opens its hand; the microphone falls faster each frame, lands on its handle with impact strokes and a ping, bounces up turning and comes down on its side with one small bounce more; the creature glances down at it, turns its face left and walks off the left edge, the microphone lies in the light, a glint, and the iris closes on it; judge whether the microphone reads as one at 12 px cells, whether the fall and the bounce read as weight, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes (also the grille's mesh and the collar), 3 visor, 4 ping, 5 feet (also the
      // forearm's crease), 6 silver, 7 warm light (the pool, the impact strokes, the glint), 8 plank, 9 seam
      palette: [...ECHO_PALETTE.slice(0, 6), '#c9d3d8', '#ffd98a', '#5a4434', '#3a2a20'],
      frames,
    };
  })();

  L.register([echoMicDrop]);
})(typeof window !== 'undefined' ? window : globalThis);
