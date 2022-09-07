import { MissionType } from 'Missions/Mission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { byId } from 'Selectors/byId';

export const franchiseIncome = (office: string) => {
  let income = new Map<Id<Source>, number>();
  for (const mission of activeMissions(office).filter(isMission(MissionType.HARVEST))) {
    const maxIncome = (byId(mission.data.source)?.energyCapacity ?? SOURCE_ENERGY_NEUTRAL_CAPACITY) / ENERGY_REGEN_TIME;
    income.set(
      mission.data.source,
      Math.min(maxIncome, (income.get(mission.data.source) ?? 0) + mission.data.harvestRate)
    );
  }
  const totalIncome = [...income.values()].reduce((a, b) => a + b, 0);
  return totalIncome;
};
