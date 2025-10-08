import { setValues } from "../../hooks/func";
import {
    COLORS,
    COLS,
    GameRegistry,
    HEIGHT,
    OFFSET_X,
    ROWS,
    WIDTH,
} from "../consts";
import { colToX, hSpacing, rowToY, validColForRow } from "./state";

const Helpers = {
    getLinear(args, num) {
        return Phaser.Math.Interpolation.Linear(args, num);
    },
    getRandom(args) {
        return Phaser.Utils.Array.GetRandom(args);
    },
    getGridCol(x, row) {
        const offset = row % 2 === 0 ? 0 : hSpacing() / 2;
        const val = Math.round((x - OFFSET_X - offset) / hSpacing());

        return getClamp(val, 0, COLS - 1);
    },
    getClamp(val, min, max) {
        return Phaser.Math.Clamp(val, min, max);
    },
    getMoveLeft(level = 1) {
        // Base range grows slightly by level
        const minBase = 12 + Math.min(level, 20);
        const maxBase = 24 + Math.min(level, 30);

        // Pick random base moves within that range
        const base = getMinMax(minBase, maxBase);

        // Soft difficulty balancing
        let bonus = 0;
        if (level <= 12) bonus = getMinMax(3, 4);
        else bonus = getMinMax(6, 8);

        // Final calculation
        const moves = Math.max(12, Math.ceil(base + bonus));

        return moves;
    },
    getEmptyNeighborPositions(row, col) {
        const { scene } = GameRegistry;
        const offsets = getPatterns(row);
        const out = [];
        for (const [dr, dc] of offsets) {
            const num = { row: row + dr, col: col + dc };
            if (isValid(num.row, num.col) || scene.bubbles[num.row]?.[num.col])
                continue;

            out.push({
                ...num,
                x: colToX(num.col, num.row),
                y: rowToY(num.row),
            });
        }

        return out;
    },
    isValid(row, col) {
        return row >= ROWS || row < 0 || validColForRow(col, row);
    },
    getNearestPoint(line, point, out = null) {
        return Phaser.Geom.Line.GetNearestPoint(line, point, out);
    },
    getRandomColor() {
        const { scene } = GameRegistry;
        const present = new Set();
        for (let r = 0; r < scene.bubbles.length; r++) {
            for (let c = 0; c < (scene.bubbles[r]?.length || 0); c++) {
                const b = scene.bubbles[r][c];
                if (b) present.add(b.colorObj.name);
            }
        }
        const pool = present.size
            ? COLORS.filter((c) => present.has(c.name))
            : COLORS;

        return getRandom(pool);
    },
    getBetween(x1, y1, x2, y2) {
        return Phaser.Math.Distance.Between(x1, y1, x2, y2);
    },
    getAimAngle(pointer) {
        const { scene } = GameRegistry;
        const { x, y } = scene.currentBubble;
        let d = { x: pointer.x - x, y: pointer.y - y };

        if (d.y >= -4) d.y = -Math.max(8, Math.abs(d.y) + 1);

        return Math.atan2(d.y, d.x);
    },
    getPatterns(row) {
        return row % 2 === 0
            ? [
                  [-1, -1],
                  [-1, 0],
                  [0, -1],
                  [0, 1],
                  [1, -1],
                  [1, 0],
              ]
            : [
                  [-1, 0],
                  [-1, 1],
                  [0, -1],
                  [0, 1],
                  [1, 0],
                  [1, 1],
              ];
    },
    getNeighbors(row, col) {
        const { scene } = GameRegistry;
        const offsets = getPatterns(row);
        let res = [];

        for (const [dr, dc] of offsets) {
            const num = { row: row + dr, col: col + dc };

            if (isValid(num.row, num.col)) continue;
            res.push({
                ...num,
                bubble: scene.bubbles[num.row]?.[num.col] || null,
            });
        }

        return res;
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
    getCenterX() {
        return WIDTH / 2;
    },
    getCenterY() {
        return HEIGHT / 2;
    },
    getLevelPattern(level = 1) {
        const config = {
            rows: 6,
            obstacleChance: 0,
            pattern: () => true,
        };

        switch (true) {
            // 🟢 Level 1–6: Small triangle (easy to aim)
            case level <= 6:
                config.rows = 8;
                config.pattern = (r, c, maxCol) =>
                    c > r / 2 && c < maxCol - r / 2;
                config.obstacleChance = 0;
                break;

            // 🟡 Level 7–12: Wider triangle or diamond (moderate)
            case level <= 12:
                config.rows = 16;
                config.pattern = (r, c, maxCol) => {
                    const mid = Math.floor(maxCol / 2);
                    const dist = Math.abs(c - mid);
                    return dist < maxCol / 2 - Math.abs(r - 3);
                };
                config.obstacleChance = 0.05;
                break;

            // 🔵 Level 12–18: Full rectangle (denser = harder)
            case level <= 18:
                config.rows = 8;
                config.pattern = () => true;
                config.obstacleChance = 0.15;
                break;

            // 🔴 Level 19+: Rectangle + Stones (hardest)
            default:
                config.rows = 12;
                config.pattern = () => Math.random() > 0.2;
                config.obstacleChance = 0.3;
                break;
        }

        return config;
    },
    hideUIAfterBonus() {
        const { scene } = GameRegistry;
        scene.tweens.add({
            targets: [
                scene.nextBubble,
                scene.swapIcon,
                scene.currentRing,
                scene.currentBubble,
                scene.shooter,
                scene.shotsBadge,
                scene.shotsText,
            ],
            scale: 0,
            alpha: 0,
            duration: 600,
            ease: "Back.easeIn",
            onComplete: () => {
                scene.currentBubble.destroy();
                scene.nextBubble.destroy();
                scene.swapIcon.destroy();
                scene.currentRing.destroy();
                scene.shooter.destroy();
                scene.shotsBadge.destroy();
                scene.shotsText.destroy();
            },
        });
    },
    getMinMax(min, max) {
        return Phaser.Math.Between(min, max);
    },
};

export const {
    getLinear,
    getRandom,
    getGridCol,
    getMoveLeft,
    getEmptyNeighborPositions,
    getNearestPoint,
    getRandomColor,
    getBetween,
    getAimAngle,
    getClamp,
    getPatterns,
    getNeighbors,
    updateShotsBadge,
    loadAssets,
    getCenterX,
    getCenterY,
    getLevelPattern,
    hideUIAfterBonus,
    getMinMax,
    isValid,
} = Helpers;
