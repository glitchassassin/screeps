import { ScannedRoomEvent } from 'Intel/events';
import { resourcesToPlunder } from 'Selectors/Combat/shouldPlunder';
import { calculateThreatLevel, ThreatLevel } from 'Selectors/Combat/threatAnalysis';
import { getRoomPathDistance } from 'Selectors/Map/getRoomPathDistance';
import { getClosestOffice } from 'Selectors/Map/MapCoordinates';

export const refreshRoomMemory = ({ room }: ScannedRoomEvent) => {
  Memory.rooms[room].rcl = Game.rooms[room].controller?.level;
  Memory.rooms[room].owner = Game.rooms[room].controller?.owner?.username;
  Memory.rooms[room].reserver = Game.rooms[room].controller?.reservation?.username;
  Memory.rooms[room].reservation = Game.rooms[room].controller?.reservation?.ticksToEnd;
  Memory.rooms[room].scanned = Game.time;

  const threatLevel = calculateThreatLevel(room);
  Memory.rooms[room].threatLevel = threatLevel;

  if (threatLevel[1]) Memory.rooms[room].lastHostileSeen = Game.time;
  if (
    Game.rooms[room].find(FIND_HOSTILE_STRUCTURES, { filter: s => s.structureType === STRUCTURE_INVADER_CORE }).length >
    0
  ) {
    Memory.rooms[room].invaderCore = Game.time;
  } else {
    delete Memory.rooms[room].invaderCore;
  }

  if ((Memory.rooms[room].plunder?.scanned ?? 0) + 500 < Game.time) {
    // If room is unowned and has resources, let's loot it!
    if (![ThreatLevel.OWNED, ThreatLevel.FRIENDLY].includes(threatLevel[0])) {
      // select plundering office
      const office = getClosestOffice(room, 6);
      const pathDistance = office ? getRoomPathDistance(office, room) : undefined;
      if (office && pathDistance) {
        // check loot structures for resources
        const lootStructures = Game.rooms[room].find(FIND_HOSTILE_STRUCTURES, {
          filter: s => 'store' in s && Object.keys(s.store).length
        }) as AnyStoreStructure[];
        const resources = new Map<ResourceConstant, number>();
        lootStructures.forEach(s => {
          for (const resource in s.store) {
            const amount = s.store.getUsedCapacity(resource as ResourceConstant) ?? 0;
            resources.set(resource as ResourceConstant, (resources.get(resource as ResourceConstant) ?? 0) + amount);
          }
        });

        // ignore small amounts of any resources
        let capacity = 0;
        for (const [resource, amount] of resources) {
          if (amount < CARRY_CAPACITY) {
            resources.delete(resource);
          } else {
            capacity += amount;
          }
        }

        const distance = pathDistance * 50;

        // cache results
        Memory.rooms[room].plunder = {
          office,
          distance,
          capacity,
          resources: resourcesToPlunder(distance, [...resources.keys()]),
          scanned: Game.time
        };
      }
    }
  }
};
