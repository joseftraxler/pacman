import {Entity} from "./entity.js";
import {ALL_DIRS, isReverse} from "../directions.js";

export class Ghost extends Entity {
    constructor(game, x, y, speed, color) {
        super(game, x, y, speed);
        this.color = color;
        // Rozházíme startovní směry, aby se duchové nechovali stejně
        this.dir = ALL_DIRS[Math.floor(Math.random() * ALL_DIRS.length)];
    }

    decide() {
        const level = this.game.level;

        // Možné směry (mimo couvání), pokud tam není zeď
        let options = ALL_DIRS.filter(d =>
            level.canWalk(this.tileX + d.dx, this.tileY + d.dy) && !isReverse(d, this.dir)
        );

        // Slepá ulička -> musíme couvnout
        if (options.length === 0) {
            const back = {dx: -this.dir.dx, dy: -this.dir.dy};
            if (level.canWalk(this.tileX + back.dx, this.tileY + back.dy)) {
                this.dir = back;
            } else {
                this.dir = {dx: 0, dy: 0};
            }
            return;
        }

        // 75 % pronásledování pacmana, jinak náhoda -> nepředvídatelnost
        if (Math.random() < 0.75) {
            const p = this.game.player;
            options.sort((a, b) => {
                const da = (this.tileX + a.dx - p.tileX) ** 2 + (this.tileY + a.dy - p.tileY) ** 2;
                const db = (this.tileX + b.dx - p.tileX) ** 2 + (this.tileY + b.dy - p.tileY) ** 2;
                return da - db;
            });
            this.dir = options[0];
        } else {
            this.dir = options[Math.floor(Math.random() * options.length)];
        }
    }

    draw(ctx, cx, cy, size) {
        const r = size * 0.45;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        // Hlava
        ctx.arc(cx, cy - r * 0.1, r, Math.PI, 0);
        // Tělo se zvlněným spodkem
        ctx.lineTo(cx + r, cy + r * 0.8);
        const waves = 4;
        for (let i = 0; i < waves; i++) {
            const x1 = cx + r - (2 * r) * ((i + 0.5) / waves);
            const x2 = cx + r - (2 * r) * ((i + 1) / waves);
            ctx.quadraticCurveTo(x1, cy + r * 0.5, x2, cy + r * 0.8);
        }
        ctx.closePath();
        ctx.fill();

        // Oči (dívají se ve směru pohybu)
        const ex = this.dir.dx * r * 0.18;
        const ey = this.dir.dy * r * 0.18;
        for (const side of [-1, 1]) {
            const eyeX = cx + side * r * 0.38;
            const eyeY = cy - r * 0.15;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, r * 0.28, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0018aa';
            ctx.beginPath();
            ctx.arc(eyeX + ex, eyeY + ey, r * 0.14, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
