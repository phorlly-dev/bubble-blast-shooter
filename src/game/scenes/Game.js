import { emitEvent, emitEvents } from "../../hooks/remote";
import { COLORS, GameRegistry, HEIGHT, RADIUS, WIDTH } from "../consts";
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
import { hSpacing, missedShot } from "../utils/state";

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
        this.level = data.level || 1;
        this.score = data.score || 0;
        this.gameOver = data.game_over || false;
        this.isShooting = data.is_shooting || false;

        // clear old events
        if (this.input) this.input.removeAllListeners();
    }

    create() {
        emitEvent("current-scene-ready", this);
        const bg = new MyImage(this, getCenterX(), getCenterY(), "background");
        bg.setAlpha(0.6);

        // world bounds
        makeWalls(this);

        this.aimLine = this.add.graphics();
        this.bubbleGroup = this.physics.add.staticGroup();

        createBubbleGrid();
        this.shotsLeft = getMoveLeft();

        setupInput();
        makeCurrentBall();
        makeSwapIcon();
        makeNextBall();
        makeShotsBadge();

        COLORS.forEach((_, idx) => (this.countColor = idx + 1));
    }

    update(_time, delta) {
        emitEvents({
            events: ["level", "score", "color"],
            args: [this.level, this.score, this.countColor],
        });

        if (this.isShooting && this.currentBubble && !this.isSnapping) {
            const shot = this.currentBubble;
            const dt = Math.min(delta / 1000, 0.02); // max 20ms per frame
            const nextX = shot.x + shot.vx * dt;
            const nextY = shot.y + shot.vy * dt;

            // Bounce
            if (nextX <= this.wallLeft + RADIUS) {
                shot.vx = Math.abs(shot.vx);
                shot.x = this.wallLeft + RADIUS;
            } else if (nextX >= this.wallRight - RADIUS) {
                shot.vx = -Math.abs(shot.vx);
                shot.x = this.wallRight - RADIUS;
            }

            // Continuous trace
            const hit = traceBubblePath(shot.x, shot.y, nextX, nextY);
            if (hit) {
                const dx = hit.x - shot.x;
                const dy = hit.y - shot.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const stopDist = Math.max(0, dist - RADIUS * 1.95);
                shot.x += (dx / dist) * stopDist;
                shot.y += (dy / dist) * stopDist;

                handleTrueHit(shot, hit);
                return;
            }

            // No collision → move normally
            shot.x = nextX;
            shot.y = nextY;

            // Ceiling / out of bounds
            if (shot.y <= this.wallTop + RADIUS) {
                snapToCeiling(shot);
                return;
            }

            if (shot.y > HEIGHT + hSpacing()) {
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
