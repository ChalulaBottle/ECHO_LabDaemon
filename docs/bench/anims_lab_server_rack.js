// Lab creatures, culture batch three (operator, 2026-10-28: "produce me another 25 animations", "be creative and keep
// the style and theming and branding we have already developed"). The lab: drawn from scratch in code on the ECHO
// base, no words in the picture, and no sound on this device, so the alarm is light only.
//
// ECHO · server rack: the creature minds a rack in the lab; one unit goes red, it pats the rack, the unit goes green,
// it nods. 40 cell lattice, 12 px cells on the 480 panel: the body is the family's 20 cell pose repeated exactly twice
// across and down, moved 6 cells left so a rack 9 across and 31 tall stands at its right against the panel's edge.
//   rack      a steel cabinet with nine units, each a dark faceplate with two LEDs two cells wide (the two columns)
//             and a steel rail under it. A lit LED is green, an unlit one shows the steel lens; every LED twinkles on
//             its own rhythm off the frame index, so the rack is always busy.
//   watch     the creature stands by its rack, a blink.
//   alarm     the fifth unit's two LEDs go red and blink red on alternate frames; the creature looks over at the rack
//             (slits slid right) and its antenna pings.
//   pat       the elbow stays out (the family's arm stub is the upper arm) and a forearm brings the fist up and down
//             onto the faulty unit's faceplate twice, a dark crease keeping it off the steel; the rack jolts a cell
//             right on each pat; the eyes narrow.
//   fixed     on the second pat the unit's LEDs come back green; the arm goes down, the creature nods (the torso a row
//             down, the legs where they stand) with its eyes shut happy and an antenna ping, then watches again.
// Loop: 25 frames, 5.31 s. The faulty unit is green again at the end and the LEDs twinkle on the frame index, so the
// last frame runs into the first without a seam.
// Palette: 0..5 the ECHO palette unchanged (2 is also the forearm's crease over the rack); 6 LED green, 7 LED red,
// 8 steel (the cabinet, the rails, the unlit lenses), 9 faceplate. Index 6 is not ping here, so nothing goes through
// echoGlitch. Big tier: 25 frames of 1600 cells are 40000 bytes of firmware table, so it ships only on boards built
// with SPLASH_BIG. One closure, so echoServerRack is the only name it adds; registered at the end of this file.
(function (root) {
  if (typeof require !== 'undefined' && !root.BENCH_LIB) require('./anims.js');
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  const echoServerRack = (() => {
    const N = 40, K = 2;                                           // lattice; a 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, FEET = 5, GREEN = 6, RED = 7, STEEL = 8, PLATE = 9;
    // Constants the cell is judged on.
    const DX = -6;                                                 // the family's 2x frame, 6 cells left
    const V = {top: 12, bot: 15, l: 12 + DX, r: 29 + DX};          // the visor band on the panel
    const EYE_C = [14 + DX, 26 + DX];                              // each slit's left col, 2 wide
    const HAND = {r: [20, 21], c: [34 + DX, 35 + DX]};             // the family's right hand on the panel
    const ELBOW = [18.5, 28.5], FORE_R = 1.5, FIST_R = 1.8;        // the forearm drawn out of the stub
    const RACK = {t: 3, b: 33, l: 31, r: 39}, UNITS = 9, BAD = 4;  // the cabinet; its units; the one that goes red
    const LEDS = [33, 36];                                         // each LED's left col, 2 wide
    const unitRow = k => RACK.t + 1 + 3 * k;                       // a unit's faceplate rows are this one and the next
    const HIPS = 27;                                               // the body's last row; the legs stand below it

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const copy = g => g.map(row => row.slice());
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    const rect = (g, r0, c0, r1, c1, v) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) put(g, r, c, v); return g; };
    const seg = (y, x, p, q) => {
      const vy = q[0] - p[0], vx = q[1] - p[1], L2 = vy * vy + vx * vx;
      const t = L2 ? Math.max(0, Math.min(1, ((y - p[0]) * vy + (x - p[1]) * vx) / L2)) : 0;
      return Math.hypot(y - p[0] - t * vy, x - p[1] - t * vx);
    };

    // The creature: the family pose at 2x moved DX across; nod drops the torso a row and leaves the legs standing.
    function creature(ping, nod) {
      const src = upscale(echoPing(ping), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (!src[r][c]) continue;
        if (nod && r <= HIPS) put(g, r + 1, c + DX, src[r][c]);
        else if (!nod || r > HIPS + 1) put(g, r, c + DX, src[r][c]);
      }
      return g;
    }
    // Faces: the slits slid sx; narrowed (the bottom half of each slit); happy arches. dy follows the nod.
    const band = (g, dy) => rect(g, V.top + dy, V.l, V.bot + dy, V.r, VISOR);
    const slits = (sx = 0) => (g, dy) => { band(g, dy); for (const c of EYE_C) rect(g, V.top + dy, c + sx, V.bot + dy, c + sx + 1, EYE); return g; };
    const narrow = (sx = 0) => (g, dy) => { band(g, dy); for (const c of EYE_C) rect(g, V.bot - 1 + dy, c + sx, V.bot + dy, c + sx + 1, EYE); return g; };
    const arches = (g, dy) => { band(g, dy); for (const c of EYE_C) { rect(g, V.top + 1 + dy, c, V.top + 1 + dy, c + 1, EYE); put(g, V.top + 2 + dy, c - 1, EYE); put(g, V.top + 2 + dy, c + 2, EYE); } return g; };

    // The rack, shifted jolt cells right. bad: the faulty unit's state (null green as the rest, 'on' red, 'off' dark).
    function rack(g, f, bad, jolt) {
      const x = jolt || 0;
      rect(g, RACK.t, RACK.l + x, RACK.b, RACK.r + x, STEEL);
      for (let k = 0; k < UNITS; k++) {
        const r = unitRow(k);
        rect(g, r, RACK.l + 1 + x, r + 1, RACK.r - 1 + x, PLATE);
        LEDS.forEach((c, j) => {
          let ink = ((k * 7 + j * 11 + f * (1 + (k + j) % 3)) % 5) < 3 ? GREEN : STEEL;   // the twinkle
          if (k === BAD && bad) ink = bad === 'on' ? RED : STEEL;
          rect(g, r, c + x, r, c + 1 + x, ink);
        });
        if (k === BAD && bad === 'on') rect(g, r + 1, RACK.l + 1 + x, r + 1, RACK.r - 1 + x, RED);   // the fault's bar
      }
      return g;
    }
    // The forearm: the hand comes off the stub and a forearm runs from the elbow to a fist, creased teal over the body
    // and dark over anything else.
    function forearm(g, fist) {
      const under = copy(g);
      for (let r = HAND.r[0]; r <= HAND.r[1]; r++) for (let c = HAND.c[0]; c <= HAND.c[1]; c++) if (g[r][c] === BODY) g[r][c] = 0;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const y = r + 0.5, x = c + 0.5;
        const d = Math.min(seg(y, x, ELBOW, fist) - FORE_R, Math.hypot(y - fist[0], x - fist[1]) - FIST_R);
        if (d <= 0) g[r][c] = BODY;
        else if (d <= 1 && under[r][c] && under[r][c] !== VISOR && under[r][c] !== EYE) g[r][c] = under[r][c] === BODY ? FEET : EYE;
      }
      return g;
    }

    // A scene. o: bad, jolt, fist (null: the hand hangs), nod, face, ping; f drives the twinkle.
    function scene(f, o) {
      const g = blank();
      rack(g, f, o.bad, o.jolt);
      const dy = o.nod ? 1 : 0, cr = creature(!!o.ping, o.nod);
      (o.face || slits(0))(cr, dy);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (cr[r][c]) g[r][c] = cr[r][c];
      if (o.fist) forearm(g, o.fist);
      return g;
    }

    // The frames.
    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    const UP = [11.5, 31], DOWN = [16, 32.5];                      // the fist raised, and on the faulty unit's faceplate
    // 1. Watch, the loop anchor: the rack twinkles, a blink.
    F(260); F(260); F(90, {face: narrow(0)}); F(260); F(260); F(260);
    // 2. The alarm: the fifth unit blinks red, the creature looks over, a ping.
    F(240, {bad: 'on', face: slits(1)}); F(240, {bad: 'off', face: slits(1), ping: true});
    F(240, {bad: 'on', face: slits(1)}); F(240, {bad: 'off', face: slits(1)});
    // 3. Two pats, the rack jolting on each.
    F(150, {bad: 'on', fist: UP, face: narrow(1)}); F(130, {bad: 'off', fist: DOWN, jolt: 1, face: narrow(1)});
    F(130, {bad: 'on', fist: UP, face: narrow(1)}); F(130, {fist: DOWN, jolt: 1, face: narrow(1)});
    // 4. Fixed: the unit is green, the arm goes down, a nod with happy eyes and a ping.
    F(220, {fist: DOWN, face: slits(1)}); F(170, {face: slits(1)});
    F(220, {nod: true, face: arches, ping: true}); F(220, {face: arches}); F(200);
    // 5. Watch again.
    F(260); F(260); F(260); F(90, {face: narrow(0)}); F(260); F(260);

    const frames = specs.map(({hold, o}, f) => ({hold, grid: scene(f, o)}));
    return {
      name: 'ECHO · server rack', key: 'echo_server_rack', fwname: 'echo server rack', category: 'Active', size: N,
      // Big tier: 25 frames of 1600 bytes (40000 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, the lab, 40 cell lattice (12 px cells, the creature at 2x moved left beside a steel rack of nine units, two columns of green LEDs twinkling on their own rhythms): it watches and blinks, the fifth unit\'s LEDs go red and blink, it looks over with an antenna ping, brings a forearm out of its arm stub and pats the faulty unit twice with the rack jolting a cell on each pat, the unit comes back green, and it nods with its eyes shut happy and a ping before it goes back to watching; judge whether the red row reads as the fault at a glance, whether the pats read as pats at 12 px cells, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes (also the forearm's crease over the rack), 3 visor, 4 ping, 5 feet (the
      // forearm's crease on the body), 6 LED green, 7 LED red, 8 steel (the cabinet, the rails, the unlit lenses),
      // 9 faceplate
      palette: [...ECHO_PALETTE.slice(0, 6), '#3cff7a', '#ff3b3b', '#46525c', '#141b20'],
      frames,
    };
  })();

  L.register([echoServerRack]);
})(typeof window !== 'undefined' ? window : globalThis);
