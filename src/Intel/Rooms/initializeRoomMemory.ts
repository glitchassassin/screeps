import { calculateThreatLevel } from 'Selectors/Combat/threatAnalysis';
import { roomIsEligibleForOffice } from 'Selectors/roomIsEligibleForOffice';
import { packPos } from 'utils/packrat';
import { recalculateTerritoryOffices } from '../Territories/recalculateTerritoryOffices';

export function initializeRoomMemory(room: string) {
  const controllerId = Game.rooms[room].controller?.id;
  if (Game.rooms[room].controller) {
    Memory.positions[Game.rooms[room].controller!.id] = packPos(Game.rooms[room].controller!.pos);
  }
  const sourceIds = Game.rooms[room].find(FIND_SOURCES).map(s => {
    Memory.positions[s.id] = packPos(s.pos);
    return s.id;
  });
  const { mineralId, mineralType } =
    Game.rooms[room].find(FIND_MINERALS).map(m => {
      Memory.positions[m.id] = packPos(m.pos);
      return { mineralId: m.id, mineralType: m.mineralType };
    })[0] ?? {};
  const eligibleForOffice = roomIsEligibleForOffice(room);

  Memory.rooms[room] = {
    controllerId,
    sourceIds,
    mineralId,
    mineralType,
    eligibleForOffice,
    officesInRange: '',
    franchises: {},
    threatLevel: calculateThreatLevel(room)
  };

  // Calculate nearby offices and assign
  recalculateTerritoryOffices(room);
}
