import { BoardroomManager } from "Boardroom/BoardroomManager";
import { Memoize } from "typescript-memoize";

let flatMap = (arr: any[], f: (x: any, i: number) => any) => {
    return [].concat(...arr.map(f))
}

export class MapAnalyst extends BoardroomManager {
    @Memoize((proximity: number) => ('' + proximity))
    calculateAdjacencyMatrix(proximity=1): {x: number, y: number}[] {
        let adjacencies = [...(new Array(proximity * 2 + 1))].map((v, i) => i - proximity)
        return flatMap(adjacencies, (x, i) => adjacencies.map( y => ({x, y})))
            .filter((a: {x: number, y: number}) => !(a.x === 0 && a.y === 0));
    }
    @Memoize((pos: RoomPosition) => (`[${pos.x}, ${pos.y}]`))
    calculateAdjacentPositions(pos: RoomPosition) {
        return this.calculateNearbyPositions(pos, 1);
    }
    @Memoize((pos: RoomPosition, proximity: number) => (`[${pos.x}, ${pos.y}]x${proximity}`))
    calculateNearbyPositions(pos: RoomPosition, proximity: number) {
        let adjacent: RoomPosition[] = [];
        adjacent = this.calculateAdjacencyMatrix(proximity)
            .map(offset => new RoomPosition(pos.x + offset.x, pos.y + offset.y, pos.roomName))
            .filter(roomPos => roomPos !== null) as RoomPosition[]
        return adjacent;
    }
    @Memoize((pos: RoomPosition) => (`${pos.roomName}[${pos.x}, ${pos.y}]${Game.time}`))
    isPositionWalkable(pos: RoomPosition) {
        let terrain = Game.map.getRoomTerrain(pos.roomName);
        if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
            return false;
        }
        if (Game.rooms[pos.roomName] && pos.look().some(obj => (OBSTACLE_OBJECT_TYPES as string[]).includes(obj.type))) {
            return false;
        }
        return true;
    }
}
