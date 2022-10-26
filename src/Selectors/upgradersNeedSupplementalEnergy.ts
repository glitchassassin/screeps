import { UpgradeMission } from 'Missions/Implementations/UpgradeMission';
import { activeMissions, isMission } from 'Missions/Selectors';

export function upgradersNeedSupplementalEnergy(office: string) {
  return activeMissions(office)
    .filter(isMission(UpgradeMission))
    .some(m => m.needsSupplementalEnergy());
}
