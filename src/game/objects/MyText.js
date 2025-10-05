import * as Phaser from "phaser";
class MyText extends Phaser.GameObjects.Text {
    constructor(scene, x, y, text, style) {
        super(scene, x, y, text, style);
        this.setOrigin(0.5);
        this.scene.add.existing(this);
    }
}

export default MyText;
