import { ScienceMission } from 'Missions/Implementations/ScienceMission';
import { activeMissions, isMission } from 'Missions/Selectors';

export const getScientists = (office: string) =>
  activeMissions(office)
    .filter(isMission(ScienceMission))
    .map(m => m.creeps.scientist.resolved)
    .filter((c): c is Creep => Boolean(c));
