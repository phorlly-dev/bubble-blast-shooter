import { emitEvent, onEvent } from "../../hooks/remote";
import { GameRegistry, HEIGHT, RADIUS, ROWS, WIDTH } from "../consts";
import MyText from "../objects/MyText";
import {
    checkGameOver,
    drawAimLine,
    shootBubble,
    snapBubbleToClosest,
    snapBubbleToGrid,
} from "./controller";
import {
    getBetween,
    getCenterX,
    getCenterY,
    getClamp,
    getEmptyNeighborPositions,
    getNeighbors,
    updateShotsBadge,
} from "./helper";
import { makeNextBall } from "./object";
import { colToX, levelCompleted, rowToY, textPopup } from "./state";

const Payloads = {
    swapBubbles() {
        const { scene } = GameRegistry;
        if (scene.isShooting || scene.isSnapping) return;

        // swap positions visually
        const curX = scene.currentBubble.x;
        const curY = scene.currentBubble.y;
        const nextX = scene.nextBubble.x;
        const nextY = scene.nextBubble.y;

        // tween animation for smoothness
        scene.tweens.add({
            targets: scene.currentBubble,
            x: nextX,
            y: nextY,
            duration: 200,
            ease: "Sine.easeInOut",
        });

        scene.tweens.add({
            targets: scene.nextBubble,
            x: curX,
            y: curY,
            duration: 200,
            ease: "Sine.easeInOut",
            onComplete: () => {
                // swap references
                const temp = scene.currentBubble;
                scene.currentBubble = scene.nextBubble;
                scene.nextBubble = temp;
            },
        });

        scene.tweens.add({
            targets: [scene.currentBubble, scene.nextBubble],
            scale: { from: 1.1, to: 1 },
            duration: 180,
            ease: "Back.easeOut",
        });

        scene.sound.play("click");
    },
    findMatches(seed) {
        const color = seed.colorObj.name;
        const seen = new Set(),
            stack = [seed],
            out = [];

        while (stack.length) {
            const cur = stack.pop();
            const key = `${cur.row},${cur.col}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(cur);
            for (const n of getNeighbors(cur.row, cur.col)) {
                if (
                    n.bubble &&
                    n.bubble.colorObj.name === color &&
                    !seen.has(`${n.row},${n.col}`)
                )
                    stack.push(n.bubble);
            }
        }

        return out;
    },
    setupInput() {
        const { scene } = GameRegistry;
        // NEW: Mouse over/out events for aim line visibility
        scene.input.on("gameover", () => {
            scene.mouseOver = true;
        });
        scene.input.on("gameout", () => {
            scene.mouseOver = false;
            scene.aimLine.clear();
        });

        scene.input.on("pointerdown", (p) => {
            if (scene.gameOver || !scene.currentBubble || scene.isShooting)
                return;

            // --- check if player clicked on swap area ---
            const swapDist = getBetween(
                p.x,
                p.y,
                scene.nextBubble.x,
                scene.nextBubble.y
            );
            const currentDist = getBetween(
                p.x,
                p.y,
                scene.currentBubble.x,
                scene.currentBubble.y
            );

            // if click near either bubble, swap instead of shoot
            if (swapDist < RADIUS * 1.2 || currentDist < RADIUS * 1.2) {
                swapBubbles();
                return;
            }

            // otherwise shoot
            shootBubble(p);
        });

        scene.input.on("pointermove", (p) => {
            if (!scene.gameOver && !scene.isShooting) drawAimLine(p);
        });

        onEvent("sound:toggle", (mute) => {
            scene.sound.mute = mute;
            scene.sound.play("click");
        });
    },
    spawnWaveEffect() {
        const { scene } = GameRegistry;
        const wave = scene.add.rectangle(
            getCenterX(),
            getCenterY(),
            WIDTH,
            HEIGHT,
            0xffffff,
            0.3
        );
        scene.tweens.add({
            targets: wave,
            alpha: 0,
            duration: 600,
            ease: "Cubic.easeOut",
            onComplete: () => wave.destroy(),
        });
    },
    animateHitShockwave(bubble) {
        const { scene } = GameRegistry;
        const maxDist = RADIUS * 4.5; // effect radius

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < (scene.bubbles[r]?.length || 0); c++) {
                const b = scene.bubbles[r][c];
                if (!b) continue;

                const d = getBetween(bubble.x, bubble.y, b.x, b.y);
                if (d > maxDist) continue;

                const strength = getClamp(1 - d / maxDist, 0, 1);
                const offsetX = (Math.random() - 0.5) * 4 * strength;
                const offsetY = (Math.random() - 0.5) * 4 * strength;

                scene.tweens.add({
                    targets: b,
                    scale: { from: 1 + 0.25 * strength, to: 1 },
                    x: b.x + offsetX,
                    y: b.y + offsetY,
                    duration: 140 + Math.random() * 100,
                    ease: "Sine.easeOut",
                    yoyo: true,
                    onComplete: () => {
                        b.setPosition(colToX(b.col, b.row), rowToY(b.row));
                        b.setScale(1);
                    },
                });
            }
        }
    },
    handleTrueHit(shot, hit) {
        const { scene } = GameRegistry;
        if (scene.isSnapping) return;
        scene.isSnapping = true;

        // --- stop movement immediately
        shot.vx = 0;
        shot.vy = 0;

        // compute impact offset
        const dx = shot.x - hit.x;
        const dy = shot.y - hit.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len;
        const uy = dy / len;

        const targetX = hit.x + ux * (RADIUS * 2.02);
        const targetY = hit.y + uy * (RADIUS * 2.02);

        // tween to settle visually
        scene.tweens.add({
            targets: shot,
            x: targetX,
            y: targetY,
            duration: 60,
            ease: "Back",
            onComplete: () => {
                // find nearest grid cell
                const neighbors = getEmptyNeighborPositions(hit.row, hit.col);
                let best = neighbors[0];
                let minDist = Infinity;
                for (const n of neighbors) {
                    const d = getBetween(targetX, targetY, n.x, n.y);
                    if (d < minDist) {
                        minDist = d;
                        best = n;
                    }
                }

                if (best) snapBubbleToGrid(shot, best.row, best.col);
                else snapBubbleToClosest(shot);

                animateHitShockwave(shot);
                scene.isSnapping = false;
                scene.isShooting = false;
            },
        });
    },
    handleMatches(matches) {
        const { scene } = GameRegistry;
        if (matches.length > 3) {
            scene.sound.play("splash");
            const flash = scene.add.rectangle(
                getCenterX(),
                getCenterY(),
                WIDTH,
                HEIGHT,
                0xffffff,
                0.4
            );
            scene.tweens.add({
                targets: flash,
                alpha: 0,
                duration: 200,
                onComplete: () => flash.destroy(),
            });
        }

        const combo = Math.max(1, matches.length - 2); // 3-match = 1x, 4-match = 2x, etc.
        matches.forEach((b) => {
            const colorScore = Math.floor(b.colorObj.score / 2) * combo;

            textPopup(b, colorScore);
            scene.score += colorScore;

            scene.bubbles[b.row][b.col] = null;
            scene.bubbleGroup.remove(b);
        });

        emitEvent("score", scene.score);
    },
    afterShot() {
        const { scene } = GameRegistry;
        if (scene.gameOver) return;
        scene.shotsLeft -= 1;
        updateShotsBadge();

        // Check for win/loss conditions
        checkGameOver();
        scene.isShooting = false;
        scene.isSnapping = false;
        if (scene.gameOver) return;

        scene.currentBubble = scene.nextBubble;
        scene.currentBubble.setPosition(scene.shooter.x, scene.shooter.y);
        makeNextBall();
    },
    endScreen(hasWon) {
        const { scene } = GameRegistry;
        if (scene.gameOver) return;
        scene.aimLine.clear();
        scene.gameOver = true;

        if (hasWon) {
            levelCompleted(scene.level);

            // You can add a "You Win!" text here if you like
            scene.time.delayedCall(2000, () => {
                scene.level += 1;
                scene.total += scene.score;
                emitEvent("level", scene.level);
                scene.scene.restart({
                    level: scene.level,
                    score: scene.total,
                    game_over: false,
                    is_shooting: false,
                    spawn_wave: true,
                });
            });
        } else {
            const title = new MyText(
                scene,
                getCenterX(),
                getCenterY() - 22,
                "GAME OVER!",
                {
                    fontSize: "40px",
                    fill: "#ff5252",
                    fontStyle: "bold",
                    stroke: "#000",
                    strokeThickness: 6,
                }
            );
            const label = new MyText(
                scene,
                getCenterX(),
                getCenterY() + 64,
                "Click to Replay",
                {
                    fontSize: "16px",
                    fill: "#ffff00",
                }
            );
            scene.input.once("pointerdown", () => {
                title.destroy();
                label.destroy();

                scene.time.delayedCall(600, () => {
                    scene.scene.restart({
                        level: scene.level,
                        score: scene.total,
                        game_over: false,
                        is_shooting: false,
                        spawn_wave: true,
                    });
                });
            });
        }
    },
};

export const {
    swapBubbles,
    findMatches,
    setupInput,
    spawnWaveEffect,
    animateHitShockwave,
    handleTrueHit,
    handleMatches,
    afterShot,
    endScreen,
} = Payloads;
