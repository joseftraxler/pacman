#!/usr/bin/env python3
"""Vykreslí náhled hry (SVG) z definice levelu – stejnými tvary a barvami jako
js/game.js. Výstup: docs/preview.svg. Nenahrazuje běžící hru, jde o věrný náhled.

Použití: python3 tools/render_preview.py [levelX]   (výchozí level7)
"""
import math
import os
import re
import sys

TILE = 26
HUD = 44
COLS, ROWS = 28, 14

BG = "#000000"
WALL = "#1420c8"
PELLET = "#ffd9a0"
PAC = "#ffe11a"
EYE = "#ffffff"
PUPIL = "#0018aa"
GHOST_COLORS = {"R": "#ff0000", "G": "#2ee66b", "B": "#33ddff", "O": "#ff9d2e"}

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


def px(x):
    return round(x * TILE, 2)


def py(y):
    return round(HUD + y * TILE, 2)


def parse_level(name):
    path = os.path.join(ROOT, "js", "levels", f"{name}.js")
    with open(path, encoding="utf-8") as f:
        src = f.read()
    rows = [m for m in re.findall(r'"([^"]*)"', src) if len(m) == COLS]
    if len(rows) != ROWS:
        raise SystemExit(f"neočekávaný počet řádků mapy: {len(rows)} (čekám {ROWS})")
    return rows


def pac_path(cx, cy, r):
    theta = 0.2 * math.pi  # poloviční úhel pusy
    pux, puy = cx + r * math.cos(theta), cy - r * math.sin(theta)
    plx, ply = cx + r * math.cos(theta), cy + r * math.sin(theta)
    # od středu ven, pak dlouhým obloukem (proti smyslu hod. ručiček) zpět – pusa vpravo
    return (f"M {round(cx,2)} {round(cy,2)} L {round(pux,2)} {round(puy,2)} "
            f"A {round(r,2)} {round(r,2)} 0 1 0 {round(plx,2)} {round(ply,2)} Z")


def ghost_path(cx, cy, r):
    hy = cy - 0.1 * r
    bottom = cy + 0.8 * r
    d = [f"M {round(cx - r,2)} {round(bottom,2)}",
         f"L {round(cx - r,2)} {round(hy,2)}",
         f"A {round(r,2)} {round(r,2)} 0 0 1 {round(cx + r,2)} {round(hy,2)}",
         f"L {round(cx + r,2)} {round(bottom,2)}"]
    waves = 4
    valley = cy + 0.5 * r
    for i in range(waves):
        x1 = cx + r - (2 * r) * ((i + 0.5) / waves)
        x2 = cx + r - (2 * r) * ((i + 1) / waves)
        d.append(f"Q {round(x1,2)} {round(valley,2)} {round(x2,2)} {round(bottom,2)}")
    d.append("Z")
    return " ".join(d)


def build_svg(rows):
    width = COLS * TILE
    height = HUD + ROWS * TILE
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
           f'viewBox="0 0 {width} {height}" font-family="Courier New, monospace">']
    out.append(f'<rect width="{width}" height="{height}" fill="{BG}"/>')

    pac = None
    ghosts = []

    # zdi a tečky
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == "#":
                s = TILE * 0.84
                out.append(f'<rect x="{px(x) + TILE*0.08:.2f}" y="{py(y) + TILE*0.08:.2f}" '
                           f'width="{s:.2f}" height="{s:.2f}" rx="{TILE*0.22:.2f}" fill="{WALL}"/>')
            elif ch == "-":
                out.append(f'<circle cx="{px(x + 0.5)}" cy="{py(y + 0.5)}" '
                           f'r="{TILE*0.11:.2f}" fill="{PELLET}"/>')
            elif ch == "*":
                out.append(f'<text x="{px(x + 0.5)}" y="{py(y + 0.5)}" '
                           f'font-size="{TILE*0.9:.1f}" text-anchor="middle" '
                           f'dominant-baseline="central">🍒</text>')
            elif ch == "P":
                pac = (x, y)
            elif ch in GHOST_COLORS:
                ghosts.append((x, y, ch))

    # duchové
    for (gx, gy, ch) in ghosts:
        cx, cy = px(gx + 0.5), py(gy + 0.5)
        r = TILE * 0.45
        out.append(f'<path d="{ghost_path(cx, cy, r)}" fill="{GHOST_COLORS[ch]}"/>')
        # oči hledí k pacmanovi
        dx, dy = 0.0, 0.2
        if pac:
            vx, vy = (pac[0] - gx), (pac[1] - gy)
            n = math.hypot(vx, vy) or 1
            dx, dy = vx / n, vy / n
        for side in (-1, 1):
            ex = cx + side * r * 0.38
            ey = cy - r * 0.15
            out.append(f'<circle cx="{ex:.2f}" cy="{ey:.2f}" r="{r*0.28:.2f}" fill="{EYE}"/>')
            out.append(f'<circle cx="{ex + dx*r*0.18:.2f}" cy="{ey + dy*r*0.18:.2f}" '
                       f'r="{r*0.14:.2f}" fill="{PUPIL}"/>')

    # pacman
    if pac:
        cx, cy = px(pac[0] + 0.5), py(pac[1] + 0.5)
        out.append(f'<path d="{pac_path(cx, cy, TILE*0.45)}" fill="{PAC}"/>')

    # HUD
    level_num = re.search(r"\d+", sys.argv[1] if len(sys.argv) > 1 else "level7")
    ln = level_num.group() if level_num else "7"
    out.append(f'<text x="6" y="30" font-size="20" fill="#ffffff">SKÓRE: 1250</text>')
    out.append(f'<text x="{width/2:.0f}" y="30" font-size="20" fill="#ffffff" '
               f'text-anchor="middle">LEVEL {ln}/10</text>')
    out.append(f'<text x="{width-6}" y="30" font-size="20" text-anchor="end">'
               f'<tspan fill="#ffffff">ŽIVOTY: </tspan><tspan fill="#ff4d4d">♥♥♥</tspan></text>')

    out.append("</svg>")
    return "\n".join(out) + "\n"


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else "level7"
    rows = parse_level(name)
    svg = build_svg(rows)
    os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)
    dst = os.path.join(ROOT, "docs", "preview.svg")
    with open(dst, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"zapsáno: docs/preview.svg  ({len(svg)} B, level {name})")


if __name__ == "__main__":
    main()
