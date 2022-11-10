import { MissionStatus } from 'Missions/Mission';
import { MissionImplementation } from '../MissionImplementation';
import { BaseMissionSpawner } from './BaseMissionSpawner';

export class MultiMissionSpawner<T extends typeof MissionImplementation> extends BaseMissionSpawner<T> {
  constructor(
    public missionClass: T,
    public generate: (current: InstanceType<T>[]) => InstanceType<T>['missionData'][],
    public onSpawn?: (mission: InstanceType<T>) => void
  ) {
    super();
  }

  public ids: InstanceType<T>['id'][] = [];

  register(ids: InstanceType<T>['id'][]) {
    this.ids = ids;
    this.resolved.forEach(m => m.init());
  }

  spawn() {
    for (const data of this.generate(this.resolved)) {
      const mission = new this.missionClass(data) as InstanceType<T>;
      this.onSpawn?.(mission);
      this.ids.push(mission.id);
    }
  }

  get resolved() {
    // clean up ids
    this.ids.forEach((id, i) => {
      if (!Memory.missions[id]) this.ids.splice(this.ids.indexOf(id));
    });
    return this.ids
      .map(id => this.missionClass.fromId(id) as InstanceType<T>)
      .filter(mission => mission?.status !== MissionStatus.DONE);
  }
}
