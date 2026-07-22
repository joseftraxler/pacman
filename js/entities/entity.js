/**
 * Základní pohyblivá entita na mřížce. Pohyb je plynulý (v jednotkách políček),
 * ale rozhodování o směru probíhá vždy přesně ve středu políčka.
 */
export class Entity {
    constructor(game, x, y, speed) {
        this.game = game;
        this.spawnX = x;
        this.spawnY = y;
        this.speed = speed;
        this.reset();
    }

    reset() {
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.dir = {dx: 0, dy: 0};
        this.nextDir = null;
        this.animPhase = 0; // ujetá vzdálenost, slouží k animaci (nezávisle na hře)
    }

    get tileX() {
        return Math.round(this.x);
    }

    get tileY() {
        return Math.round(this.y);
    }

    centered() {
        return Math.abs(this.x - Math.round(this.x)) < 1e-6 &&
            Math.abs(this.y - Math.round(this.y)) < 1e-6;
    }

    // Vzdálenost ke středu následujícího políčka ve směru pohybu
    distToNextCenter() {
        if (this.dir.dx > 0) return Math.ceil(this.x + 1e-9) - this.x;
        if (this.dir.dx < 0) return this.x - Math.floor(this.x - 1e-9);
        if (this.dir.dy > 0) return Math.ceil(this.y + 1e-9) - this.y;
        if (this.dir.dy < 0) return this.y - Math.floor(this.y - 1e-9);
        return 0;
    }

    step(dt) {
        let remaining = this.speed * dt;
        let guard = 0;

        while (remaining > 1e-9 && guard++ < 1000) {
            if (this.centered()) {
                this.x = Math.round(this.x);
                this.y = Math.round(this.y);
                this.decide();
                if (this.dir.dx === 0 && this.dir.dy === 0) {
                    return;
                }
            }

            const d = this.distToNextCenter();
            const mv = Math.min(remaining, d);
            this.x += this.dir.dx * mv;
            this.y += this.dir.dy * mv;
            this.animPhase += mv;
            remaining -= mv;

            if (mv >= d - 1e-9) {
                // Dorazili jsme do středu políčka -> zaokrouhlíme a znovu se rozhodneme
                this.x = Math.round(this.x);
                this.y = Math.round(this.y);
            } else {
                break;
            }
        }
    }

    // Přepíší potomci: rozhodnutí o směru ve středu políčka
    decide() {
    }

    /**
     * Abstraktní metoda: vykreslení entity na canvas.
     * Hra (Game) předá kontext a pixelovou pozici středu i velikost políčka,
     * takže entita nemá žádnou vazbu na hru samotnou.
     *
     * @param {CanvasRenderingContext2D} ctx  kontext, do kterého se kreslí
     * @param {number} cx    x-ová souřadnice středu entity v pixelech
     * @param {number} cy    y-ová souřadnice středu entity v pixelech
     * @param {number} size  velikost políčka v pixelech
     */
    draw(ctx, cx, cy, size) {
        throw new Error('draw() musí být implementováno v podtřídě');
    }
}
