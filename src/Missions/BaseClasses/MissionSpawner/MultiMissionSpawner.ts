import { MissionStatus } from 'Missions/Mission';
import { MissionImplementation } from '../MissionImplementation';
import { BaseMissionSpawner } from './BaseMissionSpawner';

export class MultiMissionSpawner<T extends typeof MissionImplementation> extends BaseMissionSpawner<T> {
  constructor(
    public missionClass: T,
    public generate: (current: InstanceType<T>[]) => InstanceType<T>['missionData'][]
  ) {
    super();
  }

  public ids: InstanceType<T>['id'][] = [];

  register(ids: InstanceType<T>['id'][]) {
    this.ids = ids;
    this.resolved.forEach(m => m.init());
  }

  get resolved() {
    // clean up ids
    this.ids.forEach((id, i) => {
      if (!Memory.missions[id]) this.ids.splice(this.ids.indexOf(id));
    });
    // generate new missions
    const current = this.ids
      .map(id => this.missionClass.fromId(id) as InstanceType<T>)
      .filter(mission => mission?.status !== MissionStatus.DONE);
    for (const data of this.generate(current)) {
      const mission = new this.missionClass(data) as InstanceType<T>;
      current.push(mission);
      this.ids.push(mission.id);
    }
    return current;
  }
}
