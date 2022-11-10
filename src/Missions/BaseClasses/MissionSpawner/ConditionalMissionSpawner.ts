import { MissionStatus } from 'Missions/Mission';
import { MissionImplementation } from '../MissionImplementation';
import { BaseMissionSpawner } from './BaseMissionSpawner';

export class ConditionalMissionSpawner<T extends typeof MissionImplementation> extends BaseMissionSpawner<T> {
  constructor(
    public missionClass: T,
    public missionData: () => InstanceType<T>['missionData'],
    public spawnWhen: () => boolean,
    public onSpawn?: (mission: InstanceType<T>) => void
  ) {
    super();
  }

  public ids: InstanceType<T>['id'][] = [];

  register(ids: InstanceType<T>['id'][]) {
    this.ids = ids;
    this.resolved?.init();
  }

  spawn() {
    let mission = this.missionClass.fromId(this.ids[0]) as InstanceType<T>;
    if (!mission || mission.status === MissionStatus.DONE) {
      this.ids.shift();
      if (this.spawnWhen()) {
        mission = new this.missionClass(this.missionData()) as InstanceType<T>;
        this.onSpawn?.(mission);
        this.ids.push(mission.id);
      }
    }
  }

  get resolved() {
    return this.missionClass.fromId(this.ids[0]) as InstanceType<T>;
  }
}
