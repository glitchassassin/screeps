import { BoardroomManager } from "Boardroom/BoardroomManager";
import { ConstructionSites } from "WorldState/ConstructionSites";
import { Memoize } from "typescript-memoize";
import { Structures } from "WorldState/Structures";

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
    @Memoize((pos: RoomPosition, proximity: number) => (`[${pos.x}, ${pos.y}: ${pos.roomName}]x${proximity}`))
    calculateNearbyPositions(pos: RoomPosition, proximity: number, includeCenter = false) {
        let adjacent: RoomPosition[] = [];
        adjacent = this.calculateAdjacencyMatrix(proximity)
            .map(offset => {
                try {
                    return new RoomPosition(pos.x + offset.x, pos.y + offset.y, pos.roomName)
                }
                catch {
                    return null;
                }
            })
            .filter(roomPos => roomPos !== null) as RoomPosition[]
        if (includeCenter) adjacent.push(pos);
        return adjacent;
    }
    @Memoize((roomName: string, proximity: number) => (`${roomName} ${proximity}`))
    calculateNearbyRooms(roomName: string, proximity: number, includeCenter = false) {
        let {wx, wy} = this.roomNameToCoords(roomName)
        let roomStatus = Game.map.getRoomStatus(roomName);
        let adjacent = this.calculateAdjacencyMatrix(proximity)
            .map(offset => {
                try {
                    return this.roomNameFromCoords(wx + offset.x, wy + offset.y);
                }
                catch {
                    return null;
                }
            })
            .filter(n => {
                if (n === null) return false;
                try {
                    let status = Game.map.getRoomStatus(n);
                    if (roomStatus === roomStatus || status.status === 'normal') {
                        return true;
                    }
                    return false;
                } catch {
                    return false;
                }
            }) as string[];
        if (includeCenter) adjacent.push(roomName);
        return adjacent;
    }
    @Memoize((pos: RoomPosition) => (`${pos.roomName}[${pos.x}, ${pos.y}]${Game.time}`))
    isPositionWalkable(pos: RoomPosition, ignoreCreeps: boolean = false) {
        let terrain;
        try {
            terrain = Game.map.getRoomTerrain(pos.roomName);
        } catch {
            // Invalid room
            return false;
        }
        if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
            return false;
        }
        if (Game.rooms[pos.roomName] && pos.look().some(obj => {
            if (ignoreCreeps && obj.type === LOOK_CREEPS) return false;
            return (OBSTACLE_OBJECT_TYPES as string[]).includes(obj.type)
        })) {
            return false;
        }
        return true;
    }
    @Memoize((roomName: string, avoidCreeps: boolean = false) => (`${roomName} ${avoidCreeps ? 'Y' : 'N'} ${Game.time}`))
    getCostMatrix(roomName: string, avoidCreeps: boolean = false) {
        let room = Game.rooms[roomName];
        let costs = new PathFinder.CostMatrix;

        if (!room) return costs;

        for (let struct of Structures.byRoom(roomName)) {
          if (struct.structureType === STRUCTURE_ROAD) {
            // Favor roads over plain tiles
            costs.set(struct.pos.x, struct.pos.y, 1);
          } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                     (struct.structureType !== STRUCTURE_RAMPART ||
                      !("my" in struct && struct.my))) {
            // Can't walk through non-walkable buildings
            costs.set(struct.pos.x, struct.pos.y, 0xff);
          }
        }

        for (let struct of ConstructionSites.byRoom(roomName)) {
            if (struct.structureType !== STRUCTURE_ROAD &&
                struct.structureType !== STRUCTURE_CONTAINER &&
                struct.structureType !== STRUCTURE_RAMPART) {
              // Can't walk through non-walkable construction sites
              costs.set(struct.pos.x, struct.pos.y, 0xff);
            }
        }

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

        // Calculate global positions
        let fromGlobal = this.globalPosition(from);
        let toGlobal = this.globalPosition(to);

        return Math.max( Math.abs((fromGlobal.x-toGlobal.x)), Math.abs((fromGlobal.y-toGlobal.y)) );
    }
    globalPosition(pos: RoomPosition) {
        let {x,y,roomName} = pos;
        if(!_.inRange(x, 0, 50)) throw new RangeError('x value ' + x + ' not in range');
        if(!_.inRange(y, 0, 50)) throw new RangeError('y value ' + y + ' not in range');
        if(roomName == 'sim') throw new RangeError('Sim room does not have world position');
        let {wx, wy} = this.roomNameToCoords(roomName);
        return {
            x: (50*Number(wx))+x,
            y: (50*Number(wy))+y
        };
    }
    isHighway(roomName: string) {
        let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
        if (!parsed) throw new Error('Invalid room name')
		return (Number(parsed[1]) % 10 === 0) || (Number(parsed[2]) % 10 === 0);
    }
    roomNameToCoords(roomName: string) {
        let match = roomName.match(/^([WE])([0-9]+)([NS])([0-9]+)$/);
        if (!match) throw new Error('Invalid room name')
        let [,h,wx,v,wy] = match
        return {
            wx: (h == 'W') ? Number(wx) : ~Number(wx),
            wy: (v == 'S') ? Number(wy) : ~Number(wy)
        }
    }
    roomNameFromCoords(x: number, y: number) {
        let h = (x < 0) ? 'E' : 'W';
        let v = (y < 0) ? 'N' : 'S';
        x = (x < 0) ? ~x : x;
        y = (y < 0) ? ~y : y;
        return `${h}${x}${v}${y}`
    }
}
