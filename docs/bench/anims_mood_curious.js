// Moods for the idle rotation: the ECHO creature, curious (culture batch three, entry 30, operator 2026-10-28: "be
// creative and keep the style and theming and branding we have already developed"). Drawn from scratch in code on the
// ECHO base; a small study in attention, where the eyes, the tilt of the head and the antenna all follow one thing.
//
// ECHO · curious: a small bright spark drifts in from the left, over the head and down beside it; the creature
// follows it with everything it has, reaches for it, and it pops. 40 cell lattice, 12 px cells on the 480 panel,
// built from the family's 20 cell pose repeated exactly twice across and down (upscale(echoPing(ping), 2)), moved 3
// cols left and 4 rows down so the spark has room to hover at its right; the antenna is the one part redrawn.
//   spark     a cream core 2 x 2 with gold glints that twinkle, a plus on one frame and a cross on the next, drifting
//             on a slow arc: in at the left, up over the head, down the right side to hover beside the shoulder.
//   eyes      the family's slits slide along the band after it, up to 2 cols either way, to the band's ends, and ride on the top
//             three rows while it is above the head.
//   tilt      the head and body above the waist tilt toward the spark, up to 6 degrees, pixel art style: each column
//             slides up or down by its distance from the middle, so the visor band steps like a tilted line and the
//             2x blocks stay whole; the legs and hips stay put.
//   antenna   the stem curves toward the spark as it passes, left while it is on the left, right as it crosses.
//   reach     a forearm comes out of the right arm stub (the stub is the upper arm, as in this is fine's sip) and the
//             fist closes on the spark.
//   pop       the spark bursts into eight gold rays that open and scatter into specks; the eyes go to happy arches,
//             the antenna pings, the head comes upright, a blink, and the loop opens on the rest, the air empty.
// Loop: 25 frames, 7.0 s; the drift steps hold 200 to 260 ms, the rest 600 and 700 ms.
// Palette: 0..5 the ECHO palette unchanged; 6 spark cream (the core, the specks), 7 gold (the glints and the rays).
// Index 6 is not ping here, so no frame goes through echoGlitch. Big tier: 25 frames of 1600 cells are 40000 bytes of
// firmware table, so it ships only on boards built with SPLASH_BIG. One closure, so echoCurious is the only name it
// adds; registered at the end of this file.
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  if (typeof require !== 'undefined' && !root.BENCH_LIB) require('./anims.js');
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  const echoCurious = (() => {
    const N = 40, K = 2;                                           // lattice; the 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, SPARK = 6, GOLD = 7;
    // Constants the cell is judged on.
    const OX = -3, OY = 4;                                         // the family's 2x frame, 3 cols left and 4 down
    const HEAD = 8 + OY;                                           // the head's top row; the antenna stands on it
    const ANT_C = 30 + OX;                                         // the antenna's left col (it is 2 wide)
    const V = {top: 12 + OY, bot: 15 + OY, l: 12 + OX, r: 29 + OX};   // the visor band on the panel
    const EYE_C = [14 + OX, 26 + OX];                              // each slit's left col, 2 wide
    const WAIST = 24 + OY, PIVOT = [24 + OY, 20 + OX];            // the turn's pivot: the waist's middle
    const ELBOW = [21 + OY, 34.5 + OX], FORE_R = 1.4, FIST_R = 1.9;   // the arm stub's end; the forearm and fist
    const DEG = Math.PI / 180;

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    // Distance from (y, x) to the segment p q.
    const seg = (y, x, p, q) => {
      const vy = q[0] - p[0], vx = q[1] - p[1], L2 = vy * vy + vx * vx;
      const t = L2 ? Math.max(0, Math.min(1, ((y - p[0]) * vy + (x - p[1]) * vx) / L2)) : 0;
      return Math.hypot(y - p[0] - t * vy, x - p[1] - t * vx);
    };

    // The creature: the family's 2x pose moved OX across and OY down, the antenna left off (drawn by antenna()).
    function creature() {
      const src = upscale(echoPing(false), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (src[r][c] && r + OY >= HEAD) put(g, r + OY, c + OX, src[r][c]);
      return g;
    }
    // The antenna as a curve from the head's top, 6 rows tall, its heading turning steadily along its length to lean
    // degrees at the tip (negative leans left); the tip's last third in ping when it pings.
    function antenna(g, lean, ping) {
      let y = HEAD - 0.01, x = ANT_C + 0.5;
      for (let s = 0; s <= 60; s++) {
        const t = s / 60, a = lean * DEG * t, ink = ping && t > 0.67 ? PING : BODY;
        put(g, Math.floor(y), Math.floor(x - 0.5), ink); put(g, Math.floor(y), Math.floor(x + 0.5), ink);
        y -= 0.1 * Math.cos(a); x += 0.1 * Math.sin(a);
      }
      return g;
    }
    // Faces: the band plain, then the slits slid dx on the rows given, or happy arches.
    const band = g => { for (let r = V.top; r <= V.bot; r++) for (let c = V.l; c <= V.r; c++) g[r][c] = VISOR; return g; };
    const eyes = (g, rows, dx = 0) => { band(g); for (const r of rows) for (const c0 of EYE_C) { g[V.top + r][c0 + dx] = EYE; g[V.top + r][c0 + dx + 1] = EYE; } return g; };
    const ARCH = ['.kk.', 'k..k'];
    const arches = g => { band(g); for (const c0 of EYE_C) ARCH.forEach((l, dr) => [...l].forEach((ch, dc) => { if (ch === 'k') g[V.top + 1 + dr][c0 - 1 + dc] = EYE; })); return g; };
    // The tilt, pixel art style: every column above the waist slides up or down by its distance from the pivot's
    // col times the slope, so the visor band and the head's top become stepped lines rising toward the side the head
    // leans away from; positive deg drops the right side, the head tilting right. A column that rises leaves its
    // waist row repeated under it, so the body never tears; the hips and legs stay.
    const lift = (c, deg) => Math.round((c + 0.5 - PIVOT[1]) * Math.tan(deg * DEG));
    function tilt(g, deg) {
      if (!deg) return g;
      const out = blank();
      for (let r = WAIST; r < N; r++) out[r] = g[r].slice();
      for (let c = 0; c < N; c++) {
        const s = lift(c, deg);
        for (let r = 0; r < WAIST; r++) if (g[r][c] && r + s < WAIST) put(out, r + s, c, g[r][c]);
        for (let r = WAIST + s; r < WAIST; r++) if (r >= 0 && g[WAIST - 1][c]) out[r][c] = g[WAIST - 1][c];
      }
      return out;
    }
    // Where a point above the waist lands after the tilt.
    const turned = ([y, x], deg) => [y + lift(Math.floor(x), deg), x];    // The reach: the stub's hand cells come off and a forearm runs from the (turned) elbow to the fist, a one cell
    // crease in the feet teal where it lies over the body.
    function reach(g, fist, deg) {
      const el = turned(ELBOW, deg), under = g.map(r => r.slice());
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const y = r + 0.5, x = c + 0.5;
        const d = Math.min(seg(y, x, el, fist) - FORE_R, Math.hypot(y - fist[0], x - fist[1]) - FIST_R);
        if (d <= 0) g[r][c] = BODY;
        else if (d <= 1 && under[r][c] === BODY && c < el[1]) g[r][c] = FEET;
      }
      return g;
    }
    // The spark at (y, x) its core's top left: twinkle 0 a plus of glints, 1 a cross.
    function spark(g, [y, x], twinkle) {
      for (const [dr, dc] of [[0, 0], [0, 1], [1, 0], [1, 1]]) put(g, y + dr, x + dc, SPARK);
      const glints = twinkle ? [[-1, -1], [-1, 2], [2, -1], [2, 2]] : [[-1, 0], [-1, 1], [2, 0], [2, 1], [0, -1], [1, -1], [0, 2], [1, 2]];
      for (const [dr, dc] of glints) if (inside(y + dr, x + dc) && !g[y + dr][x + dc]) put(g, y + dr, x + dc, GOLD);
      return g;
    }
    // The pop: eight rays at radius rad round (y, x), gold short rays at first, then cream specks.
    function pop(g, [y, x], rad, specks) {
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4, ry = y + 1 + rad * Math.sin(a), rx = x + 1 + rad * Math.cos(a);
        const ink = specks ? SPARK : GOLD;
        put(g, Math.floor(ry), Math.floor(rx), ink);
        if (!specks) put(g, Math.floor(y + 1 + (rad - 1) * Math.sin(a)), Math.floor(x + 1 + (rad - 1) * Math.cos(a)), ink);
      }
      return g;
    }

    // A scene. o: at (the spark's top left), tw (twinkle), eyes (rows), dx, happy, lean (antenna degrees), tilt
    // (degrees), fist (reach), burst [rad, specks], ping.
    function scene(o) {
      let c = creature();
      antenna(c, o.lean || 0, !!o.ping);
      if (o.happy) arches(c); else eyes(c, o.eyes || [0, 1, 2, 3], o.dx || 0);
      c = tilt(c, o.tilt || 0);
      if (o.fist) reach(c, o.fist, o.tilt || 0);
      if (o.at) spark(c, o.at, o.tw || 0);
      if (o.burst) pop(c, POP_AT, ...o.burst);
      return c;
    }

    const POP_AT = [13, 34];
    const UP = [0, 1, 2], ALL = [0, 1, 2, 3];
    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    // 1. Rest, the loop anchor, the air empty, a blink.
    F(700); F(90, {eyes: [3]});
    // 2. The spark drifts in from the left and up over the head; the eyes, the tilt and the antenna follow it.
    F(240, {at: [10, 0], dx: -2, tw: 0});
    F(240, {at: [8, 2], dx: -2, tilt: -3, lean: -15, tw: 1});
    F(240, {at: [6, 5], dx: -2, eyes: UP, tilt: -5, lean: -30, tw: 0});
    F(240, {at: [4, 8], dx: -2, eyes: UP, tilt: -6, lean: -40, tw: 1});
    F(240, {at: [3, 12], dx: -2, eyes: UP, tilt: -5, lean: -45, tw: 0});
    F(240, {at: [2, 16], dx: -1, eyes: UP, tilt: -3, lean: -40, tw: 1});
    F(240, {at: [2, 20], dx: 0, eyes: UP, tilt: -1, lean: -25, tw: 0});
    F(240, {at: [1, 24], dx: 1, eyes: UP, tilt: 0, lean: -5, tw: 1});
    F(240, {at: [2, 28], dx: 2, eyes: UP, tilt: 2, lean: 20, tw: 0});
    // 3. Down the right side to hover beside the shoulder; the head turns after it.
    F(240, {at: [4, 32], dx: 2, eyes: UP, tilt: 4, lean: 40, tw: 1});
    F(240, {at: [7, 34], dx: 2, eyes: UP, tilt: 6, lean: 55, tw: 0});
    F(260, {at: [10, 35], dx: 2, tilt: 6, lean: 60, tw: 1});
    F(260, {at: [12, 34], dx: 2, tilt: 6, lean: 60, tw: 0});
    F(260, {at: [13, 34], dx: 2, tilt: 6, lean: 60, tw: 1});
    // 4. The reach: the forearm comes out and the fist closes on it.
    F(220, {at: [12, 34], dx: 2, tilt: 6, lean: 55, fist: [17.5, 33.5], tw: 0});
    F(200, {at: [13, 34], dx: 2, tilt: 6, lean: 55, fist: [15.5, 34.5], tw: 1});
    // 5. The pop: rays open and scatter, happy arches, a ping, upright again.
    F(150, {happy: true, tilt: 6, lean: 30, fist: [15, 35], burst: [2.5, false], ping: true});
    F(180, {happy: true, tilt: 4, lean: 15, burst: [4, false], ping: true});
    F(200, {happy: true, tilt: 2, lean: 5, burst: [5.5, true]});
    F(500, {happy: true});
    F(600);
    F(90, {eyes: [3]});
    F(600);

    const frames = specs.map(({hold, o}) => ({hold, grid: scene(o)}));
    return {
      name: 'ECHO · curious', key: 'echo_curious', fwname: 'echo curious', category: 'Idle', size: N,
      // Big tier: 25 frames of 1600 bytes (40000 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, a mood for the idle rotation on the 40 cell lattice (12 px cells, the creature at 2x): a small twinkling spark, a cream core with gold glints, drifts in from the left, arcs up over the head and down to hover beside the right shoulder, and the creature follows it with everything it has, the eyes sliding along the band and riding high while it is overhead, the head and body tilting toward it up to 6 degrees from the waist, the antenna curving after it left and then right; a forearm comes out of the right arm stub, the fist closes on it and it pops into eight gold rays that scatter into specks while the eyes go to happy arches, the antenna pings and the head comes upright; judge whether the tilt reads as a head tilt rather than a lean or a glitch, whether the eyes and antenna read as tracking, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes, 3 visor, 4 ping (the antenna tip), 5 feet (also the forearm's crease), 6 spark
      // cream (the core, the specks), 7 gold (the glints and the rays)
      palette: [...ECHO_PALETTE.slice(0, 6), '#fff7d1', '#ffc93c'],
      frames,
    };
  })();

  L.register([echoCurious]);
})(typeof window !== 'undefined' ? window : globalThis);
