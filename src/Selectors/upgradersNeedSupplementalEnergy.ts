import { UpgradeMission } from 'Missions/Implementations/UpgradeMission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { sum } from './reducers';

export function upgradersNeedSupplementalEnergy(office: string) {
  return (
    activeMissions(office)
      .filter(isMission(UpgradeMission))
      .map(m => m.capacity())
      .reduce(sum, 0) >
    LINK_CAPACITY / 2
  );
}
