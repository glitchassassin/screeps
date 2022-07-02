import { MissionType } from 'Missions/Mission';
import { Engineer, EngineerMission } from './Engineer';
import { Explore, ExploreMission } from './Explore';
import { Harvest, HarvestMission } from './Harvest';
import { Logistics, LogisticsMission } from './Logistics';
import { MissionImplementation } from './MissionImplementation';
import { Refill, RefillMission } from './Refill';
import { Reserve, ReserveMission } from './Reserve';
import { Upgrade, UpgradeMission } from './Upgrade';

export type MissionTypes = {
  [MissionType.HARVEST]: HarvestMission,
  [MissionType.LOGISTICS]: LogisticsMission,
  [MissionType.EXPLORE]: ExploreMission,
  [MissionType.ENGINEER]: EngineerMission,
  [MissionType.REFILL]: RefillMission,
  [MissionType.UPGRADE]: UpgradeMission,
  [MissionType.RESERVE]: ReserveMission
}

export const Missions: Record<MissionType, typeof MissionImplementation> = {
  [MissionType.HARVEST]: Harvest,
  [MissionType.LOGISTICS]: Logistics,
  [MissionType.EXPLORE]: Explore,
  [MissionType.ENGINEER]: Engineer,
  [MissionType.REFILL]: Refill,
  [MissionType.UPGRADE]: Upgrade,
  [MissionType.RESERVE]: Reserve
}
