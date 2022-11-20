import { CreepBuild, MinionTypes } from 'Minions/minionTypes';
import { SpawnOrder } from 'Minions/spawnQueues';
import { Budget } from 'Missions/Budgets';
import { cpuEstimatePeriod } from 'Selectors/missionCpuAvailable';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';

declare global {
  interface CreepMemory {
    spawned?: boolean;
  }
}

export abstract class BaseCreepSpawner {
  defaultCpuPerTick = 0.4;

  constructor(
    public id: string,
    public office: string,
    public props: {
      role: MinionTypes;
      spawnData?: {
        memory?: Partial<CreepMemory>;
        spawn?: SpawnOrder['spawn'];
        directions?: SpawnOrder['directions'];
      };
      estimatedCpuPerTick?: number;
      builds: (energy: number) => CreepBuild[];
      budget?: Budget;
      estimate?: (build: CreepBuild) => { cpu: number; energy: number };
    },
    public onSpawn?: (creep: Creep) => void
  ) {}

  spawn(missionId: CreepMemory['missionId'], priority: number): SpawnOrder[] {
    if (this.disabled) return [];
    const builds = this.props.builds(spawnEnergyAvailable(this.office));

    const defaultEstimate = (build: CreepBuild) => {
      const lifetime = build.body.includes(CLAIM) ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME;
      return {
        cpu: (this.props.estimatedCpuPerTick ?? this.defaultCpuPerTick) * Math.min(cpuEstimatePeriod(), lifetime),
        energy: 0
      };
    };

    const padding = Number(Math.floor(Math.random() * 0xffff))
      .toString(16)
      .padStart(4, '0');

    return [
      {
        ...this.props.spawnData,
        priority,
        office: this.office,
        budget: this.props.budget ?? Budget.ESSENTIAL,
        name: `${missionId}|${padding}`,
        builds,
        estimate: this.props.estimate ?? defaultEstimate,
        memory: {
          ...this.props.spawnData?.memory,
          role: this.props.role,
          missionId
        }
      }
    ];
  }
  abstract get resolved(): Creep | Creep[] | undefined;
  abstract register(creep: Creep, onNew?: () => void): void;

  public memory?: Record<string, any>;
  setMemory(memory: this['memory']) {
    this.memory = memory;
  }

  public disabled = false;
  setDisabled(disabled = true) {
    this.disabled = disabled;
  }

  checkOnSpawn(creep: Creep, onNew?: () => void) {
    if (creep.memory.spawned) return;
    this.onSpawn?.(creep);
    onNew?.();
    creep.memory.spawned = true;
  }

  abstract cpuRemaining(): number;
}
