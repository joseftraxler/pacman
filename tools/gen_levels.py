import os
from collections import deque

W, H = 28, 14
GHOST_LETTERS = ['R', 'G', 'B', 'O']
# js/levels/ relativně k tomuto skriptu (tools/gen_levels.py)
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "js", "levels")


def new_grid():
    g = [['-'] * W for _ in range(H)]
    for x in range(W):
        g[0][x] = '#'
        g[H - 1][x] = '#'
    for y in range(H):
        g[y][0] = '#'
        g[y][W - 1] = '#'
    return g


def fill(g, x1, y1, x2, y2):
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            g[y][x] = '#'


def pillars(g, cols, rows, bw=1, bh=1):
    for r in rows:
        for c in cols:
            fill(g, c, r, c + bw - 1, r + bh - 1)


def place(g, x, y, ch):
    g[y][x] = ch


def build(level):
    """Vrátí grid (seznam řádků-stringů) pro daný level (1..10)."""
    g = new_grid()
    walls = []
    ghosts = []
    player = (13, 6)

    if level == 1:
        # Úplně otevřené, jeden duch
        ghosts = [(22, 2, 'R')]
        player = (13, 7)

    elif level == 2:
        fill(g, 4, 4, 11, 4)
        fill(g, 16, 9, 23, 9)
        ghosts = [(4, 2, 'R')]
        player = (13, 7)

    elif level == 3:
        fill(g, 3, 3, 11, 3)
        fill(g, 16, 10, 24, 10)
        fill(g, 13, 5, 13, 8)
        ghosts = [(3, 2, 'R'), (24, 11, 'G')]
        player = (13, 11)

    elif level == 4:
        fill(g, 4, 3, 4, 10)
        fill(g, 23, 3, 23, 10)
        fill(g, 9, 6, 18, 6)
        ghosts = [(2, 2, 'R'), (25, 11, 'G')]
        player = (13, 9)

    elif level == 5:
        fill(g, 4, 3, 11, 3)
        fill(g, 16, 3, 23, 3)
        fill(g, 4, 10, 11, 10)
        fill(g, 16, 10, 23, 10)
        fill(g, 13, 5, 14, 8)
        ghosts = [(2, 2, 'R'), (25, 2, 'G'), (13, 11, 'B')]
        player = (2, 11)

    elif level == 6:
        pillars(g, cols=[4, 9, 14, 19, 23], rows=[3, 7, 10], bw=2, bh=1)
        ghosts = [(2, 2, 'R'), (25, 2, 'G'), (25, 11, 'B')]
        player = (13, 6)

    elif level == 7:
        pillars(g, cols=[3, 7, 11, 16, 20, 24], rows=[3, 6, 9], bw=1, bh=2)
        ghosts = [(2, 2, 'R'), (25, 2, 'G'), (2, 11, 'B'), (25, 11, 'O')]
        player = (13, 12)

    elif level == 8:
        pillars(g, cols=[3, 6, 9, 12, 15, 18, 21, 24], rows=[3, 6, 9], bw=1, bh=1)
        fill(g, 13, 1, 14, 2)
        ghosts = [(2, 2, 'R'), (25, 2, 'G'), (2, 11, 'B'), (25, 11, 'O')]
        player = (1, 6)

    elif level == 9:
        pillars(g, cols=[3, 6, 9, 12, 15, 18, 21, 24], rows=[2, 4, 6, 8, 10], bw=1, bh=1)
        ghosts = [(1, 1, 'R'), (26, 1, 'G'), (1, 12, 'B'), (26, 12, 'O')]
        player = (13, 6)

    elif level == 10:
        pillars(g, cols=[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 25],
                rows=[2, 4, 6, 8, 10], bw=1, bh=1)
        # otevřeme prostřední koridor pro trochu vzduchu
        fill_open(g, 13, 5, 14, 8)
        ghosts = [(1, 1, 'R'), (26, 1, 'G'), (1, 12, 'B'), (26, 12, 'O')]
        player = (13, 6)

    # umístíme hráče a duchy (přepíšou případnou zeď na volno)
    place(g, player[0], player[1], 'P')
    for (gx, gy, letter) in ghosts:
        place(g, gx, gy, letter)

    place_power_pellets(g)

    return g, player, ghosts


def place_power_pellets(g, count=4):
    """Rozmístí power-pelety (*) poblíž rohů – nahrazuje jen existující tečky,
    takže nikdy nekoliduje se zdí ani s entitou."""
    candidates = [
        (2, 2), (W - 3, 2), (2, H - 3), (W - 3, H - 3),
        (3, 2), (W - 4, 2), (3, H - 3), (W - 4, H - 3),
        (2, 3), (W - 3, 3), (2, H - 4), (W - 3, H - 4),
    ]
    placed = 0
    for (x, y) in candidates:
        if placed >= count:
            break
        if g[y][x] == '-':
            g[y][x] = '*'
            placed += 1


def fill_open(g, x1, y1, x2, y2):
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            if g[y][x] == '#':
                g[y][x] = '-'


def validate(level, g, player, ghosts):
    errors = []
    # rozměry
    for y, row in enumerate(g):
        if len(row) != W:
            errors.append(f"řádek {y} má šířku {len(row)} != {W}")
    if len(g) != H:
        errors.append(f"výška {len(g)} != {H}")

    walkable = lambda x, y: 0 <= x < W and 0 <= y < H and g[y][x] != '#'

    # BFS z hráče
    seen = [[False] * W for _ in range(H)]
    q = deque([player])
    seen[player[1]][player[0]] = True
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if walkable(nx, ny) and not seen[ny][nx]:
                seen[ny][nx] = True
                q.append((nx, ny))

    # každá tečka (i power-peleta) musí být dosažitelná
    pellets = 0
    for y in range(H):
        for x in range(W):
            if g[y][x] in ('-', '*'):
                pellets += 1
                if not seen[y][x]:
                    errors.append(f"nedosažitelná tečka na ({x},{y})")

    # duchové dosažitelní
    for (gx, gy, letter) in ghosts:
        if not seen[gy][gx]:
            errors.append(f"nedosažitelný duch {letter} na ({gx},{gy})")

    if pellets == 0:
        errors.append("žádné tečky")

    return errors, pellets


def ghost_speed(level, total=10, min_pct=45, max_pct=90):
    """Rychlost duchů v procentech rychlosti hráče, roste lineárně."""
    t = (level - 1) / (total - 1) if total > 1 else 1
    return round(min_pct + (max_pct - min_pct) * t)


def to_js(level, g):
    name = f"level{level}"
    speed = ghost_speed(level)
    rows = ',\n'.join(f'    "{"".join(r)}"' for r in g)
    return (
        'import {Level} from "../level.js";\n\n'
        f'// první argument = rychlost duchů v % rychlosti hráče (100 = stejně rychlí)\n'
        f'const {name} = new Level(\n    {speed},\n{rows},\n);\n\n'
        f'export {{{name}}};\n'
    )


def main():
    summary = []
    for level in range(1, 11):
        g, player, ghosts = build(level)
        errors, pellets = validate(level, g, player, ghosts)
        status = "OK" if not errors else "CHYBA"
        summary.append((level, len(ghosts), pellets, status, errors))
        if not errors:
            with open(os.path.join(OUT_DIR, f"level{level}.js"), "w") as f:
                f.write(to_js(level, g))

    print(f"{'lvl':>3} {'duchů':>6} {'teček':>6}  stav")
    all_ok = True
    for level, ng, pel, status, errors in summary:
        print(f"{level:>3} {ng:>6} {pel:>6}  {status}")
        for e in errors:
            all_ok = False
            print(f"        ! {e}")
    print("VŠE OK" if all_ok else "NĚKTERÉ LEVELY MAJÍ CHYBY – soubory nezapsány")


if __name__ == "__main__":
    main()
