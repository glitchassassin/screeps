import { MissionType } from "Missions/Mission";
import { activeMissions, assignedCreep, isMission } from "Missions/Selectors";

export const getScientists = (office: string) => activeMissions(office)
  .filter(isMission(MissionType.SCIENCE))
  .map(assignedCreep)
  .filter((c): c is Creep => Boolean(c));
