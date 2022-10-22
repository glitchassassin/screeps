import { MissionImplementation } from '../MissionImplementation';
import { BaseMissionSpawner } from './BaseMissionSpawner';

export class MissionSpawner<T extends typeof MissionImplementation> extends BaseMissionSpawner<T> {
  constructor(public missionClass: T, public missionData: () => InstanceType<T>['missionData']) {
    super();
  }

  public id?: InstanceType<T>['id'];

  register(ids: InstanceType<T>['id'][]) {
    this.id = ids[0];
  }

  get resolved() {
    return new this.missionClass(this.missionData(), this.id) as InstanceType<T>;
  }
}
