import { ScienceMission } from "Missions/Implementations/Science";
import { MissionType } from "Missions/Mission";

export const getScientists = (office: string) => Memory.offices[office].activeMissions
  .filter((m): m is ScienceMission => m.type === MissionType.SCIENCE)
  .map(m => Game.creeps[m.creepNames[0]])
  .filter((c): c is Creep => Boolean(c));
