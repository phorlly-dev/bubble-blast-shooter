const INSTANCES = {
    GAME: {
        WIDTH: 390,
        HEIGHT: 460,
    },
    TILES: {
        RADIUS: 17,
        COLS: 10,
        ROWS: 8,
        OFFSET_X: 40,
        OFFSET_Y: 40,
    },
    COLORS: [
        { name: "blue", hex: 0x4eccd4, css: "#3498DB", score: 10 },
        { name: "yellow", hex: 0xf9ca24, css: "#F1C40F", score: 20 },
        { name: "red", hex: 0xff6b6b, css: "#E74C3C", score: 30 },
        { name: "green", hex: 0x45b7d1, css: "#2ECC71", score: 40 },
        { name: "orange", hex: 0xfd7a0f, css: "#E67E22", score: 35 },
        { name: "purple", hex: 0x9b59b6, css: "#9B59B6", score: 45 },
    ],
};

export const GameRegistry = {
    scene: null, // active scene
    game: null, // Phaser.Game instance (optional)
};
export const { GAME, TILES, COLORS } = INSTANCES;
export const { WIDTH, HEIGHT } = GAME;
export const { RADIUS, COLS, ROWS, OFFSET_X, OFFSET_Y } = TILES;
