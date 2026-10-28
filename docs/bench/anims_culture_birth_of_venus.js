// Culture creatures, batch three: the ECHO creature plays the set pieces everyone knows. Drawn from scratch in code on
// the ECHO base; a public domain painting lends its composition, credited by maker, title and date.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  // ECHO · birth of venus: after Sandro Botticelli, The Birth of Venus (about 1485, public domain). The composition
  // only: a figure standing on a scallop shell in the sea while a wind spirit in the clouds blows it to shore and roses
  // tumble on the breeze. The ECHO creature stands on the shell (it is a creature, it wears nothing), and the wind
  // spirit is a little cloud creature of its own kind with a visor and two eyes. 40 cell lattice, 12 px cells on the
  // 480 panel: the body is the family's 20 cell pose repeated exactly 2 times across and down, moved 3 cells right and
  // a row up so the cloud has the top left corner to itself.
  //   sea       deep blue water across the bottom four rows, a row of white wave curls on its surface and two broken
  //             foam lines under it, all scrolling left, so the shell reads as moving right toward a shore off panel.
  //   shell     a pale pink scallop: a ribbed fan with a scalloped rim rising behind the body from a hinge under the
  //             feet, its edge showing past both sides and between the legs, and its lower lip under the feet sitting
  //             in the water. Shell and creature bob a row together with the swell.
  //   rest      the family's slit eyes and arms, a slow blink.
  //   inhale    the cloud creature swells its cheeks, its eyes shut.
  //   blow      its lips pucker at its right edge and wind streaks stream right over the creature's head; the antenna
  //             bends with the wind and its tip pings, the creature's eyes shut happy, and pink roses tumble across on
  //             the breeze in front of it and drop toward the sea.
  //   settle    the cloud goes slack, the antenna stands back up, the last rose lands; the loop opens on the rest.
  // Loop: 30 frames, 6.72 s, holds 150 to 360 ms. The waves scroll a whole number of periods a loop and the bob runs a
  // whole number of cycles, and the wind, the roses and the cloud are all back at rest by the last frame, so it runs
  // into the first without a seam.
  // Palette: 0..5 the ECHO palette unchanged (2 is also the cloud's eyes and mouth, 4 also the wind streaks); 6 shell
  // pink (the fan, the lip); 7 rose (the shell's ribs and rims, the roses); 8 sea blue; 9 foam white (the cloud
  // creature, its lips, the wave curls, the foam lines, the roses' hearts). Index 6 is not ping here, so nothing goes
  // through echoGlitch. Big tier: 30 frames of 1600 cells are 48000 bytes of firmware table, so it ships only on
  // boards built with SPLASH_BIG. One closure, so echoBirthOfVenus is the only name it adds; registered at the end.
  const echoBirthOfVenus = (() => {
    const N = 40, K = 2;                                           // lattice; a 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, SHELL = 6, ROSE = 7, SEA = 8, FOAM = 9;
    // Constants the cell is judged on.
    const OX = 3, OY = -1;                                         // the family's 2x frame, 3 cells right and a row up
    const V = {top: 12 + OY, bot: 15 + OY, l: 12 + OX, r: 29 + OX};   // the visor band at rest
    const EYE_C = [14 + OX, 26 + OX];                              // each slit's left col, 2 wide
    const ANT_C = 30 + OX;                                         // the antenna's left col; rows 2..7 of the family
    const SURF = 36;                                               // the sea's surface row
    const HINGE = [34, 21 + OX];                               // the scallop's hinge, under the feet
    const TAU = 2 * Math.PI;

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const copy = g => g.map(row => row.slice());
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    // Paint one layer over another, moved dy rows.
    const over = (g, top, dy = 0) => { for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (top[r][c]) put(g, r + dy, c, top[r][c]); return g; };

    // The creature: the family pose at 2x moved OX across and OY down.
    function creature(ping) {
      const src = upscale(echoPing(ping), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (src[r][c]) put(g, r + OY, c + OX, src[r][c]);
      return g;
    }
    // Faces: the band plain; the family's slits; a blink (the bottom row of each slit); happy arches.
    const band = g => { for (let r = V.top; r <= V.bot; r++) for (let c = V.l; c <= V.r; c++) g[r][c] = VISOR; return g; };
    const slits = g => { band(g); for (let r = V.top; r <= V.bot; r++) for (const c0 of EYE_C) for (let c = c0; c < c0 + 2; c++) g[r][c] = EYE; return g; };
    const blinked = g => { band(g); for (const c0 of EYE_C) for (let c = c0 - 1; c < c0 + 3; c++) g[V.bot][c] = EYE; return g; };
    const arches = g => {
      band(g);
      for (const c0 of EYE_C) { put(g, V.top + 1, c0, EYE); put(g, V.top + 1, c0 + 1, EYE); put(g, V.top + 2, c0 - 1, EYE); put(g, V.top + 2, c0 + 2, EYE); }
      return g;
    };
    // The antenna in the wind: the family's stalk erased and redrawn leaning right a col every two rows.
    function bend(g, lean, ping) {
      for (let r = 0; r < 8 + OY; r++) for (let c = ANT_C; c <= ANT_C + 1; c++) g[r][c] = 0;
      for (let r = 2 + OY; r < 8 + OY; r++) {
        const dx = Math.round(lean * (7 + OY - r) / 2);
        for (let c = ANT_C; c <= ANT_C + 1; c++) put(g, r, c + dx, r < 4 + OY ? (ping ? PING : BODY) : BODY);
      }
      return g;
    }

    // The scallop. The fan: a half disc over the hinge, 13 ribs fanning out from it, pale pink with the rib lines in
    // rose, and a scalloped rim (each rib bulges a cell past the furrow beside it); drawn behind the creature, its edge
    // shows past both sides of the body and between the legs.
    const RIBS = 13, FAN_R = 15;
    function fan(g) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const y = r + 0.5 - HINGE[0], x = c + 0.5 - HINGE[1], d = Math.hypot(y, x);
        if (y > 0) continue;
        const a = Math.atan2(-y, x) / Math.PI;                      // 0 at the right, 1 at the left
        const u = (a * RIBS) % 1;                                   // across one rib, 0..1
        const rim = FAN_R + 1.2 * Math.sin(Math.PI * u);           // the scallop: a bulge per rib
        if (d > rim) continue;
        const furrow = (u < 0.17 || u > 0.83) && d > 3;
        g[r][c] = d > rim - 1 || furrow ? ROSE : SHELL;
      }
      return g;
    }
    // The lip under the feet: a shallow bowl 26 across and 3 deep, its rim a rose row, sitting in the water.
    function lip(g) {
      for (let r = 34; r <= 38; r++) for (let c = 0; c < N; c++) {
        const y = r + 0.5 - 33.6, x = c + 0.5 - HINGE[1];
        if ((x * x) / 169 + (y * y) / 12 > 1) continue;
        g[r][c] = r === 34 ? ROSE : (Math.abs(x) > 11.5 ? ROSE : SHELL);
      }
      return g;
    }

    // The cloud creature in the top left corner: a cluster of puffs in foam white with a band of visor and two eye
    // cells; swell 0..1 fills its cheeks, shut closes its eyes, and mouth puckers a pair of lips round a dark hole at
    // its right edge, pointing at the creature.
    const PUFFS = [[5.0, 5.0, 3.8], [2.4, 2.6, 2.4], [2.2, 7.6, 2.4], [8.4, 2.6, 2.4], [8.6, 7.4, 2.6]];
    function cloud(g, swell, mouth, shut) {
      const dx = Math.round(swell);
      for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) {
        for (const [cy, cx, rad] of PUFFS) if (Math.hypot(r + 0.5 - cy, c + 0.5 - cx) <= rad + 1.1 * swell) { put(g, r, c, FOAM); break; }
      }
      for (let c = 2; c <= 8; c++) for (const r of [3, 4]) put(g, r, c + dx, VISOR);
      for (const ec of [3, 7]) { put(g, 4, ec + dx, EYE); if (!shut) put(g, 3, ec + dx, EYE); }
      if (mouth) {
        const mc = 9, mr = 9;
        for (let r = mr - 1; r <= mr + 1; r++) for (let c = mc; c <= mc + 2; c++) put(g, r, c, FOAM);
        put(g, mr, mc + 1, EYE); put(g, mr, mc + 2, EYE);
      }
      return g;
    }
    // Wind streaks from the mouth: dashes 4 cells long on three lanes over the creature's head, travelling right
    // 5 cells a frame from the moment w (frames since the blow began); strength fades them out.
    const LANES = [[2, 0], [4, 3], [6, 1]];                        // [row, stagger]
    function wind(g, w, strength) {
      if (strength <= 0) return g;
      for (const [row, st] of LANES) for (let k = 0; k < 3; k++) {
        const head = 14 + 5 * w + st * 2 - k * 11;
        if (head < 14 || (strength < 1 && k === 0)) continue;
        for (let c = head - 3; c <= head; c++) if (c >= 14) put(g, row + (c > 24 ? 1 : 0), c, PING);
      }
      return g;
    }
    // Roses on the breeze, in front of everything: each born at the mouth at frame t0, it travels right and falls,
    // turning an eighth each frame, and is gone once it reaches the water.
    const ROSES = [[0, 7.0, 3.4, 0.05], [2, 8.0, 3.0, 0.10], [3, 6.0, 3.8, 0.12], [5, 8.0, 2.8, 0.16], [6, 7.0, 3.6, 0.20]];
    // A bloom 3 across: a plus of petals round a white heart, then the same turned an eighth (the corners out).
    const BLOOM = [['.r.', 'rwr', '.r.'], ['r.r', '.w.', 'r.r']];
    function roses(g, w) {
      for (const [t0, y0, vx, fall] of ROSES) {
        const t = w - t0;
        if (t < 0) continue;
        const x = 12 + vx * t, y = y0 + fall * t * t * 3 + 1.5 * Math.sin(t * 1.3);
        if (y > SURF - 2 || x > N) continue;
        const b = BLOOM[t % 2], r = Math.round(y), c = Math.round(x);
        b.forEach((line, dr) => [...line].forEach((ch, dc) => { if (ch !== '.') put(g, r + dr, c + dc, ch === 'w' ? FOAM : ROSE); }));
      }
      return g;
    }

    // The sea: the surface row and three rows of blue under it; wave curls on the surface every 7 cols and two broken
    // foam lines under it, all scrolled left s cells.
    function sea(g, s) {
      for (let r = SURF; r < N; r++) for (let c = 0; c < N; c++) g[r][c] = SEA;
      const m = (c, p) => ((c + s) % p + p) % p;
      for (let c = 0; c < N; c++) {
        const k = m(c, 7);
        if (k === 1 || k === 2) put(g, SURF - 1, c, FOAM);         // the curl's crest
        if (k === 3) put(g, SURF, c, FOAM);                        // its lip falling forward
        if (k === 0) put(g, SURF, c, FOAM);
        if (m(c + 3, 14) < 4) put(g, SURF + 2, c, FOAM);
        if (m(c + 9, 7) < 2) put(g, SURF + 3, c, FOAM);
      }
      return g;
    }

    // A scene: the sea, the fan, the creature with its face and pose, the lip, then the cloud, the wind and the roses
    // on top. o: face, ping, lean (the antenna's bend), swell, mouth, shut (the cloud's eyes), w (frames since the blow
    // began, null before it), strength (the wind's, 0..1); f the frame index for the waves and the bob.
    function scene(f, o) {
      const g = blank();
      const s = Math.round(14 * 2 * f / NF);                       // two periods of 14 a loop
      const bob = Math.round(0.5 + 0.5 * Math.sin(TAU * 2 * f / NF)); // 0 or 1, two swells a loop
      // The creature and its shell on one layer, so a dark rim can be cut round the creature where the fan meets it.
      const c = creature(!!o.ping);
      (o.face || slits)(c);
      if (o.lean) bend(c, o.lean, !!o.ping);
      const shell = fan(blank());
      const group = blank();
      for (let r = 0; r < N; r++) for (let k = 0; k < N; k++) {
        if (c[r][k]) { group[r][k] = c[r][k]; continue; }
        let near = false;
        for (let a = -1; a <= 1 && !near; a++) for (let b = -1; b <= 1; b++) if (inside(r + a, k + b) && c[r + a][k + b]) { near = true; break; }
        if (shell[r][k] && !near) group[r][k] = shell[r][k];
      }
      lip(group);
      sea(g, s);
      over(g, group, bob);
      // The water laps over the bottom of the lip.
      for (let k = 0; k < N; k++) if (g[N - 1][k] !== FOAM) g[N - 1][k] = SEA;
      const sky = blank();
      cloud(sky, o.swell || 0, !!o.mouth, !!o.shut);
      if (o.w !== undefined && o.w !== null) wind(sky, o.w, o.strength === undefined ? 1 : o.strength);
      // The sky's marks take a cell only where the creature and its shell are not and do not touch.
      const placed = over(blank(), group, bob);
      for (let r = 0; r < SURF - 1; r++) for (let k = 0; k < N; k++) {
        if (!sky[r][k]) continue;
        let near = false;
        for (let a = -1; a <= 1 && !near; a++) for (let b = -1; b <= 1; b++) if (inside(r + a, k + b) && placed[r + a][k + b]) { near = true; break; }
        if (!near) g[r][k] = sky[r][k];
      }
      if (o.w !== undefined && o.w !== null) roses(g, o.w);
      return g;
    }

    // The frames: listed first (the waves need the loop's length), drawn after.
    let NF = 1;
    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    // 1. Rest, the loop anchor: the shell rides the swell, a slow blink.
    F(260); F(260); F(150, {face: blinked}); F(260); F(260);
    // 2. Inhale: the cloud creature fills its cheeks, its eyes shut.
    F(220, {swell: 0.35, shut: true}); F(220, {swell: 0.7, shut: true}); F(300, {swell: 1, shut: true});
    // 3. Blow: the mouth opens, the wind streams right, the antenna bends and pings, roses tumble, eyes shut happy.
    F(180, {swell: 0.9, mouth: true, w: 0, lean: 0.5});
    F(180, {swell: 0.8, mouth: true, w: 1, lean: 1, face: arches});
    F(180, {swell: 0.7, mouth: true, w: 2, lean: 1.5, face: arches, ping: true});
    F(180, {swell: 0.6, mouth: true, w: 3, lean: 1.5, face: arches, ping: true});
    F(180, {swell: 0.55, mouth: true, w: 4, lean: 1.5, face: arches});
    F(180, {swell: 0.5, mouth: true, w: 5, lean: 1.5, face: arches});
    F(180, {swell: 0.45, mouth: true, w: 6, lean: 1.5, face: arches, ping: true});
    F(180, {swell: 0.4, mouth: true, w: 7, lean: 1.5, face: arches, ping: true});
    F(180, {swell: 0.3, mouth: true, w: 8, lean: 1.5, face: arches});
    F(180, {swell: 0.2, mouth: true, w: 9, lean: 1, face: arches});
    // 4. Settle: the cloud goes slack, the wind thins out, the antenna stands back up and the last rose lands.
    F(200, {swell: 0.1, w: 10, strength: 0.5, lean: 0.5});
    F(220, {w: 11, strength: 0.3});
    F(240, {w: 12, strength: 0});
    F(260, {w: 13, strength: 0});
    F(150, {face: blinked}); F(260); F(260);
    F(360); F(260); F(260); F(260); F(260);

    NF = specs.length;
    const frames = specs.map(({hold, o}, f) => ({hold, grid: scene(f, o)}));
    return {
      name: 'ECHO · birth of venus', key: 'echo_birth_of_venus', fwname: 'echo birth of venus', category: 'Idle', size: N,
      // Big tier: 30 frames of 1600 bytes (48000 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, after Sandro Botticelli, The Birth of Venus (about 1485, public domain), 40 cell lattice (12 px cells, the creature at 2x): the ECHO creature stands on a pale pink scallop shell riding the swell of a blue sea whose wave curls scroll past, and blinks; a little cloud creature in the top left corner with its own visor and eyes fills its cheeks and blows, wind streaks stream over the creature\'s head, its antenna bends with the wind and pings, its eyes shut happy and pink roses tumble across in front of it and drop toward the sea, then the cloud goes slack and all settles back to the rest; judge whether it reads at a glance as the painting, whether the shell reads as a scallop, whether the wind and the bending antenna read as a breeze, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes (also the cloud's eyes and mouth), 3 visor, 4 ping (the antenna tip, the wind
      // streaks), 5 feet, 6 shell pink, 7 rose (ribs, rims, roses), 8 sea blue, 9 foam white (the
      // cloud creature, wave curls, foam lines, the roses' hearts)
      palette: [...ECHO_PALETTE.slice(0, 6), '#f6d2c4', '#e8708e', '#2a5c9a', '#eafffb'],
      frames,
    };
  })();

  L.register([echoBirthOfVenus]);
})(typeof window !== 'undefined' ? window : globalThis);