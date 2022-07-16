import { MissionType } from "Missions/Mission";
import { activeMissions, isMission } from "Missions/Selectors";
import { posById } from "./posById";

export const franchiseIncome = (office: string) => {
  let income = new Map<Id<Source>, number>();
  for (const mission of activeMissions(office).filter(isMission(MissionType.HARVEST))) {
    const sourcePos = posById(mission.data.source);
    const ownedOrReserved = (
      Memory.rooms[sourcePos?.roomName ?? '']?.reserver === 'LordGreywether' ||
      Memory.rooms[sourcePos?.roomName ?? '']?.owner === 'LordGreywether'
    )
    const maxIncome = (ownedOrReserved ? SOURCE_ENERGY_CAPACITY : SOURCE_ENERGY_NEUTRAL_CAPACITY) / ENERGY_REGEN_TIME;
    income.set(
      mission.data.source,
      Math.min(maxIncome, (income.get(mission.data.source) ?? 0) + mission.data.harvestRate)
    );
  }
  const totalIncome = [...income.values()].reduce((a, b) => a + b, 0);
  return totalIncome;
}
