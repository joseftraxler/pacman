import {Level} from "./level.js";
import {Player} from "./entities/player.js";
import {Ghost} from "./entities/ghost.js";
import {DIRS, ALL_DIRS, isReverse} from "./directions.js";
import {buildKeyMap, actionForEvent} from "./input.js";

export class Game {
    constructor(canvas, levels, controls) {
        this.c = canvas;
        this.ctx = canvas.getContext('2d');
        this.levels = levels;
        this.levelIndex = 0;
        this.keyMap = buildKeyMap(controls);

        this.lives = 3;
        this.score = 0;
        // ready | playing | paused | dying | levelComplete | won | gameover
        this.state = 'ready';
        this.stateTimer = 0;

        this.loadLevel();
        this.bindInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.lastTime = performance.now();
        requestAnimationFrame(t => this.loop(t));
    }

    loadLevel() {
        // Znovu rozparsujeme level, aby se tečky obnovily i po restartu
        const base = this.levels[this.levelIndex];
        // Znovu rozparsujeme level (obnoví tečky) a zachováme jeho rychlost duchů
        this.level = new Level(base.ghostSpeed, ...base.rows);

        const playerSpeed = 6.5;
        this.player = new Player(this, this.level.playerSpawn.x, this.level.playerSpawn.y, playerSpeed);

        // ghostSpeed v levelu je procento rychlosti hráče (100 = stejně rychlí)
        const ghostSpeed = playerSpeed * this.level.ghostSpeed / 100;
        this.ghosts = this.level.ghostSpawns.map(g =>
            new Ghost(this, g.x, g.y, ghostSpeed, g.color)
        );
    }

    resetPositions() {
        this.player.reset();
        this.ghosts.forEach(g => {
            g.reset();
            g.dir = ALL_DIRS[Math.floor(Math.random() * ALL_DIRS.length)];
        });
    }

    bindInput() {
        window.addEventListener('keydown', e => {
            const action = actionForEvent(this.keyMap, e);
            if (!action) return;
            e.preventDefault();

            if (action === 'pause') {
                this.handleActionKey();
                return;
            }

            if (this.state === 'ready') {
                this.state = 'playing';
            }

            if (this.state === 'playing') {
                const want = DIRS[action];
                this.player.nextDir = want;
                // Otočení o 180° lze provést okamžitě (couváme po již projeté cestě)
                if (isReverse(want, this.player.dir)) {
                    this.player.dir = want;
                }
            }
        });
    }

    handleActionKey() {
        switch (this.state) {
            case 'ready':
                this.state = 'playing';
                break;
            case 'playing':
                this.state = 'paused';
                break;
            case 'paused':
                this.state = 'playing';
                break;
            case 'levelComplete':
                // Postup na další level, skóre a životy se přenášejí
                this.levelIndex++;
                this.loadLevel();
                this.state = 'ready';
                break;
            case 'won':
            case 'gameover':
                // Úplný restart od prvního levelu
                this.levelIndex = 0;
                this.lives = 3;
                this.score = 0;
                this.loadLevel();
                this.state = 'ready';
                break;
        }
    }

    resize() {
        this.c.width = window.innerWidth;
        this.c.height = window.innerHeight;

        const hud = 44; // vyhrazené místo nahoře pro skóre/životy
        const tile = Math.floor(Math.min(
            this.c.width / this.level.width,
            (this.c.height - hud) / this.level.height
        ));
        this.tile = Math.max(tile, 1);
        this.offsetX = Math.floor((this.c.width - this.tile * this.level.width) / 2);
        this.offsetY = hud + Math.floor((this.c.height - hud - this.tile * this.level.height) / 2);
    }

    loop(now) {
        const dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;

        this.update(dt);
        this.render();

        requestAnimationFrame(t => this.loop(t));
    }

    update(dt) {
        if (this.state === 'dying') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                if (this.lives <= 0) {
                    this.state = 'gameover';
                } else {
                    this.resetPositions();
                    this.state = 'ready';
                }
            }
            return;
        }

        if (this.state !== 'playing') {
            return;
        }

        this.player.step(dt);
        this.ghosts.forEach(g => g.step(dt));

        // O snědení tečky a skóre rozhoduje hra, ne hráč
        if (this.level.eatPellet(this.player.tileX, this.player.tileY)) {
            this.score += 10;
        }

        this.checkCollisions();

        if (this.level.pelletCount <= 0) {
            // Poslední level? -> úplná výhra, jinak jen dokončený level
            this.state = (this.levelIndex >= this.levels.length - 1) ? 'won' : 'levelComplete';
        }
    }

    checkCollisions() {
        for (const g of this.ghosts) {
            const dist = Math.hypot(g.x - this.player.x, g.y - this.player.y);
            if (dist < 0.6) {
                this.lives--;
                this.state = 'dying';
                this.stateTimer = 1.0;
                return;
            }
        }
    }

    // ---- Vykreslování ----
    render() {
        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.c.width, this.c.height);

        this.drawMaze();
        this.drawPellets();
        // Hra rozhodne, kam se entita vykreslí; entita ví, jak vypadá
        this.ghosts.forEach(g => g.draw(this.ctx, this.px(g.x + 0.5), this.py(g.y + 0.5), this.tile));
        this.player.draw(this.ctx, this.px(this.player.x + 0.5), this.py(this.player.y + 0.5), this.tile);
        this.drawHud();
        this.drawOverlay();
    }

    px(x) {
        return this.offsetX + x * this.tile;
    }

    py(y) {
        return this.offsetY + y * this.tile;
    }

    drawMaze() {
        const ctx = this.ctx;
        const t = this.tile;
        for (let y = 0; y < this.level.height; y++) {
            for (let x = 0; x < this.level.width; x++) {
                if (this.level.isWall(x, y)) {
                    ctx.fillStyle = '#1420c8';
                    this.roundRect(this.px(x) + t * 0.08, this.py(y) + t * 0.08, t * 0.84, t * 0.84, t * 0.22);
                    ctx.fill();
                }
            }
        }
    }

    drawPellets() {
        const ctx = this.ctx;
        const t = this.tile;
        ctx.fillStyle = '#ffd9a0';
        for (let y = 0; y < this.level.height; y++) {
            for (let x = 0; x < this.level.width; x++) {
                if (this.level.hasPellet(x, y)) {
                    ctx.beginPath();
                    ctx.arc(this.px(x + 0.5), this.py(y + 0.5), t * 0.11, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    drawHud() {
        const ctx = this.ctx;
        const fs = Math.max(this.tile * 0.9, 16);
        ctx.fillStyle = '#fff';
        ctx.font = `${fs}px "Courier New", monospace`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillText(`SKÓRE: ${this.score}`, this.offsetX + 4, Math.max(this.offsetY - fs - 6, 4));

        ctx.textAlign = 'center';
        ctx.fillText(`LEVEL ${this.levelIndex + 1}/${this.levels.length}`,
            this.offsetX + this.tile * this.level.width / 2,
            Math.max(this.offsetY - fs - 6, 4));

        ctx.textAlign = 'right';
        ctx.fillText(`ŽIVOTY: ${'❤️'.repeat(Math.max(this.lives, 0))}`,
            this.offsetX + this.tile * this.level.width - 4,
            Math.max(this.offsetY - fs - 6, 4));
    }

    drawOverlay() {
        const ctx = this.ctx;
        let title = null;
        let subtitle = null;

        switch (this.state) {
            case 'ready':
                title = `LEVEL ${this.levelIndex + 1}`;
                subtitle = 'Stiskni šipku pro start · Mezerník = pauza';
                break;
            case 'paused':
                title = 'PAUZA';
                subtitle = 'Mezerníkem pokračuj';
                break;
            case 'levelComplete':
                title = `LEVEL ${this.levelIndex + 1} HOTOV!`;
                subtitle = `Skóre: ${this.score} · Mezerníkem pokračuj na level ${this.levelIndex + 2}`;
                break;
            case 'won':
                title = 'VYHRÁL JSI VŠE! 🎉';
                subtitle = `Skóre: ${this.score} · Mezerníkem hraj znovu od začátku`;
                break;
            case 'gameover':
                title = 'KONEC HRY';
                subtitle = `Skóre: ${this.score} · Mezerníkem hraj znovu`;
                break;
        }

        if (!title) return;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, this.c.width, this.c.height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffe11a';
        ctx.font = `bold ${Math.max(this.tile * 2, 40)}px "Courier New", monospace`;
        ctx.fillText(title, this.c.width / 2, this.c.height / 2 - 20);

        ctx.fillStyle = '#fff';
        ctx.font = `${Math.max(this.tile * 0.9, 18)}px "Courier New", monospace`;
        ctx.fillText(subtitle, this.c.width / 2, this.c.height / 2 + Math.max(this.tile * 1.5, 30));
    }

    roundRect(x, y, w, h, r) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}
