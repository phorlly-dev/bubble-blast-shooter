import {
    COLORS,
    COLS,
    GameRegistry,
    HEIGHT,
    OFFSET_X,
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
    getRandom,
    getRandomColor,
} from "./helper";
import { colToX, hSpacing, rowToY } from "./state";

const Objects = {
    makeWalls() {
        const { scene } = GameRegistry;
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
    makeCurrentBall() {
        const { scene } = GameRegistry;

        // dark shooter base
        scene.shooter = scene.add.circle(
            getCenterX(),
            HEIGHT - hSpacing() - RADIUS / 6,
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
            HEIGHT - hSpacing(),
            "swap_icon"
        );
        scene.swapIcon.setScale(0.16).setAlpha(0.6);
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
            getCenterX() + RADIUS * 4,
            HEIGHT - hSpacing(),
            getRandomColor()
        );
        scene.nextBubble.setAlpha(0.8);
    },
    createBubbleGrid() {
        const { scene } = GameRegistry;
        const config = getLevelPattern(scene.level);
        const isStone =
            scene.level >= 3 && Math.random() < config.obstacleChance;
        const delayStep = 26;

        let delayCounter = 0;
        for (let r = 0; r < config.rows; r++) {
            scene.bubbles[r] = [];
            const maxCol = r % 2 === 0 ? COLS : COLS - 1;

            for (let c = 0; c < maxCol; c++) {
                if (!config.pattern(r, c, maxCol)) {
                    scene.bubbles[r][c] = null;
                    continue;
                }

                const colorObj =
                    Math.random() < isStone
                        ? { name: "stone", hex: 0x666666, css: "#666666" }
                        : getRandom(COLORS);

                const x = colToX(c, r);
                const y = rowToY(r);

                // Bubble base sprite
                const key = isStone ? "ball_stone" : `ball_${colorObj.name}`;
                const bubble = scene.bubbleGroup.create(x, y - 100, key); // start slightly above
                bubble.setDisplaySize(hSpacing(), hSpacing());
                bubble.setScale(0);
                bubble.alpha = 0;
                bubble.colorObj = colorObj;
                bubble.row = r;
                bubble.col = c;
                bubble.body.setCircle(RADIUS);
                bubble.isStone = isStone;

                // add to group for management
                scene.bubbleGroup.add(bubble);

                // ✅ Make its hit area circular
                bubble.setInteractive(
                    new Phaser.Geom.Circle(RADIUS, RADIUS, RADIUS),
                    Phaser.Geom.Circle.Contains
                );

                scene.bubbles[r][c] = bubble;

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

        bubble.setDisplaySize(hSpacing(), hSpacing());
        bubble.colorObj = colorObj;
        bubble.hit = false; // Flag for collision handling

        return bubble;
    },
    makeShotsBadge() {
        const { scene } = GameRegistry;
        const num = { x: WIDTH / 2.8, y: HEIGHT - hSpacing() };

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
