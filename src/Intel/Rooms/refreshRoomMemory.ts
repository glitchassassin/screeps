import { calculateThreatLevel, ThreatLevel } from 'Selectors/Combat/threatAnalysis';

export function refreshRoomMemory(room: string) {
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
  // If room is unowned and has resources, let's loot it!
  if (![ThreatLevel.OWNED, ThreatLevel.FRIENDLY].includes(threatLevel[0])) {
    const lootStructures = Game.rooms[room].find(FIND_HOSTILE_STRUCTURES, {
      filter: s => 'store' in s && Object.keys(s.store).length
    }) as AnyStoreStructure[];

    Memory.rooms[room].lootEnergy = 0;
    Memory.rooms[room].lootResources = 0;

    lootStructures.forEach(s => {
      Memory.rooms[room].lootEnergy! += s.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0;
      Memory.rooms[room].lootResources! +=
        (s.store.getUsedCapacity() ?? 0) - (s.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0);
    });
  }
}
