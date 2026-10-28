// Culture creatures: the ECHO creature plays the set pieces everyone knows (operator, 2026-10-28, culture batch three:
// "be creative and keep the style and theming and branding we have already developed"). Drawn from scratch in code on
// the ECHO base; a film lends its format only (the setting, the composition and the gesture), never its monster, its
// names or its art, and no words appear in the picture.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  // ECHO · kaiju: the giant monster film format with no named monster. The ECHO creature is the giant: it stands waist
  // deep in a night city, stomps, roars, knocks a tower over and then, being this creature, sets it back up. 40 cell
  // lattice, 12 px cells on the 480 panel: the body is the family's 20 cell pose repeated exactly 2 times across and
  // down, 1 col right and 4 rows down, so the head, the antenna and the raised arms stand clear against the sky and
  // the towers come up to its middle. The scale comes from the towers: the tallest reaches its arm stubs.
  // A first pass drew it at 3x, cropped by the frame; it read as a wall of teal with a visor on it, not as a giant,
  // because no edge of the silhouette showed against the sky. At 2x the whole head and both arms do.
  //   sky       a night navy, a crescent moon in the top left, a few stars that twinkle in turn, and two searchlight
  //             beams from below the skyline that sweep back and forth across the sky, crossing over its head; the
  //             beams light only the sky, so they pass behind the giant and the towers.
  //   towers    nine near black towers stand along the bottom in front of the giant, with gold windows lit at random;
  //             the ones under its mouth stay short so the roar shows, and its legs peek between the lowest roofs. A
  //             stomp jolts the whole skyline down a row for a frame, flips which windows are lit and kicks up dust
  //             at the street.
  //   stomp     the loop anchor: it stands, blinks, then rises a row and comes down twice; the tower right of its
  //             mouth wobbles on the second stomp.
  //   roar      both arms swing up into raised claws, the eyes squeeze shut into two chevrons and a wide mouth opens
  //             under the visor with a row of teeth top and bottom; the antenna pings.
  //   topple    one big stomp and the wobbling tower tips over to the right about its base corner, 12, 30, 55, 80 and
  //             90 degrees, drawn by rotating the tower and its windows, and lands across the street in a cloud of dust.
  //   oops      the eyes shrink to two small dots and a round mouth opens; it holds that a beat.
  //   fix       it crouches down into the city, a forearm comes out of the right arm stub in front of the towers with
  //             a dark crease round it, and the fist takes the fallen tower near its middle and stands it back up, 60,
  //             30, 0 degrees, a small wobble, then lets go; it straightens up with happy arches, a smile and a ping,
  //             and stands as the loop began.
  // Loop: 30 frames, 6.1 s. The searchlights sweep one full swing a loop on the frame index and the stars twinkle on
  // a cycle that divides it, so the last frame runs into the first without a seam.
  // Palette: 0..5 the ECHO palette unchanged (2, the eye dark, is also the towers, the mouths and the chevrons; 5,
  // the feet, also the forearm's crease); 6 night sky navy, 7 window gold, 8 searchlight blue (the beams and the
  // dust), 9 pale moonlight (the moon, the stars, the teeth, the dust's specks). Index 6 is not ping here, so nothing
  // goes through echoGlitch. Big tier: 30 frames of 1600 cells are 48000 bytes of firmware table, so it ships only on
  // boards built with SPLASH_BIG. One closure, so echoKaiju is the only name it adds; registered at the end of this
  // file.
  const echoKaiju = (() => {
    const N = 40, K = 2;                                           // lattice; a 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, SKY = 6, GOLD = 7, BEAM = 8, PALE = 9;
    const TOWER = EYE;
    // Constants the cell is judged on.
    const DX = 1, DY = 5;                                          // where the family's 2x frame sits on the panel
    const V = {top: 12 + DY, l: 12 + DX, r: 29 + DX};              // the visor band: 2x rows 12..15, cols 12..29
    const EYE_C = [14 + DX, 26 + DX];                              // each slit's left col, 2 wide
    const MOUTH_C = 21;                                            // the mouth's centre col, under the visor's middle
    // Towers along the street, bottoms on the last row: [left col, width, height]. FALL is the one that topples,
    // about its bottom right corner PIVOT [row, col].
    const TOWERS = [[0, 4, 13], [4, 3, 8], [7, 5, 10], [12, 4, 7], [16, 5, 11], [21, 4, 9], [25, 5, 13], [34, 6, 12]];
    const FALL = 6, PIVOT = [40, 30];
    const CROUCH = 5;                                              // rows down while it fixes the tower
    const FORE_R = 1.4, FIST_R = 1.9;                              // the right forearm, at 2x
    const GRIP = [-2.5, -7];                                         // where the fist takes the tower, tower local
    const TAU = 2 * Math.PI, DEG = Math.PI / 180;

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    // Sprites are rows of letters: k dark, w pale; a dot leaves the cell alone.
    const INK = {k: EYE, w: PALE};
    const stamp = (g, art, r0, c0) => { art.forEach((line, dr) => [...line].forEach((ch, dc) => { if (ch !== '.') put(g, r0 + dr, c0 + dc, INK[ch]); })); return g; };
    const hash = (a, b, c, d) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + d * 19.3) * 43758.5453; return s - Math.floor(s); };
    // Distance from (y, x) to the segment p q.
    const seg = (y, x, p, q) => {
      const vy = q[0] - p[0], vx = q[1] - p[1], L2 = vy * vy + vx * vx;
      const t = L2 ? Math.max(0, Math.min(1, ((y - p[0]) * vy + (x - p[1]) * vx) / L2)) : 0;
      return Math.hypot(y - p[0] - t * vy, x - p[1] - t * vx);
    };

    // The sky: navy, two searchlight wedges from below the street, the moon and the stars.
    let NF = 1;                                                    // frames a loop, set once the frames are listed
    const LIGHTS = [[41, 4, 0.35, 0.0], [41, 36, -0.35, Math.PI]]; // [origin row, origin col, mean angle, phase]
    const STARS = [[1, 13], [3, 23], [7, 17], [2, 29], [8, 26], [5, 10], [1, 37], [10, 2], [12, 38]];
    function sky(f) {
      const g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) g[r][c] = SKY;
      for (const [oy, ox, mean, ph] of LIGHTS) {
        const th = mean + 0.35 * Math.sin(TAU * f / NF + ph);       // radians off straight up, plus leans right
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const y = oy - (r + 0.5), x = c + 0.5 - ox;
          if (y > 0 && Math.abs(Math.atan2(x, y) - th) < 0.075) g[r][c] = BEAM;
        }
      }
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        const y = r + 0.5, x = c + 0.5;
        if (Math.hypot(y - 4.5, x - 4.5) <= 2.9 && Math.hypot(y - 3.6, x - 5.7) > 2.5) g[r][c] = PALE;
      }
      STARS.forEach(([r, c], i) => { if ((f + 2 * i) % 6) g[r][c] = PALE; });
      return g;
    }

    // The giant: the family pose at 2x on the panel, b rows down, the arms raised for the roar (each arm cell outside
    // the body reflected up about the arm's top row, so the hand stubs point up like claws).
    function giant(b, ping, armsUp) {
      const src = upscale(echoPing(ping), K), g = blank();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (!src[r][c]) continue;
        const arm = r >= 14 && r <= 21 && (c < 10 || c > 31);
        const rr = arm && armsUp ? 27 - r : r;
        put(g, rr + DY + b, c + DX, src[r][c]);
      }
      return g;
    }
    // Faces on the band, b rows down.
    const band = (g, b) => { for (let r = V.top + b; r <= V.top + b + 3; r++) for (let c = V.l; c <= V.r; c++) put(g, r, c, VISOR); return g; };
    const slits = (dx = 0) => (g, b) => { band(g, b); for (let r = V.top + b; r <= V.top + b + 3; r++) for (const c0 of EYE_C) for (let c = c0; c < c0 + 2; c++) put(g, r, c + dx, EYE); return g; };
    const blinked = (g, b) => { band(g, b); for (const c0 of EYE_C) for (let c = c0; c < c0 + 2; c++) put(g, V.top + b + 3, c, EYE); return g; };
    const squeeze = (g, b) => { band(g, b); stamp(g, ['kk.', '.kk', '.kk', 'kk.'], V.top + b, EYE_C[0]); stamp(g, ['.kk', 'kk.', 'kk.', '.kk'], V.top + b, EYE_C[1] - 1); return g; };
    const dots = (g, b) => { band(g, b); for (const c0 of EYE_C) { put(g, V.top + b + 1, c0, EYE); put(g, V.top + b + 1, c0 + 1, EYE); } return g; };
    const arches = (g, b) => { band(g, b); for (const c0 of EYE_C) stamp(g, ['.kk.', 'k..k'], V.top + b + 1, c0 - 1); return g; };
    const MOUTHS = {
      roar: ['kkkkkkkkk', 'kwkwkwkwk', 'kkkkkkkkk', 'kkwkwkwkk', '.kkkkkkk.'],
      o: ['.kk.', 'k..k', '.kk.'],
      smile: ['k.....k', '.kkkkk.'],
    };
    const mouth = (g, b, m) => { const art = MOUTHS[m]; return stamp(g, art, V.top + b + 5, MOUTH_C - Math.floor(art[0].length / 2)); };

    // A tower's cells, rotated a degrees clockwise about its bottom right corner (a = 0 stands it up), as the tower
    // local (x, y) of each panel cell it covers, counted from its left edge and its top. Windows sit on the local
    // lattice, so they turn with it.
    function towerCells(k, a, jolt) {
      const [x0, w, h] = TOWERS[k], out = [];
      const pr = 40, pc = x0 + w;
      const ca = Math.cos(a * DEG), sa = Math.sin(a * DEG);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const yp = r + 0.5 - pr - jolt, xp = c + 0.5 - pc;
        const x = xp * ca + yp * sa, y = -xp * sa + yp * ca;   // back into the tower's own frame
        if (x >= -w && x < 0 && y >= -h && y < 0) out.push([r, c, Math.floor(x + w), Math.floor(y + h)]);
      }
      return out;
    }
    function towers(g, o) {
      const seed = o.jolt ? 1 : 0, j = o.jolt ? 1 : 0;
      TOWERS.forEach(([, w, h], k) => {
        if (k === FALL) return;
        for (const [r, c, lx, ly] of towerCells(k, 0, j)) g[r][c] = win(k, w, h, lx, ly, seed) ? GOLD : TOWER;
      });
      for (let r = 25; r <= 27; r++) put(g, r + j, 38, TOWER);   // a spire on the right tower
      for (let c = 0; c < N; c++) g[N - 1][c] = TOWER;           // the street
      const [, w, h] = TOWERS[FALL];                               // the one that falls goes on top of its neighbours
      for (const [r, c, lx, ly] of towerCells(FALL, o.fall || 0, j)) g[r][c] = win(FALL, w, h, lx, ly, seed) ? GOLD : TOWER;
      return g;
    }
    // Windows: the others lit at random; the one that falls lit on every floor, so the eye finds it before it goes.
    const win = (k, w, h, lx, ly, seed) => lx % 2 === 1 && lx < w - 1 && ly < h - 1 && (k === FALL ? ly % 2 === 1 : ly % 3 === 1 && hash(k, lx, ly, seed) < 0.5);
    // The forearm: from the elbow in the right arm stub to a fist, a crease round it over whatever lies behind.
    function forearm(g, b, fist) {
      const elbow = [17.5 + DY + b, 33.5 + DX];
      const under = g.map(r => r.slice());
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const y = r + 0.5, x = c + 0.5;
        const d = Math.min(seg(y, x, elbow, fist) - FORE_R, Math.hypot(y - fist[0], x - fist[1]) - FIST_R);
        if (d <= 0) g[r][c] = BODY;
        else if (d <= 1 && under[r][c] !== SKY && under[r][c] !== BEAM) g[r][c] = FEET;
      }
      return g;
    }
    // Where the fist holds the tower when it lies at a degrees.
    const gripAt = a => {
      const ca = Math.cos(a * DEG), sa = Math.sin(a * DEG), [x, y] = GRIP;
      return [PIVOT[0] + x * sa + y * ca, PIVOT[1] + x * ca - y * sa];
    };
    // Dust: puffs of searchlight blue at the street with pale specks, size 1 for a stomp, 2 and 3 for the fall.
    function dust(g, size, f) {
      const P = size === 1 ? [[39.5, 6, 1.5], [39.5, 20, 1.5], [39.5, 33, 1.5]] : [[38.5, 33, 0.8 + size], [37.5, 38, 0.4 + size], [39, 28.5, size - 0.5]];
      for (const [cy, cx, rad] of P) for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const d = Math.hypot(r + 0.5 - cy, c + 0.5 - cx);
        if (d <= rad) g[r][c] = (size > 1 && hash(r, c, f, 3) < 0.2) ? PALE : BEAM;
      }
      return g;
    }

    // A scene: the sky, the giant over it with its face and mouth, the towers in front, then the forearm and the dust.
    // o: b (the giant's rows down), ping, arms ('up'), face, mouth, jolt, fall (degrees), fist (the angle the tower
    // is held at), dust (1..3).
    function scene(o, f) {
      const g = sky(f), b = o.b || 0;
      const c = giant(b, !!o.ping, o.arms === 'up');
      (o.face || slits())(c, b);
      if (o.mouth) mouth(c, b, o.mouth);
      for (let r = 0; r < N; r++) for (let k = 0; k < N; k++) if (c[r][k]) g[r][k] = c[r][k];
      towers(g, o);
      if (o.fist !== undefined) forearm(g, b, gripAt(o.fist));
      if (o.dust) dust(g, o.dust, f);
      return g;
    }

    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    // 1. Stomp, the loop anchor: it stands, blinks, then two stomps; the tower by its mouth wobbles on the second.
    F(260); F(260); F(90, {face: blinked});
    F(180, {b: -1}); F(160, {b: 1, jolt: true, dust: 1}); F(200);
    F(180, {b: -1}); F(160, {b: 1, jolt: true, dust: 1, fall: 6}); F(200, {fall: -3});
    // 2. The roar: claws up, eyes squeezed, the mouth wide, a ping.
    F(240, {b: -1, arms: 'up', face: squeeze, mouth: 'roar', ping: true});
    F(280, {b: -1, arms: 'up', face: squeeze, mouth: 'roar'});
    F(260, {arms: 'up', face: squeeze, mouth: 'roar', ping: true, jolt: true});
    // 3. The topple: one big stomp and the tower goes over to the right, landing in a cloud of dust.
    F(160, {b: -1});
    F(140, {b: 1, jolt: true, dust: 1, fall: 12});
    F(120, {fall: 30, face: slits(1)});
    F(110, {fall: 55, face: slits(1)});
    F(110, {fall: 80, face: slits(1)});
    F(170, {fall: 90, face: slits(1), jolt: true, dust: 3});
    // 4. Oops: small dot eyes and a round mouth, held a beat while the dust settles.
    F(320, {fall: 90, face: dots, mouth: 'o', dust: 2});
    F(320, {fall: 90, face: dots, mouth: 'o'});
    // 5. The fix: it crouches, the forearm comes down, takes the tower and stands it back up, a wobble, lets go;
    // it straightens up happy, a ping.
    F(220, {b: CROUCH, fall: 90, fist: 90, face: slits(1)});
    F(160, {b: CROUCH, fall: 60, fist: 60, face: slits(1)});
    F(160, {b: CROUCH, fall: 30, fist: 30});
    F(160, {b: CROUCH, fist: 0});
    F(140, {b: CROUCH, fall: -4, fist: -4});
    F(220, {b: 2, face: arches, mouth: 'smile', ping: true});
    F(300, {face: arches, mouth: 'smile'});
    F(260, {mouth: 'smile', ping: true});
    F(260); F(260);

    NF = specs.length;
    const frames = specs.map(({hold, o}, f) => ({hold, grid: scene(o, f)}));
    return {
      name: 'ECHO · kaiju', key: 'echo_kaiju', fwname: 'echo kaiju', category: 'Active', size: N,
      // Big tier: 30 frames of 1600 bytes (48000 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, the giant monster film format with no named monster, 40 cell lattice (12 px cells, the creature at 2x standing waist deep in a night city of near black towers with gold windows, a crescent moon and two searchlights sweeping the sky behind it): it blinks and stomps twice, the skyline jolting and dust kicking up, a tower by its mouth wobbling, it roars with claws up, eyes squeezed into chevrons and a toothy mouth, one big stomp tips the tower over onto the street in a cloud of dust, it goes small eyed with a round mouth, then crouches, reaches down with a forearm, stands the tower back up and straightens with happy arches and a smile; judge whether it reads at a glance as a giant over a city, whether the falling tower reads as a tower turning about its base, and whether the roar stays friendly.',
      // 0 transparent, 1 body, 2 eyes (also the towers, the mouths), 3 visor, 4 ping, 5 feet (the forearm's crease),
      // 6 night sky, 7 window gold, 8 searchlight blue (beams, dust), 9 pale (moon, stars, teeth, specks)
      palette: [...ECHO_PALETTE.slice(0, 6), '#14264a', '#ffc93c', '#2f5b8f', '#dfe9f5'],
      frames,
    };
  })();

  L.register([echoKaiju]);
})(typeof window !== 'undefined' ? window : globalThis);
