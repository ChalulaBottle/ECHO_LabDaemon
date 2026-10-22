# Cloud brief: culture batch three, 20 new ECHO creature animations, and the site gallery

Written 2026-10-21 for a Claude Code cloud session the operator starts with `claude --cloud`. Read this whole file
first, then `CLAUDE.md`, then the RESUME STATE in `plans/creatures-and-modes.md` and `plans/labdaemon.md`.
Operator request, verbatim: "run some more animation ideas and update the Labdaemon website and repo in a cloud
session have it complete another 20 animations."

## Where you start

- This branch, `cloud/culture-batch-3`, is cut from `origin/feat/culture-batch-2` (16 culture creatures, bench
  files `docs/bench/anims_culture_*.js`, media in `docs/media/culture/`). Build the animations here.
- The newest site work (the 110 tile creatures gallery from `tools/site_gallery.js`, captions in
  `tools/site_gallery_captions.json`, Cite this site, the music video page) is on `origin/site-pending-2026-10-17`.
  It is NOT live yet.
- GitHub Pages publishes `port/waveshare-lcd-4` from `/docs`. A push to that branch is a public deploy.

## The two hard stops

1. Never push to `port/waveshare-lcd-4` and never merge into it. The operator merges site PRs; that merge is the
   deploy.
2. Never flash a board (`pio ... -t upload`). Building is fine; flashing is the operator's.

## Task 1: ideas first (commit before any pixels)

Write `docs/bench/culture-batch-3-ideas.md`: 30 candidate ideas, each one line of intent, the family, the
lattice size, a frame count estimate and whether it is tier big. Pick the 20 strongest for variety. Families to
draw from (mix them; do not repeat a batch one or two concept):
- More culture: public domain paintings only (pre 1930 works and their makers), and meme or film FORMATS only,
  never a copyrighted character, logo or still. The ECHO creature plays every role.
- Hacker and CTF life: capture the flag, packet sniffing, a terminal glow, first blood, a cracked hash.
- Season: October and Halloween (a pumpkin, a ghost sheet, a candle), a countdown to an event.
- The lab: a server rack, a GPU fan spinning up, a laptop in a bag hibernating, a Slack ping.
- Moods for the idle rotation: sleepy, proud, curious, focused, celebrating.
Keep it family friendly; this repo is public.

## Task 2: build the 20

For each animation, follow exactly what batch two did (open three of its bench files and their media first):
- `docs/bench/anims_culture3_<slug>.js` in the same data shape (name, category, palette of at most 10 colours,
  frames as cell grids, per frame holds, `size`, `tier` when big), registered wherever batch two registered its
  files so the bench page shows it.
- A GIF and a sheet in `docs/media/culture/` made with the repo's own tools (`tools/anim_gif.py` and the sheet
  path batch two used). Look at every GIF yourself and fix what reads badly at device size.
- A one line caption in `tools/site_gallery_captions.json`.
- Regenerate the firmware header only with the generator (`tools/add_echo_anims.py`, or the culture path batch
  two used); never hand edit `firmware/src/splash_animations.h`. Respect the tier rules in that script's header
  (big ones go behind SPLASH_BIG).
- If PlatformIO is available, `pio run -d firmware -e waveshare_lcd_4` and the stock env named in `CLAUDE.md`
  must still build and fit their partitions; record the flash percentages. If it is not available, say so.
- README tables and creature counts updated.

## Task 3: the site

- Make `site/culture-batch-3` from `origin/site-pending-2026-10-17`, bring in the batch three bench files and media,
  rerun `tools/site_gallery.js` so the gallery shows the new 20 with their captions and states (on device: not
  yet; next flash), and check the gallery page loads with every image resolving (a local static server and a
  headless browser if you have one).

## Task 4: hand back

- Open two DRAFT pull requests: `cloud/culture-batch-3` into `release/increment-4` (the creatures), and
  `site/culture-batch-3` into `port/waveshare-lcd-4` (the site; the operator's merge publishes it).
- Update the RESUME STATE in `plans/creatures-and-modes.md`: what shipped, commit hashes, flash numbers, what
  needs flashing, the two PR links.
- Final message: the 20 with one line each, anything dropped and why, and the PR links.

## House style and rules

No bold in captions, badges or docs; no zero padded numbers; no arrow glyphs; plain human sentences. Credit line
stays "Created and designed by Digital Orukami, inspired by Clawdmeter". Nothing private in this public repo: no
addresses, hostnames beyond the board names already here, keys, people's names or private project details.
