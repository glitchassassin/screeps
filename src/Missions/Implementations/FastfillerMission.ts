import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { CreepSpawner } from 'Missions/BaseClasses/CreepSpawner/CreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { moveTo } from 'screeps-cartographer';
import { defaultRoomCallback } from 'Selectors/Map/Pathing';
import { rcl } from 'Selectors/rcl';
import { getSpawns } from 'Selectors/roomPlans';
import { unpackPos } from 'utils/packrat';

export interface FastfillerMissionData extends BaseMissionData {
  refillSquares: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
  };
}

const fastfillerSpawner = (office: string) =>
  new CreepSpawner('x', office, {
    role: MinionTypes.CLERK,
    budget: Budget.SURPLUS,
    body: energy =>
      MinionBuilders[MinionTypes.CLERK](
        energy,
        (SPAWN_ENERGY_CAPACITY + EXTENSION_ENERGY_CAPACITY[rcl(office)]) / CARRY_CAPACITY,
        getSpawns(office).length !== 3
      ),
    respawn: () => true
  });

export class FastfillerMission extends MissionImplementation {
  public creeps = {
    topLeft: fastfillerSpawner(this.missionData.office),
    topRight: fastfillerSpawner(this.missionData.office),
    bottomLeft: fastfillerSpawner(this.missionData.office),
    bottomRight: fastfillerSpawner(this.missionData.office)
  };

  priority = 15;

  constructor(public missionData: FastfillerMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: FastfillerMission['id']) {
    return new this(Memory.missions[id].data, id);
  }

  run(
    creeps: ResolvedCreeps<FastfillerMission>,
    missions: ResolvedMissions<FastfillerMission>,
    data: FastfillerMissionData
  ) {
    const { topLeft, topRight, bottomLeft, bottomRight } = creeps;
    const positions = [
      { creep: topLeft, pos: unpackPos(data.refillSquares.topLeft) },
      { creep: topRight, pos: unpackPos(data.refillSquares.topRight) },
      { creep: bottomLeft, pos: unpackPos(data.refillSquares.bottomLeft) },
      { creep: bottomRight, pos: unpackPos(data.refillSquares.bottomRight) }
    ];

    for (const { creep, pos } of positions) {
      if (!creep) continue;
      if (creep) moveTo(creep, { pos, range: 0 }, { roomCallback: defaultRoomCallback({ ignoreFastfiller: true }) }); // even if already there, this will prevent shoving
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
}
