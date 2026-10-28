// Lab creatures, culture batch three (operator, 2026-10-28: "produce me another 25 animations", "be creative and keep
// the style and theming and branding we have already developed"). October: drawn from scratch in code on the ECHO
// base. The three digits are the one thing written in this batch: big plain blocks, nothing else.
//
// ECHO · countdown: a split flap card over the creature counts 3, 2, 1, the creature braces lower on each, and on zero
// the card bursts and the creature hops with its arms up. 40 cell lattice, 12 px cells on the 480 panel: the body is
// the family's 20 cell pose repeated exactly twice across and down, moved 6 rows down so the card fits over it.
//   card      a dark slate tile 13 across and 13 tall with its corners cut, a split line across its middle as on a
//             split flap board, and a cream digit 7 across and 10 tall in strokes two cells thick, its bottom half a
//             row lower under the line. A flip is one frame: the top half already shows the next digit while the
//             bottom half still shows the last.
//   count     on 3 the creature looks up at the card (the top half of each slit) and blinks; on 2 it crouches a row
//             (the body comes down, the legs get shorter) with its eyes narrowed; on 1 it crouches two rows with its
//             eyes squeezed to a line and shivers a cell left and right.
//   burst     the card flashes into a gold disc with a cream heart, then eight rays of gold tipped in orange fly out, wider each frame,
//             leaving ping and cream sparkles; the creature hops seven rows with its arms straight up (the upper arms
//             stay at the shoulders, forearms drawn up from them), eyes shut happy, antenna ping.
//   land      it lands in the deep crouch, rises, stands happy while the sparkles fade, blinks.
//   reset     a blank card drops back into place and flips to 3, which is the first frame.
// Loop: 24 frames, 5.42 s; the reset flips onto the first frame, so the last frame runs into it without a seam.
// Palette: 0..5 the ECHO palette unchanged (2 is also the card's split line, 4 also the sparkles); 6 card slate, 7
// digit cream (also the sparkles), 8 gold (the rays), 9 orange (the rays' tips). Index 6 is not ping here, so nothing
// goes through echoGlitch. Big tier: 24 frames of 1600 cells are 38400 bytes of firmware table, so it ships only on
// boards built with SPLASH_BIG. One closure, so echoCountdown is the only name it adds; registered at the end of this
// file.
(function (root) {
  if (typeof require !== 'undefined' && !root.BENCH_LIB) require('./anims.js');
  const L = root.BENCH_LIB;
  const {upscale, echoPing, ECHO_PALETTE} = L;

  const echoCountdown = (() => {
    const N = 40, K = 2;                                           // lattice; a 20 cell pose repeated K times
    const BODY = 1, EYE = 2, VISOR = 3, PING = 4, CARD = 6, CREAM = 7, GOLD = 8, TIPS = 9;
    // Constants the cell is judged on.
    const DY = 6;                                                  // the family's 2x frame, 6 rows down
    const LEGS = 28;                                               // the first leg row of the 2x pose
    const EYE_C = [14, 26];                                        // each slit's left col, 2 wide
    const CARD_BOX = {t: 0, b: 12, l: 14, r: 26}, SPLIT = 6;       // the card, and the row its split line runs on
    const DIGIT_AT = [1, 17];                                      // the digit's top left
    const CENTRE = [6.5, 20.5];                                    // where the burst starts
    const TAU = 2 * Math.PI;

    const blank = () => Array.from({length: N}, () => new Array(N).fill(0));
    const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const put = (g, r, c, v) => { if (inside(r, c)) g[r][c] = v; return g; };
    const rect = (g, r0, c0, r1, c1, v) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) put(g, r, c, v); return g; };

    // The digits, 7 across and 10 tall, strokes two cells thick.
    const DIGITS = {
      3: ['#######', '#######', '.....##', '.....##', '.######', '.######', '.....##', '.....##', '#######', '#######'],
      2: ['#######', '#######', '.....##', '.....##', '#######', '#######', '##.....', '##.....', '#######', '#######'],
      1: ['...##..', '..###..', '.####..', '...##..', '...##..', '...##..', '...##..', '...##..', '.######', '.######'],
    };
    // The card: top is the digit its top half shows, bottom the digit its bottom half shows (null for blank).
    function card(g, top, bottom) {
      rect(g, CARD_BOX.t, CARD_BOX.l, CARD_BOX.b, CARD_BOX.r, CARD);
      for (const [r, c] of [[CARD_BOX.t, CARD_BOX.l], [CARD_BOX.t, CARD_BOX.r], [CARD_BOX.b, CARD_BOX.l], [CARD_BOX.b, CARD_BOX.r]]) put(g, r, c, 0);
      for (const [d, rows, gap] of [[top, [0, 4], 0], [bottom, [5, 9], 1]]) {
        if (!d) continue;
        for (let i = rows[0]; i <= rows[1]; i++) [...DIGITS[d][i]].forEach((ch, j) => { if (ch === '#') put(g, DIGIT_AT[0] + i + gap, DIGIT_AT[1] + j, CREAM); });
      }
      for (let c = CARD_BOX.l; c <= CARD_BOX.r; c++) put(g, SPLIT, c, EYE);
      return g;
    }

    // The creature: crouch rows lower with legs that many rows shorter, or hop rows higher with its arms up; sx
    // shivers it sideways.
    function creature(o) {
      const src = upscale(echoPing(!!o.ping), K), g = blank();
      const crouch = o.crouch || 0, hop = o.hop || 0, sx = o.sx || 0;
      if (o.armsUp) {
        rect(src, 16, 6, 21, 9, 0); rect(src, 16, 32, 21, 35, 0);
        rect(src, 8, 6, 13, 7, BODY); rect(src, 8, 34, 13, 35, BODY);
      }
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (!src[r][c]) continue;
        if (r < LEGS) put(g, r + DY + crouch - hop, c + sx, src[r][c]);
        else if (r >= LEGS + crouch) put(g, r + DY - hop, c + sx, src[r][c]);
      }
      return g;
    }
    // Faces, at the visor's row on the panel (top) and the shiver (sx).
    const band = (g, top, sx) => rect(g, top, 12 + sx, top + 3, 29 + sx, VISOR);
    const up = (g, top, sx) => { band(g, top, sx); for (const c of EYE_C) rect(g, top, c + sx, top + 1, c + sx + 1, EYE); return g; };
    const slits = (g, top, sx) => { band(g, top, sx); for (const c of EYE_C) rect(g, top, c + sx, top + 3, c + sx + 1, EYE); return g; };
    const narrow = (g, top, sx) => { band(g, top, sx); for (const c of EYE_C) rect(g, top + 2, c + sx, top + 3, c + sx + 1, EYE); return g; };
    const squeeze = (g, top, sx) => { band(g, top, sx); for (const c of EYE_C) rect(g, top + 2, c + sx - 1, top + 2, c + sx + 2, EYE); return g; };
    const arches = (g, top, sx) => { band(g, top, sx); for (const c of EYE_C) { rect(g, top + 1, c + sx, top + 1, c + sx + 1, EYE); put(g, top + 2, c + sx - 1, EYE); put(g, top + 2, c + sx + 2, EYE); } return g; };

    // The burst: eight rays out from the card's centre, four cells long, starting further out each step; sparkles
    // left behind from step 2 on, thinning out as fade rises.
    function burst(g, k) {
      if (k === 0) for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {   // the first step: the card flashes gold
        const d = Math.hypot(r + 0.5 - CENTRE[0], c + 0.5 - CENTRE[1]);
        if (d <= 3.6) put(g, r, c, d <= 1.6 ? CREAM : GOLD);
      }
      for (let a = 0; a < 8; a++) {
        const th = TAU * a / 8 + TAU / 16, r0 = 4 + 3.4 * k;
        for (let s = 0; s < 4; s++) put(g, Math.floor(CENTRE[0] + Math.sin(th) * (r0 + s)), Math.floor(CENTRE[1] + Math.cos(th) * (r0 + s)), s === 3 ? TIPS : GOLD);
      }
      return g;
    }
    const SPARKS = [[3, 6], [9, 34], [2, 30], [14, 3], [6, 12], [12, 37], [1, 20], [16, 33]];
    function sparkles(g, fade, k) {
      SPARKS.forEach(([r, c], i) => {
        if (i < fade * 2) return;
        const ink = (i + k) % 2 ? PING : CREAM;
        put(g, r, c, ink);
        if ((i + k) % 3 === 0) for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(g, r + a, c + b, ink);
      });
      return g;
    }

    // A scene. o: card [top, bottom] (or null with the card gone), burst step, sparkles [fade, k], the creature's
    // crouch, hop, armsUp, shiver sx, face, ping.
    function scene(o) {
      const g = blank();
      if (o.card) card(g, o.card[0], o.card[1]);
      if (o.burst !== undefined) burst(g, o.burst);
      if (o.sparkles) sparkles(g, ...o.sparkles);
      const cr = creature(o);
      (o.face || slits)(cr, 12 + DY + (o.crouch || 0) - (o.hop || 0), o.sx || 0);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (cr[r][c]) g[r][c] = cr[r][c];
      return g;
    }

    // The frames.
    const specs = [];
    const F = (hold, o = {}) => specs.push({hold, o});
    // 1. Three, the loop anchor: it looks up at the card, blinks.
    F(400, {card: [3, 3], face: up}); F(400, {card: [3, 3], face: up}); F(90, {card: [3, 3], face: narrow}); F(400, {card: [3, 3], face: up});
    // 2. Two: the flip, a crouch, the eyes narrowed, a ping.
    F(110, {card: [2, 3], face: up});
    F(400, {card: [2, 2], crouch: 1, face: narrow}); F(400, {card: [2, 2], crouch: 1, face: narrow, ping: true});
    // 3. One: the flip, the deep crouch, the eyes squeezed, a shiver.
    F(110, {card: [1, 2], crouch: 1, face: narrow});
    F(400, {card: [1, 1], crouch: 2, face: squeeze}); F(150, {card: [1, 1], crouch: 2, face: squeeze, sx: 1}); F(150, {card: [1, 1], crouch: 2, face: squeeze, sx: -1});
    // 4. The burst and the hop, arms up, happy, a ping.
    F(100, {burst: 0, hop: 3, armsUp: true, face: arches, ping: true});
    F(110, {burst: 1, hop: 6, armsUp: true, face: arches, ping: true});
    F(150, {burst: 2, sparkles: [0, 0], hop: 7, armsUp: true, face: arches});
    F(150, {burst: 3, sparkles: [0, 1], hop: 6, armsUp: true, face: arches});
    F(110, {sparkles: [0, 2], hop: 3, armsUp: true, face: arches});
    // 5. The landing: the deep crouch, up again, standing happy while the sparkles fade, a blink.
    F(110, {sparkles: [1, 3], crouch: 2, face: arches}); F(140, {sparkles: [1, 4], crouch: 1, face: arches});
    F(400, {sparkles: [2, 5], face: arches}); F(400, {sparkles: [3, 6], face: arches});
    F(90, {face: narrow}); F(400);
    // 6. The reset: a blank card is back, and flips to 3.
    F(140, {card: [null, null]}); F(110, {card: [3, null], face: up});

    const frames = specs.map(({hold, o}) => ({hold, grid: scene(o)}));
    return {
      name: 'ECHO · countdown', key: 'echo_countdown', fwname: 'echo countdown', category: 'Active', size: N,
      // Big tier: 24 frames of 1600 bytes (38400 bytes) ship only on boards built with SPLASH_BIG.
      tier: 'big',
      intent: 'Proposal, a countdown, 40 cell lattice (12 px cells, the creature at 2x moved down under a dark split flap card with a big cream block digit): on 3 it looks up at the card and blinks, the card flips to 2 and it crouches a row with its eyes narrowed and an antenna ping, flips to 1 and it crouches deeper with its eyes squeezed shut and shivers, then the card bursts into eight gold rays and sparkles and the creature hops with both arms straight up, eyes shut happy, lands in a crouch, stands happy while the sparkles fade and blinks, and a blank card comes back and flips to 3; judge whether the digits read at a glance and are the only thing written, whether the brace reads as bracing, whether the hop reads as joy, and whether it is still this creature.',
      // 0 transparent, 1 body, 2 eyes (also the card's split line), 3 visor, 4 ping (also the sparkles), 5 feet,
      // 6 card slate, 7 digit cream (also the sparkles), 8 gold (the rays), 9 orange (the rays' tips)
      palette: [...ECHO_PALETTE.slice(0, 6), '#26323c', '#fff1d6', '#ffc93c', '#ff6a3d'],
      frames,
    };
  })();

  L.register([echoCountdown]);
})(typeof window !== 'undefined' ? window : globalThis);
