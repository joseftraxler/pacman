// ---- Směry pohybu po mřížce ----
export const DIRS = {
    left: {dx: -1, dy: 0},
    right: {dx: 1, dy: 0},
    up: {dx: 0, dy: -1},
    down: {dx: 0, dy: 1},
};

export const ALL_DIRS = [DIRS.left, DIRS.right, DIRS.up, DIRS.down];

// Jsou směry a a b navzájem opačné?
export function isReverse(a, b) {
    return a.dx === -b.dx && a.dy === -b.dy;
}
