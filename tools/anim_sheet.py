#!/usr/bin/env python3
"""Render a contact sheet (every frame in order, left to right, top to bottom) from
claudepix-format animation JSON, so a whole loop can be judged in one still.

usage: python tools/anim_sheet.py [--in tools/echo_anims] [--out docs/media/sheets]
                                  [--only echo_pumpkin,echo_wanderer] [--cols 8] [--edge 120]
Each frame is drawn palette-exact at --edge px square (every lattice gets the same edge:
60 cells draw at 2 px, 40 at 3 px, 20 at 6 px) with a 1 px gap and its index and hold in
the gap below it, --cols frames a row. Output: <out>/<key>-sheet.png. Index 0 is panel black.
Needs Pillow (.venv\\Scripts\\python.exe).
"""
import argparse, json, os
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument("--in", dest="src", default=os.path.join("tools", "echo_anims"))
ap.add_argument("--out", default=os.path.join("docs", "media", "sheets"))
ap.add_argument("--only", default="")
ap.add_argument("--cols", type=int, default=8)
ap.add_argument("--edge", type=int, default=120)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)


def hexrgb(h):
    if not h or h == "transparent":
        return (0, 0, 0)
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


only = {k.strip() for k in a.only.split(",") if k.strip()}
index = json.load(open(os.path.join(a.src, "_index.json")))
LABEL = 12
for e in index:
    key = e["filename"].replace(".html", "")
    if only and key not in only:
        continue
    d = json.load(open(os.path.join(a.src, key + ".json")))
    pal = [hexrgb(p) for p in d["palette"]]
    n = d.get("size") or len(d["frames"][0]["grid"])
    cell = max(1, a.edge // n)
    edge = n * cell
    frames = d["frames"]
    cols = min(a.cols, len(frames))
    rows_ = (len(frames) + cols - 1) // cols
    W = cols * (edge + 1) + 1
    H = rows_ * (edge + 1 + LABEL) + 1
    sheet = Image.new("RGB", (W, H), (40, 40, 40))
    px = sheet.load()
    draw = ImageDraw.Draw(sheet)
    total = 0
    for i, f in enumerate(frames):
        x0 = 1 + (i % cols) * (edge + 1)
        y0 = 1 + (i // cols) * (edge + 1 + LABEL)
        for r, row in enumerate(f["grid"]):
            for c, v in enumerate(row):
                rgb = pal[v] if v else (0, 0, 0)
                for y in range(cell):
                    for x in range(cell):
                        px[x0 + c * cell + x, y0 + r * cell + y] = rgb
        draw.text((x0 + 2, y0 + edge), f"{i} {f['hold']}ms", fill=(200, 200, 200))
        total += f["hold"]
    out = os.path.join(a.out, key + "-sheet.png")
    sheet.save(out)
    print(f"{key}: {len(frames)} frames, {n} x {n}, {total} ms a loop, {len(frames) * n * n} bytes of frames -> {out}")
