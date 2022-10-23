import { MinionTypes } from 'Minions/minionTypes';
import { SpawnOrder } from 'Minions/spawnQueues';
import { Budget } from 'Missions/Budgets';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';

export abstract class BaseCreepSpawner {
  defaultCpuPerTick = 0.4;

  constructor(
    public id: string,
    public office: string,
    public props: {
      role: MinionTypes;
      spawnData?: {
        boosts?: MineralBoostConstant[];
        memory?: Partial<CreepMemory>;
        spawn?: Id<StructureSpawn>;
        directions?: DirectionConstant[];
      };
      body: (energy: number) => BodyPartConstant[];
      budget: Budget;
      estimatedCpuPerTick?: number;
      estimatedEnergy?: (body: BodyPartConstant[]) => number;
    },
    public onSpawn?: (creep: Creep) => void
  ) {}

  spawn(missionId: CreepMemory['missionId'], priority: number): SpawnOrder[] {
    const body = this.props.body(spawnEnergyAvailable(this.office));
    const lifetime = body.includes(CLAIM) ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME;

    const padding = Number(Math.floor(Math.random() * 0xffff))
      .toString(16)
      .padStart(4, '0');

    return [
      {
        ...this.props.spawnData,
        priority,
        office: this.office,
        budget: this.props.budget,
        name: `${missionId}|${padding}`,
        body,
        estimate: {
          cpu: (this.props.estimatedCpuPerTick ?? this.defaultCpuPerTick) * lifetime,
          energy: this.props.estimatedEnergy?.(body) ?? 0
        },
        memory: {
          ...this.props.spawnData?.memory,
          role: this.props.role,
          missionId
        }
      }
    ];
  }
  abstract get resolved(): Creep | Creep[] | undefined;
  abstract register(creep: Creep): void;

  public memory?: Record<string, any>;
  setMemory(memory: this['memory']) {
    this.memory = memory;
  }

  abstract cpuRemaining(): number;
}
