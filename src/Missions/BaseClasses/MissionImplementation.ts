import { BaseCreepSpawner } from './CreepSpawner/BaseCreepSpawner';
import { BaseMissionSpawner } from './MissionSpawner/BaseMissionSpawner';

declare global {
  interface CreepMemory {
    missionId: `${MissionImplementation['id']}|${BaseCreepSpawner['id']}`;
  }
  interface Memory {
    missions: Record<
      MissionImplementation['id'],
      {
        data: any;
        missions: Record<string, string[]>;
        creeps: Record<string, any>;
      }
    >;
  }
}

export interface BaseMissionData {
  office: string;
}

const singletons = new Map<MissionImplementation['id'], MissionImplementation>();

export function allMissions() {
  return singletons.values();
}

export class MissionImplementation {
  public creeps: Record<string, BaseCreepSpawner> = {};
  public missions: Record<string, BaseMissionSpawner<typeof MissionImplementation>> = {};
  public id: string;
  public priority = 5;
  constructor(public missionData: { office: string }, id?: string) {
    this.id =
      id ??
      Number(Math.floor(Math.random() * 0xffffffff))
        .toString(16)
        .padStart(8, '0');
    if (id) {
      const cached = singletons.get(id);
      if (cached) return cached;
      singletons.set(this.id, this);
    }
    Memory.missions[this.id] ??= {
      data: missionData,
      missions: {},
      creeps: {}
    };
  }

  static fromId(id: MissionImplementation['id']) {
    return new this(Memory.missions[id].data, id);
  }

  spawn() {
    const orders = [];
    for (let key in this) {
      const prop = this[key];
      if (prop instanceof BaseCreepSpawner) {
        orders.push(...prop.spawn(`${this.id}|${prop.id}`, this.priority));
      }
    }
    return orders;
  }

  execute() {
    // register ids
    for (const mission in this.missions) {
      this.missions[mission].register(Memory.missions[this.id].missions[mission] ?? []);
    }
    // register spawner memory
    for (const spawner in this.creeps) {
      Memory.missions[this.id].creeps[spawner] ??= {};
      this.creeps[spawner].setMemory(Memory.missions[this.id].creeps[spawner]);
    }

    // resolve missions
    const resolvedMissions: ResolvedMissions<MissionImplementation> = Object.keys(this.missions)
      .map(k => ({ key: k, value: this.missions[k].resolved }))
      .reduce((sum, { key, value }) => {
        sum[key as keyof this['missions']] = value;
        return sum;
      }, {} as { [T in keyof this['missions']]: this['missions'][T]['resolved'] });

    // cache ids
    for (const mission in resolvedMissions) {
      const resolved = resolvedMissions[mission];
      if (Array.isArray(resolved)) {
        Memory.missions[this.id].missions[mission] = resolved.map(m => m.id);
      } else if (resolved) {
        Memory.missions[this.id].missions[mission] = [resolved.id];
      } else {
        Memory.missions[this.id].missions[mission] = [];
      }
    }

    // resolve creeps
    const resolvedCreeps = Object.keys(this.creeps)
      .map(k => ({ key: k, value: this.creeps[k].resolved }))
      .reduce((sum, { key, value }) => {
        sum[key as keyof this['creeps']] = value;
        return sum;
      }, {} as { [T in keyof this['creeps']]: this['creeps'][T]['resolved'] });

    // run logic
    this.run(resolvedCreeps, resolvedMissions, this.missionData);
  }

  register(creep: Creep) {
    for (let key in this) {
      const prop = this[key];
      if (prop instanceof BaseCreepSpawner && creep.memory.missionId === `${this.id}|${prop.id}`) {
        prop.register(creep);
      }
    }
  }

  run(
    creeps: ResolvedCreeps<MissionImplementation>,
    missions: ResolvedMissions<MissionImplementation>,
    data: MissionImplementation['missionData']
  ) {
    throw new Error('Not implemented yet');
  }
}

export type ResolvedCreeps<Mission extends MissionImplementation> = {
  [T in keyof Mission['creeps']]: Mission['creeps'][T]['resolved'];
};
export type ResolvedMissions<Mission extends MissionImplementation> = {
  [T in keyof Mission['missions']]: Mission['missions'][T]['resolved'];
};
