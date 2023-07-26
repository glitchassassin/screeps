import { ScannedRoomEvent } from 'Intel/events';
import { calculateThreatLevel } from 'Selectors/Combat/threatAnalysis';
import { roomIsEligibleForOffice } from 'Selectors/roomIsEligibleForOffice';
import { packPos } from 'utils/packrat';

import { ThreatLevel } from 'Selectors/Combat/threatAnalysis';

declare global {
  interface RoomMemory {
    scanned?: number;
    controllerId?: Id<StructureController>;
    sourceIds?: Id<Source>[];
    mineralId?: Id<Mineral>;
    mineralType?: MineralConstant;
    rcl?: number;
    owner?: string;
    reserver?: string;
    reservation?: number;
    rclMilestones?: Record<number, number>;
    eligibleForOffice?: boolean;
    lastHostileSeen?: number;
    lastAcquireAttempt?: number;
    acquireAttempts?: number;
    invaderCore?: number;
    plunder?: {
      office: string;
      distance: number;
      capacity: number;
      resources: ResourceConstant[];
      scanned: number;
    };
    office?: string;
    officesInRange: string;
    threatLevel?: [ThreatLevel, number];
    safeModeCooldown?: number;
    safeModeEnds?: number;
  }
  interface Memory {
    positions: Record<string, string>;
  }
}

export const initializeRoomMemory = ({ room }: ScannedRoomEvent) => {
  if (Memory.rooms[room]?.eligibleForOffice !== undefined) return;

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
    threatLevel: calculateThreatLevel(room),
    safeModeCooldown: Game.rooms[room].controller?.safeModeCooldown ? Game.time + Game.rooms[room].controller!.safeModeCooldown! : undefined,
    safeModeEnds: Game.rooms[room].controller?.safeMode ? Game.time + Game.rooms[room].controller!.safeMode! : undefined
  };
};
