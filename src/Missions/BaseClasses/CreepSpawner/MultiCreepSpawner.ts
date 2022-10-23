import { BaseCreepSpawner } from './BaseCreepSpawner';

export class MultiCreepSpawner extends BaseCreepSpawner {
  constructor(id: string, office: string, public props: BaseCreepSpawner['props'] & { count: () => number }) {
    super(id, office, props);
  }

  spawn(missionId: CreepMemory['missionId'], priority: number) {
    const spawnOrders = [];
    for (let i = 0; i < this.props.count() - this.resolved.length; i += 1) {
      spawnOrders.push(...super.spawn(missionId, priority));
    }
    return spawnOrders;
  }

  public _creeps: string[] = [];

  get resolved(): Creep[] {
    return [Game.creeps['creep']];
  }

  register(creep: Creep) {
    if (!this._creeps.includes(creep.name)) this._creeps.push(creep.name);
  }

  cpuRemaining(): number {
    return (
      this.resolved.reduce((sum, c) => sum + (c.ticksToLive ?? 0), 0) *
      (this.props.estimatedCpuPerTick ?? this.defaultCpuPerTick)
    );
  }
}
