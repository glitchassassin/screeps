import { MissionImplementation } from '../MissionImplementation';

export class BaseMissionSpawner<T extends typeof MissionImplementation> {
  register(ids: InstanceType<T>['id'][]) {}
  get resolved(): InstanceType<T> | InstanceType<T>[] | undefined {
    return;
  }

  /**
   * Generate missions
   */
  spawn() {}
}
