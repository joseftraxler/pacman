import {Entity} from "./entity.js";
import {ALL_DIRS, isReverse} from "../directions.js";

const FRIGHT_BODY = '#2036ff';   // vystrašené tělo (modré)
const FRIGHT_BLINK = '#ffffff';  // problikávání těsně před koncem
const EYE = '#ffffff';
const PUPIL = '#0018aa';

export class Ghost extends Entity {
    constructor(game, x, y, speed, color) {
        super(game, x, y, speed);
        this.color = color;
        // Rozházíme startovní směry, aby se duchové nechovali stejně
        this.dir = ALL_DIRS[Math.floor(Math.random() * ALL_DIRS.length)];
    }

    reset() {
        super.reset();
        this.frightened = false;      // nastavuje Game podle power-pelety
        this.frightenedBlink = false; // problikávání před koncem režimu
        this.eaten = false;           // snědený duch se vrací na start jako oči
    }

    currentSpeed() {
        if (this.eaten) return this.speed * 2.0;    // rychlý návrat domů
        if (this.frightened) return this.speed * 0.55; // vystrašený je pomalý
        return this.speed;
    }

    decide() {
        const level = this.game.level;

        // Snědený duch, který dorazil na start, ožívá
        if (this.eaten && this.tileX === this.spawnX && this.tileY === this.spawnY) {
            this.eaten = false;
        }

        // Možné směry (mimo couvání), pokud tam není zeď
        let options = ALL_DIRS.filter(d =>
            level.canWalk(this.tileX + d.dx, this.tileY + d.dy) && !isReverse(d, this.dir)
        );

        // Slepá ulička -> musíme couvnout
        if (options.length === 0) {
            const back = {dx: -this.dir.dx, dy: -this.dir.dy};
            this.dir = level.canWalk(this.tileX + back.dx, this.tileY + back.dy)
                ? back : {dx: 0, dy: 0};
            return;
        }

        const p = this.game.player;

        if (this.eaten) {
            // Míříme na svůj start (nejkratší cestou)
            this.dir = this.#pickToward(options, this.spawnX, this.spawnY, false);
        } else if (this.frightened) {
            // Utíkáme od hráče, občas náhodně
            this.dir = Math.random() < 0.5
                ? this.#pickToward(options, p.tileX, p.tileY, true)
                : options[Math.floor(Math.random() * options.length)];
        } else {
            // Normální hon: 75 % za hráčem, jinak náhoda
            this.dir = Math.random() < 0.75
                ? this.#pickToward(options, p.tileX, p.tileY, false)
                : options[Math.floor(Math.random() * options.length)];
        }
    }

    // Vybere směr, který minimalizuje (flee=false) nebo maximalizuje (flee=true)
    // vzdálenost k cíli (tx, ty).
    #pickToward(options, tx, ty, flee) {
        const scored = options.map(d => ({
            d,
            s: (this.tileX + d.dx - tx) ** 2 + (this.tileY + d.dy - ty) ** 2,
        }));
        scored.sort((a, b) => flee ? b.s - a.s : a.s - b.s);
        return scored[0].d;
    }

    draw(ctx, cx, cy, size) {
        const r = size * 0.45;

        // Snědený duch = jen oči putující domů
        if (this.eaten) {
            this.#drawEyes(ctx, cx, cy, r);
            return;
        }

        // Barva těla podle stavu
        ctx.fillStyle = this.frightened
            ? (this.frightenedBlink ? FRIGHT_BLINK : FRIGHT_BODY)
            : this.color;

        ctx.beginPath();
        ctx.arc(cx, cy - r * 0.1, r, Math.PI, 0);          // hlava
        ctx.lineTo(cx + r, cy + r * 0.8);
        const waves = 4;                                    // zvlněný spodek
        for (let i = 0; i < waves; i++) {
            const x1 = cx + r - (2 * r) * ((i + 0.5) / waves);
            const x2 = cx + r - (2 * r) * ((i + 1) / waves);
            ctx.quadraticCurveTo(x1, cy + r * 0.5, x2, cy + r * 0.8);
        }
        ctx.closePath();
        ctx.fill();

        if (this.frightened) {
            this.#drawScaredFace(ctx, cx, cy, r);
        } else {
            this.#drawEyes(ctx, cx, cy, r);
        }
    }

    // Normální oči (zorničky hledí ve směru pohybu)
    #drawEyes(ctx, cx, cy, r) {
        const ex = this.dir.dx * r * 0.18;
        const ey = this.dir.dy * r * 0.18;
        for (const side of [-1, 1]) {
            const eyeX = cx + side * r * 0.38;
            const eyeY = cy - r * 0.15;
            ctx.fillStyle = EYE;
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, r * 0.28, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = PUPIL;
            ctx.beginPath();
            ctx.arc(eyeX + ex, eyeY + ey, r * 0.14, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Vystrašená tvář: dvě očka a klikatá pusa
    #drawScaredFace(ctx, cx, cy, r) {
        const fg = this.frightenedBlink ? '#d02020' : '#ffd1dc';
        ctx.fillStyle = fg;
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(cx + side * r * 0.35, cy - r * 0.1, r * 0.13, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.strokeStyle = fg;
        ctx.lineWidth = Math.max(r * 0.09, 1);
        ctx.beginPath();
        const y = cy + r * 0.35;
        const w = r * 0.5;
        ctx.moveTo(cx - w, y);
        ctx.lineTo(cx - w * 0.5, y - r * 0.18);
        ctx.lineTo(cx, y);
        ctx.lineTo(cx + w * 0.5, y - r * 0.18);
        ctx.lineTo(cx + w, y);
        ctx.stroke();
    }
}
