import { MinionTypes } from 'Minions/minionTypes';
import { Mission, MissionType } from 'Missions/Mission';
import { MissionImplementation } from '../MissionImplementation';

export type DefendOfficeRoles = MinionTypes.GUARD | MinionTypes.MEDIC;

interface DefendOfficeMissionData {
  role: DefendOfficeRoles;
}

export interface DefendOfficeMission extends Mission<MissionType.DEFEND_OFFICE> {
  data: DefendOfficeMissionData;
}

export class DefendOffice extends MissionImplementation {}
