// Moods for the idle rotation: the ECHO creature, sleepy (culture batch three, entry 29, operator 2026-10-28: "be
// creative and keep the style and theming and branding we have already developed"). Drawn from scratch in code on the
// ECHO base; a face study like mona lisa, where small changes to the visor carry the whole cell. No letters in the
// picture: no row of z's, the doze shows as a sleep bubble.
//
// ECHO · sleepy: a yawn, the lids coming down in three steps, a nod with a sleep bubble swelling, a jolt awake. 40
// cell lattice, 12 px cells on the 480 panel, built from the family's 20 cell pose repeated exactly twice across and
// down (upscale(echoPing(ping), 2)), centred and moved 4 rows down so the nod has room; the antenna is the one part
// redrawn.
//   yawn      the visor band stretches tall, a row up and two down, the eyes squeeze to short dark lines and a dark
//             round mouth opens in the band's lower middle; the body rises a row with it, then all of it closes back.
//   droop     the lids come down in three steps, each held long: the slits four rows, three, two, then a shut line
//             4 cells long along the band's bottom.
//   nod       the head sinks a row and then two (the legs stay put), the antenna tips forward to the left as if heavy,
//             and a pale sleep bubble swells at the side of the head in three sizes.
//   jolt      the bubble pops into four specks, the creature jerks a row taller than at rest with its eyes wide (three
//             cols each), the antenna straight and pinging, then it settles, blinks twice and is back at rest.
// Loop: 19 frames, 8.5 s, mostly still: the rest and the droop and nod stills hold 500 to 900 ms, the yawn's top two frames of 400, the jolt is
// quick. It opens and ends on the plain rest.
// Palette: 0..5 the ECHO palette unchanged (2 is also the yawn's mouth); 6 sleep pale (the bubble and its specks).
// Index 6 is not ping here, so no frame goes through echoGlitch. Big tier: 19 frames of 1600 cells are 30400 bytes of
// firmware table, so it ships only on boards built with SPLASH_BIG. One closure, so echoSleepy is the only name it
// adds; registered at the end of this file.
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  if (typeof require !== 'undefined' && !root.BENCH_LIB) require('./anims.js');
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  const echoSleepy = (() => {
    const N = 40, K = 2;                                           // lattice; the 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, PALE = 6;
    // Constants the cell is judged on.
    const OX = 0, OY = 4;                                          // the family's 2x frame, centred, 4 rows down
    const HEAD = 8 + OY;                                           // the head's top row; the antenna stands on it
    const ANT_C = 30 + OX;                                         // the antenna's left col (it is 2 wide)
    const V = {top: 12 + OY, bot: 15 + OY, l: 12 + OX, r: 29 + OX};   // the visor band on the panel
    const EYE_C = [14 + OX, 26 + OX];                              // each slit's left col, 2 wide
    const WAIST = 24 + OY;                                         // rows above it rise or sink; the legs stay
    const SLEEP = [HEAD + 2, 5];                                   // the sleep bubble's centre, left of the head

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };

    // The creature: the family's 2x pose moved OX across and OY down, the antenna left off (drawn by antenna()).
    function creature() {
      const src = upscale(echoPing(false), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (src[r][c] && r + OY >= HEAD) put(g, r + OY, c + OX, src[r][c]);
      return g;
    }
    // The antenna as a curve from the head's top, 6 rows tall upright, the tip's last third in ping when it pings; tip
    // 0..1 turns its heading steadily along its length to the left, a heavy head tipping forward.
    function antenna(g, tip, ping) {
      let y = HEAD - 0.01, x = ANT_C + 0.5;
      for (let s = 0; s <= 60; s++) {
        const t = s / 60, a = tip * 1.6 * t, ink = ping && t > 0.67 ? PING : BODY;
        put(g, Math.floor(y), Math.floor(x - 0.5), ink); put(g, Math.floor(y), Math.floor(x + 0.5), ink);
        y -= 0.1 * Math.cos(a); x -= 0.1 * Math.sin(a);
      }
      return g;
    }
    // Faces. band(g, up, down) paints the band grown up and down by that many rows; eyes on the rows given (0..3 from
    // the band's top), each w cols wide (2 the family's, 3 wide awake).
    function band(g, up = 0, down = 0) {
      for (let r = V.top - up; r <= V.bot + down; r++) for (let c = V.l; c <= V.r; c++) g[r][c] = VISOR;
      return g;
    }
    // A single row is a shut eye: a 4 cell line along the band's bottom, the lid all the way down.
    function eyes(g, rows, w = 2) {
      band(g);
      if (rows.length === 1) { for (const c0 of EYE_C) for (let k = -1; k < 3; k++) g[V.top + rows[0]][c0 + k] = EYE; return g; }
      for (const r of rows) for (const c0 of EYE_C) for (let k = 0; k < w; k++) g[V.top + r][c0 - (w > 2 ? 1 : 0) + k] = EYE;
      return g;
    }
    // The yawn, open 1..3: the band grows a row up and open rows down (two at most), the eyes squeeze to 4 cell lines
    // on its second row, and a dark mouth opens from its fourth row, a sliver, a small round one, the full yawn.
    const MOUTHS = {1: ['.kk.'], 2: ['kkkk', '.kk.'], 3: ['.kkkk.', 'kkkkkk', 'kkkkkk', '.kkkk.']};
    function yawn(g, open) {
      band(g, 1, Math.min(2, open));
      for (const c0 of EYE_C) for (let k = -1; k < 3; k++) g[V.top][c0 + k] = EYE;
      const m = MOUTHS[open], c0 = Math.round((V.l + V.r + 1) / 2 - m[0].length / 2);
      m.forEach((line, dr) => [...line].forEach((ch, dc) => { if (ch === 'k') put(g, V.top + 2 + dr, c0 + dc, EYE); }));
      return g;
    }
    // Rise (dy below 0) or sink (dy above 0): everything above the waist moves dy rows, the legs stay put; a rise
    // fills the gap with copies of the waist row.
    function posture(g, dy) {
      if (!dy) return g;
      const out = blank();
      for (let r = WAIST; r < N; r++) out[r] = g[r].slice();
      for (let r = 0; r < WAIST; r++) for (let c = 0; c < N; c++) if (g[r][c] && r + dy < WAIST) put(out, r + dy, c, g[r][c]);
      for (let r = WAIST + dy; r < WAIST; r++) if (r >= 0) out[r] = g[WAIST].slice();
      return out;
    }
    // The sleep bubble, size 1..3 a ring that grows (a filled dot at 1), 4 popped into four specks.
    function sleepBubble(g, size) {
      const [cy, cx] = SLEEP;
      if (size === 4) { for (const [dr, dc] of [[-3, -3], [-3, 3], [3, -3], [3, 3]]) put(g, cy + dr, cx + dc, PALE); return g; }
      const rad = [0, 1.1, 2.2, 3.3][size];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const d = Math.hypot(r + 0.5 - cy, c + 0.5 - cx);
        if (d <= rad && (size === 1 || d > rad - 1.05)) put(g, r, c, PALE);
      }
      return g;
    }

    // A scene. o: eyes (rows), wide (eyes 3 cols), yawn (0..3), dy, tip, ping, bubble (1..4).
    function scene(o) {
      let c = creature();
      antenna(c, o.tip || 0, !!o.ping);
      if (o.yawn) yawn(c, o.yawn); else eyes(c, o.eyes || [0, 1, 2, 3], o.wide ? 3 : 2);
      c = posture(c, o.dy || 0);
      if (o.bubble) sleepBubble(c, o.bubble);
      return c;
    }

    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    // 1. Rest, the loop anchor, a blink.
    F(900); F(90, {eyes: [3]}); F(700);
    // 2. The yawn: the band stretches tall, the mouth opens, the body rises a row; then it all closes back.
    F(220, {yawn: 1, dy: -1}); F(400, {yawn: 3, dy: -1}); F(400, {yawn: 3, dy: -1}); F(220, {yawn: 2});
    // 3. The droop: the lids come down in three steps.
    F(700, {eyes: [1, 2, 3]}); F(700, {eyes: [2, 3]}); F(800, {eyes: [3]});
    // 4. The nod: the head sinks, the antenna tips, the sleep bubble swells.
    F(500, {eyes: [3], dy: 1, tip: 0.3, bubble: 1}); F(600, {eyes: [3], dy: 2, tip: 0.6, bubble: 2}); F(700, {eyes: [3], dy: 2, tip: 0.7, bubble: 3});
    // 5. The jolt: the bubble pops, it jerks up wide eyed with a ping, settles, two blinks, the rest.
    F(160, {wide: true, dy: -1, ping: true, bubble: 4}); F(300, {wide: true, dy: -1, ping: true});
    F(300, {wide: true}); F(90, {eyes: [3]}); F(120, {eyes: [2, 3]}); F(600);

    const frames = specs.map(({hold, o}) => ({hold, grid: scene(o)}));
    return {
      name: 'ECHO · sleepy', key: 'echo_sleepy', fwname: 'echo sleepy', category: 'Idle', size: N,
      // Big tier: 19 frames of 1600 bytes (30400 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, a mood for the idle rotation on the 40 cell lattice (12 px cells, the creature at 2x), mostly still with long holds: the creature rests and blinks, yawns with its visor stretching tall, its eyes squeezed to short lines and a dark round mouth opening in the band while it rises a row, then its lids come down in three slow steps to a closed line, its head sinks two rows with the antenna tipping forward and a pale sleep bubble swelling at the side of its head, until the bubble pops and it jolts a row taller with wide eyes and a pinging antenna, settles and blinks back to rest; judge whether the tall visor reads as a yawn, whether the three lid steps read as drowsy rather than as a glitch, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes (also the yawn's mouth), 3 visor, 4 ping (the antenna tip), 5 feet, 6 sleep pale
      // (the bubble and its specks)
      palette: [...ECHO_PALETTE.slice(0, 6), '#cfeef6'],
      frames,
    };
  })();

  L.register([echoSleepy]);
})(typeof window !== 'undefined' ? window : globalThis);
