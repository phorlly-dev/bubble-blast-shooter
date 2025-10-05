import * as Phaser from "phaser";
class MySprite extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture, frame = null) {
        super(scene, x, y, texture, frame);
        this.scene.add.existing(this);
    }
}

export default MySprite;
