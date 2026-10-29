// Fable, the working set. Four cells registered into the bench through BENCH_LIB: the tier neutral
// "echo work", "echo write", "echo read" (anims_thinking.js) and "job done" (anims.js) remade in
// Fable's marks, so a Fable session shows Fable while it works. Same beats and about the same loop
// lengths as the cells they replace, so the hooks can swap them one for one.
//
//   fable work   seated at a slate desk; the hands tap in bursts of three and two, each press
//                flicks the visor to ping, the blink is Fable's closed eye lines
//   fable write  steps two cells left and types three lines on a small page; the four eyes close
//                ranks into a line and look at the page while typing
//   fable read   the four eyes close ranks into a line and drift left, centre, right across the
//                visor, snapping back at each line end; a blink and an antenna ping turn the page
//   fable done   two bounces, thumbs up, the visor flashes white, confetti in ping, amber and flash
//
// The Fable marks, as model fable in anims_models.js, are in every frame: the amber antenna tip
// (it lights in ping only on an event, as the family's tip does), the two cell amber ear on the top
// left corner (3,5) and (2,4), and the four sideways eyes on the lower visor row at cols 6, 8, 12,
// 14 with row 6 a clean visor track. The closed ranks line is fable gaze's (anims.js): cols 7, 9,
// 11, 13 shifted by o in -1..1. The blink is fable eyes' SHUT: closed eye lines 222 either side.
// All four are tier 'big' (the stock 2.16 board is full; they ship only with SPLASH_BIG), 20 cells,
// at most 22 frames and 8 palette entries each.
(function (root) {
  if (typeof require !== 'undefined' && !root.BENCH_LIB) require('./anims.js');
  const L = root.BENCH_LIB;
  const {G, clone, set, ECHO_PALETTE, echoBase} = L;

  // Indices: the first six ECHO tokens in ECHO_PALETTE order (transparent, body 17836f, dark 06090b,
  // echo 35e0c0, ping 6fe9ff, feet 0f5a4c), then Fable amber, then one per cell extra.
  const BODY = 1, DARK = 2, ECHO = 3, PING = 4, AMBER = 6, X = 7;
  const PAL = ECHO_PALETTE.slice(0, 6);
  const FABLE_AMBER = '#e0b25a';

  // The Fable body: echoBase with the ear painted; the tip and the visor come from face().
  const fableBody = (() => { const b = clone(echoBase); set(b, 3, 5, AMBER); set(b, 2, 4, AMBER); return b; })();

  // Eye sets, each a list of [row, col] on the visor.
  const PAIRS = [6, 8, 12, 14].map(c => [7, c]);                                   // Fable at rest
  const LINE = o => [7, 9, 11, 13].map(c => [7, c + o]);                           // closed ranks, o -1..1
  const SHUT = [6, 7, 8, 12, 13, 14].map(c => [7, c]);                             // the blink

  // The one face factory: repaint the visor band (rows 6..7, cols 6..14), paint the eyes, set the
  // antenna tip. dx moves the face with a shifted body (write).
  function face(g, {visor = ECHO, eye = DARK, eyes = PAIRS, tip = AMBER, dx = 0} = {}) {
    const b = clone(g);
    for (const r of [6, 7]) for (let c = 6; c <= 14; c++) set(b, r, c + dx, visor);
    for (const [r, c] of eyes) set(b, r, c + dx, eye);
    set(b, 1, 15 + dx, tip);
    return b;
  }
  function shiftX(g, dx) {
    const b = g.map(() => new Array(G).fill(0));
    for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) { const s = c - dx; if (s >= 0 && s < G) b[r][c] = g[r][s]; }
    return b;
  }
  const F = (hold, grid) => ({hold, grid});
  // Holds stay within 80..600 ms: a longer rest of the original is the same grid held over n equal
  // frames (n = ceil(hold / 600)), so the beat and the loop length are kept.
  const H = (hold, grid) => { const n = Math.ceil(hold / 600), out = []; for (let i = 0; i < n; i++) out.push(F(Math.round(hold / n), grid)); return out; };

  // 1. fable work. echo work's beats exactly: rest, blink, rest, a burst of three keystrokes, rest,
  // a burst of two, an antenna ping, rest; a keystroke is a lift (140 ms) then a press that flicks
  // the visor to ping (100 ms). The desk is one slate tone (2c4045) over rows 12..13 with legs at its
  // ends: echo work's second desk tone gave its palette slot to Fable amber (8 colours at most).
  const work = (() => {
    const SLATE = X;
    const desk = clone(fableBody);
    for (let c = 1; c <= 18; c++) { set(desk, 12, c, SLATE); set(desk, 13, c, SLATE); }
    for (let r = 14; r <= 16; r++) { set(desk, r, 1, SLATE); set(desk, r, 18, SLATE); }
    const pose = (left, right, o = {}) => {
      const b = face(desk, o);
      if (left) set(b, 11, 3, BODY);
      if (right) set(b, 11, 17, BODY);
      return b;
    };
    const rest = (o = {}) => pose(true, true, o);
    const key = hand => [F(140, pose(hand !== 'L', hand !== 'R')), F(100, rest({visor: PING}))];
    return {
      name: 'Fable · work', key: 'fable_work', fwname: 'fable work', category: 'Active', tier: 'big',
      intent: "Proposal. echo work in Fable's marks: seated at a slate desk with the amber ear and antenna tip and the four sideways eyes, the hands tap in bursts of three and two keystrokes and every press flicks the visor to ping for 100 ms, the blink is the closed eye lines, the antenna pings once; judge whether the four eyes still read through the ping flick.",
      palette: [...PAL, FABLE_AMBER, '#2c4045'],
      frames: [
        ...H(900, rest()), F(120, rest({eyes: SHUT})), F(600, rest()),
        ...key('L'), ...key('R'), ...key('L'), ...H(700, rest()),
        ...key('R'), ...key('L'), F(140, rest({tip: PING})), ...H(760, rest()),
      ],
    };
  })();

  // 2. fable write. echo write's page and timing: the creature steps two cells left, a cursor (flash)
  // blinks on the empty page, advances one cell per 450 ms as 1 cell text (echo) appears, returns at
  // each line end, blinks over the full page, and the page clears as the antenna pings. While the
  // page is empty the four rest in pairs; once typing starts they close ranks to the right, looking
  // at the page. echo write opens with four cursor blink frames; here three (on 500, off 450, on 600,
  // 350 ms short of its 1.9 s, the longest hold allowed) so the cell stays at 22 frames.
  const write = (() => {
    const CURSOR = X, TEXT = ECHO, DX = -2;
    const body = shiftX(fableBody, DX);
    const ROWS = [12, 14, 16], C0 = 15, CHAR = 450;
    const LINES = [[1, 1, 1, 0, 1], [1, 1, 0, 1], [1, 1, 1]];
    function page(n, cursor, {eyes = LINE(1), tip = AMBER} = {}) {
      const b = face(body, {dx: DX, eyes, tip});
      let k = 0;
      LINES.forEach((line, li) => line.forEach((on, p) => { if (k++ < n && on) set(b, ROWS[li], C0 + p, TEXT); }));
      if (cursor) set(b, cursor[0], cursor[1], CURSOR);
      return b;
    }
    const START = [ROWS[0], C0], frames = [];
    frames.push(F(500, page(0, START, {eyes: PAIRS})), F(450, page(0, null, {eyes: PAIRS})),
                F(600, page(0, START, {eyes: PAIRS})));
    let n = 0;
    LINES.forEach((line, li) => {
      for (let p = 0; p < line.length; p++) {
        n++;
        let cur = [ROWS[li], C0 + p + 1];
        if (cur[1] >= G) cur = li + 1 < LINES.length ? [ROWS[li + 1], C0] : null;
        frames.push(F(CHAR, page(n, cur)));
      }
      if (li + 1 < LINES.length && C0 + line.length < G) frames.push(F(500, page(n, [ROWS[li + 1], C0])));
    });
    const END = [ROWS[2], C0 + LINES[2].length];
    frames.push(F(500, page(n, null)), F(500, page(n, END)), F(500, page(n, null)),
                F(120, page(n, END, {eyes: SHUT})), F(400, page(n, END)));
    frames.push(F(450, page(0, null, {eyes: PAIRS, tip: PING})));
    return {
      name: 'Fable · write', key: 'fable_write', fwname: 'fable write', category: 'Active', tier: 'big',
      intent: "Proposal. echo write in Fable's marks: the creature steps two cells left and a one cell cursor types three lines of 1 cell text on a small page beside it, 450 ms a character; the four sideways eyes rest in pairs on the empty page and close ranks to the right to watch the text, a blink over the full page, then the page clears as the antenna pings; judge whether the closed ranks line reads as looking at the page.",
      palette: [...PAL, FABLE_AMBER, '#eafffb'],
      frames,
    };
  })();

  // 3. fable read. echo read's beats: three fixations a line (700, 650, 850 ms), a jump back for the
  // next line, three lines, then a blink with an antenna ping turns the page. Fable reads in closed
  // ranks, the four as one line drifting left, centre, right (fable gaze's drift), so the sweep has
  // the room the pairs lack (they already touch the visor ends).
  const read = (() => {
    const line = () => [...H(700, face(fableBody, {eyes: LINE(-1)})), ...H(650, face(fableBody, {eyes: LINE(0)})),
                        ...H(850, face(fableBody, {eyes: LINE(1)}))];
    return {
      name: 'Fable · read', key: 'fable_read', fwname: 'fable read', category: 'Thinking', tier: 'big',
      intent: "Proposal. echo read in Fable's marks: the four sideways eyes close ranks into one line and step left to right across the visor (700, 650, 850 ms), jumping back at each line end, and after every third line a blink of the closed eye lines and an antenna ping turn the page; judge whether the moving line of four reads as reading.",
      palette: [...PAL, FABLE_AMBER],
      frames: [...line(), ...line(), ...line(), F(140, face(fableBody, {eyes: SHUT, tip: PING}))],
    };
  })();

  // 4. fable done. job done's beats and holds: rest, two bounces, arm up, five confetti frames that
  // sway, the held pose, arm down, a long rest. The rest tip is Fable amber and lights ping where job
  // done's tip is lit. The visor flashes white with the four eyes dark on it. Confetti is job done's
  // pattern with its amber in Fable amber, except the three pieces that touched the ear in a bobbed
  // or a standing frame, (1,5), (1,3) and (2,3): they move to (0,7), (0,2) and (1,1) so the ear keeps
  // its own two cell shape on every confetti frame.
  const done = (() => {
    const FLASH = X;
    const empty = () => Array.from({length: G}, () => new Array(G).fill(0));
    const bob = (g, dy) => { const b = empty(); for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) if (g[r][c]) set(b, r + dy, c, g[r][c]); return b; };
    const base = (tip = AMBER) => face(fableBody, {tip});
    function thumbsUp(g, flash) {
      const b = clone(g);
      for (let r = 7; r <= 9; r++) { set(b, r, 16, BODY); set(b, r, 17, 0); }
      set(b, 10, 17, 0);
      for (let r = 3; r <= 7; r++) set(b, r, 17, BODY);
      set(b, 3, 18, BODY); set(b, 4, 18, BODY);
      set(b, 2, 18, ECHO); set(b, 1, 18, ECHO);
      if (flash) for (let r = 6; r <= 7; r++) for (let c = 6; c <= 14; c++) if (b[r][c] === ECHO) b[r][c] = FLASH;
      return b;
    }
    const CONFETTI = [
      [[0, 7, PING], [0, 9, AMBER], [2, 12, FLASH], [0, 2, PING], [3, 1, PING], [0, 14, PING]],
      [[0, 6, AMBER], [1, 1, FLASH], [1, 11, FLASH], [3, 19, AMBER], [2, 0, FLASH], [0, 12, PING]],
      [[2, 7, FLASH], [1, 1, AMBER], [0, 4, PING], [3, 13, AMBER], [1, 19, PING], [2, 10, AMBER]],
    ];
    const confetti = (g, k) => { const b = clone(g); for (const [r, c, v] of CONFETTI[k % 3]) if (b[r][c] === 0) set(b, r, c, v); return b; };
    return {
      name: 'Fable · done', key: 'fable_done', fwname: 'fable done', category: 'Mode', tier: 'big',
      intent: "Proposal. job done in Fable's marks: two bounces, the right arm up with a thumbs up, the visor flashes white under the four dark sideways eyes, confetti pops in ping, Fable amber and flash, a sway on the pose, arm down; judge whether the amber ear still reads among the confetti.",
      palette: [...PAL, FABLE_AMBER, '#eafffb'],
      frames: [
        F(600, base()),
        F(130, bob(base(PING), -1)), F(130, base(PING)), F(130, bob(base(PING), -1)), F(160, base(PING)),
        F(110, thumbsUp(base(PING), false)),
        F(160, confetti(thumbsUp(base(PING), true), 0)),
        F(160, confetti(bob(thumbsUp(base(AMBER), true), -1), 1)),
        F(160, confetti(thumbsUp(base(PING), true), 2)),
        F(160, confetti(bob(thumbsUp(base(AMBER), true), -1), 0)),
        F(160, confetti(thumbsUp(base(PING), true), 1)),
        ...H(700, thumbsUp(base(PING), false)),
        F(110, base(PING)),
        ...H(1400, base()),
      ],
    };
  })();

  L.register([work, write, read, done]);
})(typeof window !== 'undefined' ? window : globalThis);
