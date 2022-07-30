import { MissionType } from 'Missions/Mission';
import { AcquireEngineer, AcquireEngineerMission } from './AcquireEngineer';
import { AcquireLawyer, AcquireLawyerMission } from './AcquireLawyer';
import { AcquireLogistics, AcquireLogisticsMission } from './AcquireLogistics';
import { DefendOffice, DefendOfficeMission } from './DefendOffice';
import { DefendRemote, DefendRemoteMission } from './DefendRemote';
import { Engineer, EngineerMission } from './Engineer';
import { Explore, ExploreMission } from './Explore';
import { Harvest, HarvestMission } from './Harvest';
import { HQLogistics, HQLogisticsMission } from './HQLogistics';
import { Logistics, LogisticsMission } from './Logistics';
import { MineForeman, MineForemanMission } from './MineForeman';
import { MineHauler, MineHaulerMission } from './MineHauler';
import { MissionImplementation } from './MissionImplementation';
import { Plunder, PlunderMission } from './Plunder';
import { Refill, RefillMission } from './Refill';
import { Reserve, ReserveMission } from './Reserve';
import { Science, ScienceMission } from './Science';
import { Upgrade, UpgradeMission } from './Upgrade';

export type MissionTypes = {
  [MissionType.HARVEST]: HarvestMission;
  [MissionType.LOGISTICS]: LogisticsMission;
  [MissionType.EXPLORE]: ExploreMission;
  [MissionType.ENGINEER]: EngineerMission;
  [MissionType.REFILL]: RefillMission;
  [MissionType.UPGRADE]: UpgradeMission;
  [MissionType.RESERVE]: ReserveMission;
  [MissionType.HQ_LOGISTICS]: HQLogisticsMission;
  // [MissionType.TOWER_LOGISTICS]: TowerLogisticsMission,
  [MissionType.PLUNDER]: PlunderMission;
  [MissionType.MINE_FOREMAN]: MineForemanMission;
  [MissionType.MINE_HAULER]: MineHaulerMission;
  [MissionType.SCIENCE]: ScienceMission;
  [MissionType.ACQUIRE_ENGINEER]: AcquireEngineerMission;
  [MissionType.ACQUIRE_LOGISTICS]: AcquireLogisticsMission;
  [MissionType.ACQUIRE_LAWYER]: AcquireLawyerMission;
  [MissionType.DEFEND_REMOTE]: DefendRemoteMission;
  [MissionType.DEFEND_OFFICE]: DefendOfficeMission;
};

export const Missions: Record<MissionType, typeof MissionImplementation> = {
  [MissionType.HARVEST]: Harvest,
  [MissionType.LOGISTICS]: Logistics,
  [MissionType.EXPLORE]: Explore,
  [MissionType.ENGINEER]: Engineer,
  [MissionType.REFILL]: Refill,
  [MissionType.UPGRADE]: Upgrade,
  [MissionType.RESERVE]: Reserve,
  [MissionType.HQ_LOGISTICS]: HQLogistics,
  // [MissionType.TOWER_LOGISTICS]: TowerLogistics,
  [MissionType.PLUNDER]: Plunder,
  [MissionType.MINE_FOREMAN]: MineForeman,
  [MissionType.MINE_HAULER]: MineHauler,
  [MissionType.SCIENCE]: Science,
  [MissionType.ACQUIRE_ENGINEER]: AcquireEngineer,
  [MissionType.ACQUIRE_LOGISTICS]: AcquireLogistics,
  [MissionType.ACQUIRE_LAWYER]: AcquireLawyer,
  [MissionType.DEFEND_REMOTE]: DefendRemote,
  [MissionType.DEFEND_OFFICE]: DefendOffice
};
