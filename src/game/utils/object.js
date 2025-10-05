import {
    COLORS,
    COLS,
    HEIGHT,
    OFFSET_X,
    OFFSET_Y,
    RADIUS,
    ROWS,
    WIDTH,
} from "../consts";
import MyImage from "../objects/MyImage";
import MySprite from "../objects/MySprite";
import MyText from "../objects/MyText";
import { getRandom, getRandomColor } from "./helper";
import { colToX, hSpacing, rowToY } from "./state";

const Objects = {
    makeWalls(scene) {
        scene.wallLeft = OFFSET_X - RADIUS;
        scene.wallRight = OFFSET_X + (COLS - 1) * hSpacing() + RADIUS;
        scene.wallTop = OFFSET_Y;
        scene.physics.world.setBounds(
            scene.wallLeft,
            scene.wallTop - 100,
            scene.wallRight - scene.wallLeft,
            HEIGHT - scene.wallTop + 100,
            true,
            true,
            true,
            false
        );
    },
    makeCurrentBall(scene) {
        const shooterX = WIDTH / 2;
        const shooterY = HEIGHT - hSpacing();

        // dark shooter base
        scene.shooter = scene.add
            .circle(shooterX, shooterY - RADIUS / 6, RADIUS * 0.7, 0xffffff)
            .setAlpha(0.2);

        // ✅ add glow ring
        const currentRing = scene.add.circle(
            scene.shooter.x,
            scene.shooter.y,
            RADIUS * 1.4
        );
        currentRing.setStrokeStyle(3, 0xffffff, 0.8);
        currentRing.setAlpha(0.8);

        // current bubble (on top of shooter)
        scene.currentBubble = createBubble(
            scene,
            scene.shooter.x,
            scene.shooter.y,
            getRandomColor(scene)
        );

        return scene.currentBubble;
    },
    makeSwapIcon(scene) {
        const nextX = WIDTH / 2 + RADIUS * 4;
        const nextY = HEIGHT - hSpacing();

        const swapArrow = new MyImage(scene, nextX, nextY, "swap_icon");
        swapArrow.setScale(0.16).setAlpha(0.6);
        scene.tweens.add({
            targets: swapArrow,
            angle: 360,
            duration: 1800, // rotation speed (ms)
            repeat: -1, // infinite loop
            ease: "Linear", // constant speed
        });
    },
    makeNextBall(scene) {
        const nextX = WIDTH / 2 + RADIUS * 4;
        const nextY = HEIGHT - hSpacing();

        scene.nextBubble = createBubble(
            scene,
            nextX,
            nextY,
            getRandomColor(scene)
        );
        scene.nextBubble.setAlpha(0.8);

        return scene.nextBubble;
    },
    createBubbleGrid(scene) {
        const startRows = Math.min(ROWS, 6);
        const delayStep = 25; // ms delay per bubble for wave timing

        let delayCounter = 0;
        for (let r = 0; r < ROWS; r++) {
            scene.bubbles[r] = [];
            const maxCol = r % 2 === 0 ? COLS : COLS - 1;
            for (let c = 0; c < maxCol; c++) {
                if (r < startRows) {
                    const colorObj = getRandom(COLORS);
                    const x = colToX(c, r);
                    const y = rowToY(r);

                    const key = `ball_${colorObj.name}`;
                    const s = scene.bubbleGroup.create(x, y - 100, key); // start slightly above
                    s.setDisplaySize(hSpacing(), hSpacing());
                    s.setScale(0);
                    s.alpha = 0;
                    s.colorObj = colorObj;
                    s.row = r;
                    s.col = c;
                    s.body.setCircle(RADIUS);

                    scene.bubbles[r][c] = s;

                    // Animate drop + scale with wave delay
                    scene.time.delayedCall(delayCounter, () => {
                        scene.tweens.add({
                            targets: s,
                            y: y,
                            scale: 1,
                            alpha: 1,
                            duration: 240,
                            ease: "Back",
                        });
                    });

                    delayCounter += delayStep;
                } else {
                    scene.bubbles[r][c] = null;
                }
            }
        }
    },
    createBubble(scene, x, y, colorObj) {
        const s = new MySprite(scene, x, y, `ball_${colorObj.name}`);
        s.setDisplaySize(hSpacing(), hSpacing());
        s.colorObj = colorObj;
        s.hit = false; // Flag for collision handling

        return s;
    },
    makeShotsBadge(scene) {
        const x = WIDTH / 2.8,
            y = HEIGHT - hSpacing();
        scene.shotsBadge = scene.add.graphics();
        scene.shotsBadge.fillStyle(0x000000, 0.35);
        scene.shotsBadge.fillRoundedRect(x - 22, y - 14, 44, 28, 10);
        scene.shotsText = new MyText(scene, x, y, String(scene.shotsLeft), {
            fontSize: "16px",
            fill: "#ffeb3b",
            fontStyle: "bold",
            stroke: "#000",
            strokeThickness: 3,
        });
    },
};

export const {
    makeWalls,
    makeCurrentBall,
    makeSwapIcon,
    makeNextBall,
    createBubbleGrid,
    createBubble,
    makeShotsBadge,
} = Objects;
