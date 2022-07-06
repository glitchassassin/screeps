import { sourceIds } from "./roomCache";
import { roomPlans } from "./roomPlans";
import { storageEnergyAvailable } from "./storageEnergyAvailable";

export const missionEnergyAvailable = (office: string) => {
  const futureEnergy = (
    sourceIds(office).length * (SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME) * CREEP_LIFE_TIME
  );
  const storage = roomPlans(office)?.headquarters?.storage.structure;
  return storageEnergyAvailable(office) +
  // prospective future energy from room sources, if we don't have a storage yet
  futureEnergy;
}
