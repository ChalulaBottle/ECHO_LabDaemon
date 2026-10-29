"""Per board creature names: which table a board carries, and the nearest name it holds.

The hooks name creatures for the best table there is; a board carries one of two
(daemon/board_tables.json, written by tools/board_tables.py from
firmware/src/splash_animations.h): "base", built without SPLASH_BIG (the 2.16
AMOLED), or "big", the base rows plus the big tier (the 4 inch LCD). A board says
which in its status report: "n" is its row count. A name the board's table holds
goes as it is; else the first name of its chain (FALLBACK) that the table holds;
else None, which the tray sends as no "a" at all, handing the choice back to the
board's own rotation (firmware main.cpp reads a missing "a" as "", the release).

A board whose table is not known (no report, a plain nack from firmware without
the cmd message, or a count that matches neither build) is treated as base.
"""
import json
from pathlib import Path

TABLES_FILE = Path(__file__).resolve().parent / "board_tables.json"

# Each name's fallbacks, nearest first. The HD remakes fall back to their 20
# cell originals, the Fable working set to the echo set, the tier ultra cells
# and the big tier's ultracode creature to ultracode work. A name with no chain
# and not in the table (the culture and lab creatures, say) hands back.
FALLBACK = {
    "echo ssh hd": ("echo ssh",),
    "ctf hoodie hd": ("ctf hoodie",),
    "fable work": ("echo work",),
    "fable write": ("echo write",),
    "fable read": ("echo read",),
    "fable done": ("job done",),
    "fable ultra": ("ultracode work",),
    "opus ultra": ("ultracode work",),
    "sonnet ultra": ("ultracode work",),
    "echo packet dodge": ("ultracode work",),
}

BIG, BASE, UNKNOWN = "big", "base", "unknown"


def load_tables(path=None) -> dict:
    """{"base": frozenset, "big": frozenset (base plus the big rows), "counts":
    {"base": n, "big": n}}. A missing or damaged file gives empty tables and no
    counts: every board is then unknown, and resolve() passes names through."""
    try:
        data = json.loads(Path(path or TABLES_FILE).read_text(encoding="utf-8"))
        base = frozenset(data["base"])
        big = base | frozenset(data["big"])
        counts = {"base": int(data["counts"]["base"]), "big": int(data["counts"]["big"])}
        return {"base": base, "big": big, "counts": counts}
    except (OSError, ValueError, KeyError, TypeError):
        return {"base": frozenset(), "big": frozenset(), "counts": {}}


TABLES = load_tables()


def table_of(n, tables=None) -> str:
    """"big", "base" or "unknown" for a status report's "n"."""
    tables = TABLES if tables is None else tables
    counts = tables.get("counts") or {}
    if isinstance(n, bool) or not isinstance(n, int):
        return UNKNOWN
    if n == counts.get("big"):
        return BIG
    if n == counts.get("base"):
        return BASE
    return UNKNOWN


def resolve(name: str, table: str, tables=None):
    """The name to send a board with this table: the name, its nearest fallback
    the table holds, or None (hand back). An unknown table counts as base. With
    no tables loaded at all the name goes as it is."""
    tables = TABLES if tables is None else tables
    names = tables.get(BIG if table == BIG else BASE)
    if not names:
        return name
    if name in names:
        return name
    for alt in FALLBACK.get(name, ()):
        if alt in names:
            return alt
    return None
