import { cpuEstimatePeriod } from 'Selectors/missionCpuAvailable';
import { isCreep } from 'Selectors/typeguards';
import { BaseCreepSpawner } from './BaseCreepSpawner';

export class MultiCreepSpawner extends BaseCreepSpawner {
  constructor(
    id: string,
    office: string,
    public props: BaseCreepSpawner['props'] & { count: (current: Creep[]) => number },
    public eventHandlers?: BaseCreepSpawner['eventHandlers']
  ) {
    super(id, office, props, eventHandlers);
  }

  spawn(missionId: CreepMemory['missionId'], priority: number) {
    const spawnOrders = [];
    for (let i = 0; i < this.props.count(this.resolved); i += 1) {
      spawnOrders.push(...super.spawn(missionId, priority));
    }
    return spawnOrders;
  }

  public _creeps: string[] = [];

  get resolved(): Creep[] {
    const creeps = this._creeps.map(n => Game.creeps[n]).filter(isCreep);
    this._creeps = creeps.map(c => c.name);
    return creeps;
  }

  register(creep: Creep, onNew?: () => void) {
    if (!this._creeps.includes(creep.name)) {
      this._creeps.push(creep.name);
    }
    this.checkOnSpawn(creep, onNew);
  }

  cpuRemaining(): number {
    return (
      this.resolved.reduce((sum, c) => sum + Math.min(cpuEstimatePeriod(), c.ticksToLive ?? Infinity), 0) *
      (this.props.estimatedCpuPerTick ?? this.defaultCpuPerTick)
    );
  }
}
