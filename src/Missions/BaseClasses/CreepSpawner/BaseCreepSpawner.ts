import { MinionTypes } from 'Minions/minionTypes';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';

export abstract class BaseCreepSpawner {
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
      estimate?: (body: BodyPartConstant[]) => { cpu: number; energy: number };
    }
  ) {}
  spawn(missionId: CreepMemory['missionId'], priority: number) {
    const body = this.props.body(spawnEnergyAvailable(this.office));
    const lifetime = body.includes(CLAIM) ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME;

    const padding = Number(Math.floor(Math.random() * 0xffff))
      .toString(16)
      .padStart(4, '0');

    return [
      {
        ...this.props.spawnData,
        priority,
        name: `${missionId}|${padding}`,
        body,
        estimate: this.props.estimate?.(body) ?? { cpu: 0.4 * lifetime, energy: 0 },
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
}
