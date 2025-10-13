import { setValues } from "../../hooks/func";
import { emitEvent, emitEvents } from "../../hooks/remote";
import { COLORS, GameRegistry, H_SPACING, HEIGHT, RADIUS } from "../consts";
import MyImage from "../objects/MyImage";
import { snapToCeiling, traceBubblePath } from "../utils/controller";
import { getCenterX, getCenterY, getMoveLeft } from "../utils/helper";
import {
    createBubbleGrid,
    makeCurrentBall,
    makeNextBall,
    makeShotsBadge,
    makeSwapIcon,
    makeWalls,
} from "../utils/object";
import { handleTrueHit, setupInput, spawnWaveEffect } from "../utils/payload";
import { missedShot, stopJustBefore } from "../utils/state";

class GameEngine extends Phaser.Scene {
    constructor() {
        super("game-engine");

        this.bubbles = [];
        this.currentBubble = null;
        this.nextBubble = null;
        this.shooter = null;
        this.isShooting = false;
        this.isSnapping = false;
        this.aimLine = null;
        this.swapIcon = null;
        this.currentRing = null;
        this.bubbleGroup = null;
        this.mouseOver = false;

        this.wallLeft = 0;
        this.wallRight = 0;
        this.wallTop = 0;
        this.lastAimAngle = 0;
        this.lastAimVector = { x: 0, y: 0 };

        this.score = 0;
        this.total = 0;
        this.level = 1;
        this.countColor = 3;
        this.gameOver = false;

        this.shotsLeft = 0;
        this.shotsBadge = null;
        this.shotsText = null;
    }

    init(data) {
        GameRegistry.scene = this;
        if (data.spawn_wave) spawnWaveEffect();
        this.level = data?.level ?? 1;
        this.score = data?.score ?? 0;
        this.gameOver = data?.game_over ?? false;
        this.isShooting = data?.is_shooting ?? false;
        this.shotsLeft = getMoveLeft(this.level);

        // clear old events
        if (this.input) this.input.removeAllListeners();
    }

    create() {
        emitEvent("current-scene-ready", this);
        const bg = new MyImage(this, getCenterX(), getCenterY(), "background");
        bg.setAlpha(0.6);

        // world bounds
        makeWalls();

        this.aimLine = this.add.graphics();
        this.bubbleGroup = this.physics.add.staticGroup();

        createBubbleGrid();
        // debugGrid();
        setupInput();
        makeCurrentBall();
        makeSwapIcon();
        makeNextBall();
        makeShotsBadge();

        setValues(COLORS, (_, idx) => (this.countColor = idx + 1));
    }

    update(_time, delta) {
        emitEvents([
            { key: "level", value: this.level },
            { key: "score", value: this.score },
            { key: "color", value: this.countColor },
        ]);

        if (this.isShooting && this.currentBubble && !this.isSnapping) {
            const shot = this.currentBubble;
            const dt = Math.min(delta / 888, 0.016);
            const next = { x: shot.x + shot.vx * dt, y: shot.y + shot.vy * dt };

            // Bounce
            if (next.x <= this.wallLeft + RADIUS) {
                shot.vx = Math.abs(shot.vx);
                shot.x = this.wallLeft + RADIUS;
            } else if (next.x >= this.wallRight - RADIUS) {
                shot.vx = -Math.abs(shot.vx);
                shot.x = this.wallRight - RADIUS;
            }

            // Continuous trace
            const hit = traceBubblePath(shot.x, shot.y, next.x, next.y);
            if (hit) {
                const { x, y } = stopJustBefore(shot, hit, RADIUS * 1.03);
                shot.setPosition(x, y);

                handleTrueHit(shot, hit);
                return;
            }

            // No collision → move normally
            shot.x = next.x;
            shot.y = next.y;
            // Ceiling / out of bounds
            if (shot.y <= this.wallTop + RADIUS) {
                snapToCeiling(shot);
                return;
            }

            if (shot.y > HEIGHT + H_SPACING) {
                missedShot();
                return;
            }
        }
    }

    // --- Cleanup when scene stops ---
    shutdown() {
        this.input.removeAllListeners();
        this.sound.stopAll();
    }
}

export default GameEngine;
