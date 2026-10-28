// Lab creatures: the ECHO creature at the hacker and CTF life (operator, 2026-10-28, culture batch three: "be
// creative and keep the style and theming and branding we have already developed"). Drawn from scratch in code on the
// ECHO base, no words in the picture.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  // ECHO · packet sniff: packets stream along a wire as small blocks; the ECHO creature watches them through a
  // magnifier, one lights red under the glass, it follows that one along the wire, plucks it off as it passes its
  // hand, holds it up to look at it and flicks it away. 40 cell lattice, 12 px cells on the 480 panel: the body is the
  // family's 20 cell pose repeated exactly 2 times across and down, 3 cols right and 2 rows down, so the magnifier has
  // the left edge of the frame.
  //   wire      a dark teal line across the whole frame at belly height, in front of the body; packets ride it left
  //             to right, 4 cells long and 3 tall with a dark header notch, 12 cols apart, 3 cols a frame.
  //   magnifier the left hand holds a steel ring 9 across over the wire at the left edge; inside the ring the wire
  //             and its packets are drawn again at 1.8x about the ring's centre, so a packet swells as it crosses
  //             the glass, with a two cell white glint in the glass's top left.
  //   scan      the loop anchor: the eyes on the glass, a blink, packets passing under it.
  //   flag      one packet turns red as it crosses the glass, swollen red inside the ring; the antenna pings.
  //   follow    the red packet rides on along the wire across the belly, the eyes sliding after it, while the
  //             right hand gets ready over the wire.
  //   pluck     the right forearm comes out of its stub (the family's arm stub is the upper arm) and the fist closes
  //             on the red packet as it reaches the hand, then lifts it up beside the head.
  //   inspect   held up over the fist, the packet blinks red and white while the eyes look up at it, happy arches
  //             and a ping: got it.
  //   flick     the fist flicks it off the top right corner with a white spark, comes back down to the stub, and the
  //             eyes go back to the glass.
  // Loop: 28 frames, 5.7 s. The packets move 3 cols a frame and stand 12 apart, so 28 frames move them 84 cols, a
  // whole number of gaps, and the last frame runs into the first without a seam; the red packet is a plain one again
  // by the time it comes round.
  // Palette: 0..5 the ECHO palette unchanged (2 is also the packets' notches, 5 the wire and the forearm's crease); 6
  // packet slate, 7 alert red (the sniffed packet), 8 steel (the magnifier's ring and handle), 9 white (the glint, the
  // inspect blink, the flick's spark). Index 6 is not ping here, so nothing goes through echoGlitch. Big tier: 28
  // frames of 1600 cells are 44800 bytes of firmware table, so it ships only on boards built with SPLASH_BIG. One
  // closure, so echoPacketSniff is the only name it adds; registered at the end of this file.
  const echoPacketSniff = (() => {
    const N = 40, K = 2;                                           // lattice; a 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, PACKET = 6, RED = 7, STEEL = 8, WHITE = 9;
    // Constants the cell is judged on.
    const DX = 3, DY = 2;                                          // where the family's 2x frame sits on the panel
    const WIRE = 27;                                               // the wire's row; packets ride rows 26..28
    const GAP = 12, SPEED = 3, COUNT = 4;                          // packets 12 cols apart, 3 cols a frame; 48 cols a lap
    const PHASE = 43;                                              // puts a packet square under the glass at RED_AT
    const LENS = [27.5, 5.5], R_IN = 3.4, R_OUT = 4.5, MAG = 1.8; // the glass's centre, its radii, its magnification
    const RED_AT = 5, PLUCK_AT = 16;                               // the frame the packet turns red, and is plucked
    const ELBOW = [17.5 + DY, 33.5 + DX], FORE_R = 1.3, FIST_R = 1.8;
    const V = {top: 12 + DY, l: 12 + DX, r: 29 + DX, eyes: [14 + DX, 26 + DX]};

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    // Distance from (y, x) to the segment p q.
    const seg = (y, x, p, q) => {
      const vy = q[0] - p[0], vx = q[1] - p[1], L2 = vy * vy + vx * vx;
      const t = L2 ? Math.max(0, Math.min(1, ((y - p[0]) * vy + (x - p[1]) * vx) / L2)) : 0;
      return Math.hypot(y - p[0] - t * vy, x - p[1] - t * vx);
    };

    // The packets: packet i's left col at frame f, and which one is the red one (the one under the glass at RED_AT).
    const px = (i, f) => ((GAP * i + SPEED * f + PHASE) % (GAP * COUNT)) - 6;
    const RED_I = [...Array(COUNT).keys()].sort((a, b) => Math.abs(px(a, RED_AT) + 1.5 - LENS[1]) - Math.abs(px(b, RED_AT) + 1.5 - LENS[1]))[0];
    function packet(g, r0, c0, ink) {
      for (let r = r0; r < r0 + 3; r++) for (let c = c0; c < c0 + 4; c++) put(g, r, c, ink);
      put(g, r0 + 1, c0, EYE);
      return g;
    }
    // The wire layer on its own: the line and the packets on it; the red one red between RED_AT and the pluck, and
    // gone from the wire for the two frames after it, until it would have left the frame anyway.
    function wire(f) {
      const g = blank();
      for (let c = 0; c < N; c++) g[WIRE][c] = FEET;
      for (let i = 0; i < COUNT; i++) {
        const red = i === RED_I && f >= RED_AT && f <= PLUCK_AT;
        if (i === RED_I && f > PLUCK_AT && f <= PLUCK_AT + 2) continue;
        packet(g, WIRE - 1, px(i, f), red ? RED : PACKET);
      }
      return g;
    }

    // The creature: the family pose at 2x, DX across and DY down.
    function pose(ping) {
      const src = upscale(echoPing(ping), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (src[r][c]) put(g, r + DY, c + DX, src[r][c]);
      return g;
    }
    // Faces: the slits slid look cols, short (the top half: looking up), a blink, happy arches.
    const band = g => { for (let r = V.top; r < V.top + 4; r++) for (let c = V.l; c <= V.r; c++) g[r][c] = VISOR; };
    const slits = (look = 0, short = false) => g => { band(g); for (let r = V.top; r < V.top + (short ? 2 : 4); r++) for (const c0 of V.eyes) for (let c = c0; c < c0 + 2; c++) g[r][c + look] = EYE; };
    const blinked = g => { band(g); for (const c0 of V.eyes) for (let c = c0; c < c0 + 2; c++) g[V.top + 3][c] = EYE; };
    const arches = g => { band(g); for (const c0 of V.eyes) { g[V.top + 1][c0] = EYE; g[V.top + 1][c0 + 1] = EYE; g[V.top + 2][c0 - 1] = EYE; g[V.top + 2][c0 + 2] = EYE; } };

    // The magnifier: the ring, a short handle up to the left hand, and the wire drawn again at MAG inside the glass.
    function magnifier(g, w) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const y = r + 0.5, x = c + 0.5, d = Math.hypot(y - LENS[0], x - LENS[1]);
        if (d < R_IN) {
          const sy = Math.floor(LENS[0] + (y - LENS[0]) / MAG), sx = Math.floor(LENS[1] + (x - LENS[1]) / MAG);
          g[r][c] = inside(sy, sx) ? w[sy][sx] : 0;
        } else if (d < R_OUT) g[r][c] = STEEL;
      }
      put(g, 24, 4, WHITE); put(g, 25, 3, WHITE);                  // the glint
      put(g, 24, 9, STEEL);                                        // the handle, up into the hand
      return g;
    }
    // The forearm: the right hand stub comes off, a forearm runs from the elbow to a fist, a crease round it over
    // the body.
    function forearm(g, fist) {
      for (let r = 20 + DY; r <= 21 + DY; r++) for (let c = 34 + DX; c <= 35 + DX; c++) put(g, r, c, 0);
      const under = g.map(row => row.slice());
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const y = r + 0.5, x = c + 0.5;
        const d = Math.min(seg(y, x, ELBOW, fist) - FORE_R, Math.hypot(y - fist[0], x - fist[1]) - FIST_R);
        if (d <= 0) g[r][c] = BODY;
        else if (d <= 1 && under[r][c] === BODY) g[r][c] = FEET;
      }
      return g;
    }

    // A scene: the creature, the wire in front of it, the magnifier, then the forearm and what it holds.
    // o: face, ping, fist ([row, col]), held ('on' the fist, 'up' over it, or the ink of the packet over it), fly
    // ([row, col] of the flicked packet), spark ([row, col]).
    function scene(o, f) {
      const g = pose(!!o.ping);
      (o.face || slits(-2))(g);
      const w = wire(f);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (w[r][c]) g[r][c] = w[r][c];
      magnifier(g, w);
      if (o.fist) {
        forearm(g, o.fist);
        const [fr, fc] = o.fist.map(Math.round);
        if (o.held === 'on') packet(g, WIRE - 1, px(RED_I, f), RED);
        else if (o.held) packet(g, fr - 4, fc - 2, o.held);
      }
      if (o.fly) packet(g, o.fly[0], o.fly[1], RED);
      if (o.spark) { const [r, c] = o.spark; put(g, r, c, WHITE); put(g, r - 1, c, WHITE); put(g, r, c - 1, WHITE); put(g, r + 1, c, PING); put(g, r, c + 1, PING); }
      return g;
    }

    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    // 1. Scan, the loop anchor: the eyes on the glass, a blink.
    F(280); F(280); F(90, {face: blinked}); F(280); F(280);
    // 2. The flag: one packet turns red under the glass; a ping.
    F(260, {ping: true});
    // 3. Follow: the eyes slide after it along the wire; the hand gets ready.
    for (let f = 6; f < PLUCK_AT; f++) {
      const look = Math.round(-2 + 4 * (f - 6) / (PLUCK_AT - 7));
      F(180, {face: slits(look), ping: f === 9, fist: f >= PLUCK_AT - 2 ? [WIRE - 4 + (f - (PLUCK_AT - 2)) * 2, 37.5] : undefined});
    }
    // 4. The pluck: the fist closes on it as it reaches the hand, then lifts it up beside the head.
    F(200, {face: slits(2), fist: [WIRE + 0.5, 37.5], held: 'on'});
    F(140, {face: slits(2, true), fist: [18, 37.5], held: RED});
    // 5. Inspect: held up, it blinks red and white; the eyes up on it, arches, a ping.
    F(240, {face: slits(2, true), fist: [11.5, 37.5], held: RED});
    F(160, {face: slits(2, true), fist: [11.5, 37.5], held: WHITE});
    F(220, {face: slits(2, true), fist: [11.5, 37.5], held: RED, ping: true});
    F(160, {face: arches, fist: [11.5, 37.5], held: WHITE});
    F(300, {face: arches, fist: [11.5, 37.5], held: RED});
    // 6. The flick: off the top right corner with a spark, the fist back down, the eyes back on the glass.
    F(110, {face: arches, fist: [9.5, 37], fly: [1, 37]});
    F(140, {face: slits(0), fist: [12, 37.5], spark: [1, 38]});
    F(200, {face: slits(-1), fist: [17, 37]});
    F(280); F(280);

    const frames = specs.map(({hold, o}, f) => ({hold, grid: scene(o, f)}));
    return {
      name: 'ECHO · packet sniff', key: 'echo_packet_sniff', fwname: 'echo packet sniff', category: 'Thinking', size: N,
      // Big tier: 28 frames of 1600 bytes (44800 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, packet sniffing as a picture, 40 cell lattice (12 px cells, the creature at 2x, a wire across its belly with slate packets riding it left to right, a steel magnifier in its left hand at the left edge that swells each packet as it crosses the glass): it watches the glass and blinks, one packet lights red under it with an antenna ping, its eyes follow the red one along the wire, its right forearm comes down and the fist plucks it off as it passes, lifts it up beside its head where it blinks red and white while the eyes look up at it with happy arches, then flicks it off the top corner with a spark and goes back to the glass; judge whether the packets read as data on a wire, whether the swelling under the glass reads as a magnifier, and whether the pluck reads with so short a forearm.',
      // 0 transparent, 1 body, 2 eyes (also the packets' notches), 3 visor, 4 ping, 5 feet (the wire, the forearm's
      // crease), 6 packet slate, 7 alert red, 8 steel (the magnifier), 9 white (the glint, the blink, the spark)
      palette: [...ECHO_PALETTE.slice(0, 6), '#8fb3ba', '#ff4d5e', '#c7d3d9', '#eafffb'],
      frames,
    };
  })();

  L.register([echoPacketSniff]);
})(typeof window !== 'undefined' ? window : globalThis);
