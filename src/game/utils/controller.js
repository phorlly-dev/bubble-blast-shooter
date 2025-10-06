import { emitEvent } from "../../hooks/remote";
import { COLS, GameRegistry, HEIGHT, RADIUS, ROWS } from "../consts";
import { getAimAngle, getBetween, getGridCol, getLinear } from "./helper";
import { afterShot, endScreen, findMatches, handleMatches } from "./payload";
import { colToX, hSpacing, markConnected, missedShot, rowToY } from "./state";

const Controllers = {
    traceBubblePath(x1, y1, x2, y2) {
        const { scene } = GameRegistry;
        const steps = Math.ceil(getBetween(x1, y1, x2, y2) / (RADIUS * 0.5));
        let closest = null,
            bestDist = Infinity;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = getLinear([x1, x2], t);
            const py = getLinear([y1, y2], t);

            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < (scene.bubbles[r]?.length || 0); c++) {
                    const b = scene.bubbles[r][c];
                    if (!b) continue;
                    const d = getBetween(px, py, b.x, b.y);
                    if (d <= RADIUS * 1.55) {
                        const distFromStart = getBetween(x1, y1, b.x, b.y);
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
        const snapX = colToX(col, 0);
        const snapY = rowToY(0);

        bubble.setPosition(snapX, snapY);
        bubble.row = 0;
        bubble.col = col;

        if (!scene.bubbles[0]) scene.bubbles[0] = [];
        scene.bubbles[0][col] = bubble;
        scene.bubbleGroup.add(bubble);

        scene.tweens.add({
            targets: bubble,
            scale: { from: 1.2, to: 1 },
            duration: 160,
            ease: "Back.easeOut",
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

        const sx = scene.currentBubble.x;
        const sy = scene.currentBubble.y;

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

        const color = scene.currentBubble.colorObj.hex;
        // ✅ Start line right from the bubble’s edge, not the center
        let x = sx + scene.lastAimVector.x * RADIUS * 0.9;
        let y = sy + scene.lastAimVector.y * RADIUS * 0.9;

        let dx = scene.lastAimVector.x;
        let dy = scene.lastAimVector.y;

        const step = 10,
            maxSteps = 140;
        for (let i = 0; i < maxSteps; i++) {
            let nx = x + dx * step;
            let ny = y + dy * step;

            // bounce off walls
            if (nx <= scene.wallLeft + RADIUS) {
                nx = scene.wallLeft + RADIUS;
                dx = Math.abs(dx);
            }
            if (nx >= scene.wallRight - RADIUS) {
                nx = scene.wallRight - RADIUS;
                dx = -Math.abs(dx);
            }

            // collision check with bubbles
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < (scene.bubbles[r]?.length || 0); c++) {
                    const b = scene.bubbles[r][c];
                    if (!b) continue;
                    const dist = getBetween(nx, ny, b.x, b.y);
                    if (dist < hSpacing() - 4) {
                        return; // stop beam where it hits
                    }
                }
            }

            if (i % 2 === 0) {
                scene.aimLine.fillStyle(color, 0.75);
                scene.aimLine.fillCircle(nx, ny, 3);
            }

            if (ny <= scene.wallTop + 1) return;

            x = nx;
            y = ny;
        }
    },
    shootBubble(_pointer) {
        const { scene } = GameRegistry;
        if (!scene.currentBubble || scene.isShooting || scene.isSnapping)
            return;
        scene.isShooting = true;

        const aim = scene.lastAimVector; // exact same as laser
        const speed = 800; // or dynamic as before

        const shot = scene.currentBubble;
        shot.vx = aim.x * speed;
        shot.vy = aim.y * speed;
    },
    snapBubbleToClosest(bubble) {
        const { scene } = GameRegistry;
        let empties = [];
        for (let r = 0; r < ROWS; r++) {
            const maxCol = r % 2 === 0 ? COLS : COLS - 1;
            for (let c = 0; c < maxCol; c++) {
                if (!scene.bubbles[r][c])
                    empties.push({
                        row: r,
                        col: c,
                        x: colToX(c, r),
                        y: rowToY(r),
                    });
            }
        }

        if (empties.length === 0) {
            missedShot();
            return;
        }

        let closest = empties[0],
            minDist = Infinity;
        for (const spot of empties) {
            const d = getBetween(bubble.x, bubble.y, spot.x, spot.y);
            if (d < minDist) {
                minDist = d;
                closest = spot;
            }
        }
        snapBubbleToGrid(bubble, closest.row, closest.col);
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
        const snapX = colToX(col, row);
        const snapY = rowToY(row);
        bubble.setPosition(snapX, snapY);
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
        scene.time.delayedCall(220, () => {
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
        for (let c = 0; c < COLS; c++) {
            const b = scene.bubbles[0]?.[c];
            if (b) markConnected(b, connected);
        }

        let removed = 0;

        // Step 2: Drop all bubbles not in the connected set
        for (let r = 0; r < ROWS; r++) {
            const maxCol = r % 2 === 0 ? COLS : COLS - 1;
            for (let c = 0; c < maxCol; c++) {
                const b = scene.bubbles[r]?.[c];
                if (!b) continue;

                const key = `${r},${c}`;
                if (!connected.has(key)) {
                    scene.bubbles[r][c] = null;
                    scene.bubbleGroup.remove(b);

                    // Animate falling
                    scene.tweens.add({
                        targets: b,
                        y: HEIGHT + hSpacing(),
                        alpha: 0.5,
                        rotation: Math.random() * Math.PI * 2,
                        scale: 0.8,
                        duration: 500,
                        ease: "Cubic.easeIn",
                        onComplete: () => b.destroy(),
                    });
                    removed++;
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
            scene.sound.play("win");
            endScreen(true); // Win condition
        } else if (scene.shotsLeft <= 0) {
            scene.sound.play("lose");
            endScreen(false); // Lose condition
        }
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
} = Controllers;
