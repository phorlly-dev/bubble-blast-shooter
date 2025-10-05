import {
    COLORS,
    COLS,
    HEIGHT,
    OFFSET_X,
    OFFSET_Y,
    RADIUS,
    WIDTH,
} from "../consts";
import MyText from "../objects/MyText";
import { getPatterns } from "./helper";
import { afterShot } from "./payload";

const States = {
    missedShot(scene) {
        if (scene.currentBubble) {
            scene.currentBubble.destroy();
            scene.currentBubble = null;
        }
        afterShot(scene);
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

        return col >= 0 && col < maxCol;
    },
    textPopup(scene, b, scoreGain) {
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
    markConnected(scene, bubble, set) {
        const key = `${bubble.row},${bubble.col}`;
        if (set.has(key)) return;
        set.add(key);

        for (const [dr, dc] of getPatterns(bubble.row)) {
            const nr = bubble.row + dr;
            const nc = bubble.col + dc;
            if (nr < 0 || nr >= ROWS) continue;
            if (!validColForRow(nc, nr)) continue;
            const nb = scene.bubbles[nr]?.[nc];
            if (nb) markConnected(scene, nb, set);
        }
    },
    levelCompleted(scene, level) {
        // 🎉 Flash message
        const message = new MyText(
            scene,
            WIDTH / 2,
            HEIGHT / 2,
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
        COLORS.forEach((color) => {
            const emitter = scene.add.particles(0, 0, "particle", {
                ...emitterConfig,
                tint: color.hex, // ✅ color particles
            });

            scene.time.delayedCall(2000, () => {
                emitter.stop();
                emitter.destroy();
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
} = States;
