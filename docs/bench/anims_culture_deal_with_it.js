// Culture creatures: the ECHO creature plays the set pieces everyone knows (operator, 2026-10-28, culture batch three:
// "be creative and keep the style and theming and branding we have already developed"). Drawn from scratch in code on
// the ECHO base; a meme lends its format only (the setting, the composition and the gesture), never its characters,
// its captions or its art, and no words appear in the picture.
//
// Loaded after anims.js (bench: script tag; export: tools/bench_to_json.js globs anims_*.js).
(function (root) {
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  // ECHO · deal with it: the meme format of a pair of dark sunglasses that come down from the top of the frame in
  // stiff steps and land on a face that then plays it cool. The format only: plain dark shades with no brand, no
  // caption, and the ECHO creature wears them. 40 cell lattice, 12 px cells on the 480 panel: the body is the
  // family's 20 cell pose repeated exactly 2 times across and down, moved 3 rows down so the shades have the top of
  // the frame to come down through.
  //   shades    24 cells across and 6 tall: a grey rim with a bridge, two near black lenses rounded at the bottom
  //             corners and a white glint in the top left of each lens. They land with the rim one row over the
  //             visor band, so the lenses cover the band and the eyes and the visor's teal shows only in the nose
  //             gap between the lenses.
  //   rest      the loop anchor: the family's slit eyes, a blink, then a glance up and to the right.
  //   descent   the shades come down in five stiff steps of 4 rows at 260 ms each, the meme's own stepping, no
  //             easing; the eyes look up at them and hold still as they close in.
  //   land      a one frame dip: the torso drops a row onto its legs as the shades hit, then settles.
  //   cool      the chin lifts: the torso rises a row off its legs (the legs grow a row, standing tall), a one sided
  //             smirk comes up under the shades, a white sparkle swells and shrinks on the shades' top right corner,
  //             a white shine runs across both lenses left to right, and the antenna pings twice through a long hold.
  //   lift      the chin comes back down and the shades go back up the way they came, three quick steps of 6 rows,
  //             the eyes blinking under them; the loop opens on the rest again.
  // Loop: 29 frames, 6.2 s. The torso never moves more than a row and the smirk is two rows tall, so the shades are
  // the one big motion and read on their own.
  // Palette: 0..5 the ECHO palette unchanged (2 is also the smirk); 6 white (the glints and the sparkle's core), 7
  // the shades' grey rim, 8 the lenses' near black (lighter than the panel so the shades still show against it on the
  // way down), 9 a pale ping for the sparkle's arms. Index 6 is not ping here, so nothing goes through echoGlitch.
  // Big tier: 29 frames of 1600 cells are 46400 bytes of firmware table, so it ships only on boards built with
  // SPLASH_BIG. One closure, so echoDealWithIt is the only name it adds; registered at the end of this file.
  const echoDealWithIt = (() => {
    const N = 40, K = 2;                                           // lattice; a 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, FEET = 5, WHITE = 6, RIM = 7, LENS = 8, PALE = 9;
    // Constants the cell is judged on.
    const OY = 3;                                                  // the family's 2x frame, 3 rows down
    const LEGS = 28;                                               // family rows 28..33 at 2x are the legs
    const SHADE_C = 9;                                             // the shades' left col: 24 across, over the band
    const LAND = 12 + OY - 1;                                      // the shades' top row when on: one over the band
    const STEPS = [-5, -1, 3, 7, 11];                              // the descent, 4 rows a step, then LAND
    const UP = [8, 2, -4];                                         // the lift, 6 rows a step

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    // Sprites are rows of letters: r rim, d lens, w white, k dark; a dot leaves the cell alone.
    const INK = {r: RIM, d: LENS, w: WHITE, k: EYE};
    const stamp = (g, art, r0, c0) => { art.forEach((line, dr) => [...line].forEach((ch, dc) => { if (ch !== '.') put(g, r0 + dr, c0 + dc, INK[ch]); })); return g; };

    // The creature: the family pose at 2x, OY rows down, its torso t rows off where it stands. A raised torso leaves
    // its legs drawn at both heights, so they grow a row; a lowered one sits a row into them.
    function pose(t, ping) {
      const src = upscale(echoPing(ping), K), g = blank();
      const legs = y => { for (let r = LEGS; r < LEGS + 6; r++) for (let c = 0; c < N; c++) if (src[r][c]) put(g, r + y, c, src[r][c]); };
      legs(OY);
      if (t < 0) legs(OY + t);
      for (let r = 0; r < LEGS; r++) for (let c = 0; c < N; c++) if (src[r][c]) put(g, r + OY + t, c, src[r][c]);
      return g;
    }
    // Faces on the band at the torso's height: the family's slits slid dx; a blink (the bottom row of each slit).
    const V = t => ({top: 12 + OY + t, bot: 15 + OY + t, l: 12, r: 29});
    const EYE_C = [14, 26];                                        // each slit's left col, 2 wide
    const band = (g, t) => { const v = V(t); for (let r = v.top; r <= v.bot; r++) for (let c = v.l; c <= v.r; c++) g[r][c] = VISOR; return g; };
    const slits = (dx = 0) => (g, t) => { band(g, t); const v = V(t); for (let r = v.top; r <= v.bot; r++) for (const c0 of EYE_C) for (let c = c0; c < c0 + 2; c++) g[r][c + dx] = EYE; return g; };
    // Looking up: the slits shorten to the top half of the band.
    const up = (dx = 0) => (g, t) => { band(g, t); const v = V(t); for (let r = v.top; r <= v.top + 1; r++) for (const c0 of EYE_C) for (let c = c0; c < c0 + 2; c++) g[r][c + dx] = EYE; return g; };
    const blinked = (g, t) => { band(g, t); const v = V(t); for (const c0 of EYE_C) for (let c = c0; c < c0 + 2; c++) g[v.bot][c] = EYE; return g; };

    // The shades, 24 x 6: rim and bridge, the lenses rounded at the bottom, a glint in each lens's top left.
    const SHADES = [
      'rrrrrrrrrrrrrrrrrrrrrrrr',
      'rdwwdddddddrrdwwdddddddr',
      'rdwddddddddrrdwddddddddr',
      'rdddddddddd..ddddddddddr',
      '.rddddddddr..rddddddddr.',
      '..rrrrrrrr....rrrrrrrr..'];
    // The smirk under the shades: one corner up, the line running left from it.
    const SMIRK = ['......k', 'kkkkkk.'];
    // The sparkle: a white core and pale arms, small (1) or big (2).
    function sparkle(g, r, c, size) {
      put(g, r, c, WHITE);
      for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        put(g, r + a, c + b, size > 1 ? WHITE : PALE);
        if (size > 1) put(g, r + 2 * a, c + 2 * b, PALE);
      }
      return g;
    }

    // The shine: a white diagonal two cells wide that runs across the lenses, its foot s cols in from the shades' left.
    function shine(g, r0, s) {
      for (let dr = 1; dr <= 4; dr++) for (const k of [0, 1]) {
        const c = SHADE_C + s + k + (4 - dr);
        if (inside(r0 + dr, c) && g[r0 + dr][c] === LENS) g[r0 + dr][c] = WHITE;
      }
      return g;
    }
    // A scene. o: t (the torso's offset), face, ping, shades (their top row; null: none), smirk, shine (its foot col),
    // spark (1 or 2).
    function scene(o) {
      const t = o.t || 0;
      const g = pose(t, !!o.ping);
      (o.face || slits())(g, t);
      if (o.smirk) stamp(g, SMIRK, 21 + OY + t, 17);
      if (o.shades !== undefined && o.shades !== null) stamp(g, SHADES, o.shades, SHADE_C);
      if (o.shine !== undefined) shine(g, o.shades, o.shine);
      if (o.spark) sparkle(g, (o.shades !== undefined ? o.shades : LAND) - 1, SHADE_C + 24, o.spark);
      return g;
    }

    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    // 1. Rest, the loop anchor: a blink, a glance up and to the right.
    F(320); F(320); F(90, {face: blinked}); F(260); F(240, {face: up(1)});
    // 2. The descent: five stiff steps, the eyes up on the shades.
    for (const s of STEPS) F(260, {shades: s, face: up(0)});
    // 3. The land: a one frame dip as they hit, then settle.
    F(120, {shades: LAND + 1, t: 1}); F(200, {shades: LAND});
    // 4. Cool: the chin up, the smirk, the sparkle swells and shrinks, two pings through the hold.
    F(260, {shades: LAND - 1, t: -1, smirk: true});
    F(110, {shades: LAND - 1, t: -1, smirk: true, spark: 1});
    F(150, {shades: LAND - 1, t: -1, smirk: true, spark: 2});
    F(110, {shades: LAND - 1, t: -1, smirk: true, spark: 1});
    F(300, {shades: LAND - 1, t: -1, smirk: true, ping: true});
    F(120, {shades: LAND - 1, t: -1, smirk: true, shine: 0});
    F(120, {shades: LAND - 1, t: -1, smirk: true, shine: 7});
    F(120, {shades: LAND - 1, t: -1, smirk: true, shine: 13});
    F(120, {shades: LAND - 1, t: -1, smirk: true, shine: 19});
    F(380, {shades: LAND - 1, t: -1, smirk: true, ping: true});
    F(400, {shades: LAND - 1, t: -1, smirk: true});
    // 5. The lift: the chin down, the shades back up in three quick steps, a blink under them.
    F(200, {shades: LAND, smirk: true});
    F(110, {shades: UP[0], face: blinked});
    F(110, {shades: UP[1]});
    F(110, {shades: UP[2]});
    F(300); F(320);

    const frames = specs.map(({hold, o}) => ({hold, grid: scene(o)}));
    return {
      name: 'ECHO · deal with it', key: 'echo_deal_with_it', fwname: 'echo deal with it', category: 'Idle', size: N,
      // Big tier: 29 frames of 1600 bytes (46400 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, the meme format of sunglasses that come down from above and land on a face that then plays it cool, 40 cell lattice (12 px cells, the creature at 2x): it rests with the family\'s slit eyes and blinks, glances up, plain dark shades with a grey rim and a white glint in each lens come down from the top of the frame in five stiff steps while its eyes stay up on them, they land on the visor with a one row dip, then the chin lifts a row, a one sided smirk comes up, a sparkle swells on the shades\' corner, a shine runs across the lenses and the antenna pings twice through a long cool hold, before the shades go back up in three quick steps and it blinks; judge whether the stiff stepping reads as the meme\'s descent rather than a glitch, whether the shades read as shades over the visor rather than a black band, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes (also the smirk), 3 visor, 4 ping, 5 feet, 6 white (glints, the sparkle's
      // core), 7 the shades' grey rim, 8 the lenses' near black, 9 pale ping (the sparkle's arms)
      palette: [...ECHO_PALETTE.slice(0, 6), '#eafffb', '#6b7780', '#161b1f', '#b5f6ff'],
      frames,
    };
  })();

  L.register([echoDealWithIt]);
})(typeof window !== 'undefined' ? window : globalThis);
