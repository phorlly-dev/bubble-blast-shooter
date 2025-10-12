import {
    COLORS,
    COLS,
    GameRegistry,
    H_SPACING,
    HEIGHT,
    WIDTH,
} from "../consts";
import { colToX, isEven, rowToY } from "./state";

const Helpers = {
    getLinear(args, num) {
        return Phaser.Math.Interpolation.Linear(args, num);
    },
    getRandom(args) {
        return Phaser.Utils.Array.GetRandom(args);
    },
    getGridCol(x, row) {
        return Math.round((x - getGlobalX() - getOffsetX(row)) / H_SPACING);
    },
    getClamp(val, min, max) {
        return Phaser.Math.Clamp(val, min, max);
    },
    getMoveLeft(level = 1) {
        // Base range grows slightly by level
        const minBase = 12 + Math.min(level * 2, 24);
        const maxBase = 24 + Math.min(level * 3, 32);

        // Pick random base moves within that range
        const base = getBetween2(minBase, maxBase);

        // Soft difficulty balancing
        let bonus = 0;
        if (level <= 20) bonus = getBetween2(5, 8);
        else bonus = getBetween2(6, 9);

        // Final calculation
        const moves = Math.max(32, Math.ceil(base + bonus));

        return moves;
    },
    getEmptyNeighbors(row, col) {
        const { bubbles } = GameRegistry.scene;

        const out = [];
        for (const [dr, dc] of getPatterns(row)) {
            const nr = row + dr,
                nc = col + dc;
            if (nr < 0 || nr >= bubbles.length) continue;
            if (nc < 0 || nc >= getMaxCol(nr)) continue;
            if (!bubbles[nr]?.[nc]) {
                out.push({
                    row: nr,
                    col: nc,
                    x: colToX(nc, nr),
                    y: rowToY(nr),
                });
            }
        }

        return out;
    },
    getNearestPoint(line, point, out = null) {
        return Phaser.Geom.Line.GetNearestPoint(line, point, out);
    },
    getRandomColor() {
        const { scene } = GameRegistry;
        const present = new Set();
        for (let r = 0; r < scene.bubbles.length; r++) {
            for (let c = 0; c < getGridCol(r); c++) {
                const bubble = scene.bubbles[r]?.[c];
                if (bubble) present.add(bubble.colorObj.name);
            }
        }
        const pool = present.size
            ? COLORS.filter(({ name }) => present.has(name))
            : COLORS;

        return getRandom(pool);
    },
    getBetween4(x1, y1, x2, y2) {
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
        return isEven(row)
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
        const { bubbles } = GameRegistry.scene;
        const res = [];
        for (const [dr, dc] of getPatterns(row)) {
            const nr = row + dr,
                nc = col + dc;
            if (nr < 0 || nr >= bubbles.length) continue;
            if (nc < 0 || nc >= getMaxCol(nr)) continue;
            const bubble = bubbles[nr]?.[nc] ?? null;
            res.push({ row: nr, col: nc, bubble });
        }

        return res;
    },
    getCenterX() {
        return WIDTH / 2;
    },
    getCenterY() {
        return HEIGHT / 2;
    },
    getLevelPattern(level = 1) {
        const config = {
            rows: 8,
            obstacleChance: 0,
            pattern: () => true,
        };

        switch (true) {
            // 🟢 Level 1–10: Small triangle (easy to aim)
            case level <= 10:
                config.rows = 8;
                config.pattern = (r, c, maxCol) =>
                    c > r / 2 && c < maxCol - r / 2;
                config.obstacleChance = 0;
                break;

            // 🟡 Level 11–20: Wider triangle or diamond (moderate)
            case level <= 20:
                config.rows = 7;
                config.pattern = (r, c, maxCol) => {
                    const mid = Math.floor(maxCol / 2);
                    const dist = Math.abs(c - mid);
                    return dist < maxCol / 2 - Math.abs(r - 3);
                };
                config.obstacleChance = 0.05;
                break;

            // 🔵 Level 21–30: Full rectangle (denser = harder)
            case level <= 30:
                config.rows = 7;
                config.pattern = () => true;
                config.obstacleChance = 0.15;
                break;

            // 🔴 Level 31+: Rectangle + Stones (hardest)
            default:
                config.rows = 8;
                config.pattern = () => Math.random() > 0.2;
                config.obstacleChance = 0.3;
                break;
        }

        return config;
    },
    getBetween2(min, max) {
        return Phaser.Math.Between(min, max);
    },
    getMaxCol(row) {
        return isEven(row) ? COLS : COLS - 1;
    },
    getOffsetX(row) {
        return isEven(row) ? 0 : H_SPACING / 2;
    },
    getGlobalX() {
        return (WIDTH - COLS * H_SPACING) / 2;
    },
};

export const {
    getLinear,
    getRandom,
    getGridCol,
    getMoveLeft,
    getEmptyNeighbors,
    getNearestPoint,
    getRandomColor,
    getBetween4,
    getAimAngle,
    getClamp,
    getPatterns,
    getNeighbors,
    getCenterX,
    getCenterY,
    getLevelPattern,
    getBetween2,
    getMaxCol,
    getOffsetX,
    getGlobalX,
} = Helpers;
