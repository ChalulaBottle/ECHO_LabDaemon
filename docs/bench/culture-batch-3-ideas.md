# Culture batch three: the ideas (2026-10-28)

Operator (2026-10-28): "produce me another 25 animations and have them ready for review in the morning", "be
creative and keep the style and theming and branding we have already developed, update everything that required
the landing page, repo page, everything". The cloud brief for this batch (`CLOUD-BRIEF-culture-batch-3.md` on
`cloud/culture-batch-3`) set the families; this file is its Task 1, written before any pixels.

## The budget

The 4 inch board's app partition (max_app_8MB, 8,257,536 bytes) holds the table with the first culture batch at
6,809,891 bytes, 1,447,645 left. Twenty five animations get 1.25 MB of that between them, so each one keeps its
frame data (lattice squared times frames) at or under 52,000 bytes: 32 frames on the 40 cell lattice (12 px cells,
the creature at 2x), 14 frames on the 60 cell lattice, 130 frames on the 20. This batch is drawn on the 40 cell
lattice unless a line below says otherwise: it gives a loop of 24 to 32 frames room to move, and the creature at
2x still reads as the family at arm's length. Every animation is tier big (the stock 2.16 board is at 99 percent
of its flash), so every one ships only on boards built with SPLASH_BIG.

## The IP rule, unchanged from batch one

Everything is drawn from scratch in code and the ECHO creature plays every role. Public domain works (pre 1930 and
their makers) are credited by maker, title and date. A meme or film lends its format only (setting, composition,
gesture), never its characters, captions, logos, people or pixels, and no words appear in the picture. Nothing
trademarked in any name, key, file, caption or commit. Family friendly: the repo is public.

## Thirty three candidates, the twenty five picked marked with a star

Format: name, family, lattice, frames (estimate), bytes, tier.

Paintings, public domain:

1. * echo wanderer. Friedrich, Wanderer above the Sea of Fog (1818): the creature from behind on a dark rock, the
   fog rolling in banks below it, a slow turn of the head, an antenna ping into the mist. 40, 28, 44,800, big.
2. * echo sunflowers. Van Gogh, Sunflowers (1888): the creature as the vase, five sunflowers over its head that turn
   to follow a sun crossing the top of the frame, one petal falls. 40, 28, 44,800, big.
3. * echo water lilies. Monet, Bridge over a Pond of Water Lilies (1899): the creature on a lily pad under the
   arched bridge, rings spreading when a drop lands, a frog hop (the creature is the frog). 40, 30, 48,000, big.
4. * echo last supper. Leonardo, The Last Supper (about 1495): thirteen tiny creatures along a long table, the
   middle one spreads its arms, a ripple of gestures runs out to both ends and back. 40, 26, 41,600, big.
5. * echo napoleon. David, Napoleon Crossing the Alps (1801): the creature on a rearing horse (a bigger creature
   plays the horse), cape streaming in the wind, one arm pointing up the pass. 40, 28, 44,800, big.
6. * echo birth of venus. Botticelli, The Birth of Venus (about 1485): the creature standing on a scallop shell,
   blown to shore by a puffing cloud creature, waves under the shell. 40, 30, 48,000, big.
7. echo liberty. Delacroix, Liberty Leading the People (1830): a flag over a crowd of small creatures. Dropped:
   batch one's crosswalk already does a line of walkers and the flag would want a colour it cannot name.

Meme and film formats, the format only:

8. * echo two buttons. The sweating figure over two buttons: the creature's hand hovers between a red and a blue
   button, sweat drops, it mashes both. 40, 28, 44,800, big.
9. * echo mind blown. The gesture: the hands rise to the head, the top of the head lifts off into pixels that spray
   up and out, then rain back and reassemble. 40, 30, 48,000, big.
10. * echo facepalm. The gesture: a slow hand up over the visor, the head drops, a long hold, the hand slides off.
    40, 24, 38,400, big.
11. * echo mic drop. The gesture: a microphone held out at arm's length, released, it falls and bounces, the
    creature walks off frame. 40, 30, 48,000, big.
12. * echo deal with it. The format: sunglasses descend from the top of the frame in steps and land on the visor,
    the chin lifts, a sparkle. 40, 24, 38,400, big.
13. * echo kaiju. A giant monster film format with no named monster: the creature huge behind a skyline of dark
    towers, stomping, one tower topples, a searchlight sweeps. 40, 30, 48,000, big.
14. echo moon landing. The 1969 footage format: a flag planted on grey ground, low gravity hops, Earth in the sky.
    Dropped: echo moonwalk hd already owns the moon on this board.
15. echo slow clap. Dropped: too close to echo high five at a glance.

Hacker and CTF life:

16. * echo flag capture. Capture the flag: the creature runs at a flag on a pole, snatches it, plants it on its own
    side, a small burst. 40, 30, 48,000, big.
17. * echo packet sniff. Packets stream past as small blocks on a wire; the creature holds a magnifier over the
    wire, one packet lights red, it plucks it out and holds it up. 40, 28, 44,800, big.
18. * echo hash cracked. A padlock over the creature with four hex cells spinning like a slot machine; they stop
    one at a time, the lock springs open, the creature pumps a fist. 40, 28, 44,800, big.
19. * echo terminal glow. A dark room: the creature's face lit from below by a terminal, lines of blocks scroll up,
    a cursor blinks, the glow pulses with the typing. 40, 28, 44,800, big.
20. echo phishing. A rod pulls an envelope out of the water, the creature shakes its head and throws it back.
    Dropped: the envelope reads as mail, not as a lure, at 12 px cells.

October and Halloween:

21. * echo pumpkin. The creature carves a pumpkin: three cuts, the lid comes off, a candle goes in, the face
    lights and flickers. 40, 30, 48,000, big.
22. * echo ghost sheet. The creature under a sheet, two eye holes, floating in a slow bob; the sheet lifts and the
    creature peeks out, then drops it again. 40, 26, 41,600, big.
23. * echo countdown. A big digit over the creature flips 3, 2, 1, the creature braces, then a burst and a hop.
    40, 26, 41,600, big.
24. echo bat wings. Small wings flap with a moon behind. Dropped: the wings would hide the family's arms.

The lab:

25. * echo server rack. A rack beside the creature, two columns of LEDs blinking green; one row goes red, the
    creature pats the rack, the row goes green, it nods. 40, 28, 44,800, big.
26. * echo gpu fan. A big fan behind the creature spins up from still to a blur, the antenna bends back in the
    wind, heat shimmer lines rise, it spins down. 40, 28, 44,800, big.
27. * echo slack ping. A chat bubble with a single dot pops in at the top right, the creature perks up, the
    antenna pings, the dot count climbs to three, the creature slumps. 40, 26, 41,600, big.
28. echo laptop bag. The creature closes a laptop and zips it into a bag. Dropped: three props in 40 cells
    crowd the creature out.

Moods for the idle rotation (category Idle):

29. * echo sleepy. A yawn (the visor stretches tall), the eyes droop in three steps, the head nods forward, it
    snaps back awake, a blink. 40, 26, 41,600, big.
30. * echo curious. A small bright thing drifts across; the head tilts, the eyes track it, the antenna bends toward
    it, it reaches, the thing pops. 40, 28, 44,800, big.
31. * echo focused. The eyes narrow to slits, a thin reticle draws itself round the visor, everything else goes
    still, one slow blink, the reticle fades. 40, 24, 38,400, big.
32. echo proud. Chest out, a small medal, a sparkle. Dropped: job done already covers the pose.
33. echo celebrate. Dropped: job done.

Twenty five picked. Estimated frame data for the batch: 1,112,000 bytes, under the 1.25 MB set aside, leaving the
lcd_4 app partition about 335 KB of headroom.
