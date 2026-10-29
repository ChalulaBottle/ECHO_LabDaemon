// ECHO · ssh HD: the 20 cell "echo ssh" redone on the 60 cell lattice (operator, 2026-10-28: "ECHO ssh needs to be
// redone as well, more definition and something better that demonstrates ssh into a machine"). The host plays it
// when an agent opens a remote session. Drawn from scratch in code on the ECHO base, no words in the picture.
//
// 60 cell lattice, 8 px cells on the 480 panel. The body is the family's 20 cell pose repeated exactly 3 times across
// and down (as in mushroom HD), moved 9 cells left and 1 down so a remote machine fits at its right.
//   desk      the creature stands behind a little desk: its own terminal (a grey monitor in front of its belly, a
//             prompt on a black screen), a keyboard, a thin desk top on two legs; its shins and feet show under it.
//   machine   the remote: a grey tower at the panel's right edge with a tiny screen (a padlock while locked, lines of
//             output once in), three LEDs, four drive bays, a port low on its left side.
//   wire      a cable drops from under the desk between the creature's legs and runs along the floor into the port;
//             dark when idle, solid visor teal while the session is up.
//   type      both forearms come out of the arm stubs (the elbows stay out) onto the keyboard, the fists alternate,
//             a key flashes cream; a prompt mark, dashes and a block cursor appear on its own screen.
//   key       a gold key leaves the desk down the cable and slides along the floor to the port; the eyes follow it.
//   handshake the port lights gold, the key turns (its bow seen edge on), the padlock on the remote screen opens in
//             teal and the wire goes solid from the port back to the desk.
//   session   packets stream both ways (gold out, cream back), the remote screen fills with scrolling lines, its LEDs
//             walk, the creature types a second line and its eyes follow the traffic.
//   ping      the antenna pings with two arcs and the eyes shut happy: connected.
//   close     the traffic stops, the padlock shuts, the LEDs go out and the wire goes dark from the far end back to
//             the desk; the creature leans back (the torso two rows up, the hands back on the stubs), a fresh prompt.
// Loop: 34 frames, 6.8 s; the last frame is the first frame's pose, so it runs into it without a seam.
// Palette: 0..5 the ECHO palette unchanged (2 also the screens and sockets; 4 also the ping arcs, the walking LED;
// 5 also the forearms' crease); 6 cream (the dashes, the padlock, return packets, a pressed key), 7 gold (the key,
// outgoing packets, the port's first light), 8 machine grey (the tower, the monitor, the keyboard), 9 dark grey (the
// tower's panel, the desk, the unlit wire). Index 6 is not ping here, so nothing goes through echoGlitch. Big tier:
// 34 frames of 3600 cells are 122400 bytes of firmware table, so it ships only on boards built with SPLASH_BIG.
// One closure, so echoSshHd is the only name it adds; registered at the end of this file.
(function (root) {
  if (typeof require !== 'undefined' && !root.BENCH_LIB) require('./anims.js');
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  const echoSshHd = (() => {
    const N = 60, K = 3;
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, CREAM = 6, GOLD = 7, GREY = 8, DARK = 9;
    // Constants the cell is judged on.
    const OX = -9, OY = 1;                                         // the family's 3x frame, 9 left and 1 down
    const TORSO = 42;                                              // family rows 0..13 at 3x end here; legs below
    const V = {top: 18 + OY, bot: 23 + OY, l: 18 + OX, r: 44 + OX};   // the visor band
    const EYE_C = [21 + OX, 39 + OX];                              // each slit's left col, 3 wide
    const HANDS = [[31, 33, 0, 2], [31, 33, 39, 41]];              // the family's hands on the panel (r0, r1, c0, c1)
    const ELBOWS = [[31.5, 1.5], [31.5, 40.5]], FORE_R = 1.5, FIST_R = 2.0;
    const MON = {t: 27, b: 39, l: 12, r: 32};                      // the creature's monitor (bezel included)
    const KB = {t: 42, b: 44, l: 4, r: 40};                        // the keyboard
    const DESK = {t: 45, b: 46, l: 1, r: 43};                      // the desk top; legs at its ends to the floor
    const TOWER = {t: 15, b: 58, l: 47, r: 59};                    // the remote machine
    const RSCR = {t: 18, b: 31, l: 48, r: 58};                     // its screen, bezel included
    const LED_C = [49, 52, 55], LED_R = 34;                        // its LEDs, 2 x 2
    const PORT = {t: 53, b: 58, l: 47, r: 51};                     // the port the wire runs into
    const DROP_C = 22, FLOOR_R = 55;                               // the cable: drop col, floor row (2 thick)
    // The cable's path, desk to port, as the top left cells of 2 x 2 steps.
    const PATH = [];
    for (let r = 47; r <= 53; r++) PATH.push([r, DROP_C]);
    for (let c = DROP_C; c <= 46; c++) PATH.push([FLOOR_R, c]);
    const P = PATH.length;
    const TAU = 2 * Math.PI;

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const copy = g => g.map(row => row.slice());
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    const rect = (g, t, b, l, r, v) => { for (let y = t; y <= b; y++) for (let x = l; x <= r; x++) put(g, y, x, v); return g; };
    const INK = {k: EYE, w: CREAM, g: GOLD, t: VISOR, s: GREY, d: DARK};
    const stamp = (g, art, r0, c0, ink) => { art.forEach((line, dr) => [...line].forEach((ch, dc) => { if (ch !== '.') put(g, r0 + dr, c0 + dc, ink || INK[ch]); })); return g; };
    const seg = (y, x, p, q) => {
      const vy = q[0] - p[0], vx = q[1] - p[1], L2 = vy * vy + vx * vx;
      const t = L2 ? Math.max(0, Math.min(1, ((y - p[0]) * vy + (x - p[1]) * vx) / L2)) : 0;
      return Math.hypot(y - p[0] - t * vy, x - p[1] - t * vx);
    };

    // The creature: the family pose at 3x; dy lifts the torso (the lean), the legs stay where they stand.
    function creature(ping, dy) {
      const src = upscale(echoPing(ping), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const v = src[r][c]; if (!v) continue;
        const y = r + OY;
        put(g, y <= TORSO ? y + dy : y, c + OX, v);
        if (y === TORSO) for (let k = dy + 1; k <= 0; k++) put(g, y + k, c + OX, v);   // the lean stretches the hips
      }
      return g;
    }
    const band = (g, dy) => rect(g, V.top + dy, V.bot + dy, V.l, V.r, VISOR);
    const slits = dx => (g, dy) => { band(g, dy); for (const c0 of EYE_C) rect(g, V.top + dy, V.bot + dy, c0 + dx, c0 + dx + 2, EYE); };
    const blinked = (g, dy) => { band(g, dy); for (const c0 of EYE_C) rect(g, V.bot + dy - 1, V.bot + dy, c0, c0 + 2, EYE); };
    const ARCH = ['..kkkkk..', '.kk...kk.', 'kk.....kk'];
    const arches = (g, dy) => { band(g, dy); for (const c0 of EYE_C) stamp(g, ARCH, V.top + dy + 1, c0 - 3); };

    // The forearms: the stub is the upper arm, its hand comes off and a forearm runs to a fist on the keyboard; a one
    // cell crease in the feet teal where it lies over anything.
    function forearms(g, fists) {
      const under = copy(g);
      for (const [r0, r1, c0, c1] of HANDS) for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (g[r][c] === BODY) g[r][c] = 0;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const y = r + 0.5, x = c + 0.5;
        let d = Infinity;
        fists.forEach((f, i) => { d = Math.min(d, seg(y, x, ELBOWS[i], f) - FORE_R, Math.hypot(y - f[0], x - f[1]) - FIST_R); });
        if (d <= 0) g[r][c] = BODY;
        else if (d <= 1 && under[r][c] && under[r][c] !== BODY) g[r][c] = FEET;
        else if (d <= 1 && under[r][c] === BODY && r > 30) g[r][c] = FEET;
      }
      return g;
    }

    // The creature's terminal: a monitor with a prompt, its stand, the keyboard, the desk.
    // scr: {d1 dashes on line 1, d2 on line 2, out: output dashes on line 3, cur: which line holds the cursor (0 none)}
    function terminal(g, scr, press) {
      rect(g, MON.t, MON.b, MON.l, MON.r, GREY);
      rect(g, MON.t + 1, MON.b - 1, MON.l + 1, MON.r - 1, EYE);
      rect(g, MON.b + 1, MON.b + 2, 20, 24, DARK);                 // the stand
      const line = (row, n, ink, prompt) => {
        let c = MON.l + 3;
        if (prompt) { rect(g, row, row + 1, c, c + 1, VISOR); c += 3; }
        for (let k = 0; k < n; k++) { rect(g, row, row + 1, c, c + 1, ink); c += 3; }
        return c;
      };
      const rows = [MON.t + 2, MON.t + 5, MON.t + 8];
      const ends = [line(rows[0], scr.d1, CREAM, true), line(rows[1], scr.d2 || 0, CREAM, scr.d2 !== undefined), line(rows[2], scr.out || 0, VISOR, false)];
      if (scr.cur) { const k = scr.cur - 1; rect(g, rows[k], rows[k] + 1, ends[k], ends[k] + 1, PING); }
      // keyboard: two rows of keys and a space bar
      rect(g, KB.t, KB.b, KB.l, KB.r, GREY);
      for (let c = KB.l + 1; c < KB.r; c += 2) put(g, KB.t, c, DARK);
      for (let c = KB.l + 2; c < KB.r; c += 2) put(g, KB.t + 1, c, DARK);
      rect(g, KB.b, KB.b, 16, 28, DARK);
      if (press) put(g, press[0], press[1], press[2] || CREAM);
      rect(g, DESK.t, DESK.b, DESK.l, DESK.r, DARK);
      rect(g, DESK.b + 1, 58, DESK.l, DESK.l, DARK); rect(g, DESK.b + 1, 58, DESK.r, DESK.r, DARK);
      return g;
    }

    // The remote machine. m: {lock: 'dim'|'closed'|'open'|null, lines: n output lines so far (null: none), leds: [ink x3], port: ink of its rim}
    const LOCK_SHUT = ['.......', '..www..', '.w...w.', '.w...w.', 'wwwwwww', 'wwwkwww', 'wwwkwww', 'wwwwwww'];
    const LOCK_OPEN = ['..www..', '.w...w.', '.w...w.', '.w.....', 'wwwwwww', 'wwwkwww', 'wwwkwww', 'wwwwwww'];
    const OUT = [7, 4, 9, 5, 8, 3, 6, 9, 4, 7, 5, 8, 6, 3, 9];    // output line lengths, cycled
    function machine(g, m) {
      rect(g, TOWER.t, TOWER.b, TOWER.l, TOWER.r, GREY);
      rect(g, TOWER.t + 1, TOWER.b - 1, TOWER.l + 1, TOWER.r - 1, DARK);
      rect(g, TOWER.t, TOWER.t, TOWER.l + 1, TOWER.r - 1, GREY);
      rect(g, RSCR.t, RSCR.b, RSCR.l, RSCR.r, GREY);
      rect(g, RSCR.t + 1, RSCR.b - 1, RSCR.l + 1, RSCR.r - 1, EYE);
      if (m.lock) {
        const ink = m.lock === 'dim' ? GREY : m.lock === 'open' ? VISOR : CREAM;
        const art = m.lock === 'open' ? LOCK_OPEN : LOCK_SHUT;
        art.forEach((line, dr) => [...line].forEach((ch, dc) => {
          if (ch === '.') return;
          put(g, RSCR.t + 3 + dr, RSCR.l + 2 + dc, ch === 'k' ? EYE : ink);
        }));
      }
      if (m.lines) {
        const shown = Math.min(m.lines, 6), first = m.lines - shown;
        for (let k = 0; k < shown; k++) {
          const n = OUT[(first + k) % OUT.length], ink = (first + k) % 4 === 3 ? CREAM : VISOR;
          rect(g, RSCR.t + 1 + 2 * k, RSCR.t + 1 + 2 * k, RSCR.l + 1, RSCR.l + n, ink);
        }
      }
      LED_C.forEach((c, i) => rect(g, LED_R, LED_R + 1, c, c + 1, (m.leds && m.leds[i]) || EYE));
      for (const r of [38, 41, 44, 47]) { rect(g, r, r + 1, 49, 57, GREY); put(g, r, 56, EYE); put(g, r + 1, 56, EYE); }
      // the port: a socket on the case's lower left, the rim lights
      rect(g, PORT.t, PORT.b - 1, PORT.l, PORT.r, m.port || GREY);
      rect(g, FLOOR_R - 1, FLOOR_R + 2, PORT.l + 1, PORT.r - 1, EYE);
      if (m.port === VISOR) rect(g, FLOOR_R, FLOOR_R + 1, PORT.l + 1, PORT.r - 1, PING);
      rect(g, 59, 59, 48, 50, DARK); rect(g, 59, 59, 56, 58, DARK);   // feet
      return g;
    }

    // The wire: every step dark, lit where lit(i) says so; packets [index, ink] ride it 3 long.
    const step = (g, i, v) => { const [r, c] = PATH[i]; rect(g, r, r + 1, c, c + 1, v); };
    function wire(g, lit, packets) {
      for (let i = 0; i < P; i++) step(g, i, lit(i) ? VISOR : DARK);
      for (const [i, ink] of packets || []) for (let k = 0; k < 2; k++) if (i + k >= 0 && i + k < P) step(g, i + k, ink);
      return g;
    }

    // The key: bow, shaft, bit. Lying along the floor (bow left, bit at the tip) or hanging down the drop.
    const KEY_H = ['.ggg........', 'g...g.......', 'g...gggggggg', 'g...gggggggg', 'g...g...g.gg', '.ggg........'];
    const KEY_T = ['..g.........', '..g.........', '..g.gggggggg', '..g.gggggggg', '..g.....g.gg', '..g.........'];   // turned: the bow edge on
    const KEY_V = KEY_H[0].split('').map((_, c) => KEY_H.map(row => row[c]).join(''));
    const key = (g, k) => {
      if (k.v) stamp(g, KEY_V, 43, DROP_C - 2);
      else stamp(g, k.turned ? KEY_T : KEY_H, FLOOR_R - 2, k.c);
    };

    // The ping: the antenna tip lit and arcs over it.
    const TIP = [OY + 4.5, 15 * K + OX + 1.5];
    function arcs(g, radii) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (g[r][c]) continue;
        const y = r + 0.5, x = c + 0.5, d = Math.hypot(y - TIP[0], x - TIP[1]);
        if (y > TIP[0] + 2) continue;
        for (const R of radii) if (Math.abs(d - R) < 0.55) g[r][c] = PING;
      }
      return g;
    }

    // A scene. o: face, ping, arcs, lean (torso two rows up, hands on the stubs), fists (null: hands on the stubs),
    // scr, press, m (machine), lit, packets, key.
    const DOWN = [[42.5, 6.5], [42.5, 37.5]];
    const typing = side => side === 'L' ? [[41.2, 6.5], [42.5, 37.5]] : side === 'R' ? [[42.5, 6.5], [41.2, 37.5]] : DOWN;
    function scene(o) {
      const g = blank();
      machine(g, o.m || {lock: 'dim'});
      wire(g, o.lit || (() => false), o.packets);
      const dy = o.lean ? -2 : 0;
      const c = creature(!!o.ping, dy);
      (o.face || slits(0))(c, dy);
      for (let r = 0; r < N; r++) for (let k = 0; k < N; k++) if (c[r][k]) g[r][k] = c[r][k];
      terminal(g, o.scr || {d1: 0, cur: 1}, o.press);
      if (!o.lean) forearms(g, typing(o.hands));
      if (o.key) key(g, o.key);
      if (o.arcs) arcs(g, o.arcs);
      return g;
    }

    const frames = [];
    const F = (hold, o = {}) => frames.push({hold, grid: scene(o)});
    const look = dx => slits(dx);
    const KEYS = [[42, 11], [43, 18], [42, 25], [43, 30], [42, 15], [43, 26]];   // keys that flash as it types
    const press = i => [...KEYS[i % KEYS.length], CREAM];
    // 1. Type: a prompt, dashes one at a time, the fists alternate; enter.
    F(420, {scr: {d1: 0, cur: 1}});
    F(130, {scr: {d1: 1, cur: 1}, hands: 'L', press: press(0)});
    F(130, {scr: {d1: 2, cur: 1}, hands: 'R', press: press(1)});
    F(130, {scr: {d1: 3, cur: 1}, hands: 'L', press: press(2)});
    F(130, {scr: {d1: 4, cur: 1}, hands: 'R', press: press(3)});
    F(220, {scr: {d1: 4}, hands: 'R', press: [43, 34, GOLD], face: look(1)});
    // 2. The key leaves the desk down the cable and slides along the floor to the port; the eyes follow it.
    const S1 = {d1: 4, d2: 0, cur: 2};
    F(170, {scr: S1, key: {v: true}, face: look(0)});
    F(120, {scr: S1, key: {c: 17}, face: look(1)});
    F(120, {scr: S1, key: {c: 24}, face: look(1)});
    F(120, {scr: S1, key: {c: 31}, face: look(2)});
    F(200, {scr: S1, key: {c: 36}, face: look(2), m: {lock: 'closed', port: GOLD}});
    // 3. The handshake: the key turns, the padlock opens, the wire goes solid from the port back to the desk.
    F(300, {scr: S1, key: {c: 36, turned: true}, face: look(2), m: {lock: 'open', port: VISOR}});
    F(110, {scr: S1, face: look(2), m: {lock: 'open', port: VISOR, leds: [GOLD]}, lit: i => i >= 2 * P / 3});
    F(110, {scr: S1, face: look(1), m: {lock: 'open', port: VISOR, leds: [GOLD]}, lit: i => i >= P / 3});
    F(240, {scr: S1, face: look(0), m: {lock: 'open', port: VISOR, leds: [GOLD, GOLD]}, lit: () => true});
    // 4. The session: packets both ways, the remote screen fills and scrolls, the LEDs walk, the creature types.
    const SPAN = P + 6;
    const traffic = s => {
      const out = [(s * 5) % SPAN - 3, (s * 5 + SPAN / 2) % SPAN - 3].map(i => [Math.round(i), GOLD]);
      const back = [(s * 5 + 9) % SPAN, (s * 5 + 9 + SPAN / 2) % SPAN].map(i => [Math.round(P - 2 - i + 3), CREAM]);
      return [...out, ...back];
    };
    const ledWalk = s => [0, 1, 2].map(i => (i === s % 3 ? PING : VISOR));
    const session = (s, extra = {}) => ({
      scr: {d1: 4, d2: Math.min(4, Math.floor(s / 2)), out: 0, cur: 2},
      hands: s % 2 ? 'L' : 'R', press: s % 2 ? press(s) : null,
      m: {lines: s + 1, leds: ledWalk(s), port: VISOR}, lit: () => true, packets: traffic(s),
      face: look(Math.round(2 * Math.sin(TAU * s / 6))), ...extra,
    });
    for (let s = 0; s < 8; s++) F(170, session(s));
    // 5. The ping: connected. Two arcs over the antenna, the eyes shut happy, the traffic keeps going.
    F(160, session(8, {ping: true, arcs: [3.5], face: arches}));
    F(160, session(9, {ping: true, arcs: [3.5, 6.5], face: arches}));
    F(300, session(10, {arcs: [6.5], face: arches}));
    F(170, session(11));
    // 6. The close: the traffic stops, the padlock shuts, the LEDs go out, the wire goes dark from the far end back.
    const C = {d1: 4, d2: 4, cur: 0};
    F(150, {scr: C, m: {lock: 'closed', port: VISOR}, lit: i => i < 2 * P / 3, face: look(2)});
    F(130, {scr: C, m: {lock: 'closed'}, lit: i => i < P / 3, face: look(1)});
    F(130, {scr: C, m: {lock: 'closed'}, lit: i => i < 4, face: look(0)});
    // 7. Rest: it leans back, hands off the keys, a fresh prompt; a blink; then back to the keyboard (the loop).
    F(600, {scr: {d1: 0, cur: 1}, m: {lock: 'closed'}, lean: true, face: arches});
    F(500, {scr: {d1: 0}, m: {lock: 'dim'}, lean: true});
    F(80, {scr: {d1: 0}, m: {lock: 'dim'}, lean: true, face: blinked});
    F(420, {scr: {d1: 0, cur: 1}, m: {lock: 'dim'}, lean: true});

    return {
      name: 'ECHO · ssh HD', key: 'echo_ssh_hd', fwname: 'echo ssh hd', category: 'Active', size: N,
      // Big tier, like the other HD cells: 34 frames of 3600 bytes ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, the 60 cell remake of echo ssh (8 px cells, the creature at 3x behind a little desk with its own monitor and keyboard, a grey tower with a screen, LEDs and a port at its right, a cable from the desk along the floor into the port): it types a prompt line of dashes and a block cursor, a gold key leaves the desk and slides along the cable to the port, the key turns and the padlock on the remote screen opens while the wire goes solid teal, packets stream both ways while the remote screen fills with scrolling lines and its LEDs walk, the antenna pings with arcs and the eyes shut happy, then the padlock shuts, the wire goes dark from the far end back and it leans back; judge whether someone who knows ssh reads key, handshake, session and close without a caption, whether the tower reads as a machine, and whether it is still this creature. Host plays it when an agent opens a remote session.',
      // 0 transparent, 1 body, 2 eyes (also the screens and sockets), 3 visor (also the lit wire, the open padlock,
      // output lines), 4 ping (the antenna tip, the arcs, the cursor, the walking LED), 5 feet (also the forearms'
      // crease), 6 cream (dashes, the padlock, return packets, a pressed key), 7 gold (the key, outgoing packets, the
      // port's first light), 8 machine grey (the tower, the monitor, the keyboard), 9 dark grey (the tower's panel,
      // the desk, the unlit wire)
      palette: [...ECHO_PALETTE.slice(0, 6), '#fff1d6', '#ffc93c', '#7d8a92', '#2f383e'],
      frames,
    };
  })();

  L.register([echoSshHd]);
})(typeof window !== 'undefined' ? window : globalThis);
