import { BoardroomManager } from "Boardroom/BoardroomManager";
import { MustHaveEnergyFromSource } from "TaskRequests/prereqs/MustHaveEnergyFromSource";
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
    @Memoize((roomName: string, avoidCreeps: boolean = false) => (`${roomName} ${avoidCreeps ? 'Y' : 'N'} ${Game.time}`))
    getCostMatrix(roomName: string, avoidCreeps: boolean = false) {
        let room = Game.rooms[roomName];
        let costs = new PathFinder.CostMatrix;

        if (!room) return costs;

        room.find(FIND_STRUCTURES).forEach(function(struct) {
          if (struct.structureType === STRUCTURE_ROAD) {
            // Favor roads over plain tiles
            costs.set(struct.pos.x, struct.pos.y, 1);
          } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                     (struct.structureType !== STRUCTURE_RAMPART ||
                      !struct.my)) {
            // Can't walk through non-walkable buildings
            costs.set(struct.pos.x, struct.pos.y, 0xff);
          }
        });

        // Avoid creeps in the room
        if (avoidCreeps) {
            room.find(FIND_CREEPS).forEach(function(creep) {
                costs.set(creep.pos.x, creep.pos.y, 0xff);
              });
        }

        return costs;
    }
    getRangeTo(from: RoomPosition, to: RoomPosition) {
        if (from.roomName === to.roomName) return from.getRangeTo(to);

        return Game.map.getRoomLinearDistance(from.roomName, to.roomName) * 50;
    }
}
