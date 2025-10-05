import { COLORS } from "../consts";

class GameBoot extends Phaser.Scene {
    constructor() {
        super("game-boot");
    }

    preload() {
        this.load.setPath("assets/images/");
        this.load.image("background", "bg.png");
        this.load.image("swap_icon", "refresh.png");

        this.load.setPath("assets/sounds/");
        this.load.audio("click", "click.wav");
        this.load.audio("walk", "walk.ogg");
        this.load.audio("win", "win.wav");

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

            //Effect
            const grap = this.add.graphics();
            grap.fillStyle(color.hex, 1);
            grap.fillCircle(8, 8, 8);
            grap.generateTexture(`particle_${color.name}`, 16, 16);
            grap.destroy();
        });
    }
}

export default GameBoot;
