#!/usr/bin/env python3
"""Write daemon/board_tables.json from firmware/src/splash_animations.h.

    python tools/board_tables.py            write the file
    python tools/board_tables.py --check    exit 1 when the file is out of date

The tray resolves the creature name it sends per board (daemon/anim_fallback.py):
a board built without SPLASH_BIG carries the base table, one built with it the
base rows plus the big rows. A board says which in its status report: "n" is its
SPLASH_ANIM_COUNT. This reads the splash_anims[] table only (the header has a
second #ifdef SPLASH_BIG block, the big tier's data arrays, which says nothing
about rows) and writes

    {"base": [names outside SPLASH_BIG], "big": [names inside it],
     "counts": {"base": <SPLASH_ANIM_COUNT without SPLASH_BIG>,
                "big": <SPLASH_ANIM_COUNT with it>}}

so a board answering n == counts.big holds base + big, n == counts.base holds
base. Run it after every table change (tools/add_echo_anims.py and the like)
and commit the JSON with the header.
"""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
HEADER = REPO / "firmware" / "src" / "splash_animations.h"
OUT = REPO / "daemon" / "board_tables.json"

ROW = re.compile(r'^\s*\{"([^"]*)",')
COUNT = re.compile(r"#ifdef SPLASH_BIG\s*#define SPLASH_ANIM_COUNT (\d+)\s*#else\s*#define SPLASH_ANIM_COUNT (\d+)\s*#endif")


def tables(text: str) -> dict:
    """The two lists and the two counts from the header's text. Raises
    ValueError when the table is not where it should be or the counts do not
    match the rows."""
    m = COUNT.search(text)
    if m is None:
        raise ValueError("no SPLASH_ANIM_COUNT pair (#ifdef SPLASH_BIG ... #else ... #endif)")
    big_count, base_count = int(m.group(1)), int(m.group(2))
    start = text.find("splash_anims[SPLASH_ANIM_COUNT]")
    if start < 0:
        raise ValueError("no splash_anims[SPLASH_ANIM_COUNT] table")
    end = text.find("};", start)
    if end < 0:
        raise ValueError("splash_anims[] has no end")
    base, big = [], []
    inside = False
    for line in text[start:end].splitlines():
        s = line.strip()
        if s.startswith("#ifdef SPLASH_BIG"):
            inside = True
            continue
        if s.startswith("#endif"):
            inside = False
            continue
        row = ROW.match(line)
        if row:
            (big if inside else base).append(row.group(1))
    if len(base) != base_count or len(base) + len(big) != big_count:
        raise ValueError(f"rows ({len(base)} base, {len(big)} big) do not match the counts"
                         f" ({base_count} without SPLASH_BIG, {big_count} with it)")
    if len(set(base + big)) != len(base) + len(big):
        raise ValueError("a name appears twice in the table")
    return {"base": base, "big": big, "counts": {"base": base_count, "big": big_count}}


def render(data: dict) -> str:
    return json.dumps(data, indent=1, ensure_ascii=False) + "\n"


def main(argv=None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    text = render(tables(HEADER.read_text(encoding="utf-8")))
    if "--check" in argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != text:
            print(f"{OUT} is out of date: run python tools/board_tables.py")
            return 1
        return 0
    OUT.write_text(text, encoding="utf-8", newline="\n")
    data = json.loads(text)
    print(f"Wrote {OUT}: {len(data['base'])} base rows, {len(data['big'])} big rows"
          f" (counts {data['counts']['base']} and {data['counts']['big']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
