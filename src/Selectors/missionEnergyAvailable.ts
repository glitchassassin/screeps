import { adjacentWalkablePositions } from "./MapCoordinates";
import { sourcePositions } from "./roomCache";
import { roomPlans } from "./roomPlans";
import { storageEnergyAvailable } from "./storageEnergyAvailable";

export const missionEnergyAvailable = (office: string) => {
  const efficiency = sourcePositions(office)
    .map(pos =>
      Math.min(10,
        adjacentWalkablePositions(pos, true).length * 2 * HARVEST_POWER
      )
    )
    .reduce((a, b) => a + b, 0)

  // console.log(office, Game.rooms[office]?.energyCapacityAvailable, efficiency)

  const futureEnergy = efficiency * CREEP_LIFE_TIME;
  const storage = roomPlans(office)?.headquarters?.storage.structure;
  return storageEnergyAvailable(office) +
  // prospective future energy from room sources, if we don't have a storage yet
  futureEnergy;
}
