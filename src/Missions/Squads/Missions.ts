import { SquadMissionType } from '.';
import { AttackerHealerDuo, AttackerHealerDuoMission } from './AttackerHealerDuo';
import { SquadMissionImplementation } from './SquadMissionImplementation';

export type SquadMissionTypes = {
  [SquadMissionType.ATTACKER_HEALER_DUO]: AttackerHealerDuoMission;
};

export const SquadMissions: Record<SquadMissionType, typeof SquadMissionImplementation> = {
  [SquadMissionType.ATTACKER_HEALER_DUO]: AttackerHealerDuo
};
