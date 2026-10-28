// Lab creatures: the ECHO creature at the hacker and CTF life (operator, 2026-10-28, culture batch three: "be
// creative and keep the style and theming and branding we have already developed"). Drawn from scratch in code on the
// ECHO base, no words in the picture.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  // ECHO · flag capture: capture the flag, played straight. A plain red flag on a pole stands in its stand on the red
  // side of the field; the ECHO creature runs over from its own teal side, pulls the flag out, runs it home, plants it
  // in its own stand and the flag goes off in a small burst, and a fresh flag builds itself back up in the red stand,
  // the way a capture the flag game sends the flag home after a score. 40 cell lattice, 12 px cells on the 480
  // panel: the body is the family's 20 cell pose repeated exactly 2 times across and down, 3 rows down so it stands on
  // the ground line, and slid across the field col by col.
  //   field     a ground strip along the bottom, dark teal on the left (its side) and dark red on the right, split
  //             at col 31; a two row stand on each side raised out of the ground, the home stand at cols 25 to 29
  //             and the red stand at cols 34 to 38.
  //   flag      a white pole 31 rows tall with a red cloth 7 across and 5 tall at its top, rippling (the cloth's
  //             cols past the second ride up and down a row on a travelling wave). On its stand the cloth flies to
  //             the left; carried home it trails to the right. The pole stands behind the creature, so the hand
  //             closes over it.
  //   rest      the loop anchor: home at the left, the family's slit eyes on the flag, a blink.
  //   run       a crouch, then 3, 3, 2 and 1 cols a frame to the red stand with the legs taking turns (two of the four
  //             shortened by two rows, the other two planted) and three white speed dashes behind it, the eyes
  //             leading.
  //   grab      the right hand on the pole, which comes up out of the stand 3 rows; the cloth swings round to trail;
  //             an antenna ping.
  //   home      the same run back, the flag carried high, the dashes on the other side.
  //   plant     the pole goes down into the home stand in two steps, the torso dips a row with it.
  //   burst     both arms up, happy arches, a ping, and the planted flag goes off: a ring of white, red and ping
  //             sparks opening out from the cloth over three frames while the flag dithers away.
  //   respawn   the red stand builds a new flag from the bottom up in three steps, a ping spark at its tip, while the
  //             creature lowers its arms and settles; the loop opens on the rest again.
  // Loop: 28 frames, 5.7 s. The cloth ripples a whole number of waves a loop on the frame index, so the last frame
  // runs into the first without a seam.
  // Palette: 0..5 the ECHO palette unchanged (4, the ping, is also a spark colour); 6 white (the pole, the speed
  // dashes, sparks), 7 flag red (the cloth, sparks), 8 the red side's ground, 9 the teal side's ground. Index 6 is
  // not ping here, so nothing goes through echoGlitch. Big tier: 28 frames of 1600 cells are 44800 bytes of firmware
  // table, so it ships only on boards built with SPLASH_BIG. One closure, so echoFlagCapture is the only name it
  // adds; registered at the end of this file.
  const echoFlagCapture = (() => {
    const N = 40, K = 2;                                           // lattice; a 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, WHITE = 6, RED = 7, RED_GROUND = 8, TEAL_GROUND = 9;
    // Constants the cell is judged on.
    const OY = 3;                                                  // the family's 2x frame, 3 rows down
    const LEGS = 28;                                               // family rows 28..33 at 2x are the legs
    const HOME = -8, AWAY = 1;                                     // the creature's col offset at home and at the flag
    const GROUND = 37, SPLIT = 31;                                 // the ground's top row; the sides split at this col
    const STAND = {home: 25, away: 34};                            // each stand's left col, 5 wide, 2 rows over the ground
    const POLE = {away: 36, len: 31, top: 4};                      // the red stand's pole col; length; top row in a stand
    const LIFT = 3;                                                // rows the pole comes up out of the stand
    const TAU = 2 * Math.PI;

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };

    // The creature: the family pose at 2x, dx cols across and OY rows down, its torso t rows off its legs; legs 'A'
    // or 'B' shortens two of the four legs by two rows (the stride), arms 'up' reflects the arm stubs up.
    function pose(dx, o) {
      const src = upscale(echoPing(!!o.ping), K), g = blank(), t = o.t || 0;
      const lifted = {A: [0, 2], B: [1, 3]}[o.legs] || [];
      const LEG_C = [10, 16, 24, 30];
      for (let r = LEGS; r < LEGS + 6; r++) for (let c = 0; c < N; c++) {
        if (!src[r][c]) continue;
        const k = LEG_C.findIndex(c0 => c === c0 || c === c0 + 1);
        if (lifted.includes(k) && r >= LEGS + 4) continue;
        put(g, r + OY, c + dx, src[r][c]);
        if (t < 0) put(g, r + OY + t, c + dx, src[r][c]);         // a raised torso: the legs grow to meet it
      }
      for (let r = 0; r < LEGS; r++) for (let c = 0; c < N; c++) {
        if (!src[r][c]) continue;
        const arm = r >= 14 && r <= 21 && (c < 10 || c > 31);
        put(g, (arm && o.arms === 'up' ? 27 - r : r) + OY + t, c + dx, src[r][c]);
      }
      return g;
    }
    // Faces on the band: the family's slits slid look cols, a blink, happy arches.
    const V = (dx, t) => ({top: 12 + OY + t, l: 12 + dx, r: 29 + dx, eyes: [14 + dx, 26 + dx]});
    const band = (g, v) => { for (let r = v.top; r < v.top + 4; r++) for (let c = v.l; c <= v.r; c++) put(g, r, c, VISOR); };
    const slits = (look = 0) => (g, v) => { band(g, v); for (let r = v.top; r < v.top + 4; r++) for (const c0 of v.eyes) for (let c = c0; c < c0 + 2; c++) put(g, r, c + look, EYE); };
    const blinked = (g, v) => { band(g, v); for (const c0 of v.eyes) for (let c = c0; c < c0 + 2; c++) put(g, v.top + 3, c, EYE); };
    const arches = (g, v) => { band(g, v); for (const c0 of v.eyes) { put(g, v.top + 1, c0, EYE); put(g, v.top + 1, c0 + 1, EYE); put(g, v.top + 2, c0 - 1, EYE); put(g, v.top + 2, c0 + 2, EYE); } };

    // The field: the two grounds and the two stands.
    function field(g) {
      for (let r = GROUND; r < N; r++) for (let c = 0; c < N; c++) g[r][c] = c < SPLIT ? TEAL_GROUND : RED_GROUND;
      for (let r = GROUND - 2; r < GROUND; r++) for (let c = 0; c < 5; c++) { put(g, r, STAND.home + c, TEAL_GROUND); put(g, r, STAND.away + c, RED_GROUND); }
      return g;
    }
    // A flag: the pole at col with its top row top, the cloth on side -1 (left) or 1 (right), rippling at phase ph.
    // keep(r, c) decides which of its cells show (the dissolve and the respawn).
    let NF = 1;                                                    // frames a loop, set once the frames are listed
    function flag(g, col, top, side, f, keep = () => true) {
      for (let r = top; r < top + POLE.len; r++) if (keep(r, col)) put(g, r, col, WHITE);
      const ph = TAU * 5 * f / NF;                                 // five waves a loop
      for (let k = 0; k < 7; k++) {
        const off = k < 2 ? 0 : Math.round(Math.sin(ph - 1.1 * k));
        for (let r = top + off; r < top + off + 5; r++) { const c = col + side * (k + 1); if (keep(r, c)) put(g, r, c, RED); }
      }
      return g;
    }
    // Speed dashes: three white dashes behind the body, on the side it is running away from.
    function dashes(g, dx, dir) {
      const rows = [17 + OY, 21 + OY, 25 + OY];
      rows.forEach((r, i) => {
        const len = 3 + (i === 1 ? 1 : 0);
        for (let k = 0; k < len; k++) put(g, r, dir > 0 ? 5 + dx - k - i % 2 : 36 + dx + k + i % 2, WHITE);
      });
      return g;
    }
    // The burst: eight sparks at radius rad round the planted cloth's middle, white, red and ping in turn.
    const BURST_AT = [6, STAND.home + 2 + 1 + 3];
    function burst(g, rad) {
      const inks = [WHITE, RED, PING];
      if (rad <= 2) put(g, BURST_AT[0], BURST_AT[1], WHITE);
      for (let k = 0; k < 8; k++) {
        const a = TAU * k / 8 + (rad > 4 ? TAU / 16 : 0);
        put(g, Math.round(BURST_AT[0] + rad * Math.sin(a)), Math.round(BURST_AT[1] + rad * Math.cos(a)), inks[k % 3]);
        if (rad > 2 && rad < 6) put(g, Math.round(BURST_AT[0] + (rad - 1) * Math.sin(a)), Math.round(BURST_AT[1] + (rad - 1) * Math.cos(a)), inks[(k + 1) % 3]);
      }
      return g;
    }

    // A scene. o: dx, t, legs, arms, face, ping, away (the red stand's flag: true, false, or the row its build has
    // reached), carry ({lift, side}: the flag in the right hand), planted (rows still up out of the home stand),
    // dissolve (0 none, 1 half, 2 gone), burst (a radius), dash (1 running right, -1 running left).
    function scene(o, f) {
      const g = field(blank()), dx = o.dx === undefined ? HOME : o.dx;
      if (o.away === true) flag(g, POLE.away, POLE.top, -1, f);
      else if (typeof o.away === 'number') flag(g, POLE.away, POLE.top, -1, f, r => r >= o.away);
      if (o.carry) flag(g, 35 + dx, POLE.top - o.carry.lift, o.carry.side, f);
      if (o.planted !== undefined && o.dissolve !== 2) flag(g, 35 + HOME, POLE.top - o.planted, 1, f, (r, c) => !o.dissolve || (r + c) % 2 === 0);
      const c = pose(dx, o);
      (o.face || slits())(c, V(dx, o.t || 0));
      for (let r = 0; r < N; r++) for (let k = 0; k < N; k++) if (c[r][k]) g[r][k] = c[r][k];
      if (o.dash) dashes(g, dx, o.dash);
      if (o.burst) burst(g, o.burst);
      if (o.tip) { put(g, POLE.top - 1, POLE.away, PING); put(g, POLE.top - 2, POLE.away, WHITE); }
      return g;
    }

    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    // 1. Rest, the loop anchor: home, eyes on the flag, a blink.
    F(400, {away: true, face: slits(1)}); F(360, {away: true, face: slits(1)}); F(90, {away: true, face: blinked}); F(280, {away: true, face: slits(1)});
    // 2. The run: a crouch, then three strides to the red stand, the dashes behind it.
    F(170, {away: true, t: 1, face: slits(1)});
    F(120, {away: true, dx: -5, legs: 'A', dash: 1, face: slits(1)});
    F(120, {away: true, dx: -2, legs: 'B', dash: 1, face: slits(1)});
    F(120, {away: true, dx: 0, legs: 'A', dash: 1, face: slits(1)});
    // 3. The grab: the hand on the pole, the pole up out of the stand, the cloth swings round, a ping.
    F(200, {away: true, dx: AWAY});
    F(160, {carry: {lift: 2, side: -1}, dx: AWAY, t: -1});
    F(200, {carry: {lift: LIFT, side: 1}, dx: AWAY, t: -1, ping: true, face: slits(-1)});
    // 4. Home: three strides back, the flag carried high and trailing.
    F(120, {carry: {lift: LIFT, side: 1}, dx: AWAY - 3, legs: 'B', dash: -1, face: slits(-1)});
    F(120, {carry: {lift: LIFT, side: 1}, dx: AWAY - 6, legs: 'A', dash: -1, face: slits(-1)});
    F(120, {carry: {lift: LIFT, side: 1}, dx: HOME, legs: 'B', dash: -1, face: slits(-1)});
    // 5. The plant: down into the home stand in two steps, the torso dipping with it.
    F(180, {carry: {lift: LIFT, side: 1}});
    F(120, {carry: {lift: 1, side: 1}});
    F(160, {planted: 0, t: 1});
    // 6. The burst: arms up, arches, a ping, the sparks open out while the flag dithers away.
    F(140, {planted: 0, arms: 'up', face: arches, ping: true, burst: 2});
    F(140, {planted: 0, arms: 'up', face: arches, burst: 4, dissolve: 1});
    F(160, {planted: 0, arms: 'up', face: arches, burst: 6, dissolve: 2});
    // 7. The respawn: a new flag builds up from the bottom of the red stand; the arms come down and it settles.
    F(180, {away: 26, arms: 'up', face: arches});
    F(180, {away: 15, arms: 'up', face: arches, ping: true});
    F(200, {away: POLE.top, face: arches, tip: true});
    F(300, {away: true, face: arches});
    F(300, {away: true});
    F(320, {away: true, ping: true, face: slits(1)});
    F(380, {away: true, face: slits(1)});
    F(380, {away: true, face: slits(1)});

    NF = specs.length;
    const frames = specs.map(({hold, o}, f) => ({hold, grid: scene(o, f)}));
    return {
      name: 'ECHO · flag capture', key: 'echo_flag_capture', fwname: 'echo flag capture', category: 'Active', size: N,
      // Big tier: 28 frames of 1600 bytes (44800 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, capture the flag played straight, 40 cell lattice (12 px cells, the creature at 2x on a ground strip split teal on its side and red on the other, a stand raised on each side): a plain red flag on a white pole ripples in the red stand while the creature rests at home and blinks, then it crouches and runs over in three strides with its legs taking turns and white speed dashes behind it, pulls the pole up out of the stand with an antenna ping, runs it home with the cloth trailing, plants it in its own stand with a dip, throws both arms up with happy arches as the flag goes off in a ring of white, red and ping sparks, and a fresh flag builds itself back up from the bottom of the red stand; judge whether the run reads as a run in so short a field, whether the grab and the plant read with the pole behind the hand, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes, 3 visor, 4 ping (also sparks), 5 feet, 6 white (the pole, dashes, sparks), 7
      // flag red (the cloth, sparks), 8 the red side's ground, 9 the teal side's ground
      palette: [...ECHO_PALETTE.slice(0, 6), '#eafffb', '#ff4d5e', '#4a1d26', '#0b3b34'],
      frames,
    };
  })();

  L.register([echoFlagCapture]);
})(typeof window !== 'undefined' ? window : globalThis);
