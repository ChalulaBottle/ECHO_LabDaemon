# Growth: ECHO_LabDaemon (Clawdmeter)

Purpose: firmware and host daemon for a small desk display that shows Claude Code usage and reacts to what Claude is doing.
State: growing
Lane: free (the Pages site publishes only from port/waveshare-lcd-4)
Rules: never commit to or push branch port/waveshare-lcd-4, it is the only branch the Pages site deploys from. A cloud session may be working on branch cloud/culture-batch-3 (20 new animations); do not duplicate that work. Flashing a board, re-pairing Bluetooth and verifying touch or audio on hardware are operator steps. The touch sensor on this unit has a hardware fault (GT911 never acks) and no firmware change fixes that.

## Next improvements, in order

1. Pull the compute_layout breakpoint in firmware/src/ui.cpp (height 460 or more selects the large layout, otherwise compact) out into a small pure function in its own header, the same way the splash sizing decision already lives in splash_geometry.h with its own host test. Why: firmware/test holds exactly one host level test, test_splash_geometry, and this layout rule has none, even though it is the same kind of pure sizing decision. Size: M. Done when: the new header exists, ui.cpp calls into it, a host test beside test_splash_geometry exercises both sides of 460 px, and pio run -d firmware still builds every declared env.

2. Fill in tools/README.md with the rest of the tools folder's pipeline. Why: the README only documents scrape_claudepix.js and convert_to_c.js, but add_echo_anims.py, add_csb_anims.py, gen_attach.js, anim_gif.py, sticker.py, sticker_diecut.py and sticker_neon.py live in the same folder with no written purpose or run order, so a session has to read every script's source to see how they fit together. Size: S. Done when: tools/README.md names each of those scripts, what each one reads and writes, and where it sits relative to scrape and convert.

3. Add a committed capture tool for the waveshare_lcd_4 board's fbshot serial command that writes an already upright PNG. Why: project notes record that fbshot dumps from the 4 inch board come out rotated 180 degrees and have to be corrected before committing, and the fix for that currently lives only in a throwaway scratch helper outside the repo, not in tools/. Size: S. Done when: a script under tools/ talks the same wire format serial_cmd.cpp describes for fbshot, writes a correctly oriented PNG, and is referenced from the root README's screenshot section.

4. Turn the IO expander ordering gotcha into a checked script instead of a read only warning. Why: docs/porting/adding-a-board.md already calls out that the IO expander must be released before the display or touch library begins, because missing this exact ordering has silently broken a port before; nothing currently checks it automatically. Size: M. Done when: a script parses each board's board_init.cpp under boards/, confirms any IO expander init or release call textually precedes the first display or touch init call in the same file, fails loudly on a violation, and is named as a pre bring up step in adding-a-board.md.

5. Refresh boards/template/caps.cpp so it lists every current BoardCaps field. Why: BoardCaps has grown pwr_toggles_stats and fixed_brightness since the device abstraction refactor, each with a comment explaining why most boards leave it unset, but the template a new port is told to copy only sets the original fields, so the newer ones are invisible to whoever bootstraps the next board from it. Size: S. Done when: template/caps.cpp sets or explicitly comments every BoardCaps field, matching hal/board_caps.h.

## Grown recently

- 2026-10-22: GROWTH.md seeded for the growth rotation.
