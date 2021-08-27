export const getExitTiles = (room: string) => {
    const terrain = Game.map.getRoomTerrain(room);
    const tiles: RoomPosition[] = [];

    for (let x = 0; x < 50; x += 1) {
        if (terrain.get(x, 0) !== TERRAIN_MASK_WALL) {
            tiles.push(new RoomPosition(x, 0, room));
        }
        if (terrain.get(x, 49) !== TERRAIN_MASK_WALL) {
            tiles.push(new RoomPosition(x, 49, room));
        }
    }
    for (let y = 1; y < 49; y += 1) {
        if (terrain.get(0, y) !== TERRAIN_MASK_WALL) {
            tiles.push(new RoomPosition(0, y, room));
        }
        if (terrain.get(49, y) !== TERRAIN_MASK_WALL) {
            tiles.push(new RoomPosition(49, y, room));
        }
    }

    return tiles;
}
