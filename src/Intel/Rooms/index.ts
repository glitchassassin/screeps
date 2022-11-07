import { MINERALS } from 'gameConstants';
import { initializeOfficeMemory } from 'Intel/Rooms/initializeOfficeMemory';
import { initializeRoomMemory } from 'Intel/Rooms/initializeRoomMemory';
import { purgeDeadOffices } from 'Intel/Rooms/purgeDeadOffices';
import { refreshRoomMemory } from 'Intel/Rooms/refreshRoomMemory';
import { scanTerritories } from 'Intel/Territories';
import { recalculateTerritoryOffices } from 'Intel/Territories/recalculateTerritoryOffices';
import { scanRoomPlanStructures } from 'RoomPlanner/scanRoomPlanStructures';
import { ThreatLevel } from 'Selectors/Combat/threatAnalysis';
import { ownedMinerals } from 'Selectors/ownedMinerals';
import { roomPlans } from 'Selectors/roomPlans';
import { evaluatePowerBanks } from 'Strategy/ResourceAnalysis/PowerBank';
import profiler from 'utils/profiler';

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
    franchises: Record<
      string,
      Record<
        Id<Source>,
        {
          lastActive?: number;
          scores: number[];
        }
      >
    >;
    threatLevel?: [ThreatLevel, number];
  }
  interface Memory {
    positions: Record<string, string>;
  }
}

export const scanRooms = profiler.registerFN(() => {
  Memory.positions ??= {};
  Memory.rooms ??= {};

  // Purge dead offices
  purgeDeadOffices();

  for (let room in Game.rooms) {
    // Only need to store this once
    if (Memory.rooms[room]?.eligibleForOffice === undefined) {
      initializeRoomMemory(room);
    }

    // Recalculate territory paths when room planning is complete
    if (
      room in Memory.offices &&
      roomPlans(room)?.headquarters &&
      Object.keys(Memory.rooms[room].franchises[room] ?? {}).length === 0
    ) {
      console.log('Recalculating internal franchise paths for office', room);
      Memory.rooms[room].officesInRange = '';
      recalculateTerritoryOffices(room);
    }

    // Refresh this when visible
    refreshRoomMemory(room);

    // Assign office, if necessary
    Memory.offices ??= {};
    if (Game.rooms[room].controller?.my) {
      Memory.rooms[room].rclMilestones ??= {};
      Memory.rooms[room].rclMilestones![Game.rooms[room].controller!.level] ??= Game.time;

      if (!Memory.offices[room]) {
        initializeOfficeMemory(room);
      }

      // Temporary quotas for minerals
      for (let m of ownedMinerals()) {
        Memory.offices[room].resourceQuotas[m as ResourceConstant] = 3000;
      }
      for (let o of Memory.offices[room].lab.orders) {
        if (MINERALS.includes(o.ingredient1)) {
          Memory.offices[room].resourceQuotas[o.ingredient1] = 3000;
        }
        if (MINERALS.includes(o.ingredient2)) {
          Memory.offices[room].resourceQuotas[o.ingredient2] = 3000;
        }
      }
      scanRoomPlanStructures(room);
    }

    // collect intel
    evaluatePowerBanks(room);
  }

  scanTerritories();
}, 'scanRooms');
