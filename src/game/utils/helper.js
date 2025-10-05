import { COLORS, COLS, OFFSET_X, ROWS } from "../consts";
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

        return getClamp(
            Math.round((x - OFFSET_X - offset) / hSpacing()),
            0,
            COLS - 1
        );
    },
    getClamp(val, min, max) {
        return Phaser.Math.Clamp(val, min, max);
    },
    getMoveLeft(scene) {
        let totalBubbles = 0;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < (scene.bubbles[r]?.length || 0); c++) {
                if (scene.bubbles[r][c]) totalBubbles++;
            }
        }

        return Math.ceil(totalBubbles / (scene.level <= 3 ? 1.8 : 1.2)) + 5;
    },
    getEmptyNeighborPositions(scene, row, col) {
        const offsets = getPatterns(row);
        const out = [];
        for (const [dr, dc] of offsets) {
            const nr = row + dr;
            const nc = col + dc;
            if (
                nr < 0 ||
                nr >= ROWS ||
                !validColForRow(nc, nr) ||
                scene.bubbles[nr]?.[nc]
            )
                continue;

            // ✅ ignore cells *above* hit point — prevent “jump merge”
            if (dr < 0) continue;

            out.push({
                row: nr,
                col: nc,
                x: colToX(nc, nr),
                y: rowToY(nr),
            });
        }

        return out;
    },
    getNearestPoint(line, point, out = Phaser.Geom.Point) {
        return Phaser.Geom.Line.GetNearestPoint(line, point, out);
    },
    getRandomColor(scene) {
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
    getAimAngle(scene, pointer) {
        const sx = scene.currentBubble.x,
            sy = scene.currentBubble.y;
        let dx = pointer.x - sx,
            dy = pointer.y - sy;
        if (dy >= -4) dy = -Math.max(8, Math.abs(dy) + 1);

        return Math.atan2(dy, dx);
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
    getNeighbors(scene, row, col) {
        const offsets = getPatterns(row);
        const res = [];
        for (const [dr, dc] of offsets) {
            const nr = row + dr,
                nc = col + dc;
            if (nr < 0 || nr >= ROWS) continue;
            if (!validColForRow(nc, nr)) continue;
            res.push({
                row: nr,
                col: nc,
                bubble: scene.bubbles[nr]?.[nc] || null,
            });
        }

        return res;
    },
    updateShotsBadge(scene) {
        if (scene.shotsText) scene.shotsText.setText(String(scene.shotsLeft));
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
} = Helpers;
