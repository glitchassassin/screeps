import { byId } from 'Selectors/byId';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { franchiseIsFull } from 'Selectors/Franchises/franchiseIsFull';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';
import { getClosestByRange } from 'Selectors/Map/MapCoordinates';
import { posById } from 'Selectors/posById';
import { getSpawns, roomPlans } from 'Selectors/roomPlans';
import { storageEnergyAvailable } from 'Selectors/storageEnergyAvailable';
import { memoizeByTick } from 'utils/memoizeFunction';
import profiler from 'utils/profiler';
import { BehaviorResult } from './Behavior';
import { getEnergyFromFranchise } from './getEnergyFromFranchise';
import { getEnergyFromRuin } from './getEnergyFromRuin';
import { getEnergyFromSource } from './getEnergyFromSource';
import { getEnergyFromStorage } from './getEnergyFromStorage';
import { States } from './states';

declare global {
  interface CreepMemory {
    getEnergyState?: States;
    depositSource?: Id<Source>;
  }
}

// Energy sources

// Ruins
// Sources (franchise or self-harvest)
// Storage (go based on storage pos, then collect by hierarchy)

const energySourcesByOffice = memoizeByTick(
  (office, withdrawLimit, remote) => office + withdrawLimit + remote,
  (office: string, withdrawLimit: number, remote = false) => {
    const sources: (Ruin | { id: Id<Source>; pos: RoomPosition; energy: number } | AnyStoreStructure)[] = [];
    // ruins
    Game.rooms[office]
      ?.find(FIND_RUINS, { filter: ruin => ruin.store.getUsedCapacity(RESOURCE_ENERGY) !== 0 })
      .forEach(ruin => sources.push(ruin));
    // sources
    const shouldHarvest = !hasEnergyIncome(office);
    const shouldGetFromFranchise = storageEnergyAvailable(office) > Game.rooms[office].energyCapacityAvailable;
    franchisesByOffice(office)
      .map(({ source }) => ({
        id: source,
        energy: byId(source)?.energy ?? SOURCE_ENERGY_NEUTRAL_CAPACITY,
        pos: posById(source)!
      }))
      .filter(
        source =>
          source.pos.roomName !== office &&
          ((shouldGetFromFranchise && franchiseEnergyAvailable(source.id) >= 50) ||
            (shouldHarvest && !franchiseIsFull(office, source.id) && source.energy > 0))
      )
      .forEach(source => sources.push(source));
    // storage
    const storage = [] as AnyStoreStructure[];
    if (roomPlans(office)?.headquarters?.storage.structure)
      storage.push(roomPlans(office)!.headquarters!.storage.structure as AnyStoreStructure);
    if (roomPlans(office)?.library?.container.structure)
      storage.push(roomPlans(office)!.library!.container.structure as AnyStoreStructure);
    if (!storage.length)
      roomPlans(office)
        ?.fastfiller?.containers.filter(c => c.structure && (c.structure as AnyStoreStructure).store[RESOURCE_ENERGY])
        .forEach(c => storage.push(c.structure as AnyStoreStructure));
    if (!storage.length)
      getSpawns(office)
        .filter(c => c.store[RESOURCE_ENERGY])
        .forEach(c => storage.push(c as AnyStoreStructure));
    if (storage.length) {
      // && !remote
      sources.push(...storage);
    }
    return sources;
  }
);

export const engineerGetEnergy = profiler.registerFN(
  (creep: Creep, office: string, withdrawLimit = Game.rooms[office].energyCapacityAvailable, remote = false) => {
    if (!creep.memory.getEnergyState) {
      // Find nearest target
      const source = getClosestByRange(creep.pos, energySourcesByOffice(office, withdrawLimit, remote));
      if (!source) {
        return;
      } else if (source instanceof Ruin) {
        creep.memory.getEnergyState = States.GET_ENERGY_RUINS;
        creep.memory.targetRuin = source.id;
      } else if ('structureType' in source) {
        creep.memory.getEnergyState = States.GET_ENERGY_STORAGE;
      } else {
        if (hasEnergyIncome(office) && franchiseEnergyAvailable(source.id) >= 50) {
          creep.memory.getEnergyState = States.GET_ENERGY_FRANCHISE;
          creep.memory.franchiseTarget = source.id;
        }
        if (!(franchiseIsFull(office, source.id) || hasEnergyIncome(office))) {
          creep.memory.getEnergyState = States.GET_ENERGY_SOURCE;
          creep.memory.franchiseTarget = source.id;
        }
      }
    }
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      delete creep.memory.getEnergyState;
      return BehaviorResult.SUCCESS;
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_RUINS) {
      let result = getEnergyFromRuin(creep);
      if (result !== BehaviorResult.INPROGRESS) {
        delete creep.memory.getEnergyState;
      }
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_STORAGE) {
      let result = getEnergyFromStorage(creep, office, withdrawLimit);
      if (result !== BehaviorResult.INPROGRESS) {
        delete creep.memory.getEnergyState;
      }
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_FRANCHISE) {
      let result = getEnergyFromFranchise(creep, office, creep.memory.franchiseTarget!);
      if (result !== BehaviorResult.INPROGRESS) {
        delete creep.memory.getEnergyState;
      }
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_SOURCE) {
      let result = getEnergyFromSource(creep, office);
      if (result !== BehaviorResult.INPROGRESS) {
        delete creep.memory.getEnergyState;
      }
    }
    return BehaviorResult.INPROGRESS;
  },
  'engineerGetEnergy'
);
