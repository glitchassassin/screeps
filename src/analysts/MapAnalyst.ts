import { Analyst } from "./Analyst";

export class MapAnalyst extends Analyst {
    calculateAdjacencyMatrix = (proximity=1) => {
        let adjacencies = [...(new Array(proximity * 2 + 1))].map((v, i) => i - proximity)
        return adjacencies.map(
            (x, i) => adjacencies.map( y => ({x, y}))
        ).flat(1).filter(a => !(a.x === 0 && a.y === 0));
    }
    calculateAdjacentPositions = (pos: RoomPosition) => {
        return this.calculateNearbyPositions(pos, 1);
    }
    calculateNearbyPositions = (pos: RoomPosition, proximity: number) => {
        let adjacent: RoomPosition[] = [];
        adjacent = this.calculateAdjacencyMatrix(proximity)
            .map(offset => Game.rooms[pos.roomName].getPositionAt(pos.x + offset.x, pos.y + offset.y))
            .filter(roomPos => roomPos !== null) as RoomPosition[]
        return adjacent;
    }
    isPositionWalkable = (pos: RoomPosition) => {
        let terrain = Game.map.getRoomTerrain(pos.roomName);
        if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
            return false;
        }
        if (pos.look().some(obj => (OBSTACLE_OBJECT_TYPES as string[]).includes(obj.type))) {
            return false;
        }
        return true;
    }
}
