# CLAUDE.md

Pokyny pro práci na této hře. Drž se jich, ať zůstane konzistentní.

## Co to je

Klon Pac-Mana v čistém JavaScriptu (ES moduly), běží celý na HTML `<canvas>`.
Bez frameworků, bez závislostí, bez build kroku.

## Spuštění a testování

ES moduly se **nenačtou přes `file://`** – je nutný statický HTTP server:

```bash
python3 -m http.server 8000   # pak http://localhost:8000
```

Není žádný test runner ani linter. Ověřuj změny **v prohlížeči**. V tomto
prostředí není Node, takže `node`/`npm` nejsou k dispozici; syntaxi nelze ověřit
přes `node --check`.

## Architektura a klíčový princip

**Vazba jde jen jedním směrem: `Game` řídí, entity se starají samy o sebe.**

- `Game` (`js/game.js`) orchestruje hru: herní smyčka, stavy, kolize, skóre,
  vykreslení prostředí (bludiště, tečky, HUD) a rozhodnutí, **kam** se entita
  vykreslí.
- Entity (`js/entities/`) **nesmí ovládat hru**. Nemění skóre ani stav hry.
  Do světa jen *nahlížejí* kvůli vlastnímu pohybu (`this.game.level` pro zdi,
  `Ghost` navíc `this.game.player` jako cíl). O snědení tečky a skóre rozhoduje
  `Game`, ne `Player`.
- `Entity.draw(ctx, cx, cy, size)` je abstraktní; `Player`/`Ghost` ji implementují
  a **nesahají na `this.game`** – dostanou kontext i pozici parametrem. Tuhle
  nezávislost `draw` na hře zachovej.

Ostatní moduly: `level.js` (parsování mapy), `directions.js` (směry + `isReverse`),
`input.js` (mapování kláves na akce), `scripts.js` (bootstrap – canvas, seznam
levelů, ovládání, spuštění).

## Pohybový model

Entity se pohybují plynule v jednotkách políček, ale **o směru se rozhoduje vždy
přesně ve středu políčka** (`Entity.step` + `decide`). Pozice jsou spojité, střed
políčka = celá čísla. `animPhase` je naakumulovaná ujetá vzdálenost (pro animaci,
nezávisle na čase i na hře).

## Formát levelu

`new Level(ghostSpeed, ...rows)`:

- **`ghostSpeed`** = rychlost duchů v **procentech rychlosti hráče** (100 = stejně
  rychlí jako hráč). Skutečná rychlost se počítá v `Game.loadLevel`
  (`playerSpeed = 6.5`).
- **řádky mapy** – legenda: `#` zeď, `-` tečka, `*` ovoce/power-peleta, `P` hráč,
  `R`/`G`/`B`/`O` duchové (červený/zelený/modrý/oranžový), mezera = průchozí prázdno.

`pelletCount` zahrnuje **jen tečky `-`** – ovoce `*` je volitelné a do dokončení se
nepočítá. Level je hotový, až se snědí všechny `-`. Každá `-` musí být dosažitelná
a nikde nesmí být uzavřená oblast, jinak level nejde dokončit. Po úpravě mapy vždy
**ověř souvislost**: BFS ze startu hráče (`P`) musí projít každou tečku a duchy.
Řádek má 28 znaků, mapa 14 řádků.

Druh ovoce určuje `Level` (pole `FRUITS`, přiřazuje se v pořadí čtení mapy) a nabízí
ho přes `fruitAt(x,y)`; `Game` jen vykreslí, co dostane. Stejné pořadí drží náhled
`tools/render_preview.py` (má vlastní kopii `FRUITS` – při změně sjednoť obě).

## Vystrašený režim duchů

Snědení ovoce `*` zapne `Game.frightTimer` (7 s). `Game` každý frame nastavuje duchům
`frightened`/`frightenedBlink` (a `eaten` po snědení) – entita si stav jen čte, o
logice rozhoduje `Game`. Vystrašený duch je pomalejší a utíká; po srážce ho hráč
sní (bonus 200/400/800/1600 přes `frightCombo`), duch jako `eaten` (oči) se vrátí
na start a ožije. `Ghost.currentSpeed`/`decide`/`draw` větví podle těchto stavů.

Mapy staví a BFS-em validuje generátor `tools/gen_levels.py`
(`python3 tools/gen_levels.py`) – definuje je programově a přepíše `js/levels/*.js`.
Při úpravách levelů uprav a spusť ten (je idempotentní), místo ručního psaní map.

### Přidání levelu

1. `js/levels/levelX.js` podle vzoru (viz existující).
2. Naimportuj a přidej do pole `levels` v `js/scripts.js`. Pořadí = pořadí ve hře.
3. Rychlost duchů napříč levely roste lineárně 45 % → 90 % (level 1 → 10).

## Náhled do README

`docs/preview.svg` (obrázek v README) generuje `tools/render_preview.py`
(`python3 tools/render_preview.py [levelX]`) stejnými tvary/barvami jako `game.js`.
Po vizuální změně vykreslování ho přegeneruj, ať náhled sedí. Není to skutečný
screenshot (v tomto prostředí není prohlížeč), ale věrný vektorový náhled.

## Konvence

- **Komentáře a texty v UI česky, s plnou diakritikou.** Identifikátory anglicky.
- V importech vždy uváděj příponu **`.js`** (prohlížeč ji u ES modulů vyžaduje).
- Herní stavy: `ready | playing | paused | dying | levelComplete | won | gameover`.
