const Formats = {
    formatNumber(num) {
        return new Intl.NumberFormat("en", { notation: "compact" }).format(num);
    },
    formatName(name) {
        return name
            .trim() // remove leading/trailing spaces
            .toLowerCase() // make lowercase
            .replace(/\s+/g, "-"); // replace spaces with "-"
    },
    formatPlayer(player) {
        return player.length > 12 ? player.slice(0, 12) + "..." : player;
    },
};

export const { formatNumber, formatName, formatPlayer } = Formats;
