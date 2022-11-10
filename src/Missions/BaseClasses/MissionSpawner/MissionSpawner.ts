import { MissionImplementation } from '../MissionImplementation';
import { ConditionalMissionSpawner } from './ConditionalMissionSpawner';

export class MissionSpawner<T extends typeof MissionImplementation> extends ConditionalMissionSpawner<T> {
  constructor(
    public missionClass: T,
    public missionData: () => InstanceType<T>['missionData'],
    public onSpawn?: (mission: InstanceType<T>) => void
  ) {
    super(missionClass, missionData, () => true, onSpawn);
  }
}
