import { SquadMissionType } from '.';
import { AttackerHealerDuo, AttackerHealerDuoMission } from './Implementations/AttackerHealerDuo';
import { PowerBank, PowerBankMission } from './Implementations/PowerBank';
import { PowerBankDuo, PowerBankDuoMission } from './Implementations/PowerBankDuo';
import { SquadMissionImplementation } from './SquadMissionImplementation';

export type SquadMissionTypes = {
  [SquadMissionType.ATTACKER_HEALER_DUO]: AttackerHealerDuoMission;
  [SquadMissionType.POWER_BANK]: PowerBankMission;
  [SquadMissionType.POWER_BANK_DUO]: PowerBankDuoMission;
};

export const SquadMissions: Record<SquadMissionType, typeof SquadMissionImplementation> = {
  [SquadMissionType.ATTACKER_HEALER_DUO]: AttackerHealerDuo,
  [SquadMissionType.POWER_BANK]: PowerBank,
  [SquadMissionType.POWER_BANK_DUO]: PowerBankDuo
};
