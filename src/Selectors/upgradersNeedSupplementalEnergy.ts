import { MissionType } from 'Missions/Mission';
import { activeMissions, assignedCreep, isMission } from 'Missions/Selectors';

export function upgradersNeedSupplementalEnergy(office: string) {
  return (
    (
      activeMissions(office)
        .filter(isMission(MissionType.UPGRADE))
        .map(m => assignedCreep(m))
        .filter(c => c && !c.spawning) as Creep[]
    ).reduce((sum, c) => sum + c.getActiveBodyparts(CARRY) * CARRY_CAPACITY, 0) >
    LINK_CAPACITY / 2
  );
}
