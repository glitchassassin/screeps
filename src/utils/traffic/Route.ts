import { calculateNearbyPositions, getCostMatrix, isPositionWalkable, terrainCosts } from "Selectors/Map/MapCoordinates";
import { getTerritoryIntent, TerritoryIntent } from "Selectors/territoryIntent";

export class Route {
  lastPos?: RoomPosition;
  path?: RoomPosition[];
  pathRoom?: string;
  rooms: string[] = [];
  stuckForTicks: number = 0;
  recalculatedPath: number = 0;

  constructor(
      creep: Creep,
      public pos: RoomPosition,
      public range: number = 1
  ) {
      this.calculateRoute(creep);
      this.calculatePathToRoom(creep);
  }

  calculateRoute(creep: Creep) {
      this.rooms = [creep.pos.roomName];
      if (creep.pos.roomName !== this.pos.roomName) {
          let roomsRoute = Game.map.findRoute(
              creep.pos.roomName,
              this.pos.roomName,
              {
                  routeCallback: (roomName) => {
                      if (
                          roomName !== this.pos.roomName &&
                          roomName !== creep.pos.roomName &&
                          getTerritoryIntent(roomName) === TerritoryIntent.AVOID
                      ) return Infinity;
                      return 1;
                  }
              }
          )
          if (roomsRoute === ERR_NO_PATH) throw new Error(`No valid room path ${creep.pos.roomName} - ${this.pos.roomName}`);
          this.rooms = this.rooms.concat(roomsRoute.map(r => r.room));
          this.pathRoom = this.rooms[1];
      }
  }

  calculatePathToRoom(creep: Creep, avoidCreeps = false, recalculated = false) {
      const nextRoom = this.rooms[this.rooms.indexOf(creep.room.name) + 1];
      if (!nextRoom) {
          // We are in the target room
          let positionsInRange = calculateNearbyPositions(this.pos, this.range, true)
                                       .filter(pos =>
                                          isPositionWalkable(pos, true) &&
                                          pos.x > 0 && pos.x < 49 &&
                                          pos.y > 0 && pos.y < 49
                                      );
          // console.log(creep.name, `calculatePath: ${positionsInRange.length} squares in range ${this.range} of ${this.pos}`);
          if (positionsInRange.length === 0) throw new Error('No valid targets for path');
          this.calculatePath(creep, positionsInRange, avoidCreeps);
          return;
      }
      const exit = creep.room.findExitTo(nextRoom);
      if (exit === ERR_NO_PATH || exit === ERR_INVALID_ARGS) {
          if (!recalculated) {
              this.calculateRoute(creep);
              this.calculatePathToRoom(creep, avoidCreeps, true)
              return;
          } else {
              throw new Error('Unable to follow route')
          }
      }
      this.pathRoom = nextRoom;
      this.calculatePath(creep, creep.room.find(exit), avoidCreeps);
  }

  calculatePath(creep: Creep, positionsInRange: RoomPosition[], avoidCreeps = false) {
      let route = PathFinder.search(creep.pos, positionsInRange, {
          roomCallback: (room) => {
              if (!this.rooms?.includes(room)) return false;
              return getCostMatrix(room, avoidCreeps)
          },
          ...terrainCosts(creep),
          maxRooms: 1,
      })
      if (!route || route.incomplete) throw new Error(`Unable to plan route ${creep.pos} ${positionsInRange}`);

      this.path = route.path;
      this.lastPos = creep.pos;
  }

  run(creep: Creep) {
      if (creep.pos.inRangeTo(this.pos, this.range)) return OK;

      if (creep.pos.roomName === this.pathRoom) {
          this.calculatePathToRoom(creep);
      }

      if (this.recalculatedPath > 2 || !this.path) {
          return ERR_NO_PATH;
      }
      this.stuckForTicks = (this.lastPos && creep.pos.isEqualTo(this.lastPos)) ? this.stuckForTicks + 1 : 0;
      // log(creep.name, `Route.run: ${creep.pos} (was ${this.lastPos})`);
      if (this.stuckForTicks > 2) {
          // log(creep.name, `Route.run: stuck for ${this.stuckForTicks}, recalculating`);
          this.recalculatedPath += 1;
          this.calculatePathToRoom(creep, true);
          this.stuckForTicks = 0;
      }
      this.lastPos = creep.pos;
      let result = creep.moveByPath(this.path);
      if (result === ERR_TIRED) {
          this.stuckForTicks = 0;
          return OK;
      }
      return result;
  }
  visualize() {
      if (!this.path) return;
      let rooms = this.path.reduce((r, pos) => (r.includes(pos.roomName) ? r : [...r, pos.roomName]), [] as string[])
      if (rooms.length > 1) {
          Game.map.visual.poly(this.path, {lineStyle: 'dotted', stroke: '#fff'});
      }
      rooms.forEach(room => {
          // Technically this could cause weirdness if the road loops out of a room
          // and then back into it. If that happens, we'll just need to parse this
          // into segments a little more intelligently
          if (!this.path) return;
          new RoomVisual(room).poly(this.path.filter(pos => pos.roomName === room), {lineStyle: 'dotted', stroke: '#fff'});
      })
  }
}
