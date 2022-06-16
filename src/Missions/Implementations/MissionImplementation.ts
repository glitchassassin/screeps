import { Mission, MissionType } from "Missions/Mission";

export interface MissionImplementation<T extends MissionType, D> {
  type: T,
  spawn: (mission: Mission<T, D>) => void,
  run: (mission: Mission<T, D>) => void,
}
