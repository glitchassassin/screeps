import { Harvest, HarvestMission } from './Harvest';

export type MissionTypes = {
  [Harvest.type]: HarvestMission
}

export const Missions = {
  [Harvest.type]: Harvest
}
