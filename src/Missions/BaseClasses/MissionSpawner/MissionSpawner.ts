import { MissionImplementation } from '../MissionImplementation';
import { BaseMissionSpawner } from './BaseMissionSpawner';

export class MissionSpawner<T extends typeof MissionImplementation> extends BaseMissionSpawner<T> {
  constructor(public missionClass: T, public missionData: () => InstanceType<T>['missionData']) {
    super();
  }

  public ids: InstanceType<T>['id'][] = [];

  register(ids: InstanceType<T>['id'][]) {
    this.ids = ids;
    this.resolved.init();
  }

  get resolved() {
    let mission = this.missionClass.fromId(this.ids[0]) as InstanceType<T>;
    if (!mission) {
      this.ids.shift();
      mission = new this.missionClass(this.missionData()) as InstanceType<T>;
      this.ids.push(mission.id);
    }
    return mission;
  }
}
