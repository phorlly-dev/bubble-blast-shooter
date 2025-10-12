import { setValues } from "../../hooks/func";
import { emitEvent } from "../../hooks/remote";
import {
    COLORS,
    GameRegistry,
    H_SPACING,
    OFFSET_Y,
    V_SPACING,
    WIDTH,
} from "../consts";
import MyText from "../objects/MyText";
import {
    getCenterX,
    getCenterY,
    getBetween2,
    getNeighbors,
    getMaxCol,
    getOffsetX,
    getGlobalX,
} from "./helper";
import { afterShot } from "./payload";

const States = {
    missedShot() {
        const { scene } = GameRegistry;
        if (scene.currentBubble) {
            scene.currentBubble.destroy();
            scene.currentBubble = null;
        }
        afterShot();
    },
    rowToY(row) {
        return OFFSET_Y + row * V_SPACING;
    },
    colToX(col, row) {
        return getGlobalX() + getOffsetX(row) + col * H_SPACING;
    },
    textPopup(bubble, score) {
        const { scene } = GameRegistry;
        const popup = new MyText(scene, bubble.x, bubble.y, `+${score}`, {
            fontSize: "16px",
            fontFamily: "Arial",
            color: "#ffeb3b",
            stroke: "#000",
            strokeThickness: 4,
        });

        scene.tweens.add({
            targets: popup,
            alpha: 0,
            scale: 1.4,
            duration: 1200,
            ease: "Cubic.easeOut",
            onComplete: () => popup.destroy(),
        });

        // bubble pop animation
        scene.tweens.add({
            targets: bubble,
            alpha: 0,
            scale: 1.6,
            rotation: Math.random() * 0.5,
            duration: 280,
            ease: "Cubic.easeIn",
            onComplete: () => bubble.destroy(),
        });
    },
    markConnected(bubble, connected) {
        const stack = [{ row: bubble.row, col: bubble.col }];

        while (stack.length) {
            const { row, col } = stack.pop();
            const key = `${row},${col}`;
            if (connected.has(key)) continue;

            connected.add(key);

            // ✅ Use your existing, correct getNeighbors()
            for (const n of getNeighbors(row, col)) {
                if (n.bubble && !connected.has(`${n.row},${n.col}`)) {
                    stack.push({ row: n.row, col: n.col });
                }
            }
        }
    },
    levelCompleted(level) {
        const { scene } = GameRegistry;

        // 🎉 Flash message
        const message = new MyText(
            scene,
            getCenterX(),
            getCenterY(),
            `🎉 Level ${level} Complete!`,
            {
                fontSize: "28px",
                fill: "#cadf6dff",
                fontStyle: "bold",
                stroke: "#000",
                strokeThickness: 6,
            }
        );

        scene.tweens.add({
            targets: message,
            scale: 1.2,
            duration: 800,
            yoyo: true,
            repeat: 2,
            ease: "Sine.easeInOut",
            onComplete: () => message.destroy(),
        });

        // 🎇 Confetti particles using generic "particle"
        const emitterConfig = {
            x: { min: 0, max: WIDTH },
            y: 0,
            lifespan: 1500,
            speedY: { min: 200, max: 400 },
            scale: { start: 0.6, end: 0 },
            quantity: 4,
            blendMode: "ADD",
        };

        // Use colors directly as tints
        setValues(COLORS, ({ hex }) => {
            const emitter = scene.add.particles(0, 0, "particle", {
                ...emitterConfig,
                tint: hex, // ✅ color particles
            });

            scene.time.delayedCall(2000, () => {
                emitter.stop();
                emitter.destroy();
            });
        });
    },
    endWinSequence() {
        const { scene } = GameRegistry;
        // Flash effect before restart
        scene.cameras.main.flash(400, 255, 255, 255);

        // Big bubble burst animation
        clearScreen();
        levelCompleted(scene.level);

        // Restart game after short delay
        scene.time.delayedCall(1200, () => {
            scene.level++;
            scene.total = scene.score;
            emitEvent("level", scene.level);
            scene.scene.restart({
                level: scene.level,
                score: scene.total,
                is_shooting: false,
                game_over: false,
                spawn_wave: true,
            });
        });
    },
    clearScreen() {
        const { scene } = GameRegistry;
        const bubbles = scene.bubbleGroup.getChildren();
        setValues(bubbles, (val, idx) => {
            scene.tweens.add({
                targets: val,
                scale: 1.5,
                alpha: 0,
                duration: getBetween2(300, 600),
                delay: idx * 20,
                ease: "Back.easeIn",
                onComplete: () => val.destroy(),
            });
        });
    },
    stopJustBefore(shot, hit, back = 2) {
        const dx = hit.x - shot.x;
        const dy = hit.y - shot.y;
        const dist = Math.hypot(dx, dy) || 1;

        // distance from shot center to where it should stop = (2R - tiny_epsilon)
        // const back = Math.max(0, dist - (RADIUS * 2 - 0.5));

        return {
            x: shot.x + (dx * back) / dist,
            y: shot.y + (dy * back) / dist,
        };
    },
    debugGrid() {
        const { scene } = GameRegistry;
        for (let r = 0; r < scene.bubbles.length; r++) {
            const maxCol = getMaxCol(r);
            for (let c = 0; c < maxCol; c++) {
                const x = colToX(c, r);
                const y = rowToY(r);
                scene.add.circle(x, y, 1, 0x00ff00);
            }
        }
    },
    hideUIAfterBonus() {
        const { scene } = GameRegistry;

        // Only keep live objects
        const targets = [
            scene.nextBubble,
            scene.swapIcon,
            scene.currentRing,
            scene.currentBubble,
            scene.shooter,
            scene.shotsBadge,
            scene.shotsText,
        ].filter((o) => o && !o.destroyed && !o._destroyed);

        // If nothing to tween, just finish
        if (!targets.length) {
            cleanupUI(scene);
            return;
        }

        // Stop any previous tweens on these objects
        targets.forEach((o) => scene.tweens.killTweensOf(o));

        scene.tweens.add({
            targets,
            scale: 0,
            alpha: 0,
            duration: 600,
            ease: "Back.easeIn",
            onComplete: () => cleanupUI(scene),
        });
    },
    updateShotsBadge() {
        const { scene } = GameRegistry;
        if (scene.shotsText) scene.shotsText.setText(String(scene.shotsLeft));
    },
    loadAssets(slug, files, isAudio = false) {
        const { scene } = GameRegistry;
        scene.load.setPath(`assets/${slug}/`);
        setValues(files, ({ key, value }) => {
            if (isAudio) scene.load.audio(key, value);
            else scene.load.image(key, value);
        });
    },
    worldToGrid(x, y) {
        const { bubbles } = GameRegistry.scene;
        let row = Math.round((y - OFFSET_Y) / V_SPACING);
        row = Math.max(0, Math.min(row, bubbles.length - 1)); // clamp

        const base = getGlobalX() + getOffsetX(row);
        let col = Math.round((x - base) / H_SPACING);
        col = Math.max(0, Math.min(col, getMaxCol(row) - 1)); // clamp

        return { row, col };
    },
    isEven(val) {
        return Phaser.Math.IsEven(val);
    },
    cleanupUI(scene) {
        // Helper to destroy-and-null if it exists
        const kill = (key) => {
            const o = scene[key];
            if (o && o.destroy && !o.destroyed && !o._destroyed) o.destroy();
            scene[key] = null;
        };

        kill("currentBubble");
        kill("nextBubble");
        kill("swapIcon");
        kill("currentRing");
        kill("shooter");
        kill("shotsBadge");
        kill("shotsText");
    },
};

export const {
    missedShot,
    rowToY,
    colToX,
    validColForRow,
    textPopup,
    markConnected,
    levelCompleted,
    endWinSequence,
    clearScreen,
    stopJustBefore,
    debugGrid,
    hideUIAfterBonus,
    updateShotsBadge,
    loadAssets,
    isValid,
    worldToGrid,
    isEven,
    cleanupUI,
} = States;
