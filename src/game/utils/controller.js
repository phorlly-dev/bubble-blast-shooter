import { emitEvent } from "../../hooks/remote";
import { GameRegistry, H_SPACING, RADIUS } from "../consts";
import {
    getAimAngle,
    getBetween4,
    getCenterX,
    getCenterY,
    getGridCol,
    getBetween2,
    getRandom,
    getRandomColor,
    getMaxCol,
    getLinear,
    getKey,
} from "./helper";
import { createBubble, makeNextBall } from "./object";
import {
    afterShot,
    chooseClosestEmptyToHit,
    dropBubble,
    endScreen,
    ensureRow,
    findMatches,
    findNearestGlobalEmpty,
    handleMatches,
    handlePlayerWin,
} from "./payload";
import { colToX, isEven, markConnected, rowToY, worldToGrid } from "./state";

const Controllers = {
    traceBubblePath(x1, y1, x2, y2) {
        const { bubbles } = GameRegistry.scene;

        const steps = Math.ceil(getBetween4(x1, y1, x2, y2) / (RADIUS * 0.5));
        let closest = null,
            bestDist = Infinity;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = getLinear([x1, x2], t);
            const py = getLinear([y1, y2], t);

            for (let r = 0; r < bubbles.length; r++) {
                for (let c = 0; c < getMaxCol(r); c++) {
                    const b = bubbles[r][c];
                    if (!b) continue;

                    const d = getBetween4(px, py, b.x, b.y);
                    if (d <= RADIUS * 1.6) {
                        const distFromStart = getBetween4(x1, y1, b.x, b.y);
                        if (distFromStart < bestDist) {
                            bestDist = distFromStart;
                            closest = b;
                        }
                    }
                }
            }
        }

        return closest;
    },
    snapToCeiling(bubble) {
        const { scene } = GameRegistry;
        if (bubble.body) {
            scene.physics.world.remove(bubble.body);
            bubble.body = null;
        }

        const col = getGridCol(bubble.x, 0);
        const x = colToX(col, 0);
        const y = rowToY(0);
        bubble.setPosition(x, y);
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
        if (matches.length >= 3) {
            scene.sound.play("right");
            handleMatches(matches);
        } else {
            scene.sound.play("wrong");
        }
        afterShot();
    },
    drawAimLine(pointer) {
        const { scene } = GameRegistry;
        scene.aimLine.clear();
        if (!scene.currentBubble || !scene.mouseOver) return;

        // ✅ Prevent drawing if pointer below shooter
        if (pointer.y > scene.currentBubble.y - H_SPACING) return;

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
            } else if (n.x >= scene.wallRight - RADIUS) {
                n.x = scene.wallRight - RADIUS;
                d.x = -Math.abs(d.x);
            }

            // collision check with bubbles
            for (let r = 0; r < scene.bubbles.length; r++) {
                for (let c = 0; c < getMaxCol(r); c++) {
                    const b = scene.bubbles[r][c];
                    if (!b) continue;
                    const dist = getBetween4(n.x, n.y, b.x, b.y);
                    if (dist < H_SPACING - 4) {
                        return; // stop beam where it hits
                    }
                }
            }

            if (isEven(i)) {
                scene.aimLine.fillStyle(hex, 0.75);
                scene.aimLine.fillCircle(n.x, n.y, 3);
            }

            if (n.y <= scene.wallTop + 1) return;

            x = n.x;
            y = n.y;
        }
    },
    shootBubble() {
        const { scene } = GameRegistry;
        if (!scene.currentBubble || scene.isShooting || scene.isSnapping)
            return;
        scene.isShooting = true;

        const { x, y } = scene.lastAimVector; // exact same as laser
        const speed = 888;

        const shot = scene.currentBubble;
        shot.vx = x * speed;
        shot.vy = y * speed;
    },
    snapBubbleToGrid(bubble, row, col) {
        const { scene } = GameRegistry;
        if (bubble.body) {
            scene.physics.world.remove(bubble.body);
            bubble.body = null;
        }

        ensureRow(row);
        col = Math.max(0, Math.min(col, getMaxCol(row) - 1));
        if (scene.bubbles[row][col]) return false; // spot occupied, bail

        bubble.row = row;
        bubble.col = col;
        bubble.setPosition(colToX(col, row), rowToY(row));
        scene.bubbles[row] ??= [];
        scene.bubbles[row][col] = bubble;
        scene.bubbleGroup.add(bubble);

        // After placement, trigger cluster + fall checks
        checkClusterAndFalls(scene, bubble);
        return true;
    },
    removeFloatingBubbles() {
        const { scene } = GameRegistry;

        // // Step 1: Mark all bubbles touching the ceiling
        const connected = markConnected(scene);

        // Step 2: Drop all bubbles not in the connected set
        let removed = 0;
        for (let row = 0; row < scene.bubbles.length; row++) {
            for (let col = 0; col < getMaxCol(row); col++) {
                const bubble = scene.bubbles[row]?.[col];
                if (!bubble || bubble.isStone) continue;

                if (!connected.has(getKey(row, col))) {
                    removed++;
                    dropBubble(bubble);
                }
            }
        }

        return removed;
    },
    checkGameOver() {
        const { scene } = GameRegistry;
        if (scene.gameOver) return;

        let hasBubble = false;
        for (let row = 0; row < scene.bubbles.length; row++) {
            for (let col = 0; col < getMaxCol(row); col++) {
                if (scene.bubbles[row][col]) {
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
            x: getCenterX() + getBetween2(-100, 100),
            y: getCenterY() + getBetween2(-100, 100),
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

        return [scene.nextBubble, scene.currentBubble].filter(Boolean);
    },
    snapFromImpact(shot, hit) {
        const { scene } = GameRegistry;

        let target = chooseClosestEmptyToHit(shot, hit);

        // if nothing reachable around the hit, pick a geometric fallback
        if (!target) {
            const guess = worldToGrid(shot.x, shot.y);
            if (!scene.bubbles[guess.row]?.[guess.col]) target = guess;
        }

        // absolute last resort: nearest empty anywhere
        if (!target) target = findNearestGlobalEmpty(shot.x, shot.y);

        // final placement – one place that actually mutates the grid:
        snapBubbleToGrid(shot, target.row, target.col);
    },
    checkClusterAndFalls(scene, bubble) {
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
        });
    },
};

export const {
    traceBubblePath,
    snapToCeiling,
    drawAimLine,
    shootBubble,
    snapBubbleToGrid,
    removeFloatingBubbles,
    checkGameOver,
    spawnBonusBubbles,
    transferNextToCurrent,
    snapFromImpact,
    checkClusterAndFalls,
} = Controllers;
