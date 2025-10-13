import {
    COLORS,
    GameRegistry,
    H_SPACING,
    HEIGHT,
    OFFSET_Y,
    RADIUS,
    WIDTH,
} from "../consts";
import MyImage from "../objects/MyImage";
import MySprite from "../objects/MySprite";
import MyText from "../objects/MyText";
import {
    getCenterX,
    getLevelPattern,
    getMaxCol,
    getOffsetX,
    getRandom,
    getRandomColor,
} from "./helper";
import { colToX, rowToY } from "./state";

const Objects = {
    makeWalls() {
        const { scene } = GameRegistry;

        scene.wallLeft = RADIUS + getOffsetX(0);
        scene.wallRight = WIDTH - RADIUS;
        scene.wallTop = OFFSET_Y;
        scene.physics.world.setBounds(
            scene.wallLeft,
            scene.wallTop,
            scene.wallRight - scene.wallLeft,
            HEIGHT - scene.wallTop,
            true,
            true,
            true,
            false
        );
    },
    makeCurrentBall() {
        const { scene } = GameRegistry;

        // dark shooter base
        scene.shooter = scene.add.circle(
            getCenterX(),
            HEIGHT - H_SPACING - RADIUS / 6,
            RADIUS * 0.7,
            0xffffff
        );
        scene.shooter.setAlpha(0.2);

        // ✅ add glow ring
        scene.currentRing = scene.add.circle(
            scene.shooter.x,
            scene.shooter.y,
            RADIUS * 1.4
        );
        scene.currentRing.setStrokeStyle(3, 0xffffff, 0.8);
        scene.currentRing.setAlpha(0.8);

        // current bubble (on top of shooter)
        scene.currentBubble = createBubble(
            scene.shooter.x,
            scene.shooter.y,
            getRandomColor()
        );
    },
    makeSwapIcon() {
        const { scene } = GameRegistry;
        scene.swapIcon = new MyImage(
            scene,
            getCenterX() + RADIUS * 4,
            HEIGHT - H_SPACING,
            "swap_icon"
        );
        scene.swapIcon.setScale(0.16).setAlpha(0.3);
        scene.tweens.add({
            targets: scene.swapIcon,
            angle: 360,
            duration: 1800, // rotation speed (ms)
            repeat: -1, // infinite loop
            ease: "Linear", // constant speed
        });
    },
    makeNextBall() {
        const { scene } = GameRegistry;
        scene.nextBubble = createBubble(
            scene.swapIcon.x,
            scene.swapIcon.y,
            getRandomColor()
        );
        scene.nextBubble.setAlpha(0.8);
    },
    createBubbleGrid() {
        const { scene } = GameRegistry;
        const config = getLevelPattern(scene.level);
        const isStone = Math.random() < config.obstacleChance;
        const delayStep = 24;

        let delayCounter = 0;
        for (let row = 0; row < config.rows; row++) {
            scene.bubbles[row] = [];
            const maxCol = getMaxCol(row);

            for (let col = 0; col < maxCol; col++) {
                if (!config.pattern(row, col, maxCol)) {
                    scene.bubbles[row][col] = null;
                    continue;
                }

                const colorObj =
                    Math.random() < isStone
                        ? { name: "stone", hex: 0x666666, css: "#666666" }
                        : getRandom(COLORS);

                const x = colToX(col, row);
                const y = rowToY(row);

                // Bubble base sprite
                const bubble = createBubble(x, y - 100, colorObj); // start slightly above
                const scale = (RADIUS * 2) / bubble.width;

                scene.physics.add.existing(bubble);
                bubble.setOrigin(0.5).setDisplaySize(H_SPACING, H_SPACING);
                bubble.setScale(scale).setAlpha(0);
                const off = bubble.displayWidth / 2 - RADIUS;
                bubble.body.setCircle(RADIUS, off, off).setImmovable(true);
                bubble.setInteractive(
                    new Phaser.Geom.Circle(RADIUS, RADIUS, RADIUS),
                    Phaser.Geom.Circle.Contains
                );

                // add to group for management
                bubble.row = row;
                bubble.col = col;
                bubble.isStone = isStone;
                scene.bubbles[row][col] = bubble;
                scene.bubbleGroup.add(bubble);

                // Animate drop + scale with wave delay
                scene.time.delayedCall(delayCounter, () => {
                    scene.tweens.add({
                        targets: bubble,
                        y,
                        scale: 1,
                        alpha: 1,
                        duration: 240,
                        ease: "Back",
                    });
                });

                delayCounter += delayStep;
            }
        }
    },
    createBubble(x, y, colorObj) {
        const { scene } = GameRegistry;
        const bubble = new MySprite(scene, x, y, `ball_${colorObj.name}`);

        bubble.setDisplaySize(H_SPACING, H_SPACING);
        bubble.colorObj = colorObj;
        bubble.setOrigin(0.5);
        bubble.hit = false; // Flag for collision handling

        return bubble;
    },
    makeShotsBadge() {
        const { scene } = GameRegistry;
        const num = { x: WIDTH / 2.8, y: HEIGHT - H_SPACING };

        scene.shotsBadge = scene.add.graphics();
        scene.shotsBadge.fillStyle(0x000000, 0.35);
        scene.shotsBadge.fillRoundedRect(num.x - 22, num.y - 14, 44, 28, 10);
        scene.shotsText = new MyText(
            scene,
            num.x,
            num.y - 2,
            String(scene.shotsLeft),
            {
                fontSize: "16px",
                fontFamily: "Georgia",
                color: "#ffeb3b",
                fontStyle: "bold",
                stroke: "#000",
                strokeThickness: 3,
            }
        );
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
