import { BaseCreepSpawner } from './BaseCreepSpawner';

export class CreepSpawner extends BaseCreepSpawner {
  constructor(id: string, office: string, public props: BaseCreepSpawner['props'] & { respawn?: () => boolean }) {
    super(id, office, props);
  }

  spawn(missionId: CreepMemory['missionId'], priority: number, memory?: Record<string, boolean>) {
    if (this.resolved || (this.memory?.spawned && !this.props.respawn?.())) return [];
    return super.spawn(missionId, priority);
  }

  public _creep?: string;

  get resolved(): Creep | undefined {
    return this._creep ? Game.creeps[this._creep] : undefined;
  }

  register(creep: Creep) {
    if (this.memory) this.memory.spawned = true;
    this._creep = creep.name;
  }

  get died() {
    return this._creep && !Game.creeps[this._creep];
  }

  cpuRemaining(): number {
    return (this.resolved?.ticksToLive ?? 0) * (this.props.estimatedCpuPerTick ?? this.defaultCpuPerTick);
  }
}
