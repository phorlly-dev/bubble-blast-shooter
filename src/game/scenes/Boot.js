import { COLORS, GameRegistry } from "../consts";
import { loadAssets } from "../utils/helper";

class GameBoot extends Phaser.Scene {
    constructor() {
        super("game-boot");
        GameRegistry.scene = this;
    }

    preload() {
        loadAssets("images", [
            { key: "background", value: "bg.png" },
            { key: "swap_icon", value: "refresh.png" },
            { key: "ball_stone", value: "stone.png" },
        ]);
        loadAssets(
            "sounds",
            [
                { key: "click", value: "click.wav" },
                { key: "lose", value: "lose.wav" },
                { key: "win", value: "win.ogg" },
                { key: "right", value: "connect.ogg" },
                { key: "wrong", value: "empty.ogg" },
                { key: "splash", value: "splash.ogg" },
                { key: "fall", value: "water_drain.ogg" },
                { key: "pop", value: "pop.wav" },
            ],
            true
        );

        // Generate ball textures once here
        this.generateBallColors();
    }

    create() {
        this.scene.start("game-engine");
    }

    generateBallColors() {
        COLORS.forEach((color) => {
            const graphics = this.add.graphics();

            // Outer glow
            graphics.fillStyle(color.hex, 0.2);
            graphics.fillCircle(17.5, 17.5, 18);

            // Main ball
            graphics.fillStyle(color.hex, 1);
            graphics.fillCircle(17.5, 17.5, 16);

            // Highlight
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(14, 13, 5);

            // Save texture
            graphics.generateTexture(`ball_${color.name}`, 35, 35);
            graphics.destroy();
        });
    }
}

export default GameBoot;
