import { setValues } from "../../hooks/func";
import { emitEvent, onEvent } from "../../hooks/remote";
import { GameRegistry, HEIGHT, RADIUS, WIDTH } from "../consts";
import MyText from "../objects/MyText";
import {
    checkGameOver,
    drawAimLine,
    removeFloatingBubbles,
    shootBubble,
    snapFromImpact,
    spawnBonusBubbles,
    transferNextToCurrent,
} from "./controller";
import {
    getBetween4,
    getCenterX,
    getCenterY,
    getClamp,
    getBetween2,
    getNeighbors,
    getEmptyNeighbors,
    getMaxCol,
} from "./helper";
import { makeNextBall } from "./object";
import {
    clearScreen,
    colToX,
    endWinSequence,
    rowToY,
    hideUIAfterBonus,
    textPopup,
    updateShotsBadge,
    missedShot,
} from "./state";

const Payloads = {
    swapBubbles() {
        const { scene } = GameRegistry;
        if (scene.isShooting || scene.isSnapping) return;

        // swap positions visually
        const current = { x: scene.currentBubble.x, y: scene.currentBubble.y };
        const next = { x: scene.nextBubble.x, y: scene.nextBubble.y };

        // tween animation for smoothness
        scene.tweens.add({
            ...next,
            targets: scene.currentBubble,
            duration: 200,
            ease: "Sine.easeInOut",
        });

        scene.tweens.add({
            ...current,
            targets: scene.nextBubble,
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
            ease: "Back",
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
        scene.input.on("gameover", () => (scene.mouseOver = true));
        scene.input.on("gameout", () => {
            scene.mouseOver = false;
            scene.aimLine.clear();
        });

        scene.input.on("pointerdown", (p) => {
            if (scene.gameOver || !scene.currentBubble || scene.isShooting)
                return;

            // --- check if player clicked on swap area ---
            const swapDist = getBetween4(
                p.x,
                p.y,
                scene.nextBubble.x,
                scene.nextBubble.y
            );
            const currentDist = getBetween4(
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

        for (let row = 0; row < scene.bubbles.length; row++) {
            for (let col = 0; col < getMaxCol(row); col++) {
                const ball = scene.bubbles[row][col];
                if (!ball) continue;

                const dist = getBetween4(bubble.x, bubble.y, ball.x, ball.y);
                if (dist > maxDist) continue;

                const strength = getClamp(1 - dist / maxDist, 0, 1);
                const offsetX = (Math.random() - 0.5) * 4 * strength;
                const offsetY = (Math.random() - 0.5) * 4 * strength;

                if (bubble.isStone) {
                    bubble.setTint(0x444444);
                    bubble.setAlpha(0.9);
                    bubble.setDepth(5);
                }

                scene.tweens.add({
                    targets: ball,
                    scale: { from: 1 + 0.25 * strength, to: 1 },
                    x: ball.x + offsetX,
                    y: ball.y + offsetY,
                    duration: 140 + Math.random() * 100,
                    ease: "Sine.easeOut",
                    yoyo: true,
                    onComplete: () => {
                        ball.setPosition(
                            colToX(ball.col, ball.row),
                            rowToY(ball.row)
                        );
                        ball.setScale(1);
                    },
                });
            }
        }
    },
    handleTrueHit(shot, hit) {
        const { scene } = GameRegistry;
        if (scene.isSnapping) return;
        scene.isSnapping = true;

        if (hit.isStone) {
            // Bounce slightly or just stop (don’t merge)
            missedShot();
            return;
        }

        // --- stop movement immediately
        shot.body?.stop?.();
        snapFromImpact(shot, hit);
        shakeBubbles();
        animateHitShockwave(shot);
        scene.isSnapping = false;
        scene.isShooting = false;
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
        setValues(matches, (b) => {
            const colorScore = Math.floor(b.colorObj.score / 2) * combo;
            scene.tweens.add({
                targets: b,
                alpha: 0,
                scale: 0.2,
                duration: 150,
                ease: "Power2",
                onComplete: () => b.destroy(),
            });

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
    endScreen() {
        const { scene } = GameRegistry;
        scene.aimLine.clear();

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
                fontSize: "24px",
                fill: "#ffff00",
                fontStyle: "bold",
                stroke: "#000",
                strokeThickness: 4,
            }
        );

        clearScreen();
        hideUIAfterBonus();
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
    },
    handlePlayerWin() {
        const { scene } = GameRegistry;
        scene.aimLine.clear();

        const spawnFrom = transferNextToCurrent();
        const bonusDelay = 120;
        let moves = scene.shotsLeft;

        // Stop any shooting
        scene.isShooting = true;

        // Chain bonus pops
        const popTimer = scene.time.addEvent({
            delay: bonusDelay,
            loop: true,
            callback: () => {
                if (moves <= 0) {
                    popTimer.remove();
                    hideUIAfterBonus();
                    endWinSequence();
                    return;
                }

                moves--;
                spawnBonusBubbles(spawnFrom);

                scene.shotsLeft--;
                updateShotsBadge();
            },
        });
    },
    shakeBubbles() {
        const { scene } = GameRegistry;
        let bubbles = [];

        // Collect all existing bubbles
        for (let row = 0; row < scene.bubbles.length; row++) {
            for (let col = 0; col < getMaxCol(row); col++) {
                const bubble = scene.bubbles[row][col];
                if (bubble) bubbles.push(bubble);
            }
        }

        // Apply tiny shake animation to all
        setValues(bubbles, (val, idx) => {
            scene.tweens.add({
                targets: val,
                x: val.x + getBetween2(-2, 2), // small horizontal wiggle
                y: val.y + getBetween2(-2, 2), // small vertical jiggle
                yoyo: true,
                duration: 60,
                delay: idx * 5,
                ease: "Sine.easeInOut",
                onComplete: () => {
                    // After shake, recheck for floaters
                    if (idx === bubbles.length - 1) removeFloatingBubbles();
                },
            });
        });
    },
    chooseClosestEmptyToHit(shot, hit) {
        const candidates = getEmptyNeighbors(hit.row, hit.col);
        if (!candidates.length) return null;

        let best = candidates[0];
        let bestD = Infinity;

        for (const s of candidates) {
            const d = getBetween4(shot.x, shot.y, s.x, s.y);
            if (d < bestD) {
                bestD = d;
                best = s;
            }
        }

        return best;
    },
    findNearestGlobalEmpty(fromX, fromY) {
        const { scene } = GameRegistry;
        let best = null;
        let bestDist = Infinity;

        for (let r = 0; r < scene.bubbles.length; r++) {
            const maxCol = getMaxCol(r); // 11 on even scene.bubbles.length, 10 on odd (etc.)
            const rowArr = scene.bubbles[r] || [];
            for (let c = 0; c < maxCol; c++) {
                if (rowArr[c]) continue; // occupied -> skip
                const cx = colToX(c, r);
                const cy = rowToY(r);
                const d = getBetween4(fromX, fromY, cx, cy);
                if (d < bestDist) {
                    bestDist = d;
                    best = { row: r, col: c, x: cx, y: cy };
                }
            }
        }

        return best; // may be null if the board is full
    },
    ensureRow(row) {
        const { bubbles } = GameRegistry.scene;
        if (!bubbles[row]) {
            bubbles[row] = new Array(getMaxCol(row)).fill(null);
        } else if (bubbles[row].length !== getMaxCol(row)) {
            // normalize rows created earlier with wrong length
            const a = new Array(getMaxCol(row)).fill(null);
            for (let i = 0; i < bubbles[row].length; i++)
                a[i] = bubbles[row][i];
            bubbles[row] = a;
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
    handlePlayerWin,
    shakeBubbles,
    chooseClosestEmptyToHit,
    findNearestGlobalEmpty,
    ensureRow,
} = Payloads;
