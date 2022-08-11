import { moveTo } from 'Behaviors/moveTo';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { scheduleSpawn } from 'Minions/spawnQueues';
import { createMission, Mission, MissionType } from 'Missions/Mission';
import { getClosestByRange } from 'Selectors/Map/MapCoordinates';
import { minionCost } from 'Selectors/minionCostPerTick';
import { rcl } from 'Selectors/rcl';
import { getSpawns } from 'Selectors/roomPlans';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { packPos, unpackPos } from 'utils/packrat';
import { MissionImplementation } from './MissionImplementation';

export interface RefillMission extends Mission<MissionType.REFILL> {
  data: {
    refillSquare: string;
  };
}

export function createRefillMission(office: string, position: RoomPosition): RefillMission {
  const mobile = getSpawns(office).length !== 3;
  const body = MinionBuilders[MinionTypes.CLERK](
    spawnEnergyAvailable(office),
    (SPAWN_ENERGY_CAPACITY + EXTENSION_ENERGY_CAPACITY[rcl(office)]) / CARRY_CAPACITY,
    mobile
  );
  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(body)
  };

  return createMission({
    office,
    priority: 16,
    type: MissionType.REFILL,
    data: {
      carryCapacity: body.filter(p => p === CARRY).length * CARRY_CAPACITY,
      refillSquare: packPos(position)
    },
    estimate
  });
}

export class Refill extends MissionImplementation {
  static spawn(mission: RefillMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    // Set name
    const name = `REFILL-${mission.office}-${mission.id}`;
    const mobile = getSpawns(mission.office).length !== 3;
    const body = MinionBuilders[MinionTypes.CLERK](
      spawnEnergyAvailable(mission.office),
      (SPAWN_ENERGY_CAPACITY + EXTENSION_ENERGY_CAPACITY[rcl(mission.office)]) / CARRY_CAPACITY,
      mobile
    );

    const position = unpackPos(mission.data.refillSquare);
    const preferredSpawn = getClosestByRange(position, getSpawns(mission.office));
    const preferredDirections =
      preferredSpawn?.pos.getRangeTo(position) === 1 ? [preferredSpawn.pos.getDirectionTo(position)] : undefined;

    scheduleSpawn(
      mission.office,
      mission.priority,
      {
        name,
        body
      },
      undefined,
      {
        spawn: preferredSpawn?.id,
        directions: preferredDirections
      }
    );

    mission.creepNames.push(name);
  }

  static minionLogic(mission: RefillMission, creep: Creep): void {
    const target = unpackPos(mission.data.refillSquare);
    moveTo(creep, { pos: target, range: 0 }, { ignoreFastfiller: true }); // even if already there, this will prevent shoving
    if (!creep.pos.isEqualTo(target)) {
      return;
    }

    if (creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
      // Look for source
      const sources = creep.pos.findInRange(FIND_STRUCTURES, 1).filter(s => 'store' in s && s.store[RESOURCE_ENERGY]);
      const source = (sources.find(s => s.structureType === STRUCTURE_LINK) ??
        sources.find(s => s.structureType === STRUCTURE_CONTAINER)) as StructureContainer | StructureLink | undefined;
      if (source) {
        creep.withdraw(source, RESOURCE_ENERGY);
        source.store[RESOURCE_ENERGY] = Math.max(
          0,
          source.store[RESOURCE_ENERGY] - creep.store.getFreeCapacity(RESOURCE_ENERGY)
        );
      }
    }

    if (creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
      const destination = creep.pos
        .findInRange(FIND_STRUCTURES, 1)
        .find(
          s =>
            (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
            s.store[RESOURCE_ENERGY] < s.store.getCapacity(RESOURCE_ENERGY)
        ) as StructureSpawn | StructureExtension | undefined;
      if (destination) {
        creep.transfer(destination, RESOURCE_ENERGY);
        destination.store[RESOURCE_ENERGY] = Math.min(
          destination.store.getCapacity(RESOURCE_ENERGY),
          destination.store[RESOURCE_ENERGY] + creep.store.getFreeCapacity(RESOURCE_ENERGY)
        );
      }
    }
  }
}
