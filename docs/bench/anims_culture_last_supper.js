// Culture creatures, batch three (operator, 2026-10-28: "be creative and keep the style and theming and branding we
// have already developed"): the ECHO creature plays every role, and a painting in the public domain is homaged by its
// composition, its setting and its gesture only. Drawn from scratch in code on the ECHO base; no traced image, no
// fetched pixels.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {ECHO_PALETTE} = L;


  // ECHO · last supper: Leonardo da Vinci, The Last Supper (about 1495 to 1498). Thirteen small ECHO creatures sit
  // behind a long table under a coffered ceiling, the middle one framed by the bright middle window, the other twelve
  // in four groups of three as Leonardo grouped them, a gap of wall between each group and the middle. 40 cell
  // lattice, 12 px cells on the 480 panel. At thirteen across, each diner is the family drawn four cells wide: an
  // antenna on its right with its tip on top, a head row, a visor row whose two ends are its eyes, its body down to
  // the table, and two feet under it. In each group two sit in front side by side, one body teal and one deep teal
  // (the deep one always on the side toward the middle, so the middle one's spread arms show against it), and the third sits between and behind them, three rows higher, in deep teal, so its head and
  // visor show over theirs, as the painting's groups crowd together; the right one in front sits a row lower than the
  // left, so their two visors part.
  //   room      an umber coffered ceiling, an ochre back wall with three windows of pale sky, the middle one widest
  //             and right behind the middle diner's head, dark hangings down both side walls.
  //   table     a long white cloth from edge to edge with loaves and cups on it, its front hanging in folds, the
  //             diners' feet in the shade under it, an ochre floor.
  //   spread    the middle diner's antenna pings and its arms spread down to the table in a triangle, as in the
  //             painting; they stay spread while the ripple runs.
  //   ripple    a wave of gestures runs out from the middle to both ends and back: each diner it reaches jumps up a
  //             row, the ones in front throwing both hands up (pale), the ones behind pinging with their eyes wide,
  //             and sits again as the wave moves on.
  //   settle    the middle diner's arms come back in and everyone sits still; a blink here and there.
  // Loop: 26 frames, 5.8 s. Every diner sits at rest on the first and last frames, so the last runs into the first
  // without a seam.
  // Palette: 0..5 the ECHO palette unchanged (5 is also the deep teal diners and the feet); 6 the white cloth (also
  // the raised hands), 7 the windows' sky (also the cloth's folds), 8 the ochre wall, floor and loaves, 9 umber
  // (ceiling, hangings, the shade under the table, the cups). One closure, so echoLastSupper is the only name it
  // adds; registered at the end of this file.
  const echoLastSupper = (() => {
    const N = 40;
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, DEEP = 5, CLOTH = 6, SKY = 7, OCHRE = 8, UMBER = 9;
    // Constants the cell is judged on.
    const FRONT = 17, BACK = 14, MIDH = 16;                        // head rows: the front pair (its right one a row lower), the one behind, the middle
    const TOP = 25;                                                // the table's top row; the cloth's front hangs to 31
    const GROUPS = [0, 9, 23, 32];                                 // each group's left col, 8 wide; wall at cols 8, 17, 22, 31
    const MIDC = 18;                                               // the middle diner's left col, 18..21
    // The thirteen, left to right: [left col, head row, tone, behind].
    const DINERS = [];
    for (const g0 of GROUPS) {
      const left = g0 < MIDC;                                      // the right hand groups are mirrored: deep teal next to the middle
      DINERS.push([g0 + 2, BACK, DEEP, true], [g0, left ? FRONT : FRONT + 1, left ? BODY : DEEP, false], [g0 + 4, left ? FRONT + 1 : FRONT, left ? DEEP : BODY, false]);
    }
    DINERS.push([MIDC, MIDH, BODY, false]);

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };

    // The room behind them.
    function room(g) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) g[r][c] = OCHRE;
      for (let r = 0; r <= 4; r++) for (let c = 0; c < N; c++) g[r][c] = (r === 4 || r === 1 || c % 5 === 2) ? OCHRE : UMBER;   // coffers
      // the three windows, arched at the top
      const win = (c0, c1, r0, r1) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (r > r0 || (c > c0 && c < c1)) g[r][c] = SKY; };
      win(15, 24, 7, 23); win(6, 9, 8, 17); win(30, 33, 8, 17);
      // the hangings down both side walls, narrowing toward the back
      for (let r = 5; r < TOP; r++) for (let c = 0; c < N; c++) if (c < 3 - (r < 9 ? 1 : 0) || c > 36 + (r < 9 ? 1 : 0)) g[r][c] = UMBER;
      for (let r = TOP; r < N; r++) for (let c = 0; c < N; c++) g[r][c] = r >= 37 ? OCHRE : UMBER;
    }
    // The cloth: white from the top row down to row 31, loaves and cups along its top, folds down its front.
    function table(g) {
      for (let r = TOP; r <= 31; r++) for (let c = 0; c < N; c++) g[r][c] = CLOTH;
      for (let r = 28; r <= 31; r++) for (let c = 2; c < N; c += 5) g[r][c] = SKY;   // the folds, in the cloth's shade
      for (const c of [2, 10, 15, 25, 29, 37]) put(g, TOP, c, OCHRE);   // loaves
      for (const c of [6, 13, 27, 34]) put(g, TOP, c, UMBER);          // cups
    }

    // One diner, four cells wide at col c0 with its head on row h. o: up (rows it has jumped), hands (both raised),
    // ping, wide (the eyes grow up into the head row), blink (the visor plain).
    function diner(g, c0, h0, tone, o) {
      const h = h0 - (o.up || 0);
      put(g, h - 1, c0 + 3, tone); put(g, h - 2, c0 + 3, o.ping ? PING : tone);   // the antenna, its tip on top
      for (let c = c0; c < c0 + 4; c++) {
        put(g, h, c, tone);
        put(g, h + 1, c, o.blink || (c > c0 && c < c0 + 3) ? VISOR : EYE);
        for (let r = h + 2; r < TOP; r++) put(g, r, c, tone);
      }
      if (o.wide) { put(g, h, c0, EYE); put(g, h, c0 + 3, EYE); }
      if (o.hands) for (const c of [c0, c0 + 3]) for (let r = h - 3; r <= h - 1; r++) put(g, r, c, CLOTH);
      for (const c of [c0, c0 + 3]) { put(g, 33, c, DEEP); put(g, 34, c, DEEP); }   // feet under the table
    }
    // The middle diner's arms, spread down to the table in a triangle: k steps of two rows, a col out each step.
    function arms(g, k) {
      const sh = MIDH + 3;
      for (let s = 0; s < 2 * k; s++) { const out = Math.floor(s / 2); put(g, sh + s, MIDC - 1 - out, BODY); put(g, sh + s, MIDC + 4 + out, BODY); }
      if (k >= 3) { put(g, TOP, MIDC - 3, BODY); put(g, TOP, MIDC - 4, BODY); put(g, TOP, MIDC + 6, BODY); put(g, TOP, MIDC + 7, BODY); }   // the hands flat on the cloth
    }

    // A scene. o: w (the wave's distance out from the middle in cols, or null), spread (the arms' reach, 0..3), ping
    // (the middle one's antenna), blinks (the diners blinking, by index).
    function scene(o) {
      const g = blank();
      room(g);
      DINERS.forEach(([c0, h, tone, behind], i) => {
        const d = Math.abs(c0 + 1.5 - 19.5), mid = c0 === MIDC;
        const hit = !mid && o.w !== undefined && Math.abs(o.w - d) < 1.1;
        diner(g, c0, h, tone, {up: hit ? 1 : 0, hands: hit && !behind, ping: (hit && behind) || (mid && o.ping), wide: hit && behind, blink: (o.blinks || []).includes(i)});
      });
      table(g);
      if (o.spread) arms(g, o.spread);
      return g;
    }

    // The frames. F(hold, o).
    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    const OUT = [5, 7, 9, 11.5, 14, 16, 18];                       // the wave's stops: every diner's distance from the middle
    // 1. Rest: everyone seated; a blink or two.
    F(320); F(320); F(100, {blinks: [1, 8]}); F(320);
    // 2. The middle one pings and spreads its arms down to the table.
    F(260, {ping: true}); F(220, {ping: true, spread: 1}); F(220, {spread: 2}); F(260, {spread: 3});
    // 3. The ripple: out to both ends a diner a step, and back.
    for (const w of OUT) F(200, {spread: 3, w});
    for (const w of OUT.slice(0, -1).reverse()) F(200, {spread: 3, w});
    // 4. The settle: the arms come back in, everyone sits still.
    F(260, {spread: 3}); F(220, {spread: 1}); F(100, {blinks: [12]}); F(320); F(320);

    const frames = specs.map(({hold, o}) => ({hold, grid: scene(o)}));    return {
      name: 'ECHO · last supper', key: 'echo_last_supper', fwname: 'echo last supper', category: 'Active', size: N,
      // Big tier: 26 frames of 1600 cells are 41600 bytes of firmware table, so it ships only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal after Leonardo da Vinci, The Last Supper (about 1495 to 1498), 40 cell lattice (12 px cells): thirteen small ECHO creatures, each the family four cells wide with an antenna, a visor row whose ends are its eyes and feet under the table, sit behind a long white cloth in four groups of three (two in front, one behind and higher) round a middle one framed by the bright middle window, under an umber coffered ceiling with dark hangings down the side walls; the middle one pings and spreads its arms down to the table, a ripple of gestures runs out to both ends and back, each diner jumping up a row and either throwing its pale hands up or pinging with its eyes wide, then the arms come in and they all sit still; judge whether thirteen diners read at a glance as the painting, whether each still reads as this creature at four cells wide, and whether the ripple reads as one wave out and back.',
      // 0 transparent, 1 body, 2 eyes, 3 visor, 4 ping, 5 deep teal (every other diner, the feet), 6 the white cloth
      // (also the raised hands, the loaves are ochre on it), 7 the windows' sky (also the cloth's folds), 8 ochre wall
      // and floor, 9 umber (ceiling, hangings, the shade under the table, the cups)
      palette: [...ECHO_PALETTE.slice(0, 6), '#efe8d6', '#a8c3cf', '#9a7a4e', '#3a2b1f'],
      frames,
    };
  })();

  L.register([echoLastSupper]);
})(typeof window !== 'undefined' ? window : globalThis);