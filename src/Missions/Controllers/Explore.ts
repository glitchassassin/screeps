import { createExploreMission } from 'Missions/Implementations/Explore';
import { MissionType } from 'Missions/Mission';
import { isMission, pendingAndActiveMissions, submitMission } from 'Missions/Selectors';
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    if (pendingAndActiveMissions(office).some(isMission(MissionType.EXPLORE))) return; // Only one pending logistics mission at a time

    if (hasEnergyIncome(office) || Memory.roomPlans[office]?.office === false) {
      submitMission(office, createExploreMission(office));
    }
  }
};
