import { MissionImplementation } from '../MissionImplementation';
import { BaseMissionSpawner } from './BaseMissionSpawner';

export class MultiMissionSpawner<T extends typeof MissionImplementation> extends BaseMissionSpawner<T> {
  constructor(
    public missionClass: T,
    public missionData: () => InstanceType<T>['missionData'],
    public count: () => number
  ) {
    super();
  }

  public ids: InstanceType<T>['id'][] = [];

  register(ids: InstanceType<T>['id'][]) {
    this.ids = ids;
  }

  get resolved() {
    const actualIds: (InstanceType<T>['id'] | undefined)[] = this.ids.slice();
    while (actualIds.length < this.count()) {
      actualIds.push(undefined);
    }
    return actualIds.map(id => new this.missionClass(this.missionData(), id) as InstanceType<T>);
  }
}
