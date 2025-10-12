const INSTANCES = {
    GAME: {
        WIDTH: 390,
        HEIGHT: 460,
    },
    CONFIG: {
        RADIUS: 17,
        H_SPACING: 34,
        V_SPACING: Math.sqrt(3) * 17,
        COLS: 11,
        OFFSET_Y: 40, // top margin
    },
    COLORS: [
        { name: "red", hex: 0xff6b6b, css: "#E74C3C", score: 10 },
        { name: "yellow", hex: 0xf9ca24, css: "#F1C40F", score: 15 },
        { name: "blue", hex: 0x4ecdc4, css: "#3498DB", score: 20 },
        { name: "green", hex: 0x45b7d1, css: "#2ECC71", score: 25 },
    ],
};

export const { GAME, CONFIG, COLORS } = INSTANCES;
export const { WIDTH, HEIGHT } = GAME;
export const { RADIUS, H_SPACING, V_SPACING, COLS, ROWS, OFFSET_Y } = CONFIG;
export const GameRegistry = {
    scene: null, // active scene
    game: null, // Phaser.Game instance (optional)
};
