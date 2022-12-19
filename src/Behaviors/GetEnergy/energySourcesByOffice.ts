import { byId } from 'Selectors/byId';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { franchiseIsFull } from 'Selectors/Franchises/franchiseIsFull';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';
import { posById } from 'Selectors/posById';
import { sum } from 'Selectors/reducers';
import { getSpawns, roomPlans } from 'Selectors/roomPlans';
import { storageEnergyAvailable } from 'Selectors/storageEnergyAvailable';
import { memoizeByTick } from 'utils/memoizeFunction';

export const energySourcesByOffice = memoizeByTick(
  (office, withdrawLimit, remote) => office + withdrawLimit + remote,
  (office: string, withdrawLimit: number, remote = false) => {
    const sources: (Ruin | { id: Id<Source>; pos: RoomPosition; energy: number } | Resource | AnyStoreStructure)[] = [];
    // ruins
    Game.rooms[office]
      ?.find(FIND_RUINS, { filter: ruin => ruin.store.getUsedCapacity(RESOURCE_ENERGY) !== 0 })
      .forEach(ruin => sources.push(ruin));
    // dropped resources
    Game.rooms[office]
      ?.find(FIND_DROPPED_RESOURCES, {
        filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount > CARRY_CAPACITY * 2
      })
      .forEach(resource => sources.push(resource));
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
          (shouldHarvest || source.pos.roomName !== office) &&
          ((shouldGetFromFranchise && franchiseEnergyAvailable(source.id) >= 50) ||
            (shouldHarvest && !franchiseIsFull(office, source.id) && source.energy > 0))
      )
      .forEach(source => sources.push(source));
    // storage
    const storage = [] as AnyStoreStructure[];
    if (roomPlans(office)?.headquarters?.storage.structure)
      storage.push(roomPlans(office)!.headquarters!.storage.structure!);
    if (roomPlans(office)?.library?.container.structure?.store[RESOURCE_ENERGY])
      storage.push(roomPlans(office)!.library!.container.structure!);
    if (roomPlans(office)?.library?.link.structure?.store[RESOURCE_ENERGY])
      storage.push(roomPlans(office)!.library!.link.structure!);
    if (
      !roomPlans(office)?.headquarters?.storage.structure &&
      (roomPlans(office)
        ?.fastfiller?.containers.map(c => c.structure?.store[RESOURCE_ENERGY] ?? 0)
        .reduce(sum, 0) ?? 0) > withdrawLimit
    )
      roomPlans(office)
        ?.fastfiller?.containers.filter(c => c.structure && c.structure.store[RESOURCE_ENERGY])
        .forEach(c => storage.push(c.structure!));
    if (!storage.length)
      getSpawns(office)
        .filter(c => c.store[RESOURCE_ENERGY])
        .forEach(c => storage.push(c));
    if (storage.length) {
      // && !remote
      sources.push(...storage);
    }
    return sources;
  }
);
