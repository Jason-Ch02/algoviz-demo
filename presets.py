"""
Generate preset mazes for the pathfinding grid.

The visualizer is mostly JavaScript, but the wall layouts you can load from the
"Preset" menu are generated here and written to data.json — so the grid size and
presets stay in one place and the frontend just renders them.

Run:  python presets.py   ->   data.json
"""

import json

ROWS, COLS = 21, 41
START = [10, 3]
END = [10, COLS - 4]


def comb():
    """Vertical 'teeth' with gaps alternating top/bottom."""
    walls = []
    for i, c in enumerate(range(5, COLS - 3, 6)):
        rng = range(1, ROWS - 4) if i % 2 == 0 else range(4, ROWS - 1)
        walls += [[r, c] for r in rng]
    return walls


def rooms():
    """A grid of rooms separated by walls with single doorways."""
    walls = []
    mid_r = ROWS // 2
    for c in range(COLS):
        if c not in (COLS // 4, 3 * COLS // 4):       # leave doorways
            walls.append([mid_r, c])
    for c in (COLS // 3, 2 * COLS // 3):
        for r in range(ROWS):
            if r not in (mid_r // 2, mid_r + mid_r // 2):
                walls.append([r, c])
    return walls


def zigzag():
    """Staggered horizontal walls that force a snaking path."""
    walls = []
    for i, r in enumerate(range(3, ROWS - 2, 4)):
        if i % 2 == 0:
            walls += [[r, c] for c in range(1, COLS - 6)]
        else:
            walls += [[r, c] for c in range(5, COLS - 1)]
    return walls


def dedupe(cells):
    seen, out = set(), []
    block = {tuple(START), tuple(END)}
    for c in cells:
        t = tuple(c)
        if t not in seen and t not in block:
            seen.add(t); out.append(list(c))
    return out


def main():
    data = {
        "grid": {"rows": ROWS, "cols": COLS},
        "start": START,
        "end": END,
        "presets": {
            "Comb": dedupe(comb()),
            "Rooms": dedupe(rooms()),
            "Zigzag": dedupe(zigzag()),
        },
    }
    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    sizes = {k: len(v) for k, v in data["presets"].items()}
    print(f"Wrote data.json — grid {ROWS}x{COLS}, presets {sizes}")


if __name__ == "__main__":
    main()
