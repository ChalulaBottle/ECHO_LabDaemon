// Lab creatures, culture batch three (operator, 2026-10-28: "produce me another 25 animations", "be creative and keep
// the style and theming and branding we have already developed"). Hacker life: drawn from scratch in code on the ECHO
// base, no words in the picture; the terminal's lines are blocks and dashes of glow, never readable text.
//
// ECHO · terminal glow: a dark room at night, the creature at its desk beside a terminal, its face and its right side lit
// by the screen. 40 cell lattice, 12 px cells on the 480 panel: the body is the family's 20 cell pose repeated exactly
// twice across and down, moved 6 cells left so the desk and the terminal fit at its right.
//   room      black, but the screen throws a dithered teal halo on the wall round the monitor and on the floor under
//             the desk; the halo's reach breathes with the typing. The room takes only empty cells off a one cell rim
//             round the creature and the furniture, so a dark outline always holds the silhouette.
//   terminal  a steel monitor on a steel desk, a dark teal screen, a keyboard slab under the creature's right hand.
//             Six lines on the screen, one every other row: a typed command is a ping prompt cell and phosphor blocks,
//             its output is dashes of visor teal; the bottom line is the live one, with a two row phosphor cursor.
//   glow      every body cell inside a radius of the screen's lower half takes the lit teal, and the visor cells in it
//             take the ping colour, so the light reads as coming up and in from the screen; a keystroke widens the
//             radius two cells and the halo with it, so the glow pulses with the typing.
//   idle      the cursor blinks, the creature watches the screen with its slits slid right, a blink.
//   type      the right hand dips onto the keyboard on every other frame and a block lands on the live line each frame.
//   enter     the line commits, the screen scrolls up two rows a line, the output lines arrive fast and the antenna
//             pings once; then a second, shorter command, its output, and the cursor blinks again.
// Loop: 26 frames, 5.6 s. The screen holds a ring of seven lines (two commands and five output lines) and the loop
// commits exactly seven, so the last frame shows the same lines as the first and runs into it without a seam.
// Palette: 0..5 the ECHO palette unchanged (4 is also the prompt cell and the lit visor, 3 also the output dashes);
// 6 phosphor (typed blocks, the cursor), 7 lit teal (the body in the screen's light), 8 steel (monitor, desk,
// keyboard), 9 screen teal (the screen's face and the halo). Index 6 is not ping here, so nothing goes through
// echoGlitch. Big tier: 26 frames of 1600 cells are 41600 bytes of firmware table, so it ships only on boards built
// with SPLASH_BIG. One closure, so echoTerminalGlow is the only name it adds; registered at the end of this file.
(function (root) {
  if (typeof require !== 'undefined' && !root.BENCH_LIB) require('./anims.js');
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  const echoTerminalGlow = (() => {
    const N = 40, K = 2;                                           // lattice; a 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, PHOS = 6, LIT = 7, STEEL = 8, SCREEN = 9;
    // Constants the cell is judged on.
    const DX = -6;                                                 // the family's 2x frame, 6 cells left
    const V = {top: 12, bot: 15, l: 12 + DX, r: 29 + DX};          // the visor band on the panel
    const EYE_C = [14 + DX, 26 + DX];                              // each slit's left col, 2 wide
    const HAND = {r: [20, 21], c: [34 + DX, 35 + DX]};             // the family's right hand on the panel
    const MON = {t: 9, b: 23, l: 31, r: 39}, SCR = {t: 10, b: 22, l: 32, r: 38};
    const ROWS = [11, 13, 15, 17, 19, 21];                         // the screen's six lines; the last is the live one
    const DESK = 24, KEYS = [26, 29];                              // the desk top row; the keyboard's cols on row 23
    const LIGHT = [20, 34];                                        // where the light comes from: the screen's lower half
    const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const copy = g => g.map(row => row.slice());
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    const rect = (g, r0, c0, r1, c1, v) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) put(g, r, c, v); return g; };

    // The creature: the family pose at 2x moved DX across.
    function creature(ping) {
      const src = upscale(echoPing(ping), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (src[r][c]) put(g, r, c + DX, src[r][c]);
      return g;
    }
    // Faces: the family's slits slid sx (toward the screen is right); a blink keeps the bottom half of each slit.
    const band = g => rect(g, V.top, V.l, V.bot, V.r, VISOR);
    const slits = (sx = 0) => g => { band(g); for (const c of EYE_C) rect(g, V.top, c + sx, V.bot, c + sx + 1, EYE); return g; };
    const blinked = (sx = 0) => g => { band(g); for (const c of EYE_C) rect(g, V.bot - 1, c + sx, V.bot, c + sx + 1, EYE); return g; };

    // The furniture: monitor, screen, desk and its legs, the keyboard slab.
    function furniture(g) {
      rect(g, MON.t, MON.l, MON.b, MON.r, STEEL);
      rect(g, SCR.t, SCR.l, SCR.b, SCR.r, SCREEN);
      rect(g, DESK, KEYS[0], DESK, N - 1, STEEL);
      rect(g, DESK + 1, KEYS[0] + 1, 33, KEYS[0] + 1, STEEL);
      rect(g, DESK + 1, 37, 33, 37, STEEL);
      rect(g, 23, KEYS[0], 23, KEYS[1], STEEL);
      return g;
    }

    // The screen's ring of lines, 7 cells each across cols 32..38: p a ping prompt, t a typed block, o an output dash.
    const LINES = ['p.ttt.t', 'ooo.oo.', 'oo.oooo', 'oooo...', 'p.tt.tt', 'o.ooo..', 'ooooo.o'];
    const P = LINES.length;
    const INK = {p: PING, t: PHOS, o: VISOR};
    const lineAt = i => LINES[((i % P) + P) % P];
    // A line on screen row r: whole, or (for the live command) the prompt and its first n typed blocks; the col after
    // the last block drawn is where the cursor sits.
    function line(g, r, text, n = Infinity) {
      let typed = 0, next = SCR.l + 2;
      [...text].forEach((ch, k) => {
        if (ch === '.') return;
        if (ch === 't' && ++typed > n) return;
        put(g, r, SCR.l + k, INK[ch]);
        next = SCR.l + k + 2;
      });
      return Math.min(next, SCR.r);
    }
    // The screen for c lines committed and t blocks typed on the live line; cur shows the cursor.
    function screen(g, c, t, cur) {
      for (let k = 0; k < 5; k++) line(g, ROWS[k], lineAt(c - 5 + k));
      const live = lineAt(c);
      if (live[0] === 'p') {
        const x = line(g, ROWS[5], live, t);
        if (cur) { put(g, ROWS[5] - 1, x, PHOS); put(g, ROWS[5], x, PHOS); }
      }
      return g;
    }

    // The light: body cells inside radius R of the screen's lower half take the lit teal, visor cells the ping colour.
    function light(g, R) {
      for (let r = 0; r < N; r++) for (let c = 0; c <= MON.l - 2; c++) {
        const d = Math.hypot(r - LIGHT[0], c - LIGHT[1]);
        if (d > R) continue;
        const t = (BAYER[r % 4][c % 4] + 0.5) / 16;              // the last three cells of the radius dither out
        if (g[r][c] === BODY && (d <= R - 3 || t < (R - d) / 3)) g[r][c] = LIT;
        else if (g[r][c] === VISOR && d <= R - 4) g[r][c] = PING;
      }
      return g;
    }
    // The halo: a dithered wash round the screen whose density falls off with distance; reach H.
    function halo(H) {
      const bg = blank(), cy = (SCR.t + SCR.b) / 2, cx = (SCR.l + SCR.r) / 2;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const d = Math.hypot(r - cy, (c - cx) * 0.8);
        const t = (BAYER[r % 4][c % 4] + 0.5) / 16;
        if (t < 0.8 * (1 - d / H)) bg[r][c] = SCREEN;
      }
      return bg;
    }
    // The creature and furniture over the halo, which takes a cell only where nothing stands and nothing stands beside it.
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

    // A scene. o: c lines committed, t blocks typed on the live line, cur the cursor, tap the hand down on the keys,
    // lvl the glow 0..2, face, ping.
    function scene(o) {
      const g = blank();
      furniture(g);
      screen(g, o.c, o.t || 0, !!o.cur);
      const cr = creature(!!o.ping);
      (o.face || slits(1))(cr);
      if (o.tap) { rect(cr, HAND.r[0], HAND.c[0], HAND.r[1], HAND.c[1], 0); rect(cr, HAND.r[0] + 1, HAND.c[0], HAND.r[1] + 1, HAND.c[1], BODY); }
      light(cr, 12 + 2 * (o.lvl || 0));
      for (let r = 0; r < N; r++) for (let k = 0; k < N; k++) if (cr[r][k]) g[r][k] = cr[r][k];
      return compose(g, halo(12 + 3 * (o.lvl || 0)));
    }

    // The frames.
    const specs = [];
    const F = (hold, o) => specs.push({hold, o});
    // 1. Idle, the loop anchor: the cursor blinks on the live command line, the creature watches, a blink.
    F(400, {c: 0, cur: 1});
    F(400, {c: 0, cur: 0});
    F(90,  {c: 0, cur: 1, face: blinked(1)});
    F(380, {c: 0, cur: 1});
    // 2. The first command, a block a frame, the hand on the keys every other frame; the glow pulses with each key.
    F(130, {c: 0, t: 1, cur: 1, tap: 1, lvl: 2});
    F(120, {c: 0, t: 2, cur: 1, lvl: 1});
    F(130, {c: 0, t: 3, cur: 1, tap: 1, lvl: 2});
    F(120, {c: 0, t: 4, cur: 1, lvl: 1});
    // 3. Enter: the line commits, the output scrolls in fast, an antenna ping.
    F(160, {c: 1, tap: 1, lvl: 2, ping: true});
    F(100, {c: 2, lvl: 2, ping: true});
    F(100, {c: 3, lvl: 2});
    F(130, {c: 4, cur: 1, lvl: 1});
    // 4. It reads the output: a glance at the room, back to the screen, the cursor blinking.
    F(400, {c: 4, cur: 0, lvl: 0});
    F(380, {c: 4, cur: 1, lvl: 0, face: slits(0)});
    F(90,  {c: 4, cur: 1, lvl: 0, face: blinked(0)});
    F(380, {c: 4, cur: 0, lvl: 0});
    // 5. The second command, then its output and a ping.
    F(130, {c: 4, t: 1, cur: 1, tap: 1, lvl: 2});
    F(120, {c: 4, t: 2, cur: 1, lvl: 1});
    F(130, {c: 4, t: 3, cur: 1, tap: 1, lvl: 2});
    F(120, {c: 4, t: 4, cur: 1, lvl: 1});
    F(160, {c: 5, tap: 1, lvl: 2});
    F(100, {c: 6, lvl: 2, ping: true});
    F(130, {c: 7, cur: 1, lvl: 1});
    // 6. The glow settles back; seven lines committed, so the screen is the first frame's again.
    F(400, {c: 7, cur: 0, lvl: 0});
    F(400, {c: 7, cur: 1, lvl: 0});
    F(400, {c: 7, cur: 0, lvl: 0});

    const frames = specs.map(({hold, o}) => ({hold, grid: scene(o)}));
    return {
      name: 'ECHO · terminal glow', key: 'echo_terminal_glow', fwname: 'echo terminal glow', category: 'Thinking', size: N,
      // Big tier: 26 frames of 1600 bytes (41600 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, hacker life at night, 40 cell lattice (12 px cells, the creature at 2x moved left beside a steel desk and a terminal) in a dark room lit only by the screen: its right side and the right of its visor take the screen\'s light, a dithered teal halo falls on the wall and the floor, and the cursor blinks on the live line; the hand dips onto the keyboard and blocks land on the line one a frame, the glow and the halo widening with every key, enter scrolls the screen up and the output dashes arrive fast with an antenna ping, it glances out at the room and back, types a second command and its output scrolls in, and the glow settles back to the first frame; judge whether the light reads as coming from the screen, whether the typing reads as typing at 12 px cells, whether the lines read as glow and never as text, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes, 3 visor (also the output dashes), 4 ping (the antenna tip, the prompt cell, the
      // lit visor), 5 feet, 6 phosphor (typed blocks, the cursor), 7 lit teal (the body in the screen's light), 8 steel
      // (monitor, desk, keyboard), 9 screen teal (the screen's face and the halo)
      palette: [...ECHO_PALETTE.slice(0, 6), '#d2ffe6', '#2fc49e', '#3a4650', '#0f3a33'],
      frames,
    };
  })();

  L.register([echoTerminalGlow]);
})(typeof window !== 'undefined' ? window : globalThis);
