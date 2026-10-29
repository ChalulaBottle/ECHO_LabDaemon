// Lab creatures: the ECHO creature at the hacker and CTF life. This one is the daemon itself dodging traffic, with the
// ultracode signature at its climax (operator, 2026-10-28: "Make one that represents the daemon dodging packets as
// well ultracode"). Drawn from scratch in code on the ECHO base, no words in the picture.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {G, upscale, echoPing, echoBase, ECHO_PALETTE} = L;

  // ECHO · packet dodge: packets fly in from the right in volleys and the creature gets out of their way without
  // ever being touched, until a wall comes that it cannot dodge, so it does the ultracode thing and becomes three.
  // 40 cell lattice, 12 px cells on the 480 panel: the body is the family's 20 cell pose repeated exactly 2 times
  // across and down, 5 rows down so its feet stand on a floor line on the bottom row.
  //   packets   bright gold blocks 3 across and 2 tall with a short amber trail behind them (to the right, since they
  //             fly left), 10 to 12 cols a frame, off the left edge; the wall's packets are dark red with a gold nose
  //             and a shorter trail, so a rank reads as a train of separate packets.
  //   rest      the loop anchor: the family's slit eyes, a blink.
  //   lean      two singles: one at antenna height, one at the top of the head. It leans back from each, the upper
  //             body sheared left and lowered over the hips, the antenna whipped back flat over the head; the eyes
  //             track the packet, looking up.
  //   hop       a low one at the shins: a crouch, a hop with the legs tucked, the packet under the feet, a landing.
  //   duck      a high one at the visor: the body squashes down and out (a fifth wider, the legs bent to 4 rows),
  //             the antenna flat, the packet over the head; it rises through a crouch.
  //   wall      dark red packets in three lanes, three ranks deep, above the head, at the head and at the belly at once. It sees
  //             it, pings, and goes ultracode: two of the family's glitch splits (visor rows shifted, painted in
  //             ping), the second tearing the belly the other way, then it shrinks to the family's own 1x pose,
  //             to one mini with two ping ghosts, and to three minis standing in the wall's three gaps, a zigzag
  //             stack, each pinging its own antenna in turn while the volley passes between them.
  //   rejoin    the minis slide into one column, fold into one mini with ghosts, grow through the 1x pose back to
  //             the creature, which pings.
  //   dust      it shakes itself left and right, cream dust puffing off its shoulders and feet and settling, a blink
  //             and a glance back, and the loop opens on the rest.
  // Nothing touches the creature: the build checks every frame, and throws if any packet or trail cell lands on or
  // next to (sharing an edge with) a creature cell.
  // Palette: 0..5 the ECHO palette (index 6, ping's duplicate, is left out; the glitch paints in 4); 6 packet gold,
  // 7 trail amber, 8 wall red, 9 dust cream. Big tier: 1600 bytes a frame. One closure, so echoPacketDodge is the
  // only name it adds; registered at the end of this file.
  const echoPacketDodge = (() => {
    const N = 40, K = 2;
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, GOLD = 6, TRAIL = 7, WALL = 8, CREAM = 9;
    // Constants the cell is judged on.
    const DX = 0, DY = 5;                                          // where the family's 2x frame sits on the panel
    const FLOOR = 39;                                              // the floor line; the feet stand on row 38
    const V = {top: 12 + DY, l: 12 + DX, r: 29 + DX, eyes: [14 + DX, 26 + DX]};             // visor rows 17..20
    const HEAD = 8 + DY;                                           // the head's top row, 13
    const BELLY = 27 + DY;                                         // the body's last row above the legs, 32
    const LEGS = [28 + DY, 33 + DY];                               // the legs, 33..38
    const CX = 21;                                                 // the body's centre line (between cols 20 and 21)
    const SPEED = 10;                                              // the singles' and the duck's speed, cols a frame

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const copy = g => g.map(r => r.slice());
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    const place = (dst, src, r0, c0, paint = 0) => {
      for (let r = 0; r < src.length; r++) for (let c = 0; c < src[r].length; c++) if (src[r][c]) put(dst, r0 + r, c0 + c, (paint && src[r][c] !== EYE) ? paint : src[r][c]);
      return dst;
    };

    // ---------- the creature at 2x ----------
    // Faces on the upright pose: slits slid look cols, the top half (up), the bottom half (down) or whole; a blink.
    const band = g => { for (let r = V.top; r < V.top + 4; r++) for (let c = V.l; c <= V.r; c++) g[r][c] = VISOR; };
    const slits = (look = 0, vert = 'mid') => g => {
      band(g);
      const r0 = vert === 'down' ? V.top + 2 : V.top, r1 = vert === 'up' ? V.top + 1 : V.top + 3;
      for (let r = r0; r <= r1; r++) for (const c0 of V.eyes) for (let c = c0; c < c0 + 2; c++) g[r][c + look] = EYE;
    };
    const blinked = g => { band(g); for (const c0 of V.eyes) for (let c = c0; c < c0 + 2; c++) g[V.top + 3][c] = EYE; };
    // The upright creature; fold whips the antenna back flat over the head (a staircase two cells thick, its tip at
    // the back), as it does in the leans and the duck.
    function upright(o) {
      const src = upscale(echoPing(!!o.ping), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (src[r][c]) put(g, r + DY, c + DX, src[r][c]);
      (o.face || slits(0))(g);
      if (o.fold) {
        for (let r = 2 + DY; r <= 7 + DY; r++) for (const c of [30 + DX, 31 + DX]) g[r][c] = 0;
        for (let c = 26; c <= 31; c++) g[HEAD - 1][c + DX] = BODY;
        for (let c = 21; c <= 27; c++) g[HEAD - 2][c + DX] = BODY;
        g[HEAD - 2][19 + DX] = g[HEAD - 2][20 + DX] = o.ping ? PING : BODY;
      }
      return g;
    }
    // Deform: bands of source rows [a, b] land on target rows [a2, b2] (nearest row), each target row sheared by
    // shift(y) cols and stretched w times about the centre line. The whole pose vocabulary is this one function.
    function deform(src, bands, shift = () => 0, w = 1) {
      const g = blank();
      for (const {s: [a, b], t: [a2, b2]} of bands) for (let y = a2; y <= b2; y++) {
        if (y < 0 || y >= N) continue;
        const sr = b2 === a2 ? a : Math.round(a + (y - a2) * (b - a) / (b2 - a2));
        const sh = shift(y);
        for (let x = 0; x < N; x++) {
          const sc = Math.round(CX + (x + 0.5 - CX - sh) / w - 0.5);
          if (sc >= 0 && sc < N && src[sr][sc]) g[y][x] = src[sr][sc];
        }
      }
      return g;
    }
    const UP = o => (o.fold ? HEAD - 2 : 2 + DY);                  // the sprite's top row: the tip, or the folded antenna
    const POSES = {
      stand: (s) => s,
      // lean back: the upper body lowered d rows over the hips and sheared sh cols left at the top, the hips pushed 2
      // cols forward over straight legs, so it bends back from the knees
      lean: (s, o, d, sh) => deform(s, [{s: [UP(o), BELLY], t: [UP(o) + d, BELLY]}, {s: LEGS, t: LEGS}], y => (y > BELLY ? 2 * (LEGS[1] - y) / (LEGS[1] - BELLY) : 2 - (sh + 2) * (BELLY - y) / (BELLY - UP(o) - d))),
      // crouch: knees bent, the body 2 rows down and a touch wider
      crouch: (s, o) => deform(s, [{s: [UP(o), BELLY], t: [UP(o) + 2, BELLY + 1]}, {s: LEGS, t: [LEGS[0] + 2, LEGS[1]]}], () => 0, 1.06),
      // hop: the whole body up h rows, the legs tucked to 4 rows
      hop: (s, o, h) => deform(s, [{s: [UP(o), BELLY], t: [UP(o) - h, BELLY - h]}, {s: LEGS, t: [LEGS[0] - h, LEGS[0] - h + 3]}]),
      // duck: squashed down to `top` and a fifth wider, the legs bent to 4 rows
      duck: (s, o, top) => deform(s, [{s: [UP(o), BELLY], t: [top, LEGS[1] - 4]}, {s: LEGS, t: [LEGS[1] - 3, LEGS[1]]}], () => 0, 1.2),
    };
    // The family's glitch split at 2x: its rows 6..8 (here 17..22) one family cell (2 here) right, the visor in ping;
    // the tear also drags the belly (family rows 11..13, here 27..32) one family cell left.
    function glitch(g, tear) {
      const b = copy(g);
      for (let r = 12 + DY; r <= 17 + DY; r++) for (let c = N - 1; c >= 0; c--) b[r][c] = c >= 2 ? g[r][c - 2] : 0;
      for (let r = V.top; r < V.top + 4; r++) for (let c = 0; c < N; c++) if (b[r][c] === VISOR) b[r][c] = PING;
      if (tear) for (let r = 22 + DY; r <= 27 + DY; r++) for (let c = 0; c < N; c++) b[r][c] = c + 2 < N ? g[r][c + 2] : 0;
      return b;
    }

    // ---------- the minis (the ultracode family's own) ----------
    // 2 by 2 block downsample of echoBase, eyes winning a tie (anims_modes.js: the minis came out blind otherwise).
    const MINI = (() => {
      const H = G / 2, m = Array.from({length: H}, () => new Array(H).fill(0));
      for (let r = 0; r < H; r++) for (let c = 0; c < H; c++) {
        const block = [echoBase[2 * r][2 * c], echoBase[2 * r][2 * c + 1], echoBase[2 * r + 1][2 * c], echoBase[2 * r + 1][2 * c + 1]];
        if (block.filter(v => v === EYE).length >= 2) { m[r][c] = EYE; continue; }
        const n = {}; for (const v of block) if (v) n[v] = (n[v] || 0) + 1;
        let best = 0, count = 0;
        for (const k of Object.keys(n).map(Number).sort((a, b) => a - b)) if (n[k] > count) { best = k; count = n[k]; }
        m[r][c] = best;
      }
      return m;
    })();
    // A mini, its antenna tip pinging or not.
    const mini = (tip = false) => { const m = copy(MINI); m[0][7] = tip ? PING : BODY; return m; };
    // The three gaps in the wall: top left corners of the minis (content rows 0..8, cols 1..8 of the 10 by 10).
    // A zigzag stack, the ultracode triangle stood on end: top in the middle, middle to the left, bottom to the right.
    const GAP = [[4, 17], [17, 11], [30, 22]];
    const CENTRE = [30, 16];                                       // one mini standing on the floor, under the body's centre
    const ONE_X = [22, 11];                                        // the family's 1x pose standing on the floor
    const trio = (pings, spots = GAP) => { const g = blank(); spots.forEach(([r, c], i) => place(g, mini(pings === i), r, c)); return g; };

    // ---------- the packets ----------
    // A packet: its left col on each frame from f0, rows row and row + 1. Singles fly at SPEED from col 37; the wall
    // follows WALL_X (a looming approach, then fast) in three lanes, three ranks 6 apart, their trails cut to 2 so each
    // packet stands apart.
    const packets = [];
    const single = (f0, row, v = SPEED) => packets.push({row, kind: GOLD, x: f => (f >= f0 ? 37 - v * (f - f0) : null)});
    function drawPacket(g, row, x, kind) {
      for (let r = row; r <= row + 1; r++) {
        for (let c = x; c < x + 3; c++) put(g, r, c, kind);
        if (kind === WALL) put(g, r, x, GOLD);                     // the wall's gold nose
        for (let c = x + 3; c < x + (kind === WALL ? 5 : 6); c++) if (inside(r, c) && !g[r][c]) g[r][c] = TRAIL;
      }
      if (kind !== WALL && inside(row, x + 6) && !g[row][x + 6]) g[row][x + 6] = TRAIL;   // the trail's ragged tail
    }

    // ---------- the frames ----------
    const specs = [];
    const F = (hold, o = {}) => specs.push(Object.assign({hold}, o));
    // 1. Rest, the loop anchor: calm, a blink, a glance right.
    F(400); F(90, {face: blinked}); F(400, {face: slits(2)});
    // 2. The singles: one at antenna height, one at the head's top; a small lean back, then a deep one.
    single(2, 8); single(3, 12);
    F(150, {pose: ['lean', 1, 3], fold: true, face: slits(2, 'up')});
    F(160, {pose: ['lean', 4, 8], fold: true, face: slits(1, 'up')});
    F(160, {pose: ['lean', 4, 8], fold: true, face: slits(-1, 'up')});
    F(180, {pose: ['lean', 4, 8], fold: true, face: slits(-2, 'up')});
    // 3. The hop: a low one at the shins; crouch, up, up, land.
    single(7, 35, 12);
    F(160, {pose: ['crouch'], face: slits(2, 'down')});
    F(120, {pose: ['hop', 6], face: slits(1, 'down')});
    F(150, {pose: ['hop', 7], face: slits(-1, 'down')});
    F(150, {pose: ['crouch'], face: slits(-2, 'down')});
    // 4. The duck: a high one at the visor; squash under it, rise through a crouch.
    single(11, 17);
    F(220, {face: slits(2)});
    F(150, {pose: ['duck', 21], fold: true, face: slits(2, 'up')});
    F(170, {pose: ['duck', 21], fold: true, face: slits(0, 'up')});
    F(170, {pose: ['duck', 21], fold: true, face: slits(-2, 'up')});
    F(200, {pose: ['crouch'], face: slits(2)});
    // 5. The wall: three lanes, three ranks. It sees it and pings; the glitch, the tear, the shrink, one mini with
    // ghosts, three minis in the gaps, each pinging in turn while the volley passes.
    const W0 = 15, WALL_X = [38, 36, 34, 31, 27, 20, 12, 4, -4, -12, -20, -28, -36];
    const LANES = [[1, 0], [14, 2], [27, 6]];                      // [row, how far behind the front]
    for (const [row, lag] of LANES) for (const rank of [0, 6, 12]) packets.push({row, kind: WALL, x: f => (f >= W0 && f - W0 < WALL_X.length ? WALL_X[f - W0] + lag + rank : null)});
    F(80, {face: slits(2), glitch: 1, ping: true});
    F(140, {face: slits(2)});
    F(80, {face: slits(2), glitch: 2});
    F(110, {grid: () => place(blank(), echoPing(false), ...ONE_X)});
    F(130, {grid: () => { const g = blank(); place(g, MINI, GAP[0][0], GAP[0][1], PING); place(g, MINI, GAP[1][0], GAP[1][1], PING); return place(g, mini(), ...CENTRE); }});
    F(220, {grid: () => trio(0)});
    F(220, {grid: () => trio(2)});
    F(220, {grid: () => trio(1)});
    // 6. The rejoin: one column, one mini with ghosts, the 1x pose, the creature with a ping.
    F(200, {grid: () => trio(-1, [[4, 16], [17, 16], [30, 16]])});
    F(120, {grid: () => { const g = blank(); place(g, MINI, 14, 16, PING); place(g, MINI, 22, 16, PING); return place(g, mini(), ...CENTRE); }});
    F(90, {grid: () => place(blank(), echoPing(false), ...ONE_X)});
    F(300, {ping: true});
    // 7. The dust: a shake left, a shake right, cream puffs off the shoulders and feet, settling.
    F(160, {shake: -1, dust: [[17, 4], [17, 5], [18, 4], [20, 2], [36, 6], [37, 5], [37, 7], [36, 37], [37, 38], [37, 36], [17, 37], [18, 38]]});
    F(160, {shake: 1, dust: [[19, 2], [20, 3], [23, 1], [16, 3], [37, 3], [38, 2], [36, 1], [38, 39], [37, 38], [35, 39], [20, 38], [16, 39]]});
    F(400, {face: blinked, dust: [[26, 2], [31, 1], [38, 1], [38, 3], [38, 38], [27, 38]]});
    F(400, {face: slits(-1), dust: [[38, 2], [38, 37]]});

    // Draw, then check: the creature layer and the packet layer may not touch.
    const frames = specs.map((sp, f) => {
      let c;
      if (sp.grid) c = sp.grid();
      else {
        const o = {ping: sp.ping, face: sp.face, fold: sp.fold};
        c = upright(o);
        const [name, ...args] = sp.pose || ['stand'];
        c = POSES[name](c, o, ...args);
        if (sp.glitch) c = glitch(c, sp.glitch === 2);
        if (sp.shake) c = c.map(row => row.map((_, x) => row[x - sp.shake] || 0));
      }
      const p = blank();
      for (const pk of packets) { const x = pk.x(f); if (x !== null) drawPacket(p, pk.row, x, pk.kind); }
      for (let r = 0; r < N; r++) for (let x = 0; x < N; x++) {
        if (!p[r][x]) continue;
        for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (inside(r + dr, x + dc) && c[r + dr][x + dc]) throw new Error(`echo packet dodge: frame ${f}, a packet at row ${r} col ${x} touches the creature`);
      }
      const g = copy(c);
      for (let r = 0; r < N; r++) for (let x = 0; x < N; x++) if (p[r][x]) g[r][x] = p[r][x];
      for (const [r, x] of sp.dust || []) if (inside(r, x) && !g[r][x]) g[r][x] = CREAM;
      for (let x = 0; x < N; x++) if (!g[FLOOR][x]) g[FLOOR][x] = FEET;
      return {hold: sp.hold, grid: g};
    });
    return {
      name: 'ECHO · packet dodge', key: 'echo_packet_dodge', fwname: 'echo packet dodge', category: 'Mode', size: N,
      // Big tier: 1600 bytes a frame, so it ships only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, the daemon dodging traffic with the ultracode signature at its climax, 40 cell lattice (12 px cells, the creature at 2x standing on a floor line): gold packets with short amber trails fly in from the right and off the left edge; it leans back from two singles at antenna and head height with its antenna whipped flat, hops a low one with its legs tucked, squashes down under a high one at the visor, then a dark red wall of packets in three lanes comes that it cannot dodge, so it pings, glitch splits twice in ping like ultracode enter, shrinks and echoes into three minis that stand in the wall\'s three gaps and ping in turn while the volley passes between them, slides back together into one, and shakes off cream dust; nothing ever touches it (the build checks); judge whether the lean, hop and duck read as dodges, whether the split reads as ultracode rather than the creature breaking, and whether the packets read as packets.',
      // 0 transparent, 1 body, 2 eyes, 3 visor, 4 ping (antenna tip, the glitch's visor, the ghosts), 5 feet (also the
      // floor line), 6 packet gold (also the wall's noses), 7 trail amber, 8 wall red, 9 dust cream
      palette: [...ECHO_PALETTE.slice(0, 6), '#ffd23f', '#9a6a12', '#a3192b', '#fff1d6'],
      frames,
    };
  })();

  L.register([echoPacketDodge]);
})(typeof window !== 'undefined' ? window : globalThis);
