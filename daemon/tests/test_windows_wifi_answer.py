#!/usr/bin/env python3
"""wifi.json waits for a board's answer: the file goes only once a board said it stored them.

A board built with Wi-Fi answers credentials {"ack": true, "wf": "ok"} (stored, or forgotten for an
empty ssid) or {"err": true, "wf": "no"} (not stored); one built without Wi-Fi, the two AMOLED boards,
answers the plain {"err": true} (firmware main.cpp, handle_wifi_msg; plans/labdaemon.md, "Wi-Fi
answers"). relay_wifi writes to every linked board that has not had the version, then a task of its
own waits for every answer under the one WIFI_ANSWER_WAIT, so no link's tick waits on it.

conftest points every relay file at tmp_path; the live %LOCALAPPDATA%\\Clawdmeter is never
touched. A board here is a fake BleakClient that keeps every message and answers each on TX the way
the firmware does.

Run: python -m pytest daemon/tests/test_windows_wifi_answer.py -x -q
"""
import asyncio
import json
import math
import os
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import daemon.claude_usage_daemon_windows as mod

USAGE = {"s": 10, "ok": True}
PAGE = {"pg": "spotify", "pt": "Now playing", "p1": "Song", "p2": "Artist",
        "p3": "Desk speaker", "pp": 10, "pa": "echo headphones"}
BOARD = "E8:3D:C1:F7:6F:21"      # the 4 inch board, built with Wi-Fi
BOARD_B = "D4:05:92:B7:8B:E2"    # an AMOLED board, built without
SSID = "Echo Lab 5G"             # no log line may hold the network name
SECRET = "hunter2-SENTINEL-9f3a"  # nor the password, nor its SENTINEL core
CREDENTIALS = {"wf": SSID, "wp": SECRET}
WF_OK = {"ack": True, "wf": "ok"}
WF_NO = {"err": True, "wf": "no"}
NACK = {"err": True}
ACK = {"ack": True}
BRIGHT = {"c": "bright", "v": "40"}
STORED = "Wi-Fi credentials stored by 1 board(s), file removed"
KEPT = "Wi-Fi credentials stored by no board, the file waits for a board that has not had it"
# asyncio on Windows fires a timer up to one clock step (15.6 ms) early, and time.monotonic()
# moves in the same steps, so a measured span comes out a little short.
CLOCK_SLACK = 0.04


@pytest.fixture(autouse=True)
def wifi_answers(monkeypatch):
    """The boards a Wi-Fi file version went to, and the task awaiting their answers, start afresh
    in every test, as conftest does for the rest of the relay state."""
    monkeypatch.setattr(mod, "_WIFI_TRIED", None)
    monkeypatch.setattr(mod, "_WIFI_WAITER", None)


@pytest.fixture
def logs(monkeypatch):
    lines = []
    monkeypatch.setattr(mod, "log", lines.append)
    return lines


@pytest.fixture
def fast(monkeypatch):
    """Tick quickly and do not space writes out (the gap has tests of its own)."""
    monkeypatch.setattr(mod, "TICK", 0.01)
    monkeypatch.setattr(mod, "WATCH_TICK", 0.01)
    monkeypatch.setattr(mod, "WRITE_GAP", 0.0)


def _write(path, obj):
    """Drop a relay file the way the engine does: whole, by atomic replace."""
    mod._write_json_atomic(path, obj)


def _cmd(base, obj):
    _write(base / "cmd" / f"{time.time_ns()}.json", {"expires": time.time() + 30, **obj})


def _reports(base):
    folder = base / "board"
    return sorted(os.listdir(folder)) if folder.exists() else []


def _report(base, address=BOARD):
    return json.loads((base / "board" / f"{address.replace(':', '-')}.json").read_text(encoding="utf-8"))


def _leaks(lines):
    return [line for line in lines if "SENTINEL" in line or SSID in line]


def _wifi_lines(lines):
    return [line for line in lines if "Wi-Fi" in line]


async def until(cond, timeout=5.0):
    deadline = time.monotonic() + timeout
    while not cond():
        if time.monotonic() > deadline:
            raise AssertionError("timed out waiting for the daemon")
        await asyncio.sleep(0.01)


class Board:
    """A board behind a fake BleakClient. Every message written to it is kept in order, with the
    time it came (`at`), and answered on TX right after the write, as the firmware answers it.

    wifi is how it answers credentials: "ok" (a board built with Wi-Fi that stored them), "no" (one
    that refused them), "none" (the plain nack of a board built without Wi-Fi) or "mute" (nothing);
    delay holds that answer back so many seconds. cmd "ok" answers each cmd as cmd.cpp does, "mute"
    says nothing. Everything else gets the plain ack. tx=False: the TX subscription fails, so the
    link cannot hear the board. `said` keeps every answer with the time it went."""

    def __init__(self, wifi="ok", cmd="ok", tx=True, delay=0.0):
        self.sent, self.at, self.said = [], [], []
        self.tx = None
        self.wifi, self.cmd, self.delay = wifi, cmd, delay
        self.client = MagicMock()
        self.client.is_connected = True
        self.client.mtu_size = 256
        self.client.connect = AsyncMock()
        self.client.disconnect = AsyncMock()
        if tx:
            self.client.start_notify = AsyncMock(side_effect=self._subscribe)
        else:
            self.client.start_notify = AsyncMock(side_effect=mod.BleakError("Could not start notify"))
        self.client.write_gatt_char = self._write

    def _subscribe(self, uuid, callback):
        if uuid == mod.TX_CHAR_UUID:
            self.tx = callback

    async def _write(self, _uuid, data, response=None):
        msg = json.loads(bytes(data))
        self.sent.append(msg)
        self.at.append(time.monotonic())
        answer, delay = self.answer_to(msg)
        if answer is not None and self.tx is not None:
            loop = asyncio.get_running_loop()
            if delay:
                loop.call_later(delay, self.say, answer)
            else:
                loop.call_soon(self.say, answer)

    def answer_to(self, msg):
        if "wf" in msg:
            return {"ok": WF_OK, "no": WF_NO, "none": NACK, "mute": None}[self.wifi], self.delay
        if "c" in msg and "s" not in msg:
            return (None if self.cmd == "mute" else {"c": msg["c"], "ok": 1}), 0
        return ACK, 0

    def say(self, msg):
        self.said.append((msg, time.monotonic()))
        self.tx(None, bytearray(json.dumps(msg).encode()))

    def wf(self):
        return [m for m in self.sent if "wf" in m]

    def wf_at(self):
        return next(t for m, t in zip(self.sent, self.at) if "wf" in m)


def _drive(boards, scenario, timeout=15):
    """Link every board in `boards` (address: Board) while `scenario()` acts on the files. One board
    gets the single link of connect_and_run; several get one _board_link each, as main() gives
    them."""
    async def run():
        stop_event = asyncio.Event()
        if len(boards) == 1:
            address = next(iter(boards))
            links = [asyncio.ensure_future(mod.connect_and_run(MagicMock(address=address), stop_event))]
        else:
            turn = asyncio.Lock()
            links = [asyncio.ensure_future(mod._board_link(a, stop_event, None, turn)) for a in boards]
        try:
            await scenario()
        finally:
            stop_event.set()
            await asyncio.gather(*links)

    with patch.object(mod, "BleakClient", side_effect=lambda device, **kw: boards[device.address].client), \
         patch.object(mod, "read_token", return_value="tok"), \
         patch.object(mod, "poll_api", new=AsyncMock(side_effect=lambda _tok: dict(USAGE))):
        asyncio.run(asyncio.wait_for(run(), timeout=timeout))


def _settled():
    return not mod._WIFI_BUSY


# ---------------------------------------------------------------------------
# The contract
# ---------------------------------------------------------------------------

def test_the_wait_is_one_named_constant_of_three_to_four_seconds():
    assert 3.0 <= mod.WIFI_ANSWER_WAIT <= 4.0


# ---------------------------------------------------------------------------
# Session._on_tx: the board's answers to credentials
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("raw, verdict", [
    (b'{"ack":true,"wf":"ok"}', "ok"),
    (b'{"err":true,"wf":"no"}', "refused"),
], ids=["stored", "refused"])
def test_both_wifi_answers_reach_wf_heard_and_nothing_else(relay_files, logs, monkeypatch, raw, verdict):
    """Neither has btn, art, c or approve, and the refusal is not the plain nack: before this
    both were dropped, and the answer never reached the relay."""
    s = mod.Session(MagicMock(), BOARD)
    heard = []
    real = s._wf_heard

    def spy(msg):
        heard.append(msg)
        real(msg)

    s._wf_heard = spy
    others = {name: MagicMock() for name in ("_cmd_heard", "_art_heard", "_nack_heard")}
    for name, stand_in in others.items():
        setattr(s, name, stand_in)
    write_event, write_decision = MagicMock(), MagicMock()
    monkeypatch.setattr(mod, "write_event", write_event)
    monkeypatch.setattr(mod, "write_decision", write_decision)

    async def hear():
        s._wf_answer = asyncio.get_running_loop().create_future()
        s._on_tx(None, bytearray(raw))
        return s._wf_answer.result()

    assert asyncio.run(hear()) == verdict
    assert heard == [json.loads(raw)]
    for stand_in in (*others.values(), write_event, write_decision):
        stand_in.assert_not_called()
    assert logs == []


@pytest.mark.parametrize("raw, verdict", [(b'{"ack":true,"wf":"ok"}', "ok"), (b'{"err":true,"wf":"no"}', "refused")])
def test_a_wifi_answer_with_no_wait_under_way_is_logged_and_changes_nothing(relay_files, logs, raw, verdict):
    s = mod.Session(MagicMock(), BOARD)
    s._cmd_waiting = ("status", time.monotonic())
    s._on_tx(None, bytearray(raw))
    assert logs == [f"Wi-Fi answer {verdict} came after the wait, ignored ({BOARD})"]
    assert s._cmd_waiting is not None                       # a cmd's wait is no business of it
    assert _reports(relay_files) == []


@pytest.mark.parametrize("msg", [{"wf": "maybe"}, {"ack": True, "wf": True}, {"wf": ["ok"]}, {"wf": None},
                                 {"err": True, "wf": {"no": 1}}])
def test_a_wifi_answer_of_another_shape_settles_nothing(relay_files, logs, msg):
    s = mod.Session(MagicMock(), BOARD)

    async def hear():
        s._wf_answer = asyncio.get_running_loop().create_future()
        s._on_tx(None, bytearray(json.dumps(msg).encode()))
        return s._wf_answer.done()

    assert asyncio.run(hear()) is False
    assert logs == [f"Device sent a Wi-Fi answer of another shape, ignoring ({BOARD})"]


def test_a_plain_nack_while_credentials_wait_is_their_answer_not_a_cmd_s(relay_files, logs):
    """A board built without Wi-Fi has no handler for credentials, so it answers them with the
    plain nack; it must not count against a cmd sent just before (_nack_heard)."""
    s = mod.Session(MagicMock(), BOARD)
    s._cmd_waiting = ("bright", time.monotonic())
    s._nack_heard = MagicMock()

    async def hear():
        s._wf_answer = asyncio.get_running_loop().create_future()
        s._on_tx(None, bytearray(b'{"err":true}'))
        return s._wf_answer.result()

    assert asyncio.run(hear()) == "nack"
    s._nack_heard.assert_not_called()
    assert s._cmd_waiting[0] == "bright"                    # the cmd still waits for its own answer
    assert _reports(relay_files) == [] and logs == []


def test_once_the_credentials_have_their_answer_a_plain_nack_is_a_cmd_s_again(relay_files, logs):
    s = mod.Session(MagicMock(), BOARD)
    s._cmd_waiting = ("bright", time.monotonic())

    async def hear():
        s._wf_answer = asyncio.get_running_loop().create_future()
        s._wf_answer.set_result("ok")
        s._on_tx(None, bytearray(b'{"err":true}'))

    asyncio.run(hear())
    report = _report(relay_files)
    assert report["cmd"] is False and report["last"] == {"c": "bright", "err": mod.CMD_OLD_FIRMWARE}


def test_a_nack_for_the_credentials_never_marks_the_board_as_old_firmware(relay_files, logs, fast):
    """A cmd, then the credentials, then the plain nack of a board without Wi-Fi within
    CMD_NACK_WAIT of the cmd: the nack is the credentials' answer. The board/ file never says
    cmd false or old firmware, and the cmd still takes its own answer when it comes."""
    wifi = relay_files / "wifi.json"
    board = Board(wifi="none", cmd="mute")
    checked = []

    async def scenario():
        await until(lambda: USAGE in board.sent)
        _cmd(relay_files, BRIGHT)
        await until(lambda: BRIGHT in board.sent)
        _write(wifi, {"ssid": SSID, "pass": SECRET})
        await until(lambda: board.wf() and _settled())
        session = next(iter(mod._LIVE_LINKS))
        assert _reports(relay_files) == []                  # no flip, not even for a moment
        assert session._cmd_waiting is not None and session._cmd_waiting[0] == "bright"
        board.say({"c": "bright", "ok": 1})                 # the cmd's own answer, late
        await until(lambda: _reports(relay_files))
        checked.append(True)

    _drive({BOARD: board}, scenario)
    assert checked
    cmd_at = board.at[board.sent.index(BRIGHT)]
    nack_at = next(t for msg, t in board.said if msg == NACK)
    assert nack_at - cmd_at < mod.CMD_NACK_WAIT             # the nack came while the cmd waited
    report = _report(relay_files)
    assert report["cmd"] is True and report["last"] == {"c": "bright", "ok": 1}
    assert not any("firmware without the cmd message" in line for line in logs)
    assert f"Wi-Fi credentials: {BOARD} has no Wi-Fi (it answered the plain nack)" in logs
    assert wifi.exists()
    assert not _leaks(logs)


def test_an_answer_that_lands_in_the_write_gap_belongs_to_the_message_before(relay_files, logs, monkeypatch):
    """The wait for the credentials' answer is armed at their write, past the write gap. A plain
    nack that lands during the gap answers the message before them (here a cmd on firmware without
    the cmd message), and the credentials still get their own answer after it."""
    monkeypatch.setattr(mod, "WRITE_GAP", 0.5)
    wifi = relay_files / "wifi.json"
    board = Board(wifi="ok", cmd="mute")
    s = mod.Session(board.client, BOARD)
    s._tx_ok = True
    board.tx = s._on_tx
    mod._LIVE_LINKS.add(s)

    async def run():
        s.queue_cmd(BRIGHT, math.inf)
        await s.send_cmds()                                 # the cmd goes; its answer is late
        _write(wifi, {"ssid": SSID, "pass": SECRET})
        relay = asyncio.ensure_future(mod.relay_wifi(mod._FIRST_TICK))
        await asyncio.sleep(0.05)
        assert board.wf() == []                             # still inside the gap
        board.say(NACK)                                     # the cmd's answer, from older firmware
        await relay
        await until(_settled)

    asyncio.run(run())
    assert board.wf() == [CREDENTIALS]
    assert _report(relay_files)["last"] == {"c": "bright", "err": mod.CMD_OLD_FIRMWARE}
    assert not wifi.exists()
    assert STORED in logs
    assert not _leaks(logs)


# ---------------------------------------------------------------------------
# What becomes of the file
# ---------------------------------------------------------------------------

def _one_board(relay_files, board, address=BOARD):
    """Link `board` at `address`, write the credentials and let the answers come in."""
    wifi = relay_files / "wifi.json"

    async def scenario():
        await until(lambda: USAGE in board.sent)
        _write(wifi, {"ssid": SSID, "pass": SECRET})
        await until(lambda: board.wf() and _settled())
        assert next(iter(mod._LIVE_LINKS))._wf_answer is None   # nothing left armed

    _drive({address: board}, scenario)
    return wifi


def test_a_board_that_stored_them_removes_the_file_in_one_line(relay_files, logs, fast):
    board = Board(wifi="ok")
    wifi = _one_board(relay_files, board)
    assert board.wf() == [CREDENTIALS]
    assert not wifi.exists()
    assert _wifi_lines(logs) == [STORED]
    assert not _leaks(logs)


def test_the_only_board_has_no_wifi_so_the_file_stays_and_the_board_is_named(relay_files, logs, fast):
    board = Board(wifi="none")
    wifi = _one_board(relay_files, board, BOARD_B)
    assert board.wf() == [CREDENTIALS]
    assert wifi.exists()
    assert _wifi_lines(logs) == [f"Wi-Fi credentials: {BOARD_B} has no Wi-Fi (it answered the plain nack)", KEPT]
    assert not _leaks(logs)


def test_a_board_that_refused_them_keeps_the_file_and_the_log_says_refused(relay_files, logs, fast):
    board = Board(wifi="no")
    wifi = _one_board(relay_files, board)
    assert wifi.exists()
    assert _wifi_lines(logs) == [f"Wi-Fi credentials refused by {BOARD} (its serial log says why)", KEPT]
    assert not _leaks(logs)


def test_no_answer_in_time_keeps_the_file(relay_files, logs, fast, monkeypatch):
    monkeypatch.setattr(mod, "WIFI_ANSWER_WAIT", 0.3)
    board = Board(wifi="mute")
    wifi = _one_board(relay_files, board)
    assert wifi.exists()
    assert _wifi_lines(logs) == [f"Wi-Fi credentials: no answer from {BOARD} in 0.3 s", KEPT]
    assert not _leaks(logs)


def test_the_4_inch_board_stores_them_while_an_amoled_board_answers_the_nack(relay_files, logs, fast):
    wifi = relay_files / "wifi.json"
    lcd4, amoled = Board(wifi="ok"), Board(wifi="none")

    async def scenario():
        await until(lambda: USAGE in lcd4.sent and USAGE in amoled.sent)
        _write(wifi, {"ssid": SSID, "pass": SECRET})
        await until(lambda: lcd4.wf() and amoled.wf() and _settled())
        await asyncio.sleep(0.1)                            # both links tick on: nothing more goes

    _drive({BOARD: lcd4, BOARD_B: amoled}, scenario)
    assert lcd4.wf() == [CREDENTIALS] and amoled.wf() == [CREDENTIALS]
    assert not wifi.exists()
    assert _wifi_lines(logs) == [f"Wi-Fi credentials: {BOARD_B} has no Wi-Fi (it answered the plain nack)", STORED]
    assert not _leaks(logs)


def test_a_clear_waits_for_a_board_with_wifi_too(relay_files, logs, fast):
    """{"ssid": ""} is for the boards built with Wi-Fi as much as a network is."""
    wifi = relay_files / "wifi.json"
    amoled = Board(wifi="none")

    async def scenario():
        await until(lambda: USAGE in amoled.sent)
        _write(wifi, {"ssid": ""})
        await until(lambda: amoled.wf() and _settled())

    _drive({BOARD_B: amoled}, scenario)
    assert wifi.exists()
    assert f"{KEPT} (empty ssid: the boards forget the network)" in logs
    lcd4 = Board(wifi="ok")

    async def later():
        await until(lambda: not wifi.exists())

    _drive({BOARD: lcd4}, later)
    assert lcd4.wf() == [{"wf": ""}]
    assert f"{STORED} (empty ssid: the boards forget the network)" in logs


# ---------------------------------------------------------------------------
# One wait for every board, and nobody waits on it
# ---------------------------------------------------------------------------

def test_two_silent_boards_cost_one_wait_not_two(relay_files, logs, fast, monkeypatch):
    monkeypatch.setattr(mod, "WIFI_ANSWER_WAIT", 0.5)
    wifi = relay_files / "wifi.json"
    a, b = Board(wifi="mute"), Board(wifi="mute")
    span = []

    async def scenario():
        await until(lambda: USAGE in a.sent and USAGE in b.sent)
        _write(wifi, {"ssid": SSID, "pass": SECRET})
        await until(lambda: a.wf() and b.wf())
        await until(_settled)
        span.append(time.monotonic() - max(a.wf_at(), b.wf_at()))

    _drive({BOARD: a, BOARD_B: b}, scenario)
    assert 0.5 - CLOCK_SLACK <= span[0] < 0.85            # one wait for both (two would be 1.0 s)
    assert f"Wi-Fi credentials: no answer from {BOARD} in 0.5 s" in logs
    assert f"Wi-Fi credentials: no answer from {BOARD_B} in 0.5 s" in logs
    assert wifi.exists()
    assert not _leaks(logs)


def test_no_link_waits_on_the_answers(relay_files, logs, fast, monkeypatch):
    """The wait runs as its own asyncio task: while one board says nothing, both links tick on,
    and a page written mid wait reaches both boards, the one whose link sent the credentials too,
    before the wait is over."""
    monkeypatch.setattr(mod, "WIFI_ANSWER_WAIT", 2.0)
    wifi = relay_files / "wifi.json"
    a, b = Board(wifi="ok"), Board(wifi="mute")

    async def scenario():
        await until(lambda: USAGE in a.sent and USAGE in b.sent)
        _write(wifi, {"ssid": SSID, "pass": SECRET})
        await until(lambda: a.wf() and b.wf())
        assert mod._WIFI_BUSY                               # b's answer is still awaited
        _write(relay_files / "page.json", {**PAGE, "expires": time.time() + 30})
        await until(lambda: PAGE in a.sent and PAGE in b.sent)
        assert mod._WIFI_BUSY and wifi.exists()             # both pages went mid wait
        await until(_settled)

    _drive({BOARD: a, BOARD_B: b}, scenario)
    assert not wifi.exists()                                # a stored them
    assert _wifi_lines(logs) == [f"Wi-Fi credentials: no answer from {BOARD_B} in 2 s", STORED]
    assert not _leaks(logs)


def test_a_daemon_that_stops_mid_wait_ends_it_at_once_and_keeps_the_file(relay_files, logs, fast, monkeypatch):
    monkeypatch.setattr(mod, "WIFI_ANSWER_WAIT", 30.0)
    wifi = relay_files / "wifi.json"
    board = Board(wifi="mute")
    _write(wifi, {"ssid": SSID, "pass": SECRET})

    async def scenario():
        await until(lambda: board.wf())
        assert mod._WIFI_BUSY

    started = time.monotonic()
    _drive({BOARD: board}, scenario)
    assert time.monotonic() - started < 5                   # Quit never waits on the answers
    assert not mod._WIFI_BUSY
    assert wifi.exists()
    assert "Wi-Fi answers no longer awaited, the daemon is stopping: the file stays" in logs
    assert not _leaks(logs)


# ---------------------------------------------------------------------------
# Never the same version to the same board twice; a board that links later gets it
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("answer", ["none", "no", "mute"])
def test_a_board_that_did_not_store_them_never_gets_that_file_again_but_a_new_board_does(
        relay_files, logs, fast, monkeypatch, answer):
    monkeypatch.setattr(mod, "WIFI_ANSWER_WAIT", 0.2)
    wifi = relay_files / "wifi.json"
    _write(wifi, {"ssid": SSID, "pass": SECRET})
    first = Board(wifi=answer)

    async def ticks():
        await until(lambda: first.wf() and _settled())
        await asyncio.sleep(0.3)                            # thirty ticks more

    _drive({BOARD: first}, ticks)
    again = Board(wifi=answer)                              # the same board links again

    async def relink():
        await until(lambda: USAGE in again.sent)
        await asyncio.sleep(0.3)

    _drive({BOARD: again}, relink)
    later = Board(wifi="ok")                                # a board that has not had it

    async def new_board():
        await until(lambda: not wifi.exists())

    _drive({BOARD_B: later}, new_board)
    assert first.wf() == [CREDENTIALS]
    assert again.wf() == []
    assert later.wf() == [CREDENTIALS]
    assert STORED in logs
    assert not _leaks(logs)


def test_a_new_version_goes_again_to_a_board_that_did_not_store_the_last(relay_files, logs, fast):
    """Writing the file again is how the operator sends it again to a board that missed it."""
    wifi = relay_files / "wifi.json"
    board = Board(wifi="none")

    async def scenario():
        await until(lambda: USAGE in board.sent)
        _write(wifi, {"ssid": SSID, "pass": SECRET})
        await until(lambda: board.wf() and _settled())
        _write(wifi, {"ssid": SSID, "pass": SECRET + "-2"})
        await until(lambda: len(board.wf()) == 2 and _settled())

    _drive({BOARD: board}, scenario)
    assert board.wf() == [CREDENTIALS, {"wf": SSID, "wp": SECRET + "-2"}]
    assert logs.count(KEPT) == 2
    assert not _leaks(logs)


# ---------------------------------------------------------------------------
# A link that cannot hear its board, a late answer, a file written again mid wait
# ---------------------------------------------------------------------------

def test_a_link_that_cannot_hear_its_board_counts_the_write_as_stored(relay_files, logs, fast, monkeypatch):
    """The documented rule (README-windows.md, Wi-Fi): with no TX subscription no answer can be
    heard, so there is nothing to wait for, and the write counts as stored, as it always did."""
    monkeypatch.setattr(mod, "WIFI_ANSWER_WAIT", 5.0)
    wifi = relay_files / "wifi.json"
    board = Board(tx=False)
    _write(wifi, {"ssid": SSID, "pass": SECRET})

    async def scenario():
        await until(lambda: not wifi.exists(), timeout=3.0)  # well inside the 5 s wait: none was kept

    _drive({BOARD: board}, scenario)
    assert board.wf() == [CREDENTIALS]
    assert _wifi_lines(logs) == ["Wi-Fi credentials sent to 1 board(s) that cannot answer, file removed"]
    assert not _leaks(logs)


def test_a_board_heard_and_a_board_not_heard_together(relay_files, logs, fast):
    """The rule holds beside a board that answers: the write to the link that cannot hear counts."""
    wifi = relay_files / "wifi.json"
    deaf, amoled = Board(tx=False), Board(wifi="none")

    async def scenario():
        await until(lambda: USAGE in deaf.sent and USAGE in amoled.sent)
        _write(wifi, {"ssid": SSID, "pass": SECRET})
        await until(lambda: deaf.wf() and amoled.wf() and _settled())

    _drive({BOARD: deaf, BOARD_B: amoled}, scenario)
    assert not wifi.exists()
    assert _wifi_lines(logs) == [f"Wi-Fi credentials: {BOARD_B} has no Wi-Fi (it answered the plain nack)",
                                 "Wi-Fi credentials sent to 1 board(s) that cannot answer, file removed"]
    assert not _leaks(logs)


def test_an_answer_after_the_wait_changes_nothing(relay_files, logs, fast, monkeypatch):
    monkeypatch.setattr(mod, "WIFI_ANSWER_WAIT", 0.2)
    wifi = relay_files / "wifi.json"
    board = Board(wifi="ok", delay=0.5)

    async def scenario():
        await until(lambda: USAGE in board.sent)
        _write(wifi, {"ssid": SSID, "pass": SECRET})
        await until(lambda: board.wf() and _settled())
        assert wifi.exists()
        await until(lambda: any("came after the wait" in line for line in logs))
        await asyncio.sleep(0.1)

    _drive({BOARD: board}, scenario)
    assert wifi.exists()
    assert board.wf() == [CREDENTIALS]
    assert _wifi_lines(logs) == [f"Wi-Fi credentials: no answer from {BOARD} in 0.2 s", KEPT,
                                 f"Wi-Fi answer ok came after the wait, ignored ({BOARD})"]
    assert not _leaks(logs)


def test_a_file_written_again_while_the_boards_answer_is_left_for_its_own_turn(relay_files, logs, fast, monkeypatch):
    """The board stored the first version, but by then the file holds a newer one: that is not
    removed under it, and goes to the board on its own turn."""
    monkeypatch.setattr(mod, "WIFI_ANSWER_WAIT", 1.0)
    wifi = relay_files / "wifi.json"
    board = Board(wifi="ok", delay=0.3)
    newer = {"wf": SSID, "wp": SECRET + "-2"}

    async def scenario():
        await until(lambda: USAGE in board.sent)
        _write(wifi, {"ssid": SSID, "pass": SECRET})
        await until(lambda: board.wf())
        _write(wifi, {"ssid": SSID, "pass": SECRET + "-2"})  # the operator ran wifi set again
        await until(lambda: not wifi.exists())

    _drive({BOARD: board}, scenario)
    assert board.wf() == [CREDENTIALS, newer]
    assert _wifi_lines(logs) == [
        "Wi-Fi credentials stored by 1 board(s); the file changed meanwhile and is left alone", STORED]
    assert not _leaks(logs)
