import { setValues } from "../../hooks/func";
import { emitEvent } from "../../hooks/remote";
import {
    COLORS,
    COLS,
    GameRegistry,
    OFFSET_X,
    OFFSET_Y,
    RADIUS,
    WIDTH,
} from "../consts";
import MyText from "../objects/MyText";
import { getCenterX, getCenterY, getMinMax, getNeighbors } from "./helper";
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
    hSpacing() {
        return RADIUS * 2;
    },
    vPitch() {
        return Math.round(Math.sqrt(3) * RADIUS);
    },
    rowToY(row) {
        return OFFSET_Y + row * vPitch();
    },
    colToX(col, row) {
        const offset = row % 2 === 0 ? 0 : hSpacing() / 2;

        return OFFSET_X + col * hSpacing() + offset;
    },
    validColForRow(col, row) {
        const maxCol = row % 2 === 0 ? COLS : COLS - 1;

        return col < 0 || col >= maxCol;
    },
    textPopup(b, scoreGain) {
        const { scene } = GameRegistry;
        const popup = new MyText(scene, b.x, b.y, `+${scoreGain}`, {
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
            targets: b,
            alpha: 0,
            scale: 1.6,
            rotation: Math.random() * 0.5,
            duration: 280,
            ease: "Cubic.easeIn",
            onComplete: () => b.destroy(),
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
            const neighbors = getNeighbors(row, col);
            for (const n of neighbors) {
                if (n.bubble && !connected.has(`${n.row},${n.col}`)) {
                    stack.push({ ...n });
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
        const bubbles = scene.bubbleGroup.getChildren();
        setValues(bubbles, (b, i) => {
            scene.tweens.add({
                targets: b,
                scale: 1.5,
                alpha: 0,
                duration: getMinMax(300, 600),
                delay: i * 20,
                ease: "Back.easeIn",
                onComplete: () => b.destroy(),
            });
        });
        levelCompleted(scene.level);

        // Restart game after short delay
        scene.time.delayedCall(1200, () => {
            scene.level += 1;
            scene.total += scene.score;
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
};

export const {
    missedShot,
    hSpacing,
    vPitch,
    rowToY,
    colToX,
    validColForRow,
    textPopup,
    markConnected,
    levelCompleted,
    endWinSequence,
} = States;
