import { prespawnByArrived } from 'Selectors/prespawn';
import { BaseCreepSpawner } from './BaseCreepSpawner';

declare global {
  interface CreepMemory {
    arrived?: number;
  }
}

export class CreepSpawner extends BaseCreepSpawner {
  constructor(
    id: string,
    office: string,
    public props: BaseCreepSpawner['props'] & { prespawn?: boolean; respawn?: () => boolean },
    public onSpawn?: BaseCreepSpawner['onSpawn']
  ) {
    super(id, office, props, onSpawn);
  }

  spawn(missionId: CreepMemory['missionId'], priority: number) {
    const prespawn = this.props.prespawn && this.resolved && prespawnByArrived(this.resolved);
    if (!prespawn || this.resolved || (this.memory?.spawned && !this.props.respawn?.())) return [];
    return super.spawn(missionId, priority);
  }

  public _creep?: string;

  get resolved(): Creep | undefined {
    return this._creep ? Game.creeps[this._creep] : undefined;
  }

  register(creep: Creep) {
    if (this.memory) {
      this.memory.spawned = true;
      this.onSpawn?.(creep);
    }
    this._creep = creep.name;
  }

  get died() {
    return this._creep && !Game.creeps[this._creep];
  }

  cpuRemaining(): number {
    return (this.resolved?.ticksToLive ?? 0) * (this.props.estimatedCpuPerTick ?? this.defaultCpuPerTick);
  }
}
