import { MissionType } from "Missions/Mission";

export const franchiseIncome = (office: string) => {
  let income = 0;
  for (const mission of Memory.offices[office].activeMissions) {
    if (mission.type !== MissionType.HARVEST) continue;
    income += Math.min(10, mission.data.harvestRate);
  }
  return income;
}
