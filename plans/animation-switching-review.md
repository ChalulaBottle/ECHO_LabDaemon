# Animation switching review: why the desk creature gets stuck, and how to free it

Review of 2026-10-28, read only, checkout `Temp Clawdmeter` on `release/increment-4` (HEAD da1ebd7). Operator brief:
"I want to see more of the animation options, I don't like it being stuck; review that code and how this works so
that we can improve the switching and reactions." Added the same evening: "if we are switching then we also need the
option for the larger screen as well, and the engine built in to detect which board is connected."

Evidence used: the source named below, the tray logs `%LOCALAPPDATA%\Clawdmeter\daemon.log` and `daemon.log.1` to
`daemon.log.3` (2026-10-24 to 2026-10-28), the live `state.json`, `hooks.json` and `board\` folder, and one timing run
of the hook interpreter. Nothing was changed except this file.

## 1. The path, end to end

Who decides. Three parties can name the creature, in this order of rank on the board:

1. The Claude Code hooks (`daemon/clawdmeter_hooks.py`) pick one name per event and write it to `state.json` as
   `anim`. The tray sends it as `a` inside every usage payload. On the board this is `forced_idx` (splash.cpp 161).
2. The engine's board controller (`labdaemon_engine/controllers/board.py` 32 and 33, `creature(name)` and
   `release()`) sends the cmd `{"c":"anim","v":name}`, which the board keeps as `hold_idx` (cmd.cpp 94 and 95,
   splash.cpp 861 to 879). A hold ranks below a host name: it shows only while `forced_idx` is unset (splash.cpp 877).
3. The board itself: a shuffle bag over four usage rate groups, a wildcard pool and a morning coffee bias
   (splash.cpp 889 to 923), every 6 to 14 s (splash.cpp 48 and 49, commit 00c6513), but only while neither of the
   two above is set (splash.cpp 799). That is the source at HEAD. What the linked board runs is unknown: D4 was sent
   the status cmd on both links in the logs (2026-10-27 17:36:02 and 2026-10-28 19:12:44) and left no report and no
   nack record, which most likely means its firmware predates the cmd message (02631fa, 2026-10-03). The only 2.16
   flash the plans record is `waveshare_amoled_216_c6` on 2026-10-01. If so, D4 has neither the shuffle bag and
   wildcard pool (c4b6753 and df1c153, 2 and 3 October) nor the 6 to 14 s interval (00c6513, 2026-10-17), and its
   own rotation is the older fixed group cycle. Every 127 row build is "built, not flashed" in the plans, so no board
   carries the big tier yet either.

The engine never writes `state.json`; `controllers/claude.py` only reads it (lines 23 and 24 say so, and "the last
hook to run wins"). So there is no engine and hooks fight over that file. The fight that does exist is between Claude
Code sessions: every session's hooks write the same `state.json`, and the last one wins (section 2, item 9).

Latency, one hook event to the panel:

| Step | Where | Time |
|---|---|---|
| Hook process start | Claude Code runs `python -E -S clawdmeter_hooks.py <Event>` async (SETTINGS_PLAN, hooks 193 to 205) | measured 60 to 66 ms median for a no op run, 124 ms worst of ten (Python 3.11, piped from PowerShell, so pipe start is included) |
| Lock wait | `hooks.lock`, `LOCK_WAIT_S` 3 s (hooks 181, 547 to 591) | milliseconds normally; up to 3 s behind a burst of agent events, and a run that gives up writes nothing |
| The run | read state, sidecar, maybe the transcript tail | a few ms (test bound under 100 ms in process, test_windows_hooks 772 to 781) |
| state.json write | atomic replace with retries every 5 ms for 0.5 s (hooks 454 to 458) | under 1 ms, up to 0.5 s if the tray holds the file |
| Dwell gate | `DWELL_S` 3 s (hooks 172, 820 to 824) | a tool change inside 3 s of the last change is dropped, not delayed |
| Tray tick | `WATCH_TICK` 1 s (daemon 72, wait at 2090) | 0 to 1 s; if the last usage poll is over 60 s old the tray polls the API first (daemon 1987 to 1993), adding an HTTP round trip |
| BLE write | `session.write_payload` | the log shows "State file changed" and "Sending" in the same second in almost every row; the slowest seen took 2 s (20:55:40 to 20:55:42) |
| Firmware swap | `splash_set_anim` (splash.cpp 835 to 859) from the usage handler (main.cpp 904), loop delay 5 ms | immediate: first frame drawn on receipt |

So a typical event reaches the panel in about 0.1 to 1.2 s, and the worst ordinary case is about 5 s (lock, tick,
poll). Speed is not the problem. What happens after the name lands is.

The tray also re-sends the same `a` with every 60 s usage poll (daemon 2062 to 2065) and with every `n` change. The
firmware ignores a repeat of the same name (splash.cpp 838), so a repeat neither refreshes nor releases anything.

## 2. Why it feels stuck

What the logs say first. Across daemon.log.2, daemon.log.1 and the current daemon.log (2026-10-26 13:41 to
2026-10-28 21:01, about 960 creature
changes), time on screen by host name, with any single gap capped at 30 minutes so overnight gaps do not dominate:
ultracode work 43 percent, agents join 12 percent, the device's own choice 9 percent, echo work 8, echo ssh 7, job
done 5, two agents 4, fable ultra 4, model opus 3, everything else under 2 each. The median run of one name was
10 s, but the long runs are the problem: ultracode work held 1,526 s, 1,046 s and 1,014 s in single stretches.

Since the tier hooks went live (first `fable ultra` at 20:31 today) to 21:01: fable ultra 87.8 percent, job done 6.5,
token burner 4.3, model fable 0.5, the device's own choice 0.5 (one stretch of 10 s), ultracode enter 0.3. That is
the "stuck" the operator sees: one creature, broken only by flashes of 2 to 5 s.

The rules that hold a creature, each with its file and line and a verdict.

1. A host named creature never expires on the board. splash.cpp 799 suspends the rotation while `forced_idx` is set,
   and only a different name or "" changes it (splash.cpp 835 to 846). There is no timer and no quiet lapse for it,
   although the page has one (main.cpp 266 to 275, `BLE_HOST_QUIET_MS` 90 s in ble.h 47). While a name is set the
   usage peek is suspended too (main.cpp 822), and a group change only re-shows the forced name (splash.cpp 891).
   Verdict: "the host decides" is by design (plans/creatures-and-modes.md, Activity to creature mapping), but holding
   forever was never designed; it is an accident of the hooks having no process between events and the board having
   no idea which name is a moment and which is a background. Worst case seen: `agents join` named from 1:31 to 9:37
   with the 2.16 board linked (the panel may have been asleep), then sent again on reconnect at 19:12 and held until
   19:30, so about 8 h of one name with the link up.
2. "" is rare. The hooks hand the choice back to the device only on an idle_prompt notification (hooks 924 to 927,
   and not at all while any agent or workflow is live), SessionEnd (946 to 951), the event after a "job done" when
   that event proposes nothing (816 to 819), a hand typed compact (838 to 843), and SessionStart with no known tier
   (853). On a known tier SessionStart shows the tier creature instead. In the logs "" was 34 of about 960 changes.
   Verdict: by design (the device's choice is for "nothing is happening"), but too narrow: it means the rotation,
   the wildcard pool and the 54 big tier creatures are almost never seen.
3. `agents join` has no exit. `_on_subagent_stop` names it with force when the count reaches zero (hooks 901 to 904)
   and nothing follows: if the turn's Stop already ran while agents were still working (909 to 914 then proposed the
   agents creature and set no "done"), no later event comes until the operator types again. The idle_prompt that
   would have released it most likely fired earlier, while agents were live, and did nothing (925 and 926); the log
   cannot show which hook events ran, only what the tray was sent. Verdict: accident.
   This is the 8 h run above.
4. Ultracode outranks the tier, every tool, and every session. While `side["ultra"]` is live, every main
   conversation tool call proposes ultra work (hooks 877 to 879), every subagent tool call proposes the agents
   creature (866 to 869), which is ultra work from 3 agents (790 to 793), and the flag stays live for 120 s after the
   last agent (ULTRA_GAP_S, 176) or 120 s after launch with no agent (ULTRA_GRACE_S, 175). Verdict: by design that a
   workflow is the dominant activity and wins; an accident that `side["ultra"]` is one global slot (709 to 731), so a
   workflow in one session makes every other session's tool calls show ultra work too. Today hooks.json holds two
   sessions, the workflow in c81e3dc0 and four agents in 7d288ff1, and the `n` badge sums both (`agents()` with no
   session, 651 to 653), which is why it read 6.
5. One name per state, no cycling. `tool_anim` (354 to 367), `turn_start` (773 to 783), `ultra_work` (785 to 788) and
   `agents_anim` (790 to 793) are pure functions of the event: the same event always gives the same name. The tier map
   has one ultra name per tier (TIER_ANIMS, 153 to 157). So a two hour workflow is two hours of fable ultra. Verdict:
   by design for clarity, an accident for variety. Nothing in the hooks ever cycles through candidates.
6. The dwell. A non forced proposal inside `DWELL_S` (3 s) of the last change is dropped (hooks 820 to 824), not
   queued. In a burst (Read, Grep, Edit within 2 s) the first tool shows and stays until a call lands after the 3 s;
   if none does, the first one stays until the next moment. The dwell already is a cooldown, on the leading edge.
   Its stated reason (header 103 to 107: every state.json change costs the daemon a poll) is mostly stale: the tray
   re-sends the cached usage with no API call while the last poll is under 60 s old (daemon 1987 to 1991), so the
   cost is at most one poll a minute either way. Verdict: by design, with a stale rationale; it now mainly limits BLE
   writes and makes bursts show their first tool rather than their last.
7. "job done" holds until the next event of any kind (hooks 816 to 819, 920 and 921). In one session that is the
   next prompt or the idle_prompt about a minute later, which is by design. With two sessions it is clobbered: Stop
   checks only this session's agents (912), and another session's agent tool call replaces it once the 3 s dwell has
   passed. The log shows job done at 20:34:14 replaced at 20:34:16. Verdict: accident.
8. The token burner outranks the tier at every prompt and session start (`turn_start` 774 to 776) for 60 s after the
   last reading above 500k (BURN_HOLD_S, 174). So a long session over 500k never shows `model fable` or `fable gaze`
   at a prompt. Yet during a workflow its own flash is overwritten within 2 to 5 s by the next agent tool call (log:
   20:53:03 to 20:53:08, 20:53:53 to 20:54:00, 20:55:40 to 20:55:44, 20:58:00 to 20:58:05). Verdict: by design that
   it wins at a prompt; an accident that it shadows the tier for a whole long session while being nearly invisible
   when it actually crosses. Note the zero count of `fable gaze` in the logs covers only the 30 minutes since the
   tier hooks went live, so it is weak evidence; the code path above is the real reason.
9. The last session to write wins. All sessions share one `state.json` and one `anim_t` (hooks 806 and 807, 821 and
   824). A quiet session's moment is replaced by a busy session's tool call, and the busy session's workflow paints
   every session's work as ultracode (item 4). Verdict: accident; the hooks were written for one session at a time.
10. The morning bias. On the idle and normal groups, one pick in three from 6:00 to 10:00 is a coffee creature
   (splash.cpp 172 to 210, 898 to 904), before the wildcard draw. Verdict: by design, and mild; it only acts when the
   device has the choice, which item 2 makes rare.
11. The wildcard pool is drawn only when the device picks (splash.cpp 906 to 909: one in three on groups 0 and 1, one
   in five on 2 and 3), so never while a host name is set. On top of that the usage rate group is mostly 0: the
   session percent arrives as a whole number and the ring needs 4 minutes of samples 50 s apart (usage_rate.cpp 22,
   29, 82 to 85), so a 1 percent rise in 5 minutes is the difference between idle and active. Verdict: the pool rule
   is by design (state creatures shown at random "would lie", splash.cpp 66 to 72); its reach is an accident of rule 1.
   And on D4 the pool may not exist at all (section 1, party 3).
12. The desk button gives only a moment's escape. `splash_next` (splash.cpp 814 to 824) moves to the next table row
   but leaves `forced_idx` set, so the rotation stays suspended and the button's creature then sits until the hooks
   change their name. Verdict: accident.
13. The engine's creature hold is invisible while the hooks name one (splash.cpp 877). The dashboard's creature box
   appears to do nothing during Claude work. Verdict: by design of the rank order, but it should say so on the
   dashboard.
14. The unlinked 4 inch board. E8:3D:C1:F7:6F:21 has not linked once in the four logs (2026-10-24 12:44 to now):
   532, 362, 465 and 6 failed rounds, no "Sending" line. Each round is three attempts that each end in a bare
   TimeoutError after 36 to 54 s, 2 s apart, then the 8 s reconnect cap (daemon 44 to 49, 1896 to 1939, 2121 to
   2144); one round from "Connecting" to the next "Connecting" takes 2 to 2.5 minutes, forever. Its only report on
   disk (board\E8-3D-C1-F7-6F-21.json, 2026-10-18) says "old firmware". D4:05:92:B7:8B:E2 is the one linked board.
   Effects: the larger screen shows nothing the host sends (and it would need a flash of current firmware before
   it could show the big tier); the connect lock is taken per attempt (daemon 1906), so a D4 drop can wait up to about 50 s
   behind one doomed E8 attempt; and the churn plus the state lines roll a 512 KB log in under a day (daemon.log.1
   spans 22:54 yesterday to 20:46 today), so history is short. Verdict: accident (a board that is off, out of range
   or needs pairing again), not a switching rule, but it hides every big tier creature.
15. Unknown names release silently. A name missing from a board's table hits splash.cpp 855 to 858: the current
   creature keeps playing and `forced_idx` goes to -1, so the rotation resumes. The tray does not filter names
   (daemon 349 to 385 checks only the length). Verdict: by design as a safety net; it is also the only reason a board
   with the 73 row table would ever leave a big tier name.

Nothing in the hooks ever sends a big tier name today: of every hook name and every candidate in section 3, only
`echo packet dodge` is big tier only (it sits in the SPLASH_BIG block of splash_animations.h, rows 4413 to 4468,
with `ctf hoodie hd`, `echo ssh hd` and the 51 others). The hooks' table test does not guard this: `_firmware_names`
(test_windows_hooks 104 to 111) reads every row regardless of `#ifdef SPLASH_BIG` and checks against the 127 count,
so a big tier only name would pass it.

## 3. Proposals, ranked by value

Shared constraint for all of them: the hooks have no process between events and cannot expire anything; the firmware
cannot tell a hold from a 60 s repeat of the same name; the tray ticks every second and already shapes each board's
payload. So timing rules belong in the tray. A hooks change is live on the next event (settings.json runs the working
tree); a tray change needs a tray restart; a firmware change needs a flash, and both build targets are full (lcd_4
99.5 percent after the HD batch, the 2.16 AMOLED about 99.2 percent per the build notes), so firmware proposals must
add bytes only where they remove some. The flash limits by build: lcd_4 99.5 percent, `waveshare_amoled_216` 99.3
percent (plans/labdaemon.md 21), `waveshare_amoled_216_c6` 44.9 percent (commit 72ec2e7). The rule "nothing may grow
the stock firmware" binds `waveshare_amoled_216`; which of the two 2.16 builds D4 carries is not known yet.

P1. A host name that expires in the tray. Files: `daemon/claude_usage_daemon_windows.py` (the state merge at 1980 to
1993 and the poll merge at 2062 to 2065), `daemon/tests/test_windows_state.py` or a new `test_windows_switching.py`.
Design: the tray remembers when the `anim` value last changed (not the file's mtime: `n` changes rewrite the file all
through a workflow); once the same name has stood for `HOST_HOLD_S` (90 s, a key in the tray's `config`), it drops `a`
from what it sends, so the board gets "" and its rotation resumes; a new name puts `a` back at once. "job done" and the
tier creature at a prompt can keep a shorter hold of their own (say 20 s). Risk: low; during real work the name changes
often (with P2 at least every 25 s), so it only frees names nobody is updating. The one trade: after 90 s of a single
long tool (a 5 minute build), the board starts its idle rotation while Claude is busy; P5's background or a longer hold
for `echo work` covers that. Tests: a name held past the hold is sent without `a` once and on every later poll; a new
name restores it; `n` changes alone do not reset the clock; the poll path and the state path agree.

P2. Variety inside the working set. Files: `daemon/clawdmeter_hooks.py` (TIER_ANIMS 153 to 157, `ultra_work` 785 to
788, `_clean_sidecar` 501 to 536, which drops unknown sidecar keys and must learn the new one), its tests. Design: each
role holds a list instead of one name, for example fable ultra work `fable ultra`, `ultra cube`, `ultra braille`,
`ultramode`, and for other tiers their ultra name with the same three; the resting role (session start and prompts)
rotates `model fable`, `fable gaze` and `fable eyes` on fable (all three in both tables), and `opus enter` with
`model opus` on opus; when a proposal stays in the same role and the
creature has stood `VARIETY_S` (25 s) by `anim_t`, the next member is proposed, with the index in hooks.json. Agent tool
calls arrive every few seconds in a workflow, so the rotation advances without a timer. When the fable work, write,
read and done cells being drawn now land in the table, the same lists give the tier its whole working set (write tools
to `fable write`, and so on). Risk: low; every listed name is in both tables today (none is big tier only). Tests: the
rotation advances only after VARIETY_S, never during the dwell, never past a force moment; a name list member missing
from the table fails the existing name test; the `_firmware_names` test is split to check the 73 row build too.

P3. Per board naming, the larger screen and board detection (operator, this evening). Files:
`daemon/claude_usage_daemon_windows.py` (Session, `_cmd_heard` 1233 to 1257, `_write_report` 1296 to 1309, the two
merge points), a new generated `daemon/board_tables.json`, a generator in `tools/` (or a step in
`tools/add_echo_anims.py`), `labdaemon_engine/controllers/board.py` and `dashboard.html` (REPORT_FIELDS at 852).
What exists: the board already identifies itself. On every link the tray sends `{"c":"status","v":""}` (LINK_STATUS,
daemon 132 and 1948 to 1951), and the answer carries `fw` (BoardCaps `name`, for example "Waveshare LCD 4" or
"Waveshare AMOLED 2.16", boards/*/board.h and caps.cpp) and `n` (`splash_anim_count()`, 127 with SPLASH_BIG, 73
without) (cmd.cpp 61 to 79). The tray keeps it per address in `board\<addr>.json`, and the dashboard already shows
Firmware and Creatures per board. The other places a board leaves a trace identify nothing: the boot banner is
serial only, so the tray never sees it; `daemon.heartbeat` is one file for all boards (`ts`, `connected`); the Wi-Fi
memory is one stamp for the whole tray (`_WIFI_SENT`, daemon 1703); `daemon.pages` is per address but records only
whether a page is up. The status report is the only identity source on link. So no firmware change is needed. Gaps: D4 has no report on disk (it was asked at
19:12:44 and no answer was recorded), and E8's report is from old firmware; the first step is to get a fresh report
from each. Design: the generator writes `board_tables.json` as `{"127": [names], "73": [names]}` straight from
splash_animations.h (the BIG block decides the split); the tray keeps a profile per link from the status answer, falling
back to the saved report; before each push it resolves the host's `a` per board through a fallback chain, for example
`echo ssh hd` then `echo ssh`, `ctf hoodie hd` then `ctf hoodie`, `echo packet dodge` then `ultracode work`, any culture
creature then "" (the device's own rotation); a board with no profile gets the name as it came (today's behaviour).
Then the hooks may name HD and big tier creatures and the 4 inch board shows them while the 2.16 gets its nearest
match. The dashboard gains one line per board: linked or not, table (big or stock, from `n`), and the name it was last
sent. Message shape: none new; the status answer and the usage `a` stay as they are. Risks: a table count can collide
across future builds (key on `fw` plus `n`, and regenerate the file in the same commit as the table); a stale profile
after a reflash (refresh it on every link, which already happens); nothing grows either firmware. Tests: resolution per
profile, the chain order, no profile means pass through, the generator reproduces the table counts, a board answering
with a plain nack keeps pass through.

P4. Sessions stop trampling each other. Files: `daemon/clawdmeter_hooks.py` (`ultra` 709 to 731, `_on_stop` 909 to
921, `finish` 809 to 830), tests. Design: the workflow flag becomes per session (`sessions[sid]["ultra"]`), so only the
workflow's own session shows ultra work; a force moment (job done, agents join, model switch) records its session and
`MOMENT_S` (8 s), and a non force proposal from another session inside that time is dropped. Risk: medium (the
ordering and stale rules are subtle; the existing 212 tests guard them). Tests: two sessions, one in a workflow, the
other's Read shows `echo read`; job done in one survives the other's agent calls for MOMENT_S.

P5. Moments over a background, and reactions to tool results. Files: the hooks (state shape), the tray (P1's clock
grows a second one), `daemon/clawdmeter_state.py`, the engine's `_parse_state` (claude.py 225 to 228, which already
ignores extra keys), and the test that the hooks write state.json exactly as clawdmeter_state does
(test_windows_hooks 1059). Design: state.json gains `bg` (the background, for example the tier's working creature) and
`until` (when the current `anim` stops being a moment); the tray shows `anim` until `until`, then `bg`, then P1's
expiry. Moments: job done 8 s, agents join 6 s, the burner crossing 6 s, a model switch 5 s, and with P3 per board
reactions: a failed Bash as `echo facepalm` (big) falling back to `echo startle`, a test pass as `echo high five`, a
push as `echo mic drop` (big) falling back to `echo hop`, an ssh call as `echo ssh hd` falling back to `echo ssh`, a
CTF flag as `echo flag capture` or `echo hash cracked` (big). Coupling: the hooks' `STATE_DEFAULTS` and `load_state`
(211, 432 to 451) keep only agents, anim and mode and would drop the new keys on every rewrite; they must learn them.
Tool result reactions are operator gated: PostToolUse is wired today for `Agent|Task` only (SETTINGS_PLAN 197), so it
needs a broader matcher in `~/.claude/settings.json` and a fresh `--print-settings` paste, and the PostToolUse payload
fields (exit code, error flag) must be checked against the current Claude Code hooks docs before anyone designs on
them. Risk: medium. Tests: moment then background then expiry in order; a moment from a stale run shows nothing.

P6. A trailing edge for bursts. Files: hooks `finish` (820 to 824), the tray. Design: inside the dwell the hooks still
record the latest proposal as `want` in state.json, and the tray applies the newest `want` once the dwell has passed,
so a burst shows its last tool rather than its first. Risk: more state.json writes (cheap; the tray reads it every
second anyway, and the poll cost argument is stale, rule 6). Tests: Read then Edit 1 s apart ends on `echo write`.

P7. The burner as a moment, not a turn rule. Files: hooks `turn_start` 773 to 783, `_on_pre_tool` 880 to 885. Design:
the burner shows on the crossing (as now, plus P5's 6 s hold) and at most once per BURN_HOLD_S at a prompt, and the
tier creature (and `fable gaze`) gets the other prompts. Risk: low. Tests: a session over 500k shows `fable gaze` at
its second prompt after the hold.

P8. "Surprise me". Files: the tray (and P3's tables). Design: every `SURPRISE_S` (5 minutes, configurable, 0 to turn
it off) the tray sends one board pick even while a host name stands: either "" for 12 s (the device draws from its
group or wildcard pool) or, with a profile, a wildcard name valid for that board for 12 s, then the host name again.
Risk: low; it shows something untrue for 12 s, which is the point of the slot. Tests: one surprise per period, never
over a moment or an approve prompt.

P9. Firmware: a quiet lapse for host names, and a button that frees. Files: `firmware/src/main.cpp` (beside
`host_page_tick`, 266 to 275), `splash.cpp` (`splash_next` 814 to 824). Design: when the host has written nothing for
`BLE_HOST_QUIET_MS` (90 s, a PC asleep or a tray that quit), `splash_set_anim("")`; `splash_next` clears `forced_idx`
until the host sends a different name. Risk: flash space (a few dozen bytes; fine on amoled_216_c6, tight on lcd_4 and
the stock amoled_216, so measure and trade a row if needed), and an operator gated flash. Tests: serial pokes on lcd_4 (`anim`, then silence for 90 s).

P10. A gentler retry for a board that never answers. Files: daemon `_board_link` (2121 to 2144). Design: after (say)
10 failed rounds in a row, back off that address to 60 s and log one line per 10 rounds. Risk: low; a board switched on
later links within a minute instead of 2.5. Tests: in test_windows_multiboard.

P11. Names the code can show that no event uses. In both tables: `opus enter` and `opus work` (natural opus switch and
think roles in TIER_ANIMS), `echo think deep` (a long gap after a prompt, the plan's "thinking" row that was never
built), `agents split` (a SubagentStart moment), `ultra cube`, `ultra braille`, `ultramode` (P2), `credits out` (planned
as board local when `st` is not allowed, never wired), `echo build` (boot only), `echo done`. Big tier only (need P3):
`echo packet dodge` (drawn for ultracode, "host named", never named), `ctf hoodie hd` and `echo ssh hd` (the hooks send
the low resolution ones), `echo hash cracked`, `echo flag capture`, `echo packet sniff`, `echo terminal glow`,
`echo server rack`, `echo gpu fan`, `echo focused`, `echo sleepy` and the culture batch. The plan's "1 agent:
echo idle" row was also never built (one agent shows `two agents`).

## 4. Recommended first increment

One session, no flash, no settings.json change: P1 and P2, plus the detection half of P3.

Before the code, learn what D4 runs: the engine's board `refresh()` (cmd status) or serial `status` on the board. A plain nack
   or silence means firmware from before 2026-10-03, which changes what the operator will see (below).
1. Tray: P1's expiry (90 s, `job done` and the prompt's tier creature 20 s), with its tests.
2. Hooks: P2's rotation for the ultra role on every tier (`fable ultra`, `ultra cube`, `ultra braille`, `ultramode`;
   the other tiers start from their own ultra name), with its tests, and the `_firmware_names` test split so the 73
   row build is checked too.
3. Tray and engine: P3's profile per link (from the status answer, else the saved report), `board_tables.json` from a
   generator, the resolver with pass through for a board with no profile, and the dashboard line per board. No hook
   names a big tier creature yet, so this part changes nothing on the panel today; it is the ground for P5 and for the
   4 inch board.
4. Restart the tray (hooks are live on the next event), then read `board\*.json` to learn what D4 runs.

What the operator should see afterwards: during a workflow the creature changes about every 25 s through the fable
ultracode set instead of sitting on fable ultra; when work stops (agents done, the job finished and nobody typing), the
board goes back to its own rotation after at most 90 s instead of holding agents join or job done for hours. What that
rotation looks like depends on D4's firmware: on current firmware it is the 6 to 14 s shuffle with the wildcard pool and
the coffee mornings; on firmware from before 2026-10-03 it is the older group cycle, and the shuffle, the pool and the
faster interval need a flash of current firmware first (operator gated). Nothing changes on the 4 inch board until it
links (power, range or a new pairing; its retry loop has failed for four days), and once it links the dashboard says
which table each board carries.

Second increment: P4 and P5 (sessions and moments, then the tool result reactions after the operator's settings.json
yes and a docs check), then P7 and P8. P9 waits for the next flash.
