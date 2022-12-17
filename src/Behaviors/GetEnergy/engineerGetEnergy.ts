import { BehaviorResult } from 'Behaviors/Behavior';
import { HarvestMission } from 'Missions/Implementations/HarvestMission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { byId } from 'Selectors/byId';
import { getClosestByRange } from 'Selectors/Map/MapCoordinates';
import { posById } from 'Selectors/posById';
import { energySourcesByOffice } from './energySourcesByOffice';
import { fromDroppedResource } from './fromDroppedResource';
import { fromFranchise } from './fromFranchise';
import { fromSource } from './fromSource';
import { fromStorageStructure } from './fromStorageStructure';

declare global {
  interface CreepMemory {
    getEnergySource?: Id<Ruin | Source | Resource | AnyStoreStructure>;
  }
}

export const engineerGetEnergy = (
  creep: Creep,
  office: string,
  withdrawLimit = Game.rooms[office].energyCapacityAvailable,
  remote = false
) => {
  if (!creep.memory.getEnergySource) {
    const source = getClosestByRange(creep.pos, energySourcesByOffice(office, withdrawLimit, remote));
    if (!source) {
      return BehaviorResult.FAILURE;
    } else {
      creep.memory.getEnergySource = source.id;
    }
  }
  if (!creep.memory.getEnergySource) {
    return BehaviorResult.FAILURE;
  }

  const source = byId(creep.memory.getEnergySource);

  if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
    return BehaviorResult.SUCCESS;
  }

  if (!source || source instanceof Source) {
    // is a source or remote franchise with no visibility, or is gone
    if (!source && !posById(creep.memory.getEnergySource)) {
      // source is gone
      delete creep.memory.getEnergySource;
      return BehaviorResult.FAILURE;
    }
    if (
      activeMissions(office)
        .filter(isMission(HarvestMission))
        .some(m => m.missionData.source === creep.memory.getEnergySource && m.harvestRate() > 0)
    ) {
      // source is being harvested by another creep
      return fromFranchise(creep, creep.memory.getEnergySource as Id<Source>);
    } else {
      return fromSource(creep, creep.memory.getEnergySource as Id<Source>);
    }
  } else if (source instanceof Resource) {
    return fromDroppedResource(creep, source.id);
  } else {
    return fromStorageStructure(creep, source.id);
  }
};
