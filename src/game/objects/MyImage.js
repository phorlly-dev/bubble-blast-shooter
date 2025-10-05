class MyImage extends Phaser.GameObjects.Image {
    constructor(scene, x, y, texture, frame = null) {
        super(scene, x, y, texture, frame);
        this.scene.add.existing(this);
    }
}

export default MyImage;
