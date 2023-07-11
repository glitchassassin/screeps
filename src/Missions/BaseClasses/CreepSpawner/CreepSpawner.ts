import { prespawnByArrived } from 'Selectors/prespawn';
import { CPU_ESTIMATE_PERIOD } from 'config';
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
    public eventHandlers?: BaseCreepSpawner['eventHandlers']
  ) {
    super(id, office, props, eventHandlers);
  }

  spawn(missionId: CreepMemory['missionId'], priority: number) {
    const prespawn = this.props.prespawn && this.resolved && prespawnByArrived(this.resolved);
    if (this.memory?.spawned && !this.props.respawn?.()) return [];
    if (this.resolved && !prespawn) return [];
    return super.spawn(missionId, priority);
  }

  public _creep?: string;

  get resolved(): Creep | undefined {
    return this._creep ? Game.creeps[this._creep] : undefined;
  }

  get spawned() {
    return Boolean(this.memory?.spawned);
  }

  register(creep: Creep, onNew?: () => void) {
    if (this.memory) {
      this.memory.spawned = true;
      this.checkOnSpawn(creep, onNew);
    }
    this._creep = creep.name;
  }

  get died() {
    return this.memory?.spawned && (!this._creep || !Game.creeps[this._creep]);
  }

  cpuRemaining(): number {
    return (
      Math.min(CPU_ESTIMATE_PERIOD, this.resolved?.ticksToLive ?? Infinity) * this.cpuPerTick
    );
  }

  ttlRemaining(): number {
    return Math.min(CPU_ESTIMATE_PERIOD, this.resolved?.ticksToLive ?? Infinity);
  }
}
