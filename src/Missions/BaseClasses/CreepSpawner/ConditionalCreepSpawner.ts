import { BaseCreepSpawner } from './BaseCreepSpawner';

declare global {
  interface CreepMemory {
    arrived?: number;
  }
}

export class ConditionalCreepSpawner extends BaseCreepSpawner {
  constructor(id: string, office: string, public props: BaseCreepSpawner['props'] & { shouldSpawn?: () => boolean }) {
    super(id, office, props);
  }

  spawn(missionId: CreepMemory['missionId'], priority: number) {
    if (this.resolved || !this.props.shouldSpawn?.()) return [];
    return super.spawn(missionId, priority);
  }

  public _creep?: string;

  get resolved(): Creep | undefined {
    return this._creep ? Game.creeps[this._creep] : undefined;
  }

  get spawned() {
    return Boolean(this.memory?.spawned);
  }

  register(creep: Creep) {
    if (this.memory) {
      this.memory.spawned = true;
      this.onSpawn?.(creep);
    }
    this._creep = creep.name;
  }

  get died() {
    return this.memory?.spawned && (!this._creep || !Game.creeps[this._creep]);
  }

  cpuRemaining(): number {
    return (this.resolved?.ticksToLive ?? 0) * (this.props.estimatedCpuPerTick ?? this.defaultCpuPerTick);
  }
}
