import { Analyst } from "./Analyst";

const adjacencyMatrix = [
    {x: -1, y: -1},
    {x: 0, y: -1},
    {x: 1, y: -1},
    {x: -1, y: 0},
    {x: 1, y: 0},
    {x: -1, y: 1},
    {x: 0, y: 1},
    {x: 1, y: 1},
]

export class MapAnalyst extends Analyst {
    calculateAdjacentPositions = (pos: RoomPosition) => {
        let adjacent: RoomPosition[] = [];
        adjacent = adjacencyMatrix
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
