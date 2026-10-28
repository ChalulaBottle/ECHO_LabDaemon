// The lab: the ECHO creature and a chat ping (culture batch three, entry 27, operator 2026-10-28: "be creative and
// keep the style and theming and branding we have already developed"). Drawn from scratch in code on the ECHO base.
// The bubble is a generic cream chat bubble holding dots: no app's mark, no app's colours, no words in the picture,
// and no sound implied (the panel has none); the only signal is the antenna's light.
//
// ECHO · chat ping: a message is coming, then another, then a third; the creature is thrilled at the first and wilts
// by the third. 40 cell lattice, 12 px cells on the 480 panel, built from the family's 20 cell pose repeated exactly
// twice across and down (upscale(echoPing(ping), 2)), moved 6 cols left and 6 rows down so the bubble has the top
// right corner; the antenna is the one part redrawn.
//   bubble    a cream bubble 12 across and 9 tall, a col clear of the panel's edge, round cornered, its tail pointing down at the antenna. It pops in
//             as a small round blob, then opens full size with four short ping ticks flashing round it.
//   dots      dark 2 x 2 dots, one, two, three: each arrives with a flash of the ticks and a ping of the antenna.
//   perk      at the first dot it stretches two rows taller, the antenna stands straight and pings, the eyes look up and
//             right at the bubble.
//   wait      at the second it is still up and looking, a little bounce.
//   slump     at the third it sags two rows, the antenna flops over to the left, the lids half drop and the eyes look
//             down, and a small grey sigh puff drifts off its left side.
//   reset     the bubble shrinks to the blob and goes, the creature comes back up to the rest with a blink; the loop
//             opens on the rest, the corner empty.
// Loop: 27 frames, 6.9 s, every hold 90 to 400 ms. Rest and slump hold longest; the pops are quick.
// Palette: 0..5 the ECHO palette unchanged (2 is also the dots; 4 also the ping ticks); 6 cream (the bubble), 7 sigh
// grey (the puff). Index 6 is not ping here, so no frame goes through echoGlitch. Big tier: 27 frames of 1600 cells
// are 43200 bytes of firmware table, so it ships only on boards built with SPLASH_BIG. One closure, so echochatPing
// is the only name it adds; registered at the end of this file.
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  if (typeof require !== 'undefined' && !root.BENCH_LIB) require('./anims.js');
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  const echochatPing = (() => {
    const N = 40, K = 2;                                           // lattice; the 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, CREAM = 6, SIGH = 7;
    // Constants the cell is judged on.
    const OX = -6, OY = 6;                                         // the family's 2x frame, 6 cols left and 6 down
    const HEAD = 8 + OY;                                           // the head's top row; the antenna stands on it
    const ANT_C = 30 + OX;                                         // the antenna's left col (it is 2 wide)
    const V = {top: 12 + OY, bot: 15 + OY, l: 12 + OX, r: 29 + OX};   // the visor band on the panel
    const EYE_C = [14 + OX, 26 + OX];                              // each slit's left col, 2 wide
    const WAIST = 24 + OY;                                         // rows above it stretch up or sag down; legs stay
    const BUB = {top: 1, left: 28};                                // the bubble's top left
    const DOT_C = [29, 32, 35], DOT_R = 5;                         // each dot's left col and top row, 2 x 2

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    const INK = {w: CREAM, k: EYE, g: SIGH, p: PING};
    const stamp = (g, art, r0, c0) => { art.forEach((line, dr) => [...line].forEach((ch, dc) => { if (ch !== '.') put(g, r0 + dr, c0 + dc, INK[ch]); })); return g; };

    // The creature: the family's 2x pose moved OX across and OY down, the antenna left off (drawn by antenna()).
    function creature() {
      const src = upscale(echoPing(false), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (src[r][c] && r + OY >= HEAD) put(g, r + OY, c + OX, src[r][c]);
      return g;
    }
    // The antenna as a curve from the head's top: 6 rows tall upright, the tip's last third in ping when it pings.
    // flop 1 wilts it over to the left like a stem: its heading turns steadily along its length until the tip
    // points down and out; a negative flop leans it right.
    function antenna(g, flop, ping) {
      let y = HEAD - 0.01, x = ANT_C + 0.5;
      for (let s = 0; s <= 60; s++) {
        const t = s / 60, a = flop * 2.3 * t;
        const ink = ping && t > 0.67 ? PING : BODY;
        put(g, Math.floor(y), Math.floor(x - 0.5), ink); put(g, Math.floor(y), Math.floor(x + 0.5), ink);
        y -= 0.1 * Math.cos(a); x -= 0.1 * Math.sin(a);
      }
      return g;
    }
    // Faces: the band plain, then each slit 2 wide on the rows given, slid dx.
    const face = (g, rows, dx = 0) => {
      for (let r = V.top; r <= V.bot; r++) for (let c = V.l; c <= V.r; c++) g[r][c] = VISOR;
      for (const r of rows) for (const c0 of EYE_C) { g[V.top + r][c0 + dx] = EYE; g[V.top + r][c0 + dx + 1] = EYE; }
      return g;
    };
    // Stretch (dy below 0) or sag (dy above 0): everything above the waist moves dy rows, the legs stay put; a
    // stretch fills the gap with copies of the waist row.
    function posture(g, dy) {
      if (!dy) return g;
      const out = blank();
      for (let r = WAIST; r < N; r++) out[r] = g[r].slice();
      for (let r = 0; r < WAIST; r++) for (let c = 0; c < N; c++) if (g[r][c] && r + dy < WAIST) put(out, r + dy, c, g[r][c]);
      for (let r = WAIST + dy; r < WAIST; r++) if (r >= 0) out[r] = g[WAIST].slice();
      return out;
    }

    // The bubble: 'blob' a small round one by the corner, 'full' the bubble with its tail; dots 0..3; ticks the four
    // ping ticks round it.
    const BUBBLE = [
      '..wwwwwwww..', '.wwwwwwwwww.', 'wwwwwwwwwwww', 'wwwwwwwwwwww', 'wwwwwwwwwwww', 'wwwwwwwwwwww',
      'wwwwwwwwwwww', '.wwwwwwwwww.', '..wwwwwwww..', '..www.......', '.ww.........', 'w...........'];
    const BLOB = ['.ww.', 'wwww', 'wwww', '.ww.'];
    const TICKS = [[[0, 25], [1, 25]], [[0, 39], [1, 39]], [[10, 39], [11, 39]], [[11, 31], [12, 32]]];
    function bubble(g, kind, dots, ticks) {
      if (kind === 'blob') { stamp(g, BLOB, BUB.top + 3, BUB.left + 4); return g; }
      stamp(g, BUBBLE, BUB.top, BUB.left - 1);
      for (let k = 0; k < dots; k++) for (const [dr, dc] of [[0, 0], [0, 1], [1, 0], [1, 1]]) put(g, DOT_R + dr, DOT_C[k] + dc, EYE);
      if (ticks) for (const t of TICKS) for (const [r, c] of t) put(g, r, c, PING);
      return g;
    }
    // The sigh: a small grey puff off the left of the head, k 0..2 as it drifts out and thins.
    const PUFFS = [['.gg.', 'gggg', '.gg.'], ['.gg..', 'g..g.', '.gg.g'], ['..g..', 'g...g', '.....']];
    const sigh = (g, k) => stamp(g, PUFFS[k], HEAD + 2 + 2 - k, 1 + k);

    // A scene. o: dy (posture), flop, ping, eyes (rows), dx (the eyes' slide), bubble ('blob' or 'full'), dots,
    // ticks, sigh (0..2).
    function scene(o) {
      let c = creature();
      antenna(c, o.flop || 0, !!o.ping);
      face(c, o.eyes || [0, 1, 2, 3], o.dx || 0);
      c = posture(c, o.dy || 0);
      if (o.bubble) bubble(c, o.bubble, o.dots || 0, !!o.ticks);
      if (o.sigh !== undefined) sigh(c, o.sigh);
      return c;
    }

    const UP = [0, 1, 2], LOW = [2, 3], BLINK = [3];
    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    // 1. Rest, the loop anchor, a blink.
    F(400); F(400); F(90, {eyes: BLINK}); F(400);
    // 2. The first dot: the blob pops, the bubble opens with the ticks and a dot; it perks up, pings, looks up right.
    F(120, {bubble: 'blob', dx: 1});
    F(140, {bubble: 'full', dots: 1, ticks: true, dy: -2, ping: true, eyes: UP, dx: 2});
    F(260, {bubble: 'full', dots: 1, dy: -2, ping: true, eyes: UP, dx: 2});
    F(380, {bubble: 'full', dots: 1, dy: -2, eyes: UP, dx: 2});
    // 3. The second dot: still up and looking, a little bounce.
    F(140, {bubble: 'full', dots: 2, ticks: true, dy: -1, ping: true, eyes: UP, dx: 2});
    F(160, {bubble: 'full', dots: 2, dy: -2, ping: true, eyes: UP, dx: 2});
    F(380, {bubble: 'full', dots: 2, dy: -2, eyes: UP, dx: 2});
    F(160, {bubble: 'full', dots: 2, dy: -2, eyes: UP, dx: 1});
    // 4. The third dot: it sags, the antenna flops, the lids drop, a sigh drifts off.
    F(140, {bubble: 'full', dots: 3, ticks: true, dy: -1, ping: true, eyes: UP, dx: 2});
    F(200, {bubble: 'full', dots: 3, dy: 1, flop: 0.35, eyes: [1, 2, 3], dx: 1});
    F(220, {bubble: 'full', dots: 3, dy: 2, flop: 0.75, eyes: LOW, dx: 0, sigh: 0});
    F(400, {bubble: 'full', dots: 3, dy: 2, flop: 1, eyes: LOW, dx: -1, sigh: 1});
    F(400, {bubble: 'full', dots: 3, dy: 2, flop: 1, eyes: LOW, dx: -1, sigh: 2});
    F(350, {bubble: 'full', dots: 3, dy: 2, flop: 1, eyes: LOW, dx: -1}); F(350, {bubble: 'full', dots: 3, dy: 2, flop: 1, eyes: LOW, dx: -1});
    F(120, {bubble: 'full', dots: 3, dy: 2, flop: 1, eyes: BLINK, dx: -1});
    F(400, {bubble: 'full', dots: 3, dy: 2, flop: 1, eyes: LOW, dx: -1});
    // 5. Reset: the bubble shrinks and goes, it comes back up, a blink, the rest.
    F(140, {bubble: 'blob', dy: 2, flop: 0.9, eyes: LOW, dx: 0});
    F(220, {dy: 1, flop: 0.55, eyes: [1, 2, 3]});
    F(220, {dy: 0, flop: 0.2});
    F(180, {flop: -0.1});
    F(90, {eyes: BLINK});
    F(400);

    const frames = specs.map(({hold, o}) => ({hold, grid: scene(o)}));
    return {
      name: 'ECHO · chat ping', key: 'echo_chat_ping', fwname: 'echo chat ping', category: 'Active', size: N,
      // Big tier: 27 frames of 1600 bytes (43200 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, 40 cell lattice (12 px cells, the creature at 2x), a generic cream chat bubble in the top right corner with dark dots, no app mark and no words: the creature rests and blinks, the bubble pops in with one dot and four flashing ping ticks and the creature perks up two rows taller with its antenna pinging and its eyes looking up at it, a second dot arrives and it bounces, still keen, then a third arrives and it sags two rows, the antenna flops over, the lids half drop, the eyes look down and a grey sigh puff drifts off its side, then the bubble shrinks away and it comes back up to rest; judge whether the perk and the slump read at a glance, whether the flopped antenna reads as a droop rather than a broken part, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes (also the dots), 3 visor, 4 ping (the antenna tip, the ticks), 5 feet, 6 cream
      // (the bubble), 7 sigh grey (the puff)
      palette: [...ECHO_PALETTE.slice(0, 6), '#fff1d6', '#7d8f97'],
      frames,
    };
  })();

  L.register([echochatPing]);
})(typeof window !== 'undefined' ? window : globalThis);
