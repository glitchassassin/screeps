import { BehaviorResult } from 'Behaviors/Behavior';
import { HarvestMission } from 'Missions/Implementations/HarvestMission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { getClosestByRange } from 'Selectors/Map/MapCoordinates';
import { byId } from 'Selectors/byId';
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

  let result = BehaviorResult.INPROGRESS;

  if (!source || source instanceof Source) {
    if (
      activeMissions(office)
        .filter(isMission(HarvestMission))
        .some(m => m.missionData.source === creep.memory.getEnergySource && m.harvestRate() > 0)
    ) {
      // source is being harvested by another creep
      result = fromFranchise(creep, creep.memory.getEnergySource as Id<Source>);
    } else if (posById(creep.memory.getEnergySource)) {
      // Known source, but not being harvested
      result = fromSource(creep, creep.memory.getEnergySource as Id<Source>);
    } else {
      // not a source (or is gone?)
      result = BehaviorResult.FAILURE;
    }
  } else if (source instanceof Resource) {
    result = fromDroppedResource(creep, source.id);
  } else {
    if (source.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      result = BehaviorResult.FAILURE;
    }
    result = fromStorageStructure(creep, source.id);
  }

  if (result !== BehaviorResult.INPROGRESS) {
    delete creep.memory.getEnergySource;
  }

  return result;
};
