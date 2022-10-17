import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { createSpawnOrder, SpawnOrder } from 'Minions/spawnQueues';
import { createMission, Mission, MissionType } from 'Missions/Mission';
import { moveTo } from 'screeps-cartographer';
import { getClosestByRange } from 'Selectors/Map/MapCoordinates';
import { defaultRoomCallback } from 'Selectors/Map/Pathing';
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

export function createRefillOrder(office: string, position: RoomPosition): SpawnOrder {
  const mobile = getSpawns(office).length !== 3;
  const body = MinionBuilders[MinionTypes.CLERK](
    spawnEnergyAvailable(office),
    (SPAWN_ENERGY_CAPACITY + EXTENSION_ENERGY_CAPACITY[rcl(office)]) / CARRY_CAPACITY,
    mobile
  );
  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: 0
  };

  const mission = createMission({
    office,
    priority: 16,
    type: MissionType.REFILL,
    data: {
      carryCapacity: body.filter(p => p === CARRY).length * CARRY_CAPACITY,
      refillSquare: packPos(position)
    },
    estimate
  });

  // Set name
  const name = `REFILL-${mission.office}-${mission.id}`;
  const preferredSpawn = getClosestByRange(position, getSpawns(mission.office));
  const preferredDirections =
    preferredSpawn?.pos.getRangeTo(position) === 1 ? [preferredSpawn.pos.getDirectionTo(position)] : undefined;

  return createSpawnOrder(
    mission,
    {
      name,
      body
    },
    {
      spawn: preferredSpawn?.id,
      directions: preferredDirections
    }
  );
}

export class Refill extends MissionImplementation {
  static run(mission: RefillMission, creep?: Creep) {
    // clear the space if needed
    const target = unpackPos(mission.data.refillSquare);
    const existing = target.lookFor(LOOK_CREEPS)[0];
    if (creep?.spawning && existing?.name.startsWith('REFILL')) {
      existing.suicide();
    }
    super.run(mission, creep);
  }

  static minionLogic(mission: RefillMission, creep: Creep): void {
    const target = unpackPos(mission.data.refillSquare);
    moveTo(creep, { pos: target, range: 0 }, { roomCallback: defaultRoomCallback({ ignoreFastfiller: true }) }); // even if already there, this will prevent shoving
    if (!creep.pos.isEqualTo(target)) {
      if (creep.pos.isNearTo(target)) {
        const existing = target.lookFor(LOOK_CREEPS)[0];
        // old creep still surviving - clear it out to make space for this one
        if (existing?.name.startsWith('REFILL')) existing.suicide();
      }
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
