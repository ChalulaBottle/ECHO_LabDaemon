// The lab: the ECHO creature beside a big case fan (culture batch three, entry 26, operator 2026-10-28: "be creative
// and keep the style and theming and branding we have already developed"). Drawn from scratch in code on the ECHO
// base; a generic square case fan, no maker, no logo and no words in the picture.
//
// ECHO · gpu fan: the fan stands behind the creature's right shoulder and runs one duty cycle: still, spinning up,
// a blur at full speed with heat rising off the top, spinning down, still again. 40 cell lattice, 12 px cells on the
// 480 panel, built from the family's 20 cell pose repeated exactly twice across and down (upscale(echoPing(ping), 2)),
// moved 6 cols left and 6 rows down so the fan has the top right of the panel; the antenna is the one part redrawn.
//   fan       a square grey case 19 cells across with a round hole, four dark screw holes in its corners, a hub and
//             five swept blades in a pale grey. At rest the blades stand clear; as it turns each blade drags a smear
//             of darker grey behind it, longer the faster it goes; at full speed the hole is a grey blur disc with two
//             pale streak arcs turning in it, so the speed reads without the wagon wheel stall a fast blade would show.
//   antenna   the family's stem and tip, drawn as a curve: the fan's draught bends it back to the left, more as the fan
//             speeds up, fluttering a little at full speed. When the fan stops it springs past upright, settles, and
//             the tip pings once.
//   heat      warm shimmer lines rise through the dark over the creature's head while the fan runs flat out, carried
//             left by the draught, and thin out as it spins down.
//   face      the family's slit eyes at rest with a blink; they squint to two rows against the wind at full speed and
//             open again as it slows.
// Loop: 28 frames, 5.8 s. It opens and ends on the still fan with the blades in the same place: the spin's angle steps
// are scaled so the whole turn is a whole number of blade spacings, so the last frame runs into the first.
// Palette: 0..5 the ECHO palette unchanged (2 is also the screw holes and the hub's centre); 6 case grey (the frame and
// the hub), 7 blade grey (the blades, the streak arcs), 8 blur grey (the smear and the blur disc), 9 heat (the
// shimmer). Index 6 is not ping here, so no frame goes through echoGlitch. Big tier: 28 frames of 1600 cells are
// 44800 bytes of firmware table, so it ships only on boards built with SPLASH_BIG. One closure, so echoGpuFan is the
// only name it adds; registered at the end of this file.
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  if (typeof require !== 'undefined' && !root.BENCH_LIB) require('./anims.js');
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  const echoGpuFan = (() => {
    const N = 40, K = 2;                                           // lattice; the 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, CASE = 6, BLADE = 7, BLUR = 8, HEAT = 9;
    // Constants the cell is judged on.
    const OX = -6, OY = 6;                                         // the family's 2x frame, 6 cols left and 6 down
    const HEAD = 8 + OY;                                           // the head's top row; the antenna stands on it
    const ANT_C = 30 + OX;                                         // the antenna's left col (it is 2 wide)
    const V = {top: 12 + OY, bot: 15 + OY, l: 12 + OX, r: 29 + OX};   // the visor band on the panel
    const EYE_C = [14 + OX, 26 + OX];                              // each slit's left col, 2 wide
    const FY = 11, FX = 30, HALF = 9.5, HOLE = 9.2;                // the fan's centre, the case's half side, the hole
    const HUB = 2.4, BLADES = 5, BLADE_W = 0.62, SWEEP = 0.09;     // hub radius; blade count, width (rad), sweep
    const TAU = 2 * Math.PI, GAP = TAU / BLADES;

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const copy = g => g.map(row => row.slice());
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    const mod = (a, m) => ((a % m) + m) % m;

    // The creature: the family's 2x pose moved OX across and OY down, the antenna left off (drawn by antenna()).
    function creature() {
      const src = upscale(echoPing(false), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (src[r][c] && r + OY >= HEAD) put(g, r + OY, c + OX, src[r][c]);
      return g;
    }
    // The antenna as a curve from the head's top: 6 rows tall upright, the tip's last third in ping when it pings.
    // bend 1 lays the tip 4 cols to the left and a row and a half lower; a negative bend leans it right.
    function antenna(g, bend, ping) {
      for (let s = 0; s <= 60; s++) {
        const t = s / 60, y = HEAD - 0.01 - 6 * t + 1.5 * Math.abs(bend) * t * t, x = ANT_C - 4 * bend * t * t;
        const ink = ping && t > 0.67 ? PING : BODY;
        put(g, Math.floor(y), Math.round(x), ink); put(g, Math.floor(y), Math.round(x) + 1, ink);
      }
      return g;
    }
    // Faces: the band plain, the slits on the rows given (all four, the two middle in the squint, the bottom two in
    // the blink).
    const band = g => { for (let r = V.top; r <= V.bot; r++) for (let c = V.l; c <= V.r; c++) g[r][c] = VISOR; return g; };
    const eyes = (g, rows) => { band(g); for (const r of rows) for (const c0 of EYE_C) { g[V.top + r][c0] = EYE; g[V.top + r][c0 + 1] = EYE; } return g; };
    const OPEN = [0, 1, 2, 3], SQUINT = [1, 2], BLINK = [3];

    // The fan at angle rot. speed 0..1: 0 clear blades, up to 0.85 a smear behind each blade growing with it, past
    // 0.85 the blur disc with two pale streak arcs.
    function fan(g, rot, speed) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const y = r + 0.5 - FY, x = c + 0.5 - FX;
        if (Math.abs(y) > HALF || Math.abs(x) > HALF) continue;
        const d = Math.hypot(y, x), th = Math.atan2(y, x);
        if (d > HOLE) { g[r][c] = CASE; continue; }
        if (d < HUB) { g[r][c] = CASE; continue; }
        if (d > HOLE - 0.9) continue;                              // the gap between the blade tips and the case
        if (speed > 0.85) {
          const arc = (d > 3.6 && d < 4.8 && mod(th - rot, Math.PI) < 1.0) || (d > 6.4 && d < 7.6 && mod(th - rot + 1.4, Math.PI) < 1.2);
          g[r][c] = arc ? BLADE : BLUR;
          continue;
        }
        const m = mod(th - rot - SWEEP * d, GAP), smear = speed * 0.95;
        if (m < BLADE_W) g[r][c] = BLADE;
        else if (m > GAP - smear) g[r][c] = BLUR;
      }
      g[FY][FX] = EYE; g[FY - 1][FX - 1] = EYE; g[FY - 1][FX] = EYE; g[FY][FX - 1] = EYE;
      for (const [r, c] of [[FY - 8, FX - 8], [FY - 8, FX + 7], [FY + 7, FX - 8], [FY + 7, FX + 7]]) put(g, r, c, EYE);
      return g;
    }
    // Heat: five shimmer lines, four cells tall, rising two rows a frame through the dark over the head and carried
    // left by the draught a col every three rows, a one col kink every other row; amount 0..1 thins them (a line shows only
    // while its own share is under the amount).
    const SHIMMER = [[19, 0, 0.1], [15, 8, 0.5], [11, 3, 0.25], [7, 11, 0.7], [4, 6, 0.85]];   // [col, phase, share]
    const HEAT_LOW = HEAD - 2, HEAT_RIGHT = Math.floor(FX - HALF) - 1;   // under the head's rim, left of the case
    function heat(g, f, amount) {
      for (const [c0, ph, share] of SHIMMER) {
        if (share >= amount) continue;
        const y0 = HEAT_LOW - mod(2 * f + ph, HEAT_LOW + 3);
        for (let k = 0; k < 4; k++) {
          const y = y0 - k, x = c0 - Math.floor((HEAT_LOW - y) / 3) + [0, 1, 1, 0][mod(y + ph, 4)];
          if (y >= 0 && y <= HEAT_LOW && x < HEAT_RIGHT) put(g, y, x, HEAT);
        }
      }
      return g;
    }
    // The creature over the fan: the fan takes a cell only where nothing stands and nothing stands beside it, so a
    // dark rim keeps the silhouette.
    function compose(fg, bg) {
      const g = copy(fg);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (fg[r][c] || !bg[r][c]) continue;
        let near = false;
        for (let a = -1; a <= 1 && !near; a++) for (let b = -1; b <= 1; b++) if (inside(r + a, c + b) && fg[r + a][c + b]) { near = true; break; }
        if (!near) g[r][c] = bg[r][c];
      }
      return g;
    }

    // The frames: F(hold, step the blades turn this frame in blade spacings, speed for the drawing, o). o: bend,
    // ping, eyes (rows), heat (amount).
    const specs = [];
    const F = (hold, step, speed, o = {}) => specs.push({hold, step, speed, o});
    // 1. Still: the blades stand clear, a blink.
    F(400, 0, 0); F(90, 0, 0, {eyes: BLINK}); F(400, 0, 0); F(400, 0, 0);
    // 2. Spin up: the steps grow, the smear grows behind each blade, the draught starts to bend the antenna.
    F(220, 0.12, 0.1, {bend: 0.08}); F(200, 0.22, 0.25, {bend: 0.2}); F(180, 0.33, 0.45, {bend: 0.35});
    F(170, 0.41, 0.62, {bend: 0.5, eyes: [0, 1, 2]}); F(160, 0.46, 0.8, {bend: 0.68, eyes: SQUINT});
    // 3. Flat out: the blur disc, the antenna laid back and fluttering, the eyes squinting, heat rising.
    const flutter = [1, 0.88, 1, 0.92, 1, 0.86, 1, 0.9, 1, 0.9];
    flutter.forEach((b, k) => F(150, 0.37, 1, {bend: b, eyes: SQUINT, heat: Math.min(1, 0.3 + 0.25 * k)}));
    // 4. Spin down: the smear shortens, the antenna comes up, the heat thins out, the eyes open.
    F(170, 0.44, 0.78, {bend: 0.7, eyes: SQUINT, heat: 0.6}); F(190, 0.36, 0.55, {bend: 0.5, eyes: [0, 1, 2], heat: 0.35});
    F(210, 0.26, 0.35, {bend: 0.32, heat: 0.15}); F(230, 0.16, 0.18, {bend: 0.16}); F(260, 0.07, 0.06, {bend: 0.06});
    // 5. Stopped: the antenna springs past upright, settles, the tip pings; the loop opens on the still fan.
    F(160, 0, 0, {bend: -0.35}); F(170, 0, 0, {bend: 0.15}); F(330, 0, 0, {ping: true}); F(330, 0, 0);

    // The steps scaled so the whole turn is a whole number of blade spacings: the still blades sit where they began.
    const total = specs.reduce((s, x) => s + x.step, 0), scale = Math.round(total) / total;
    let turn = 0;
    const frames = specs.map(({hold, step, speed, o}, f) => {
      turn += step * scale;
      const fg = creature();
      antenna(fg, o.bend || 0, !!o.ping);
      eyes(fg, o.eyes || OPEN);
      const bg = fan(blank(), turn * GAP + 0.3, speed);
      if (o.heat) heat(bg, f, o.heat);
      return {hold, grid: compose(fg, bg)};
    });
    return {
      name: 'ECHO · gpu fan', key: 'echo_gpu_fan', fwname: 'echo gpu fan', category: 'Active', size: N,
      // Big tier: 28 frames of 1600 bytes (44800 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, 40 cell lattice (12 px cells, the creature at 2x), the creature standing in front of a big grey square case fan that runs one duty cycle: the blades stand still and it blinks, then the fan spins up with a darker smear growing behind each blade while the draught bends the antenna back to the left, at full speed the hole becomes a grey blur disc with pale streak arcs turning in it, the antenna lies back and flutters, the eyes squint against the wind and warm shimmer lines rise over its head, carried left by the draught, then it spins down, the heat thins out, the eyes open, and when the blades stop the antenna springs past upright, settles and pings; judge whether the spin up and the blur read as speed rather than a grey plate, whether the bent antenna reads as wind, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes (also the screw holes and the hub's centre), 3 visor, 4 ping (the antenna tip),
      // 5 feet, 6 case grey (the frame and the hub), 7 blade grey (blades and streak arcs), 8 blur grey (the smear and
      // the blur disc), 9 heat (the shimmer)
      palette: [...ECHO_PALETTE.slice(0, 6), '#3d4a52', '#a9bcc4', '#5f7079', '#ffb26b'],
      frames,
    };
  })();

  L.register([echoGpuFan]);
})(typeof window !== 'undefined' ? window : globalThis);
