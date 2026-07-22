// Barvy duchů podle znaku v mapě
export const GHOST_COLORS = {
    'R': '#ff0000', // červený
    'G': '#2ee66b', // zelený
    'B': '#33ddff', // modrý
    'O': '#ff9d2e', // oranžový
};

/**
 * Level rozparsuje mapu předanou jako seznam řádků (stringů).
 * Prvním parametrem je rychlost duchů jako procento rychlosti hráče
 * (100 = stejně rychlí jako hráč, 50 = poloviční rychlost).
 * Legenda znaků:
 *   #        zeď
 *   -        tečka (pellet) ke snědení
 *   P        startovní pozice pacmana
 *   R/G/B/O  startovní pozice duchů (barva dle znaku)
 *   mezera   prázdné políčko (bez tečky)
 */
export class Level {
    constructor(ghostSpeed, ...rows) {
        this.ghostSpeed = ghostSpeed;
        this.rows = rows;
        this.height = rows.length;
        this.width = Math.max(...rows.map(r => r.length));

        this.walls = [];        // walls[y][x] = true, pokud je zeď
        this.pellets = [];      // pellets[y][x] = true, pokud je tečka
        this.pelletCount = 0;   // počet zbývajících teček
        this.ghostSpawns = [];  // [{x, y, color}]
        this.playerSpawn = {x: 1, y: 1};

        this.#parse();
    }

    #parse() {
        for (let y = 0; y < this.height; y++) {
            const wallRow = [];
            const pelletRow = [];
            const row = this.rows[y] ?? '';

            for (let x = 0; x < this.width; x++) {
                const ch = row[x] ?? '#';
                let isWall = false;
                let isPellet = false;

                switch (ch) {
                    case '#':
                        isWall = true;
                        break;
                    case '-':
                        isPellet = true;
                        this.pelletCount++;
                        break;
                    case 'P':
                        this.playerSpawn = {x, y};
                        break;
                    case 'R':
                    case 'G':
                    case 'B':
                    case 'O':
                        this.ghostSpawns.push({x, y, color: GHOST_COLORS[ch]});
                        break;
                }

                wallRow.push(isWall);
                pelletRow.push(isPellet);
            }

            this.walls.push(wallRow);
            this.pellets.push(pelletRow);
        }
    }

    isWall(x, y) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
            return true;
        }
        return this.walls[y][x];
    }

    // Lze na políčko vstoupit? (opak zdi)
    canWalk(x, y) {
        return !this.isWall(x, y);
    }

    hasPellet(x, y) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
            return false;
        }
        return this.pellets[y][x];
    }

    // Sní tečku, vrátí true, pokud tam nějaká byla
    eatPellet(x, y) {
        if (this.hasPellet(x, y)) {
            this.pellets[y][x] = false;
            this.pelletCount--;
            return true;
        }
        return false;
    }
}
