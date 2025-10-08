import { emitEvent } from "../../hooks/remote";
import { COLS, GameRegistry, HEIGHT, RADIUS, ROWS } from "../consts";
import {
    getAimAngle,
    getBetween,
    getCenterX,
    getCenterY,
    getGridCol,
    getLinear,
    getMinMax,
    getRandom,
    getRandomColor,
} from "./helper";
import { createBubble, makeNextBall } from "./object";
import {
    afterShot,
    endScreen,
    findMatches,
    handleMatches,
    handlePlayerWin,
} from "./payload";
import { colToX, hSpacing, markConnected, missedShot, rowToY } from "./state";

const Controllers = {
    traceBubblePath(x1, y1, x2, y2) {
        const { scene } = GameRegistry;
        const steps = Math.ceil(getBetween(x1, y1, x2, y2) / (RADIUS * 0.5));
        let between = { closest: null, bestDist: Infinity };

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = getLinear([x1, x2], t);
            const py = getLinear([y1, y2], t);

            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < (scene.bubbles[r]?.length || 0); c++) {
                    const b = scene.bubbles[r][c];
                    if (!b) continue;

                    const d = getBetween(px, py, b.x, b.y);
                    if (d <= RADIUS * 1.5) {
                        const distFromStart = getBetween(x1, y1, b.x, b.y);
                        if (distFromStart < between.bestDist) {
                            between.bestDist = distFromStart;
                            between.closest = b;
                        }
                    }
                }
            }
        }

        return between;
    },
    snapToCeiling(bubble) {
        const { scene } = GameRegistry;
        if (bubble.body) {
            scene.physics.world.remove(bubble.body);
            bubble.body = null;
        }

        const col = getGridCol(bubble.x, 0);
        bubble.setPosition(colToX(col, 0), rowToY(0));
        bubble.row = 0;
        bubble.col = col;

        if (!scene.bubbles[0]) scene.bubbles[0] = [];
        scene.bubbles[0][col] = bubble;
        scene.bubbleGroup.add(bubble);

        scene.tweens.add({
            targets: bubble,
            scale: { from: 1.2, to: 1 },
            duration: 160,
            ease: "Back",
        });

        const matches = findMatches(bubble);
        if (matches.length >= 3) handleMatches(matches);
        afterShot();
    },
    drawAimLine(pointer) {
        const { scene } = GameRegistry;
        scene.aimLine.clear();
        if (!scene.currentBubble || !scene.mouseOver) return;

        // ✅ Prevent drawing if pointer below shooter
        if (pointer.y > scene.currentBubble.y - hSpacing()) return;

        const bubble = { x: scene.currentBubble.x, y: scene.currentBubble.y };

        // Calculate current angle to pointer
        const rawAngle = getAimAngle(pointer);

        // Smoothly rotate laser toward pointer (optional, feel)
        if (scene.lastAimAngle == null) scene.lastAimAngle = rawAngle;
        scene.lastAimAngle = Phaser.Math.Angle.RotateTo(
            scene.lastAimAngle,
            rawAngle,
            0.12
        );

        const angle = scene.lastAimAngle; // ✅ store the one used for shooting
        scene.lastAimVector = {
            // ✅ store direction for shot
            x: Math.cos(angle),
            y: Math.sin(angle),
        };

        const { hex } = scene.currentBubble.colorObj;

        // ✅ Start line right from the bubble’s edge, not the center
        let x = bubble.x + scene.lastAimVector.x * RADIUS * 0.9;
        let y = bubble.y + scene.lastAimVector.y * RADIUS * 0.9;
        let d = { x: scene.lastAimVector.x, y: scene.lastAimVector.y };

        const step = { min: 10, max: 140 };
        for (let i = 0; i < step.max; i++) {
            let n = { x: x + d.x * step.min, y: y + d.y * step.min };

            // bounce off walls
            if (n.x <= scene.wallLeft + RADIUS) {
                n.x = scene.wallLeft + RADIUS;
                d.x = Math.abs(d.x);
            }
            if (n.x >= scene.wallRight - RADIUS) {
                n.x = scene.wallRight - RADIUS;
                d.x = -Math.abs(d.x);
            }

            // collision check with bubbles
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < (scene.bubbles[r]?.length || 0); c++) {
                    const b = scene.bubbles[r][c];
                    if (!b) continue;
                    const dist = getBetween(n.x, n.y, b.x, b.y);
                    if (dist < hSpacing() - 4) {
                        return; // stop beam where it hits
                    }
                }
            }

            if (i % 2 === 0) {
                scene.aimLine.fillStyle(hex, 0.75);
                scene.aimLine.fillCircle(n.x, n.y, 3);
            }

            if (n.y <= scene.wallTop + 1) return;

            x = n.x;
            y = n.y;
        }
    },
    shootBubble(_pointer) {
        const { scene } = GameRegistry;
        if (!scene.currentBubble || scene.isShooting || scene.isSnapping)
            return;
        scene.isShooting = true;

        const { x, y } = scene.lastAimVector; // exact same as laser
        const speed = 800;

        const shot = scene.currentBubble;
        shot.vx = x * speed;
        shot.vy = y * speed;
    },
    snapBubbleToClosest(bubble) {
        const { scene } = GameRegistry;
        let empties = [];
        for (let row = 0; row < ROWS; row++) {
            const maxCol = row % 2 === 0 ? COLS : COLS - 1;
            for (let col = 0; col < maxCol; col++) {
                if (!scene.bubbles[row][col])
                    empties.push({
                        row,
                        col,
                        x: colToX(col, row),
                        y: rowToY(row),
                    });
            }
        }

        if (empties.length === 0) {
            missedShot();
            return;
        }

        let between = { closest: empties[0], minDist: Infinity };
        for (const spot of empties) {
            const d = getBetween(bubble.x, bubble.y, spot.x, spot.y);
            if (d < between.minDist) {
                between.closest = spot;
                between.minDist = d;
            }
        }

        snapBubbleToGrid(bubble, between.closest.row, between.closest.col);
    },
    snapBubbleToGrid(bubble, row, col) {
        const { scene } = GameRegistry;
        if (bubble.body) {
            scene.physics.world.remove(bubble.body);
            bubble.body = null;
        }

        // ensure valid row
        if (!scene.bubbles[row]) scene.bubbles[row] = [];

        // compute placement
        bubble.setPosition(colToX(col, row), rowToY(row));
        bubble.row = row;
        bubble.col = col;

        scene.bubbles[row][col] = bubble;
        scene.bubbleGroup.add(bubble);

        // match check
        const matches = findMatches(bubble);
        if (matches.length >= 3) {
            scene.sound.play("right");
            handleMatches(matches);
        } else {
            scene.sound.play("wrong");
        }

        // delay floater check
        scene.time.delayedCall(360, () => {
            const removed = removeFloatingBubbles();
            if (removed > 0) {
                scene.sound.play("fall");
                scene.score += removed * 5;
                emitEvent("score", scene.score);
            }

            afterShot();
            scene.isSnapping = false;
        });
    },
    removeFloatingBubbles() {
        const { scene } = GameRegistry;
        const connected = new Set();

        // Step 1: Mark all bubbles touching the ceiling
        for (let col = 0; col < COLS; col++) {
            const top = scene.bubbles[0]?.[col];
            if (top && !top.isStone) markConnected(top, connected);
        }

        // Step 2: Drop all bubbles not in the connected set
        let removed = 0;
        for (let row = 0; row < ROWS; row++) {
            const maxCol = row % 2 === 0 ? COLS : COLS - 1;
            for (let col = 0; col < maxCol; col++) {
                const bubble = scene.bubbles[row]?.[col];
                if (!bubble || bubble.isStone) continue;

                const key = `${row},${col}`;
                if (!connected.has(key)) {
                    scene.bubbleGroup.remove(bubble);
                    scene.bubbles[row][col] = null;
                    removed++;

                    // Drop animation
                    scene.tweens.add({
                        targets: bubble,
                        y: bubble.y + HEIGHT * 0.5,
                        alpha: 0,
                        duration: 600,
                        ease: "Cubic.easeIn",
                        onComplete: () => bubble.destroy(),
                    });
                }
            }
        }

        return removed;
    },
    checkGameOver() {
        const { scene } = GameRegistry;
        if (scene.gameOver) return;

        let hasBubble = false;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < (scene.bubbles[r]?.length || 0); c++) {
                if (scene.bubbles[r][c]) {
                    hasBubble = true;
                    break;
                }
            }

            if (hasBubble) break;
        }

        if (!hasBubble) {
            // ✅ Player WIN
            scene.sound.play("win");
            handlePlayerWin();
            scene.gameOver = true;
        } else if (scene.shotsLeft <= 0) {
            // ❌ Lose condition
            scene.sound.play("lose");
            endScreen();
            scene.gameOver = true;
        }
    },
    spawnBonusBubbles(spawnFrom) {
        const { scene } = GameRegistry;
        const from = getRandom(spawnFrom);
        const color = getRandomColor();
        const bubble = createBubble(from.x, from.y, color);

        scene.tweens.add({
            targets: bubble,
            x: getCenterX() + getMinMax(-100, 100),
            y: getCenterY() + getMinMax(-100, 100),
            scale: { from: 0.7, to: 1.3 },
            alpha: { from: 1, to: 0 },
            duration: 360,
            ease: "Back.easeOut",
            onStart: () => scene.sound.play("pop"),
            onComplete: () => {
                bubble.destroy();
                scene.score += color.score;
                emitEvent("score", scene.score);
            },
        });
    },
    transferNextToCurrent() {
        const { scene } = GameRegistry;

        // Promote next bubble to current
        if (scene.nextBubble) {
            scene.currentBubble = scene.nextBubble;
            scene.nextBubble = null;

            // Tween animation from right to center
            scene.tweens.add({
                targets: scene.currentBubble,
                x: scene.shooter.x,
                y: scene.shooter.y,
                scale: 1,
                duration: 200,
                ease: "Back.easeOut",
            });
        }

        // Spawn a new next bubble
        makeNextBall();
    },
};

export const {
    traceBubblePath,
    snapToCeiling,
    drawAimLine,
    shootBubble,
    snapBubbleToClosest,
    snapBubbleToGrid,
    removeFloatingBubbles,
    checkGameOver,
    spawnBonusBubbles,
    transferNextToCurrent,
} = Controllers;
