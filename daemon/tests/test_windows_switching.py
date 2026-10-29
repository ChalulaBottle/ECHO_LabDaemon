#!/usr/bin/env python3
"""Animation switching, increment 1 (plans/animation-switching-review.md, P1, P2, P3).

The tray: a host named creature expires (HostHold, the anim_expire config key) and is
resolved per board against the table it carries (anim_fallback, board_tables.json, the
board's status report). The hooks: the resting and ultra roles rotate through their sets
(ROTATIONS, ROTATE_S), the workflow flag is per session, "job done" holds against another
session's agent events (JOB_HOLD_S), and the token burner is a moment at prompts.

conftest keeps every relay file, the config and the hooks' folder in tmp_path.

Run: python -m pytest daemon/tests/test_windows_switching.py -x -q
"""
import asyncio
import json
import os
import re
import time
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import daemon.claude_usage_daemon_windows as mod
from daemon import anim_fallback as fb
from daemon.tests.test_windows_cmd import BOARD, Board, _drive, until
from daemon.tests.test_windows_hooks import T0, _sidecar, fire, clock  # noqa: F401 - fixtures
from tools import board_tables

REPO = Path(__file__).resolve().parents[2]
HEADER = REPO / "firmware" / "src" / "splash_animations.h"


@pytest.fixture
def logs(monkeypatch):
    lines = []
    monkeypatch.setattr(mod, "log", lines.append)
    return lines


def _state(base, anim, agents=0, age=0.0):
    """state.json as the hooks write it; `age` seconds old by its mtime."""
    path = base / "state.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"agents": agents, "anim": anim, "mode": ""}), encoding="utf-8")
    t = time.time() - age
    os.utime(path, (t, t))


# ---------------------------------------------------------------------------
# P1: the host name expires in the tray
# ---------------------------------------------------------------------------

def test_expiry_arms_on_a_name_and_fires_once_after_its_time(logs):
    h = mod.HostHold()
    h.update({"n": 0, "a": "agents join"}, 1000.0)
    assert not h.due(1000.0 + 89.9) and h.out() == {"n": 0, "a": "agents join"}
    assert h.due(1000.0 + 90.0)
    assert h.out() == {"n": 0}                                    # no "a": the board takes its own choice
    assert not h.due(1000.0 + 500.0) and h.out() == {"n": 0}     # once, and it stays handed back
    assert logs == ["Host creature 'agents join' stood 90 s with no change: handed back to the board"]


def test_a_change_arms_it_again_and_a_rewrite_that_changes_nothing_does_not(logs):
    h = mod.HostHold()
    h.update({"n": 0, "a": "job done"}, 0.0)
    h.update({"n": 0, "a": "job done"}, 60.0)                   # mode words alone: same fields
    assert h.due(90.0)
    h.update({"n": 0, "a": "echo work"}, 100.0)                 # a new name
    assert h.out()["a"] == "echo work" and not h.due(189.0) and h.due(190.0)
    h.update({"n": 2, "a": "echo work"}, 200.0)                 # the agent count moved: work goes on
    assert h.out()["a"] == "echo work" and not h.due(289.0)


def test_no_name_never_expires_and_zero_turns_it_off(logs, relay_files):
    h = mod.HostHold()
    h.update({"n": 3}, 0.0)
    assert not h.due(1e9)
    (relay_files / "config").parent.mkdir(parents=True, exist_ok=True)
    (relay_files / "config").write_text("clock=auto\nanim_expire = 0  # never\n")
    h.update({"n": 0, "a": "echo work"}, 0.0)
    assert not h.due(1e9) and h.out()["a"] == "echo work"


@pytest.mark.parametrize("text, expire", [
    ("", 90.0), ("anim_expire=30", 30.0), ("ANIM_EXPIRE = 120 # two minutes", 120.0),
    ("anim_expire=0", 0.0), ("anim_expire=-5", 90.0), ("anim_expire=soon", 90.0), ("anim_expire=1.5", 90.0),
])
def test_the_anim_expire_config_key(relay_files, text, expire):
    relay_files.mkdir(parents=True, exist_ok=True)
    (relay_files / "config").write_text(text + "\n")
    assert mod.read_anim_expire() == expire


def _client(sent, on_write=None):
    client = AsyncMock()
    client.connect = AsyncMock(return_value=None)
    client.is_connected = True
    client.disconnect = AsyncMock()
    client.start_notify = AsyncMock()

    async def write(_uuid, data, response=False):
        sent.append(json.loads(data))
        if on_write:
            on_write(len(sent))
    client.write_gatt_char = write
    return client


def _link(client, stop_event):
    poll = AsyncMock(side_effect=lambda _tok: {"s": 10, "ok": True})
    with patch.object(mod, "BleakClient", return_value=client), \
         patch.object(mod, "read_token", return_value="tok"), \
         patch.object(mod, "poll_api", new=poll):
        asyncio.run(asyncio.wait_for(mod.connect_and_run(MagicMock(address=BOARD), stop_event), timeout=10))
    return poll


def test_the_tray_hands_the_name_back_then_a_new_name_puts_it_back(relay_files, monkeypatch, logs):
    """The loop: a name goes with the first push, the same payload goes again without "a"
    once the name expired (no API call), and a new name arms it at once."""
    monkeypatch.setattr(mod, "TICK", 0.02)
    monkeypatch.setattr(mod, "WATCH_TICK", 0.02)
    monkeypatch.setattr(mod, "read_anim_expire", lambda: 0.3)
    _state(relay_files, "agents join")
    stop_event = asyncio.Event()
    sent = []

    def on_write(count):
        if count == 2:
            _state(relay_files, "echo work")
        elif count == 3:
            stop_event.set()

    poll = _link(_client(sent, on_write), stop_event)
    assert sent == [{"s": 10, "ok": True, "n": 0, "a": "agents join"},
                    {"s": 10, "ok": True, "n": 0},                 # expired: handed back
                    {"s": 10, "ok": True, "n": 0, "a": "echo work"}]
    assert poll.call_count == 1
    assert "Host creature 'agents join' stood 0 s with no change: handed back to the board" in logs


def test_a_link_to_a_name_that_stood_for_hours_hands_it_back_at_once(relay_files, monkeypatch, logs):
    """The clock starts at the file's own time, and the poll path drops "a" as the resend does."""
    monkeypatch.setattr(mod, "TICK", 0.02)
    monkeypatch.setattr(mod, "WATCH_TICK", 0.02)
    _state(relay_files, "agents join", age=8 * 3600)
    stop_event = asyncio.Event()
    sent = []
    _link(_client(sent, lambda count: stop_event.set()), stop_event)
    assert sent == [{"s": 10, "ok": True, "n": 0}]
    assert any("stood 90 s with no change" in line for line in logs)


# ---------------------------------------------------------------------------
# P3: board_tables.json, the generator
# ---------------------------------------------------------------------------

def test_the_generator_counts_match_the_headers_defines():
    text = HEADER.read_text(encoding="utf-8")
    big_def, base_def = map(int, re.search(
        r"#ifdef SPLASH_BIG\s*#define SPLASH_ANIM_COUNT (\d+)\s*#else\s*#define SPLASH_ANIM_COUNT (\d+)",
        text).groups())
    t = board_tables.tables(text)
    assert t["counts"] == {"base": base_def, "big": big_def}
    assert len(t["base"]) == base_def and len(t["base"]) + len(t["big"]) == big_def
    assert "fable gaze" in t["base"] and "fable eyes" in t["base"] and "echo ssh hd" in t["big"]


def test_the_committed_board_tables_json_is_up_to_date():
    committed = (REPO / "daemon" / "board_tables.json").read_text(encoding="utf-8")
    assert committed == board_tables.render(board_tables.tables(HEADER.read_text(encoding="utf-8")))
    assert board_tables.main(["--check"]) == 0


def test_the_big_data_block_before_the_table_does_not_split_it():
    text = """
#ifdef SPLASH_BIG
static const uint8_t splash_big_frames[] = {0};
{"not a row", "x"},
#endif
#ifdef SPLASH_BIG
#define SPLASH_ANIM_COUNT 3
#else
#define SPLASH_ANIM_COUNT 2
#endif
static const splash_anim_def_t splash_anims[SPLASH_ANIM_COUNT] = {
    {"one", "A", 1, p, f, h, 20},
{"two", "A", 1, p, f, h, 20},
#ifdef SPLASH_BIG
    {"three hd", "A", 1, p, f, h, 60},
#endif
};
"""
    assert board_tables.tables(text) == {"base": ["one", "two"], "big": ["three hd"],
                                         "counts": {"base": 2, "big": 3}}
    with pytest.raises(ValueError):
        board_tables.tables(text.replace("COUNT 2", "COUNT 4"))


# ---------------------------------------------------------------------------
# P3: the resolver (anim_fallback)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("n, table", [(127, "big"), (73, "base"), (83, "unknown"), (None, "unknown"),
                                      (True, "unknown"), ("127", "unknown")])
def test_which_table_a_count_means(n, table):
    assert fb.table_of(n) == table


@pytest.mark.parametrize("name, base, big", [
    ("echo ssh hd", "echo ssh", "echo ssh hd"),
    ("ctf hoodie hd", "ctf hoodie", "ctf hoodie hd"),
    ("echo packet dodge", "ultracode work", "echo packet dodge"),
    ("fable work", "echo work", "echo work"),        # in no build yet: both boards get the echo set
    ("fable write", "echo write", "echo write"),
    ("fable read", "echo read", "echo read"),
    ("fable done", "job done", "job done"),
    ("fable gaze", "fable gaze", "fable gaze"),      # base: stays
    ("fable eyes", "fable eyes", "fable eyes"),
    ("fable ultra", "fable ultra", "fable ultra"),   # base today; its chain is ultracode work
    ("echo work", "echo work", "echo work"),
    ("no such creature", None, None),                # nothing holds it: hand back
])
def test_the_real_tables_resolve_each_name(name, base, big):
    assert fb.resolve(name, "base") == base
    assert fb.resolve(name, "unknown") == base       # unknown is treated as base
    assert fb.resolve(name, "big") == big


def test_a_big_only_creature_with_no_chain_hands_back_on_base():
    big_only = [n for n in fb.TABLES["big"] - fb.TABLES["base"] if n not in fb.FALLBACK]
    assert big_only, "the big tier has creatures with no chain (the culture batch)"
    assert fb.resolve(big_only[0], "big") == big_only[0]
    assert fb.resolve(big_only[0], "base") is None


SYNTH = {"base": frozenset({"echo work", "echo write", "job done", "ultracode work"}),
         "big": frozenset({"echo work", "echo write", "job done", "ultracode work", "fable work", "fable ultra"}),
         "counts": {"base": 4, "big": 6}}


def test_a_big_board_gets_fable_work_and_a_base_board_echo_work():
    """With a build that carries the Fable working set (a synthetic table: none does yet)."""
    assert fb.resolve("fable work", "big", SYNTH) == "fable work"
    assert fb.resolve("fable work", "base", SYNTH) == "echo work"
    assert fb.resolve("fable work", "unknown", SYNTH) == "echo work"
    assert fb.resolve("fable ultra", "base", SYNTH) == "ultracode work"
    assert fb.resolve("opus ultra", "base", SYNTH) == "ultracode work"
    assert fb.table_of(6, SYNTH) == "big" and fb.table_of(4, SYNTH) == "base"


def test_no_tables_file_passes_names_through(tmp_path):
    empty = fb.load_tables(tmp_path / "missing.json")
    assert fb.resolve("fable work", "base", empty) == "fable work"
    assert fb.table_of(127, empty) == "unknown"


def test_every_chain_ends_in_the_base_table():
    for name, chain in fb.FALLBACK.items():
        assert any(alt in fb.TABLES["base"] for alt in chain), name


# ---------------------------------------------------------------------------
# P3: per board record and resolution in the Session
# ---------------------------------------------------------------------------

def _hear(session, msg):
    session._on_tx(None, bytearray(json.dumps(msg).encode()))


def _report(base):
    return json.loads((base / "board" / f"{BOARD.replace(':', '-')}.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("n, table", [(127, "big"), (73, "base"), (83, "unknown")])
def test_the_status_answer_records_the_table_with_fw_and_n(relay_files, logs, n, table):
    s = mod.Session(MagicMock(), BOARD)
    _hear(s, {"c": "status", "fw": "Waveshare LCD 4", "n": n})
    report = _report(relay_files)
    assert (report["table"], report["fw"], report["n"]) == (table, "Waveshare LCD 4", n)
    assert s.table == table and s.table_dirty == (table != "unknown")
    assert f"Board table: {table} (fw Waveshare LCD 4, n {n}) ({BOARD})" in logs


def test_a_plain_nack_leaves_the_table_unknown(relay_files, logs):
    s = mod.Session(MagicMock(), BOARD)
    s._cmd_waiting = ("status", time.monotonic())
    s._on_tx(None, bytearray(b'{"err": true}'))
    assert _report(relay_files)["table"] == "unknown" and s.table == "unknown"


def test_a_board_that_never_answers_is_unknown_with_one_line_and_no_file(relay_files, logs):
    s = mod.Session(MagicMock(), BOARD)
    s._cmd_waiting = ("status", time.monotonic() - mod.CMD_NACK_WAIT - 1)
    s.status_overdue()
    s.status_overdue()
    assert logs == ["No status answer within 2 s: creature table unknown, names resolve as base"]
    assert not (relay_files / "board").exists() and s.table == "unknown"


def test_board_fields_resolve_and_log_once_per_change(logs):
    s = mod.Session(MagicMock(), BOARD)
    assert s.board_fields({"n": 1, "a": "echo ssh hd"}) == {"n": 1, "a": "echo ssh"}
    assert s.board_fields({"n": 2, "a": "echo ssh hd"}) == {"n": 2, "a": "echo ssh"}   # the 60 s repeat
    assert s.board_fields({"n": 2, "a": "zz culture"}) == {"n": 2}                       # hand back
    assert s.board_fields({"n": 2, "a": "echo work"}) == {"n": 2, "a": "echo work"}
    assert s.board_fields({"n": 2}) == {"n": 2}
    assert logs == ["Creature 'echo ssh hd' is not in this board's unknown (as base) table: sending 'echo ssh'",
                    "Creature 'zz culture' is not in this board's unknown (as base) table: handing back to the board"]
    s.table = "big"
    assert s.board_fields({"n": 2, "a": "echo ssh hd"}) == {"n": 2, "a": "echo ssh hd"}


class _Answering(Board):
    """A board whose status answer comes 50 ms after the cmd, so the link's first usage push
    has always gone before the table is known."""

    def __init__(self, n):
        super().__init__()
        self.n = n

    def answer_to(self, msg):
        if msg.get("c") == "status" and "s" not in msg:
            asyncio.get_running_loop().call_later(
                0.05, self.say, {"c": "status", "fw": "Waveshare LCD 4", "n": self.n})
            return None
        return super().answer_to(msg)


def _usage(board):
    return [m for m in board.sent if "s" in m]


@pytest.mark.parametrize("n, last", [(6, "fable work"), (4, "echo work")])
def test_the_link_resolves_per_board_and_pushes_again_when_the_table_changes_the_name(
        relay_files, monkeypatch, logs, n, last):
    """The first usage push goes before the status answer (unknown, as base: echo work); the
    answer of a big board makes fable work right, so the same usage goes again with it (no API
    call); a base board's answer changes nothing and nothing more is sent."""
    monkeypatch.setattr(mod, "LINK_STATUS", {"c": "status", "v": ""})
    monkeypatch.setattr(mod, "TICK", 0.01)
    monkeypatch.setattr(mod, "WATCH_TICK", 0.01)
    monkeypatch.setattr(mod, "WRITE_GAP", 0.0)
    monkeypatch.setattr(fb, "TABLES", SYNTH)
    _state(relay_files, "fable work")
    board = _Answering(n)

    async def scenario():
        await until(lambda: board.tx is not None and any(m.get("c") == "status" for m in board.sent))
        await until(lambda: (relay_files / "board").exists())
        await asyncio.sleep(0.2)

    _drive({BOARD: board}, scenario)
    usage = _usage(board)
    assert usage[0]["a"] == "echo work"
    assert usage[-1]["a"] == last
    assert len(usage) == (2 if last == "fable work" else 1)
    assert _report(relay_files)["table"] == ("big" if n == 6 else "base")


# ---------------------------------------------------------------------------
# P2: the hooks rotate the resting and ultra roles
# ---------------------------------------------------------------------------

def _three_agents(fire, model="claude-fable-5"):
    fire("SessionStart", at=0, source="startup", model=model)
    for i, aid in enumerate(("a1", "a2", "a3")):
        fire("SubagentStart", at=1 + i, agent_id=aid)


def test_the_fable_ultra_set_rotates_after_rotate_s_and_wraps(fire):
    _three_agents(fire)                                           # fable ultra from 3 s
    seen = [fire("PreToolUse", at=at, agent_id="a1", tool_name="Read")["anim"]
            for at in (10, 27.9, 28, 40, 53, 78, 103)]
    assert seen == ["fable ultra", "fable ultra", "ultra cube", "ultra cube", "ultra braille",
                    "ultramode", "fable ultra"]


@pytest.mark.parametrize("model, first", [("claude-opus-5", "opus ultra"), ("claude-sonnet-4-6", "sonnet ultra"),
                                          ("claude-haiku-4-5-20251001", "ultracode work"), (None, "ultracode work")])
def test_each_tier_starts_from_its_own_ultra_cell_then_the_shared_ones(fire, model, first):
    _three_agents(fire, model)
    assert fire("PreToolUse", at=10, agent_id="a1", tool_name="Read")["anim"] == first
    assert fire("PreToolUse", at=40, agent_id="a1", tool_name="Read")["anim"] == "ultra cube"
    assert fire("PreToolUse", at=70, agent_id="a1", tool_name="Read")["anim"] == "ultra braille"
    assert fire("PreToolUse", at=100, agent_id="a1", tool_name="Read")["anim"] == "ultramode"
    assert fire("PreToolUse", at=130, agent_id="a1", tool_name="Read")["anim"] == first


def test_the_fable_resting_set_after_the_signature(fire):
    fire("SessionStart", at=0, source="startup", model="claude-fable-5")
    prompts = [fire("UserPromptSubmit", at=at)["anim"] for at in (5, 15, 20, 40, 70, 100)]
    assert prompts == ["model fable",     # the first prompt: the signature
                       "fable gaze",      # the next moves on at once
                       "fable gaze",      # 5 s later: stays
                       "fable eyes", "model fable", "fable gaze"]


def test_the_position_is_kept_per_session_in_hooks_json(fire, relay_files):
    _three_agents(fire)
    fire("PreToolUse", at=30, agent_id="a1", tool_name="Read")
    side = _sidecar(relay_files)
    assert side["sessions"]["s1"]["rot"]["ultra"] == {"i": 1, "t": T0 + 30}
    # another session starts its own resting set
    fire("SessionStart", at=31, source="startup", model="claude-fable-5", session_id="s2")
    assert fire("UserPromptSubmit", at=35, session_id="s2")["anim"] == "model fable"
    assert _sidecar(relay_files)["sessions"]["s1"]["rot"]["ultra"] == {"i": 1, "t": T0 + 30}


def test_a_rotation_dropped_by_the_dwell_does_not_move_the_position(fire, relay_files):
    _three_agents(fire)                                           # fable ultra stands from 3 s
    assert fire("PreCompact", at=30, trigger="auto")["anim"] == "echo loading"   # a moment at 30 s
    assert fire("PreToolUse", at=31, agent_id="a1", tool_name="Read")["anim"] == "echo loading"
    assert _sidecar(relay_files)["sessions"]["s1"]["rot"]["ultra"] == {"i": 0, "t": T0 + 3}
    assert fire("PreToolUse", at=34, agent_id="a1", tool_name="Read")["anim"] == "ultra cube"
    assert _sidecar(relay_files)["sessions"]["s1"]["rot"]["ultra"] == {"i": 1, "t": T0 + 34}


# ---------------------------------------------------------------------------
# The accidents: per session workflow flag, the job done hold, the burner as a moment
# ---------------------------------------------------------------------------

def test_a_workflow_paints_only_its_own_session(fire, relay_files):
    fire("PreToolUse", at=0, tool_name="Workflow", session_id="wf")
    assert fire("PreToolUse", at=5, tool_name="Read", session_id="other") == \
        {"agents": 0, "anim": "echo read", "mode": "ultracode"}
    assert fire("PreToolUse", at=10, tool_name="Read", session_id="wf")["anim"] == "ultracode work"
    assert "ultra" in _sidecar(relay_files)["sessions"]["wf"]
    assert "ultra" not in _sidecar(relay_files)["sessions"]["other"]


def test_an_old_global_workflow_flag_moves_into_its_session(fire, relay_files):
    relay_files.mkdir(parents=True, exist_ok=True)
    (relay_files / "hooks.json").write_text(json.dumps({
        "anim_t": T0, "ultra": {"sid": "wf", "since": T0, "seen": None},
        "sessions": {"wf": {"t": T0}, "other": {"t": T0}}}), encoding="utf-8")
    (relay_files / "state.json").write_text(json.dumps({"agents": 0, "anim": "ultracode enter",
                                                        "mode": "ultracode"}), encoding="utf-8")
    assert fire("PreToolUse", at=5, tool_name="Edit", session_id="other")["anim"] == "echo write"
    side = _sidecar(relay_files)
    assert "ultra" not in side and side["sessions"]["wf"]["ultra"]["since"] == T0
    assert fire("PreToolUse", at=10, tool_name="Edit", session_id="wf")["anim"] == "ultracode work"


def test_job_done_holds_against_another_sessions_agents_for_job_hold_s(fire):
    fire("SubagentStart", at=0, agent_id="b1", session_id="busy")
    assert fire("Stop", at=10, session_id="quiet") == {"agents": 1, "anim": "job done", "mode": "done"}
    # the busy session's agent work inside the hold: nothing shows, the done stays
    assert fire("PreToolUse", at=11, agent_id="b1", tool_name="Read", session_id="busy")["anim"] == "job done"
    assert fire("SubagentStop", at=13, agent_id="b1", session_id="busy") == \
        {"agents": 0, "anim": "job done", "mode": "done"}
    # past the hold the next agent event goes through and clears it
    fire("SubagentStart", at=14, agent_id="b2", session_id="busy")
    assert fire("PreToolUse", at=14.5, agent_id="b2", tool_name="Read", session_id="busy") == \
        {"agents": 1, "anim": "two agents", "mode": ""}


def test_the_hold_never_stops_a_prompt_or_the_sessions_own_events(fire):
    fire("Stop", at=10, session_id="quiet")
    assert fire("UserPromptSubmit", at=11, session_id="busy")["anim"] == "echo think spin"
    fire("Stop", at=20, session_id="quiet")
    assert fire("PreToolUse", at=21, tool_name="Read", session_id="quiet")["anim"] == "echo read"


def test_the_burner_is_a_moment_at_prompts(fire, tmp_path):
    from daemon.tests.test_windows_hooks import _transcript
    path = tmp_path / "t.jsonl"
    t = _transcript(path, ("claude-opus-5-5[1m]", 620_000))
    assert fire("UserPromptSubmit", at=0, transcript_path=t)["anim"] == "token burner"   # the crossing
    assert fire("UserPromptSubmit", at=30, transcript_path=t)["anim"] == "token burner"  # inside its hold
    # still above 500k, but the crossing was over a hold ago: the tier has the prompts back
    assert fire("UserPromptSubmit", at=70, transcript_path=t)["anim"] == "model opus"
    assert fire("UserPromptSubmit", at=200, transcript_path=t)["anim"] == "model opus"
