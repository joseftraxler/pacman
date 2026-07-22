import {Entity} from "./entity.js";

export class Player extends Entity {
    decide() {
        const level = this.game.level;

        // Pokud lze zatočit do bufferovaného směru, uděláme to
        if (this.nextDir && level.canWalk(this.tileX + this.nextDir.dx, this.tileY + this.nextDir.dy)) {
            this.dir = this.nextDir;
        }

        // Pokud je před námi zeď, zastavíme se
        if (!level.canWalk(this.tileX + this.dir.dx, this.tileY + this.dir.dy)) {
            this.dir = {dx: 0, dy: 0};
        }
    }

    draw(ctx, cx, cy, size) {
        const r = size * 0.45;

        // Úhel natočení podle směru
        let base = 0;
        const d = this.dir;
        if (d.dx > 0) base = 0;
        else if (d.dx < 0) base = Math.PI;
        else if (d.dy > 0) base = Math.PI / 2;
        else if (d.dy < 0) base = -Math.PI / 2;

        // Otvírání pusy (jen když se hýbe) – odvozeno z ujeté vzdálenosti
        const moving = d.dx !== 0 || d.dy !== 0;
        const mouth = moving ? (Math.abs(Math.sin(this.animPhase * 2.2)) * 0.28 + 0.02) : 0.02;

        ctx.fillStyle = '#ffe11a';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, base + mouth * Math.PI, base - mouth * Math.PI + Math.PI * 2);
        ctx.closePath();
        ctx.fill();
    }
}
