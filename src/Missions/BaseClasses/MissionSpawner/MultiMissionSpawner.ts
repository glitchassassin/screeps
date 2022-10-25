import { MissionImplementation } from '../MissionImplementation';
import { BaseMissionSpawner } from './BaseMissionSpawner';

export class MultiMissionSpawner<T extends typeof MissionImplementation> extends BaseMissionSpawner<T> {
  constructor(
    public missionClass: T,
    public missionData: () => InstanceType<T>['missionData'],
    public count: (current: InstanceType<T>[]) => number
  ) {
    super();
  }

  public ids: InstanceType<T>['id'][] = [];

  register(ids: InstanceType<T>['id'][]) {
    this.ids = ids;
  }

  get resolved() {
    // remove cleaned up missions
    this.ids = this.ids.filter(i => !!Memory.missions[i]);
    // generate new missions
    const current = this.ids.map(id => new this.missionClass(this.missionData(), id) as InstanceType<T>);
    const count = this.count(current);
    while (current.length < count) {
      const mission = new this.missionClass(this.missionData()) as InstanceType<T>;
      current.push(mission);
      this.ids.push(mission.id);
    }
    return current;
  }
}
